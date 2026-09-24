import { SyllabusManager, classByNumber } from "./syllabus";

export const SYLLABUS_FILE_DROP_ATTR = "data-syllabus-file-drop";
export const SYLLABUS_FILE_DROP_CLASS_ATTR = "data-syllabus-class-number";
export const SYLLABUS_FILE_DROP_OVERLAY_CLASS = "syllabus-os-file-drop-overlay";

export type SyllabusFileDropTarget =
  | { kind: "class"; classNumber: number | null }
  | { kind: "further-reading" }
  | { kind: "collection" };

type DropTargetNode = {
  getAttribute?: (name: string) => string | null;
  parentElement?: DropTargetNode | null;
};

function asDropTargetNode(target: EventTarget | null): DropTargetNode | null {
  if (!target || typeof target !== "object") {
    return null;
  }
  const node = target as DropTargetNode & { nodeType?: number };
  if (typeof node.getAttribute === "function") {
    return node;
  }
  return node.parentElement ?? null;
}

/** Plugin sandbox has no `Element` constructor — do not use `instanceof Element`. */
function asDomElement(target: EventTarget | null): Element | null {
  if (!target || typeof target !== "object") {
    return null;
  }
  const node = target as { nodeType?: number; parentElement?: Element | null };
  if (node.nodeType === 1) {
    return target as Element;
  }
  return node.parentElement ?? null;
}

/** Finder/OS drags often leave `event.target` on the page root; use the cursor. */
export function hitTargetFromDragEvent(
  event: Pick<DragEvent, "clientX" | "clientY" | "target">,
): EventTarget | null {
  const x = event.clientX;
  const y = event.clientY;
  if (typeof x !== "number" || typeof y !== "number") {
    return event.target;
  }
  const doc = fileDropDocument(event.target);
  const stack =
    typeof doc.elementsFromPoint === "function"
      ? doc.elementsFromPoint(x, y)
      : [doc.elementFromPoint?.(x, y)];
  for (const raw of stack) {
    const el = asDomElement(raw as EventTarget | null);
    if (!el) {
      continue;
    }
    if (typeof el.closest === "function") {
      if (el.closest(`.${SYLLABUS_FILE_DROP_OVERLAY_CLASS}`)) {
        continue;
      }
    }
    return el;
  }
  return event.target;
}

export function resolveSyllabusFileDropTarget(
  target: EventTarget | null,
): SyllabusFileDropTarget {
  let el = asDropTargetNode(target);
  while (el) {
    const zone = el.getAttribute?.(SYLLABUS_FILE_DROP_ATTR);
    if (zone === "further-reading") {
      return { kind: "further-reading" };
    }
    if (zone === "class") {
      const raw = el.getAttribute?.(SYLLABUS_FILE_DROP_CLASS_ATTR);
      if (raw == null || raw === "" || raw === "null") {
        return { kind: "class", classNumber: null };
      }
      const classNumber = Number(raw);
      if (Number.isFinite(classNumber)) {
        return { kind: "class", classNumber };
      }
    }
    el = el.parentElement ?? null;
  }
  return { kind: "collection" };
}

function fileDropDocument(target: EventTarget | null): Document {
  if (target && typeof target === "object" && "ownerDocument" in target) {
    const doc = (target as { ownerDocument?: Document | null }).ownerDocument;
    if (doc) {
      return doc;
    }
  }
  try {
    return Zotero.getMainWindow()?.document ?? document;
  } catch {
    return document;
  }
}

function closestFileDropElement(target: EventTarget | null): Element | null {
  let el = asDomElement(target);
  while (el) {
    if (
      typeof el.hasAttribute === "function" &&
      el.hasAttribute(SYLLABUS_FILE_DROP_ATTR)
    ) {
      return el;
    }
    el = el.parentElement;
  }
  return null;
}

function paintTargetForZone(zone: Element): HTMLElement {
  if (zone.classList.contains("syllabus-class-items")) {
    return zone as HTMLElement;
  }
  const items = zone.querySelector(".syllabus-class-items");
  return (items as HTMLElement) || (zone as HTMLElement);
}

export function highlightSyllabusFileDropzones(
  target: EventTarget | null,
): void {
  const doc = fileDropDocument(target);
  const zone = closestFileDropElement(target);
  const paint = zone ? paintTargetForZone(zone) : null;
  const seen = new Set<HTMLElement>();
  for (const raw of doc.querySelectorAll(`[${SYLLABUS_FILE_DROP_ATTR}]`)) {
    const node = raw as Element | null;
    if (!node || node.nodeType !== 1) {
      continue;
    }
    const candidate = paintTargetForZone(node);
    if (seen.has(candidate)) {
      continue;
    }
    seen.add(candidate);
    candidate.dataset.dropzoneActive = candidate === paint ? "true" : "false";
    if (node !== candidate) {
      (node as HTMLElement).dataset.dropzoneActive = "false";
    }
  }
}

export function clearSyllabusFileDropzoneHighlights(
  target?: EventTarget | null,
): void {
  const doc = fileDropDocument(target ?? null);
  for (const raw of doc.querySelectorAll(`[${SYLLABUS_FILE_DROP_ATTR}]`)) {
    const node = raw as Element | null;
    if (!node || node.nodeType !== 1) {
      continue;
    }
    (node as HTMLElement).dataset.dropzoneActive = "false";
    const paint = paintTargetForZone(node);
    if (paint !== node) {
      paint.dataset.dropzoneActive = "false";
    }
  }
}

export async function assignImportedOsFilesToSyllabus(
  items: Zotero.Item[],
  collectionId: number,
  target: SyllabusFileDropTarget,
): Promise<void> {
  if (target.kind === "collection" || items.length === 0) {
    return;
  }

  if (target.kind === "further-reading") {
    const keys = items.map((item) => item.key).filter(Boolean);
    if (!keys.length) {
      return;
    }
    const current = SyllabusManager.getFurtherReadingOrder(collectionId);
    const unique = keys.filter((key, index) => keys.indexOf(key) === index);
    await SyllabusManager.setFurtherReadingOrder(
      collectionId,
      [...current.filter((key) => !unique.includes(key)), ...unique],
      "page",
    );
    return;
  }

  if (target.classNumber != null) {
    const metadata = SyllabusManager.getSyllabusMetadata(collectionId);
    if (!classByNumber(metadata, target.classNumber)) {
      await SyllabusManager.addClass(collectionId, target.classNumber, "page");
    }
  }

  for (const item of items) {
    try {
      if (item.isNote()) {
        continue;
      }
    } catch {
      continue;
    }
    await SyllabusManager.addClassAssignment(
      item,
      collectionId,
      target.classNumber,
      {},
      "page",
    );
  }
}
