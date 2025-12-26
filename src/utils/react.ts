import React from "react";
import ReactDOM from "react-dom/client";

/**
 * Registers an unmount function for a React tree with a unique key.
 * This should be called after creating a React root to enable hot reload support.
 *
 * @param key - Unique identifier for this React tree
 * @param win - Zotero window object
 * @param unmountFn - Function to unmount the React tree
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
 * Creates a React root and renders JSX, automatically registering the unmount function.
 * Use this inside renderWithHotReload's renderFn for key-based hot reload support.
 *
 * @param key - Unique identifier for this React tree
 * @param win - Zotero window object
 * @param rootElement - DOM element to render into
 * @param jsx - React component to render
 */
export function createReactRoot(
  key: string,
  win: _ZoteroTypes.MainWindow,
  rootElement: HTMLElement,
  jsx: React.ReactNode,
) {
  // Create new React root and render
  const root = ReactDOM.createRoot(rootElement);
  root.render(jsx);

  // Register unmount function for hot reload support
  registerUnmount(key, win, () => {
    try {
      if (rootElement.isConnected || rootElement.parentNode) {
        root.unmount();
      }
    } catch (e) {
      ztoolkit.log(`Error during React unmount for key "${key}":`, e);
    }
  });
}

/**
 * Renders a React component with hot reload support using a unique key.
 * This allows multiple separate React trees to coexist and be independently unmounted.
 *
 * @param key - Unique identifier for this React tree
 * @param win - Zotero window object
 * @param rootElement - DOM element to render into
 * @param renderFn - Function that performs the React rendering. Should call registerUnmount
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

  // Unmount existing React root for this key before clearing content
  // This prevents "Node.removeChild" errors during hot reload
  const existingUnmount = unmountMap.get(key);
  if (existingUnmount) {
    try {
      existingUnmount();
    } catch (e) {
      ztoolkit.log(`Error unmounting React tree with key "${key}":`, e);
    }
    unmountMap.delete(key);
  }

  // Clear previous content before rendering React
  rootElement.textContent = "Loading...";

  // Ensure window is available globally for React
  // React may try to access window during initialization
  if (typeof (globalThis as any).window === "undefined") {
    (globalThis as any).window = win;
  }

  // Execute the render function
  try {
    renderFn();
  } catch (e) {
    ztoolkit.log(`Error rendering React tree with key "${key}":`, e);
  }
}

export function renderReactComponent(
  win: _ZoteroTypes.MainWindow,
  rootElement: HTMLElement,
  jsx: React.ReactNode,
) {
  // Ensure window is available for React
  if (typeof (globalThis as any).window === "undefined" && win) {
    (globalThis as any).window = win;
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

  // Create new React root and render
  const root = ReactDOM.createRoot(rootElement);

  root.render(jsx);

  // Store teardown function
  win.myPluginUnmount = () => {
    try {
      if (rootElement.isConnected || rootElement.parentNode) {
        root.unmount();
      }
    } catch (e) {
      ztoolkit.log("Error during React unmount:", e);
    }
  };
}