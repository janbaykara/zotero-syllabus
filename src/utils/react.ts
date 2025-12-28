import { render, type ComponentChildren } from "preact";

/**
 * Renders a Preact component into a DOM element.
 * Ensures window and document are available globally for Preact.
 * Each root tree is isolated by a unique identifier to prevent conflicts during hot reloading.
 */
export function renderComponent(
  win: _ZoteroTypes.MainWindow,
  rootElement: HTMLElement,
  jsx: ComponentChildren,
  rootId?: string,
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
    (win as any).__preactUnmountMap = new Map<string, () => void>();
  }
  const unmountMap = (win as any).__preactUnmountMap as Map<string, () => void>;

  // Generate a unique ID for this root if not provided
  // Use a combination of element properties to create a stable ID
  const id =
    rootId ||
    `preact-root-${rootElement.id || rootElement.className || Math.random().toString(36).substring(7)}`;

  // Unmount existing content for this specific root if present
  const existingUnmount = unmountMap.get(id);
  if (existingUnmount) {
    try {
      if (rootElement.isConnected || rootElement.parentNode) {
        existingUnmount();
      }
    } catch (e) {
      ztoolkit.log(`Error during unmount for root ${id}:`, e);
    }
  }

  // Render Preact component
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
  unmountMap.set(id, unmountFn);

  // Return the ID so callers can use it for cleanup if needed
  return id;
}
