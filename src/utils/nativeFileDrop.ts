import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import type { JSX } from "preact";
import { getSelectedCollection, getSelectedLibraryID } from "./zotero";

function logNativeFileDrop(message: string, error?: unknown): void {
  try {
    ztoolkit.log(message, error);
  } catch {
    // Unit tests import this module without the plugin global.
  }
}

const ZOTERO_DRAG_TYPES = [
  "zotero/item",
  "zotero/collection",
  "zotero/search",
  "application/x-syllabus-assignment-ids",
];

const OS_FILE_DRAG_TYPES = [
  "application/x-moz-file",
  "Files",
  "text/x-moz-url",
];

type MozDataTransfer = DataTransfer & {
  mozItemCount?: number;
  mozGetDataAt?: (type: string, index: number) => unknown;
};

type ZoteroDragDrop = {
  getDataFromDataTransfer?: (dataTransfer: DataTransfer) =>
    | {
        dataType: string;
        data: unknown[];
        dropEffect?: string;
      }
    | false
    | null;
};

type DropPane = {
  displayCannotEditLibraryMessage?: () => void;
  displayCannotEditLibraryFilesMessage?: () => void;
  displayCannotAddShortcutMessage?: (path?: string) => void;
  addItemFromURL?: (
    url: string,
    itemType?: string,
  ) => Promise<Zotero.Item | false> | Zotero.Item | false;
};

export type OsFileDropEffect = "copy" | "link" | "move";

export type CollectedOsDrop =
  | {
      kind: "file";
      file: nsIFile | string;
      path: string;
      name: string;
      isDirectory: boolean;
    }
  | { kind: "url"; url: string };

export type NativeFileDropDestination = {
  libraryID: number;
  collections: number[] | undefined;
  canEdit: boolean;
  canEditFiles: boolean;
};

export function dataTransferHasType(
  types: DataTransfer["types"] | null | undefined,
  type: string,
): boolean {
  if (!types) {
    return false;
  }
  const contains = (types as { contains?: (value: string) => boolean })
    .contains;
  // Firefox/XUL still exposes DOMStringList.contains; Zotero 10 uses includes.
  if (typeof contains === "function" && contains.call(types, type)) {
    return true;
  }
  if (typeof types.includes === "function" && types.includes(type)) {
    return true;
  }
  try {
    return Array.from(types as unknown as string[]).includes(type);
  } catch {
    return false;
  }
}

/** True for Finder/Explorer (and URL) drops, not Zotero or syllabus item drags. */
export function isOsFileDrag(
  dataTransfer: DataTransfer | null | undefined,
): boolean {
  if (!dataTransfer) {
    return false;
  }
  if (
    ZOTERO_DRAG_TYPES.some((type) =>
      dataTransferHasType(dataTransfer.types, type),
    )
  ) {
    return false;
  }
  return OS_FILE_DRAG_TYPES.some((type) =>
    dataTransferHasType(dataTransfer.types, type),
  );
}

export function isSyllabusNoteFileName(name: string): boolean {
  return name.toLowerCase().endsWith(".syllabus");
}

export function osFileDropEffect(
  event: {
    metaKey?: boolean;
    altKey?: boolean;
    shiftKey?: boolean;
    ctrlKey?: boolean;
    dataTransfer?: DataTransfer | null;
  },
  isMac: boolean,
): OsFileDropEffect {
  if (isMac) {
    if (event.metaKey) {
      return event.altKey ? "link" : "move";
    }
    return "copy";
  }
  const effect = event.dataTransfer?.dropEffect;
  if (effect === "link" || effect === "move" || effect === "copy") {
    return effect;
  }
  if (event.shiftKey) {
    return event.ctrlKey ? "link" : "move";
  }
  return "copy";
}

function queryNsIFile(value: unknown): unknown {
  if (!value || typeof value !== "object") {
    return value;
  }
  const qi = (value as { QueryInterface?: (iid: unknown) => unknown })
    .QueryInterface;
  if (typeof qi !== "function") {
    return value;
  }
  try {
    return qi.call(value, Ci.nsIFile) ?? value;
  } catch {
    return value;
  }
}

