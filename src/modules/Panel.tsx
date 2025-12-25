import React, { useState } from "react";
import ReactDOM from "react-dom/client";

// export function renderPanel(win: _ZoteroTypes.MainWindow, rootElement: HTMLElement) {
//   rootElement.textContent = "!";
// }

export function Panel() {
  const [state, setState] = useState(0);

  return (
    <div style={{ padding: 8 }}>
      <h3>My Plugin Panel</h3>
      <div onClick={() => {
        setState(state + 1);
      }}>Hello from React inside Zotero! ... {state}</div>
    </div>
  );
}

export function renderPanel(win: _ZoteroTypes.MainWindow, rootElement: HTMLElement) {
  try {
    ztoolkit.log("renderPanel called");

    // Ensure window is available for React
    // React's createRoot may try to access window during initialization
    // In Zotero sandbox, window should be available via global setup, but React might check it differently
    // Set it explicitly to ensure React can find it
    if (typeof (globalThis as any).window === "undefined" && win) {
      (globalThis as any).window = win;
      ztoolkit.log("Set window in globalThis");
    }

    // Also ensure it's available as a direct property (React might check this way)
    // React might access window via a direct reference, so ensure it's set
    const windowRef = (globalThis as any).window;
    if (!windowRef && win) {
      (globalThis as any).window = win;
    }

    // Unmount existing root if it exists
    // Check if the root element is still in the DOM before trying to unmount
    // This prevents errors during hot reload when the DOM structure has changed
    if (win.myPluginUnmount) {
      try {
        // Check if the root element is still connected to the DOM
        if (rootElement.isConnected || rootElement.parentNode) {
          ztoolkit.log("Unmounting existing root");
          win.myPluginUnmount();
        } else {
          ztoolkit.log("Root element no longer in DOM, skipping unmount");
        }
      } catch (e) {
        ztoolkit.log("Error during unmount (likely hot reload):", e);
        // Continue anyway - the old root is probably already gone
      }
      delete win.myPluginUnmount;
    }

    // Check if React is available
    ztoolkit.log("Checking React availability", {
      React: typeof React,
      ReactDOM: typeof ReactDOM,
      window: typeof (globalThis as any).window
    });
    if (typeof React === "undefined" || typeof ReactDOM === "undefined") {
      ztoolkit.log("React or ReactDOM not available");
      rootElement.textContent = "React not available";
      return;
    }

    ztoolkit.log("Creating React root");
    // Create new React root and render
    const root = ReactDOM.createRoot(rootElement);

    ztoolkit.log("Rendering Panel component");
    root.render(<Panel />);

    // Store teardown function with element reference for safety
    win.myPluginUnmount = () => {
      try {
        ztoolkit.log("Unmounting React root");
        // Check if the element is still connected to the DOM before unmounting
        // This prevents errors during hot reload when the DOM structure has changed
        if (rootElement.isConnected || rootElement.parentNode) {
          root.unmount();
        } else {
          ztoolkit.log("Root element no longer in DOM, skipping unmount");
        }
      } catch (e) {
        ztoolkit.log("Error during React unmount (likely hot reload):", e);
        // Silently fail - the element is probably already gone
      }
    };

    ztoolkit.log("renderPanel completed successfully");
  } catch (e) {
    const error = e as Error;
    ztoolkit.log("Error in renderPanel:", e, error.stack);
    rootElement.textContent = `Error: ${error.message || String(e)}`;
    throw e; // Re-throw to see the full error
  }
}