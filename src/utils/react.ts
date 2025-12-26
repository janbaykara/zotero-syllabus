import { render, type ComponentChildren } from "preact";

/**
 * Registers an unmount function for a Preact tree with a unique key.
 * This should be called after creating a Preact root to enable hot reload support.
 *
 * @param key - Unique identifier for this Preact tree
 * @param win - Zotero window object
 * @param unmountFn - Function to unmount the Preact tree
 */
export function registerUnmount(
  key: string,
  win: _ZoteroTypes.MainWindow,
  unmountFn: () => void,
) {
  // Initialize unmount map if it doesn't exist
  if (!(win as any).myPluginUnmountMap) {
    (win as any).myPluginUnmountMap = new Map<string, () => void>();
  }
  const unmountMap = (win as any).myPluginUnmountMap as Map<string, () => void>;
  unmountMap.set(key, unmountFn);
}

/**
 * Creates a Preact root and renders JSX, automatically registering the unmount function.
 * Use this inside renderWithHotReload's renderFn for key-based hot reload support.
 *
 * @param key - Unique identifier for this Preact tree
 * @param win - Zotero window object
 * @param rootElement - DOM element to render into
 * @param jsx - Preact component to render
 */
export function createReactRoot(
  key: string,
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

  // Render Preact component
  render(jsx, rootElement);

  // Register unmount function for hot reload support
  registerUnmount(key, win, () => {
    try {
      if (rootElement.isConnected || rootElement.parentNode) {
        render(null, rootElement);
      }
    } catch (e) {
      ztoolkit.log(`Error during Preact unmount for key "${key}":`, e);
    }
  });
}

/**
 * Renders a Preact component with hot reload support using a unique key.
 * This allows multiple separate Preact trees to coexist and be independently unmounted.
 *
 * @param key - Unique identifier for this Preact tree
 * @param win - Zotero window object
 * @param rootElement - DOM element to render into
 * @param renderFn - Function that performs the Preact rendering. Should call registerUnmount
 *                   to register the unmount function for hot reload support.
 */
export function renderWithHotReload(
  key: string,
  win: _ZoteroTypes.MainWindow,
  rootElement: HTMLElement,
  renderFn: () => void,
) {
  // Initialize unmount map if it doesn't exist
  if (!(win as any).myPluginUnmountMap) {
    (win as any).myPluginUnmountMap = new Map<string, () => void>();
  }
  const unmountMap = (win as any).myPluginUnmountMap as Map<string, () => void>;

  // Unmount existing Preact root for this key before clearing content
  // This prevents "Node.removeChild" errors during hot reload
  const existingUnmount = unmountMap.get(key);
  if (existingUnmount) {
    try {
      existingUnmount();
    } catch (e) {
      ztoolkit.log(`Error unmounting Preact tree with key "${key}":`, e);
    }
    unmountMap.delete(key);
  }

  // Clear previous content before rendering Preact
  rootElement.textContent = "Loading...";

  // Ensure window and document are available globally for Preact
  // Preact may try to access window and document during initialization
  if (typeof (globalThis as any).window === "undefined") {
    (globalThis as any).window = win;
  }
  if (typeof (globalThis as any).document === "undefined" && win.document) {
    (globalThis as any).document = win.document;
  }

  // Execute the render function
  try {
    renderFn();
  } catch (e) {
    ztoolkit.log(`Error rendering Preact tree with key "${key}":`, e);
  }
}

export function renderReactComponent(
  win: _ZoteroTypes.MainWindow,
  rootElement: HTMLElement,
  jsx: ComponentChildren,
) {
  // Ensure window and document are available for Preact
  if (typeof (globalThis as any).window === "undefined" && win) {
    (globalThis as any).window = win;
  }
  if (typeof (globalThis as any).document === "undefined" && win?.document) {
    (globalThis as any).document = win.document;
  }

  // Unmount existing root if it exists
  if (win.myPluginUnmount) {
    try {
      if (rootElement.isConnected || rootElement.parentNode) {
        win.myPluginUnmount();
      }
    } catch (e) {
      ztoolkit.log("Error during unmount:", e);
    }
    delete win.myPluginUnmount;
  }

  // Render Preact component
  render(jsx, rootElement);

  // Store teardown function
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