function asNsIFile(value: unknown): {
  path: string;
  leafName: string;
  isDirectory: () => boolean;
} | null {
  value = queryNsIFile(value);
  if (!value || typeof value !== "object") {
    return null;
  }
  const file = value as {
    path?: string;
    leafName?: string;
    isDirectory?: () => boolean;
  };
  if (typeof file.path !== "string" || !file.path) {
    return null;
  }
  const leafName =
    typeof file.leafName === "string"
      ? file.leafName
      : file.path.split(/[/\\]/).pop() || file.path;
  return {
    path: file.path,
    leafName,
    isDirectory:
      typeof file.isDirectory === "function"
        ? file.isDirectory.bind(file)
        : () => false,
  };
}

function collectedFile(
  raw: unknown,
  fallbackName?: string,
): CollectedOsDrop | null {
  const file = asNsIFile(raw);
  if (!file) {
    return null;
  }
  return {
    kind: "file",
    file: raw as nsIFile,
    path: file.path,
    name: fallbackName || file.leafName,
    isDirectory: file.isDirectory(),
  };
}

function itemsFromDragData(
  dataType: string,
  data: unknown[],
): CollectedOsDrop[] {
  if (dataType === "application/x-moz-file") {
    return data.flatMap((raw) => {
      const item = collectedFile(raw);
      return item ? [item] : [];
    });
  }
  if (dataType === "text/x-moz-url") {
    return data.flatMap((raw) => {
      if (typeof raw === "string") {
        const url = raw.split("\n")[0]?.trim();
        return url ? [{ kind: "url", url }] : [];
      }
      const item = collectedFile(raw);
      return item ? [item] : [];
    });
  }
  return [];
}

/** Paths/URLs from an OS drop, matching Zotero.DragDrop when available. */
export function collectDroppedOsItems(
  dataTransfer: DataTransfer | null | undefined,
): CollectedOsDrop[] {
  if (!dataTransfer) {
    return [];
  }

  const dragDrop = (Zotero as unknown as { DragDrop?: ZoteroDragDrop })
    .DragDrop;
  const dragData = dragDrop?.getDataFromDataTransfer?.(dataTransfer);
  if (dragData && dragData.dataType && Array.isArray(dragData.data)) {
    const fromDragDrop = itemsFromDragData(dragData.dataType, dragData.data);
    if (fromDragDrop.length) {
      return fromDragDrop;
    }
  }

  const moz = dataTransfer as MozDataTransfer;
  const count = moz.mozItemCount ?? 0;
  if (typeof moz.mozGetDataAt === "function" && count > 0) {
    const items: CollectedOsDrop[] = [];
    for (let i = 0; i < count; i++) {
      const item = collectedFile(moz.mozGetDataAt("application/x-moz-file", i));
      if (item) {
        items.push(item);
      }
    }
    if (items.length) {
      return items;
    }
  }

  return Array.from(dataTransfer.files || []).flatMap((file) => {
    const path = (file as File & { mozFullPath?: string }).mozFullPath;
    if (!path) {
      return [];
    }
    return [
      {
        kind: "file" as const,
        file: path,
        path,
        name: file.name,
        isDirectory: false,
      },
    ];
  });
}

function getActivePane(): DropPane | undefined {
  try {
    return (Zotero.getActiveZoteroPane() ??
      Zotero.getMainWindow()?.ZoteroPane) as DropPane | undefined;
  } catch {
    return undefined;
  }
}

export function resolveNativeFileDropDestination(): NativeFileDropDestination | null {
  try {
    const collection = getSelectedCollection();
    const selectedLibraryID = getSelectedLibraryID();
    const fallbackLibraryID = Zotero.Libraries?.userLibraryID;
    const libraryID =
      collection?.libraryID ??
      selectedLibraryID ??
      (typeof fallbackLibraryID === "number" && fallbackLibraryID > 0
        ? fallbackLibraryID
        : null);
    if (libraryID == null) {
      return null;
    }
    const library = Zotero.Libraries.get(libraryID);
    // Missing library objects must not be treated as read-only: that used to
    // show Zotero's "cannot make changes to the currently selected collection"
    // alert on Gallery/Syllabus drops.
    if (!library) {
      return {
        libraryID,
        collections: collection ? [collection.id] : undefined,
        canEdit: true,
        canEditFiles: true,
      };
    }
    return {
      libraryID,
      collections: collection ? [collection.id] : undefined,
      canEdit: Boolean(library.editable),
      canEditFiles: Boolean(library.filesEditable ?? library.editable),
    };
  } catch (error) {
    logNativeFileDrop("Error resolving native file drop destination:", error);
    return null;
  }
}

export function canAcceptOsFileDrop(): boolean {
  const dest = resolveNativeFileDropDestination();
  return Boolean(dest?.canEdit);
}

