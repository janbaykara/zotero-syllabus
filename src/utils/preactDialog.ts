import { render, type ComponentChildren } from "preact";
import type { DialogHelper } from "zotero-plugin-toolkit";
import { getCSSUrl } from "./css";

export type PreactDialogButton = {
  id: string;
  label: string;
  noClose?: boolean;
};

export type PreactDialogFeatures = {
  width?: number;
  height?: number;
  left?: number;
  top?: number;
  centerscreen?: boolean;
  resizable?: boolean;
  fitContent?: boolean;
  noDialogMode?: boolean;
  alwaysRaised?: boolean;
};

export type PreactDialogHandle = {
  dialog: DialogHelper;
  window: Window;
  /** Re-run the content factory into the dialog root. */
  remount: () => void;
  close: () => void;
};

export type OpenPreactDialogOptions = {
  title: string;
  /** Mount-point element id inside the dialog. */
  rootId?: string;
  /**
   * Build the Preact tree. Called on load and whenever `remount()` runs.
   * Prefer internal component state over remount when possible.
   */
  content: (handle: PreactDialogHandle) => ComponentChildren;
  buttons?: PreactDialogButton[];
  features?: PreactDialogFeatures;
  /**
   * When true, reuse/focus `addon.data.dialog` if already open (singleton
   * editor windows). Cleared on unload so shutdown can close it.
   */
  singleton?: boolean;
  onBeforeUnload?: (handle: PreactDialogHandle) => void;
  onUnload?: (
    lastButtonId: string | undefined,
    handle: PreactDialogHandle,
  ) => void;
};

function injectDialogStyles(doc: Document): void {
  if (doc.querySelector(`link[data-syllabus-stylesheet="dialog"]`)) {
    return;
  }
  const link = doc.createElement("link");
  link.rel = "stylesheet";
  link.type = "text/css";
  link.href = getCSSUrl();
  link.setAttribute("data-syllabus-stylesheet", "dialog");
  doc.head?.appendChild(link);
}

function mountPreact(root: HTMLElement, jsx: ComponentChildren): void {
  render(jsx, root);
}

function unmountPreact(root: HTMLElement | null): void {
  if (!root) return;
  try {
    render(null, root);
  } catch (error) {
    ztoolkit.log("Error unmounting Preact dialog:", error);
  }
}

/**
 * Open a DialogHelper window with Preact content and plugin styles injected.
 * Parallel to {@link TabManager}: chrome shell + Preact body.
 */
export function openPreactDialog(
  options: OpenPreactDialogOptions,
): PreactDialogHandle | null {
  if ((__env__ as string) === "test") {
    return null;
  }

  if (options.singleton) {
    const existing = addon.data.dialog;
    if (existing?.window && !existing.window.closed) {
      existing.window.focus();
      return null;
    }
  }

  const rootId =
    options.rootId ||
    `syllabus-preact-dialog-${Zotero.Utilities.randomString()}`;

  // Filled after DialogHelper is constructed so content() can close/remount.
  const handle = {
    dialog: null as unknown as DialogHelper,
    window: null as unknown as Window,
    remount: () => {},
    close: () => {},
  } as PreactDialogHandle;

  handle.remount = () => {
    const win = handle.window;
    if (!win || win.closed) return;
    const root = win.document.getElementById(rootId);
    if (!root) return;
    try {
      mountPreact(root, options.content(handle));
    } catch (error) {
      ztoolkit.log("Error remounting Preact dialog:", error);
    }
  };

  handle.close = () => {
    try {
      handle.window?.close();
    } catch (error) {
      ztoolkit.log("Error closing Preact dialog:", error);
    }
  };

  const dialog = new ztoolkit.Dialog(1, 1).addCell(0, 0, {
    tag: "div",
    namespace: "html",
    id: rootId,
    styles: {
      width: "100%",
      boxSizing: "border-box",
      overflow: "auto",
    },
  });

  for (const button of options.buttons || []) {
    dialog.addButton(button.label, button.id, {
      noClose: button.noClose,
    });
  }

  dialog
    .setDialogData({
      loadCallback: () => {
        handle.dialog = dialog;
        handle.window = dialog.window;
        try {
          injectDialogStyles(dialog.window.document);
          handle.remount();
        } catch (error) {
          ztoolkit.log("Error mounting Preact dialog:", error);
        }
      },
      beforeUnloadCallback: () => {
        try {
          options.onBeforeUnload?.(handle);
        } catch (error) {
          ztoolkit.log("Error in Preact dialog beforeUnload:", error);
        }
        unmountPreact(dialog.window?.document.getElementById(rootId));
      },
      unloadCallback: () => {
        const lastButtonId = dialog.dialogData._lastButtonId as
          string | undefined;
        try {
          options.onUnload?.(lastButtonId, handle);
        } catch (error) {
          ztoolkit.log("Error in Preact dialog unload:", error);
        }
        if (options.singleton && addon.data.dialog === dialog) {
          addon.data.dialog = undefined;
        }
      },
    })
    .open(options.title, {
      centerscreen: true,
      resizable: true,
      fitContent: false,
      ...options.features,
    });

  handle.dialog = dialog;
  if (options.singleton) {
    addon.data.dialog = dialog;
  }

  return handle;
}

/**
 * Open a Preact dialog and resolve when it closes with the last button id
 * (and optional mapped result).
 */
export function openPreactDialogAsync<T = string | undefined>(
  options: Omit<OpenPreactDialogOptions, "onUnload" | "singleton"> & {
    mapResult?: (lastButtonId: string | undefined) => T;
  },
): Promise<T> {
  if ((__env__ as string) === "test") {
    const mapped = options.mapResult
      ? options.mapResult(options.buttons?.[0]?.id)
      : (options.buttons?.[0]?.id as T);
    return Promise.resolve(mapped);
  }

  return new Promise((resolve) => {
    openPreactDialog({
      ...options,
      singleton: false,
      onUnload: (lastButtonId) => {
        resolve(
          options.mapResult
            ? options.mapResult(lastButtonId)
            : (lastButtonId as T),
        );
      },
    });
  });
}
