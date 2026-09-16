import { render, type ComponentChildren } from "preact";

type RootMeta = {
  unmount: () => void;
  /** Stable identity for the last tree mounted on this root (mode + key). */
  treeKey?: string;
};

/**
 * Renders a Preact component into a DOM element.
 * Ensures window and document are available globally for Preact.
 * Each root tree is isolated by a unique identifier to prevent conflicts during hot reloading.
 *
 * Re-renders update in place (no blank flash). Pass `treeKey` when the logical
 * view changes (e.g. collection id / gallery vs syllabus) to force a clean remount.
 */
export function renderComponent(
  win: _ZoteroTypes.MainWindow,
  rootElement: HTMLElement,
  jsx: ComponentChildren,
  rootId?: string,
  treeKey?: string,
) {
  // Ensure window and document are available globally for Preact
  if (typeof (globalThis as any).window === "undefined") {
    (globalThis as any).window = win;
  }
  if (typeof (globalThis as any).document === "undefined" && win.document) {
    (globalThis as any).document = win.document;
  }

  // Initialize the unmount map if it doesn't exist
  if (!(win as any).__preactUnmountMap) {
    (win as any).__preactUnmountMap = new Map<string, RootMeta>();
  }
  const unmountMap = (win as any).__preactUnmountMap as Map<string, RootMeta>;

  // Generate a unique ID for this root if not provided
  // Use a combination of element properties to create a stable ID
  const id =
    rootId ||
    `preact-root-${rootElement.id || rootElement.className || Math.random().toString(36).substring(7)}`;

  const existing = unmountMap.get(id);
  const sameTree =
    existing &&
    treeKey != null &&
    existing.treeKey != null &&
    existing.treeKey === treeKey;

  // Only tear down when the logical view changes. Same-key re-renders update
  // in place via Preact's render() — unmount-first caused SyllabusPage flashes.
  if (existing && !sameTree && treeKey != null) {
    try {
      if (rootElement.isConnected || rootElement.parentNode) {
        existing.unmount();
      }
    } catch (e) {
      ztoolkit.log(`Error during unmount for root ${id}:`, e);
    }
  } else if (existing && treeKey == null) {
    // Legacy callers with no treeKey: preserve prior force-remount behaviour
    // only when explicitly clearing; otherwise update in place.
  }

  // Render Preact component (updates existing tree when not unmounted)
  render(jsx, rootElement);

  // Store unmount function for this specific root
  const unmountFn = () => {
    try {
      if (rootElement.isConnected || rootElement.parentNode) {
        render(null, rootElement);
      }
    } catch (e) {
      ztoolkit.log(`Error during Preact unmount for root ${id}:`, e);
    }
  };
  unmountMap.set(id, {
    unmount: unmountFn,
    treeKey: treeKey ?? existing?.treeKey,
  });

  // Return the ID so callers can use it for cleanup if needed
  return id;
}

/** Tear down a Preact root so its document listeners cannot outlive the view. */
export function unmountComponent(win: _ZoteroTypes.MainWindow, rootId: string) {
  const unmountMap = (win as any).__preactUnmountMap as
    | Map<string, RootMeta>
    | undefined;
  if (!unmountMap) {
    return;
  }
  const meta = unmountMap.get(rootId);
  if (!meta) {
    return;
  }
  try {
    meta.unmount();
  } catch (e) {
    ztoolkit.log(`Error during unmount for root ${rootId}:`, e);
  }
  unmountMap.delete(rootId);
}