export function isLeavingDropTarget(
  currentTarget: EventTarget & { contains?: (node: Node) => boolean },
  relatedTarget: EventTarget | null,
): boolean {
  if (!relatedTarget || typeof (relatedTarget as Node).nodeType !== "number") {
    return true;
  }
  if (typeof currentTarget.contains !== "function") {
    return true;
  }
  return !currentTarget.contains(relatedTarget as Node);
}

async function removeDroppedFile(path: string): Promise<void> {
  try {
    if (typeof IOUtils.remove === "function") {
      await IOUtils.remove(path, { ignoreAbsent: true });
    }
  } catch (error) {
    logNativeFileDrop("Error deleting original file after drag:", error);
  }
}

function recognizeImportedItems(items: Zotero.Item[]): void {
  const recognize = (
    Zotero as unknown as {
      RecognizeDocument?: {
        autoRecognizeItems?: (items: Zotero.Item[]) => void;
      };
    }
  ).RecognizeDocument;
  try {
    recognize?.autoRecognizeItems?.(items);
  } catch (error) {
    logNativeFileDrop("Error auto-recognizing dropped files:", error);
  }
}

function ensureDropEffectAllowsDrop(event: DragEvent): void {
  const dataTransfer = event.dataTransfer;
  if (!dataTransfer) {
    return;
  }
  if (!dataTransfer.dropEffect || dataTransfer.dropEffect === "none") {
    dataTransfer.dropEffect = "copy";
  }
}

function allowOsFileDragEvent(event: DragEvent): boolean {
  if (!isOsFileDrag(event.dataTransfer)) {
    return false;
  }
  event.preventDefault();
  event.stopPropagation();
  const dataTransfer = event.dataTransfer;
  if (dataTransfer) {
    if (!dataTransfer.dropEffect || dataTransfer.dropEffect === "none") {
      dataTransfer.dropEffect = "copy";
    } else if (!Zotero.isMac) {
      dataTransfer.dropEffect = osFileDropEffect(event, false);
    }
  }
  return true;
}

/**
 * Import OS-dropped files/URLs into the selected collection (or library).
 * Does not call itemsView.onDrop: that path treats orientation 0 as "drop on
 * a row" and can show a false read-only alert while the items tree is hidden.
 */
export async function importDroppedOsFilesIntoCurrentView(
  event: DragEvent,
  options?: { skipFileName?: (name: string) => boolean },
): Promise<Zotero.Item[]> {
  ensureDropEffectAllowsDrop(event);

  const dest = resolveNativeFileDropDestination();
  const pane = getActivePane();
  if (!dest) {
    logNativeFileDrop("No collection/library to import dropped files into");
    return [];
  }
  if (!dest.canEdit) {
    pane?.displayCannotEditLibraryMessage?.();
    return [];
  }

  const dropped = collectDroppedOsItems(event.dataTransfer);
  const skip = options?.skipFileName;
  const toImport = dropped.filter((item) => {
    if (item.kind === "url") {
      return true;
    }
    if (item.isDirectory) {
      return false;
    }
    return !skip?.(item.name);
  });
  if (!toImport.length) {
    return [];
  }

  const hasFiles = toImport.some((item) => item.kind === "file");
  if (hasFiles && !dest.canEditFiles) {
    pane?.displayCannotEditLibraryFilesMessage?.();
    return [];
  }

  const effect = osFileDropEffect(event, Boolean(Zotero.isMac));
  const added: Zotero.Item[] = [];

  for (const item of toImport) {
    try {
      if (item.kind === "url") {
        const created = await pane?.addItemFromURL?.(
          item.url,
          "temporaryPDFHack",
        );
        if (created) {
          added.push(created);
        }
        continue;
      }

      if (item.name.toLowerCase().endsWith(".lnk")) {
        pane?.displayCannotAddShortcutMessage?.(item.path);
        continue;
      }

      let created: Zotero.Item | undefined;
      if (effect === "link") {
        created = await Zotero.Attachments.linkFromFile({
          file: item.file,
          collections: dest.collections,
        });
      } else {
        created = await Zotero.Attachments.importFromFile({
          file: item.file,
          libraryID: dest.libraryID,
          collections: dest.collections,
        });
        if (effect === "move") {
          await removeDroppedFile(item.path);
        }
      }
      if (created) {
        added.push(created);
      }
    } catch (error) {
      logNativeFileDrop("Error importing dropped file:", error);
    }
  }

  if (added.length) {
    recognizeImportedItems(added);
  }
  return added;
}

