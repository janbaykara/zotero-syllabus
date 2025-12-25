import React from "react";
import ReactDOM from "react-dom/client";

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