import { SyllabusManager } from "./modules/syllabus";
import { getString, initLocale } from "./utils/locale";
import { registerPrefsScripts } from "./modules/preferenceScript";
import { createZToolkit } from "./utils/ztoolkit";
import { getCSSUrl } from "./utils/css";

async function onStartup() {
  await Promise.all([
    Zotero.initializationPromise,
    Zotero.unlockPromise,
    Zotero.uiReadyPromise,
  ]);

  initLocale();

  // Install Talis Aspire translator
  SyllabusManager.onStartup();

  await Promise.all(
    Zotero.getMainWindows().map((win) => onMainWindowLoad(win)),
  );

  // Mark initialized as true to confirm plugin loading status
  // outside of the plugin (e.g. scaffold testing process)
  addon.data.initialized = true;
}

function registerStyleSheet(win: _ZoteroTypes.MainWindow) {
  const doc = win.document;

  // Remove any existing stylesheets from previous loads (for hot reload)
  const existingStylesheets = doc.querySelectorAll(
    'link[data-syllabus-stylesheet="true"]',
  );
  existingStylesheets.forEach((link) => {
    link.remove();
  });

  // Load Tailwind CSS with cache-busting hash
  const tailwindStyles = ztoolkit.UI.createElement(doc, "link", {
    properties: {
      type: "text/css",
      rel: "stylesheet",
      href: getCSSUrl(),
    },
    attributes: {
      "data-syllabus-stylesheet": "true",
    },
  });
  doc.documentElement?.appendChild(tailwindStyles);

  // Load existing stylesheet
  const styles = ztoolkit.UI.createElement(doc, "link", {
    properties: {
      type: "text/css",
      rel: "stylesheet",
      href: `chrome://${addon.data.config.addonRef}/content/zoteroPane.css`,
    },
    attributes: {
      "data-syllabus-stylesheet": "true",
    },
  });
  doc.documentElement?.appendChild(styles);
}

async function onMainWindowLoad(win: _ZoteroTypes.MainWindow): Promise<void> {
  // Create ztoolkit for every window
  addon.data.ztoolkit = createZToolkit();

  // Register stylesheets
  registerStyleSheet(win);

  SyllabusManager.onMainWindowLoad(win);

  win.MozXULElement.insertFTLIfNeeded(
    `${addon.data.config.addonRef}-mainWindow.ftl`,
  );

  const popupWin = new ztoolkit.ProgressWindow(addon.data.config.addonName, {
    closeOnClick: true,
    closeTime: -1,
  })
    .createLine({
      text: getString("startup-begin"),
      type: "default",
      progress: 0,
    })
    .show();

  await Zotero.Promise.delay(1000);
  popupWin.changeLine({
    progress: 30,
    text: `[30%] ${getString("startup-begin")}`,
  });

  await Zotero.Promise.delay(1000);

  popupWin.changeLine({
    progress: 100,
    text: `[100%] ${getString("startup-finish")}`,
  });
  popupWin.startCloseTimer(5000);
}

async function onMainWindowUnload(win: _ZoteroTypes.MainWindow): Promise<void> {
  ztoolkit.unregisterAll();
  addon.data.dialog?.window?.close();
  SyllabusManager.onMainWindowUnload(win);
}

function onShutdown(): void {
  SyllabusManager.onShutdown();
  ztoolkit.unregisterAll();
  addon.data.dialog?.window?.close();
  // Remove addon object
  addon.data.alive = false;
  // @ts-expect-error - Plugin instance is not typed
  delete Zotero[addon.data.config.addonInstance];
}

/**
 * Dispatcher for Notify events.
 */
async function onNotify(
  event: string,
  type: string,
  ids: Array<string | number>,
  extraData: { [key: string]: any },
) {
  ztoolkit.log("onNotify", event, type, ids, extraData);
  SyllabusManager.onNotify(event, type, ids, extraData);
}

/**
 * Dispatcher for Preference UI events.
 * @param type event type
 * @param data event data
 */
async function onPrefsEvent(type: string, data: { [key: string]: any }) {
  switch (type) {
    case "load":
      registerPrefsScripts(data.window);
      break;
    default:
      return;
  }
}

export default {
  onStartup,
  onShutdown,
  onMainWindowLoad,
  onMainWindowUnload,
  onNotify,
  onPrefsEvent,
};
