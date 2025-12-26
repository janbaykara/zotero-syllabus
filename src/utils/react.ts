import { render, type ComponentChildren } from "preact";

/**
 * Renders a Preact component into a DOM element.
 * Ensures window and document are available globally for Preact.
 */
export function renderComponent(
  win: _ZoteroTypes.MainWindow,
  rootElement: HTMLElement,
  jsx: ComponentChildren,
) {
  // Ensure window and document are available globally for Preact
  if (typeof (globalThis as any).window === "undefined") {
    (globalThis as any).window = win;
  }
  if (typeof (globalThis as any).document === "undefined" && win.document) {
    (globalThis as any).document = win.document;
  }

  // Unmount existing content if present
  if (win.myPluginUnmount) {
    try {
      if (rootElement.isConnected || rootElement.parentNode) {
        win.myPluginUnmount();
      }
    } catch (e) {
      ztoolkit.log("Error during unmount:", e);
    }
  }

  // Render Preact component
  render(jsx, rootElement);

  // Store unmount function for cleanup
  win.myPluginUnmount = () => {
    try {
      if (rootElement.isConnected || rootElement.parentNode) {
        render(null, rootElement);
      }
    } catch (e) {
      ztoolkit.log("Error during Preact unmount:", e);
    }
  };
}