function customViewDropRoot(): HTMLElement | null {
  try {
    return (
      (Zotero.getMainWindow()?.document.getElementById(
        "syllabus-custom-view",
      ) as HTMLElement | null) ?? null
    );
  } catch {
    return null;
  }
}

export function useOsFileDropHandlers(options: {
  onOsFileDrop: (event: DragEvent) => void | Promise<void>;
  acceptDrop?: () => boolean;
}): {
  isDraggingFile: boolean;
  onDragEnter: (event: JSX.TargetedDragEvent<HTMLElement>) => void;
  onDragOver: (event: JSX.TargetedDragEvent<HTMLElement>) => void;
  onDragLeave: (event: JSX.TargetedDragEvent<HTMLElement>) => void;
  onDrop: (event: JSX.TargetedDragEvent<HTMLElement>) => void;
} {
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const onOsFileDropRef = useRef(options.onOsFileDrop);
  onOsFileDropRef.current = options.onOsFileDrop;
  const acceptDropRef = useRef(options.acceptDrop);
  acceptDropRef.current = options.acceptDrop;

  const canHandle = useCallback(
    (dataTransfer: DataTransfer | null | undefined) => {
      if (!isOsFileDrag(dataTransfer)) {
        return false;
      }
      if (acceptDropRef.current) {
        return acceptDropRef.current();
      }
      return true;
    },
    [],
  );

  const onDragEnter = useCallback(
    (event: JSX.TargetedDragEvent<HTMLElement>) => {
      if (!canHandle(event.dataTransfer)) {
        return;
      }
      allowOsFileDragEvent(event);
      setIsDraggingFile(true);
    },
    [canHandle],
  );

  const onDragOver = useCallback(
    (event: JSX.TargetedDragEvent<HTMLElement>) => {
      if (!canHandle(event.dataTransfer)) {
        return;
      }
      allowOsFileDragEvent(event);
    },
    [canHandle],
  );

  const onDragLeave = useCallback(
    (event: JSX.TargetedDragEvent<HTMLElement>) => {
      if (!isOsFileDrag(event.dataTransfer)) {
        return;
      }
      if (isLeavingDropTarget(event.currentTarget, event.relatedTarget)) {
        setIsDraggingFile(false);
      }
    },
    [],
  );

  const onDrop = useCallback(
    (event: JSX.TargetedDragEvent<HTMLElement>) => {
      if (!canHandle(event.dataTransfer)) {
        return;
      }
      allowOsFileDragEvent(event);
      setIsDraggingFile(false);
      void onOsFileDropRef.current(event);
    },
    [canHandle],
  );

  useEffect(() => {
    const root = customViewDropRoot();
    if (!root) {
      return;
    }
    const handleEnter = (event: DragEvent) => {
      if (!canHandle(event.dataTransfer)) {
        return;
      }
      allowOsFileDragEvent(event);
      setIsDraggingFile(true);
    };
    const handleOver = (event: DragEvent) => {
      if (!canHandle(event.dataTransfer)) {
        return;
      }
      allowOsFileDragEvent(event);
    };
    const handleLeave = (event: DragEvent) => {
      if (!isOsFileDrag(event.dataTransfer)) {
        return;
      }
      if (isLeavingDropTarget(root, event.relatedTarget)) {
        setIsDraggingFile(false);
      }
    };
    const handleDrop = (event: DragEvent) => {
      if (!canHandle(event.dataTransfer)) {
        return;
      }
      allowOsFileDragEvent(event);
      setIsDraggingFile(false);
      void onOsFileDropRef.current(event);
    };
    root.addEventListener("dragenter", handleEnter, true);
    root.addEventListener("dragover", handleOver, true);
    root.addEventListener("dragleave", handleLeave, true);
    root.addEventListener("drop", handleDrop, true);
    return () => {
      root.removeEventListener("dragenter", handleEnter, true);
      root.removeEventListener("dragover", handleOver, true);
      root.removeEventListener("dragleave", handleLeave, true);
      root.removeEventListener("drop", handleDrop, true);
    };
  }, [canHandle]);

  useEffect(() => {
    const handleDragEnd = () => setIsDraggingFile(false);
    const doc = Zotero.getMainWindow()?.document ?? document;
    doc.addEventListener("dragend", handleDragEnd);
    return () => doc.removeEventListener("dragend", handleDragEnd);
  }, []);

  return { isDraggingFile, onDragEnter, onDragOver, onDragLeave, onDrop };
}
