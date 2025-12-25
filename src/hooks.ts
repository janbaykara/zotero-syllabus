import { SyllabusManager, SyllabusUIFactory } from "./modules/syllabus";
import { getString, initLocale } from "./utils/locale";
import { registerPrefsScripts } from "./modules/preferenceScript";
import { createZToolkit } from "./utils/ztoolkit";

async function onStartup() {
  await Promise.all([
    Zotero.initializationPromise,
    Zotero.unlockPromise,
    Zotero.uiReadyPromise,
  ]);

  initLocale();

  SyllabusManager.registerPrefs();

  SyllabusManager.registerNotifier();

  await SyllabusUIFactory.registerSyllabusPriorityColumn();

  await SyllabusUIFactory.registerSyllabusClassInstructionColumn();

  await SyllabusUIFactory.registerSyllabusClassNumberColumn();

  SyllabusUIFactory.registerSyllabusItemPaneSection();

  await Promise.all(
    Zotero.getMainWindows().map((win) => onMainWindowLoad(win)),
  );

  // Mark initialized as true to confirm plugin loading status
  // outside of the plugin (e.g. scaffold testing process)
  addon.data.initialized = true;
}

async function onMainWindowLoad(win: _ZoteroTypes.MainWindow): Promise<void> {
  // Create ztoolkit for every window
  addon.data.ztoolkit = createZToolkit();

  const zoteroPane = ztoolkit.getGlobal("ZoteroPane");
  // Use addReloadListener to catch view reloads (which happen on sort changes)
  if (zoteroPane) {
    // Set up class group row styling after window loads
    ztoolkit.log("onMainWindowLoad->setupSyllabusView");
    SyllabusManager.setupSyllabusView();

    zoteroPane.addReloadListener(() => {
      ztoolkit.log("reloadListener->setupSyllabusView");
      SyllabusManager.setupSyllabusView();
    });

    const itemsView = zoteroPane.itemsView;
    if (itemsView) {
      itemsView.window.addEventListener("click", (e: Event) => {
        ztoolkit.log("itemsView.click->setupSyllabusView", e);
        SyllabusManager.setupSyllabusView();
      });
    }
  }

  // Listen for tab changes and refresh syllabus view
  (async () => {
    const z = ztoolkit.getGlobal("Zotero");
    const mainWindow = z.getMainWindow();
    let currentTab = mainWindow.Zotero_Tabs.getState()[0].title;
    while (true) {
      await Zotero.Promise.delay(500);
      const newTab = mainWindow.Zotero_Tabs.getState()[0].title;
      if (newTab !== currentTab) {
        ztoolkit.log("newTab", newTab);
        currentTab = newTab;
        SyllabusManager.setupSyllabusView();
      }
    }
  })();

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

  SyllabusUIFactory.registerStyleSheet(win);

  SyllabusUIFactory.registerContextMenu(win);

  await Zotero.Promise.delay(1000);

  popupWin.changeLine({
    progress: 100,
    text: `[100%] ${getString("startup-finish")}`,
  });
  popupWin.startCloseTimer(5000);
}

async function onMainWindowUnload(win: Window): Promise<void> {
  ztoolkit.unregisterAll();
  addon.data.dialog?.window?.close();
  ztoolkit.log("onMainWindowUnload->setupSyllabusView");
  SyllabusManager.setupSyllabusView();
  SyllabusManager.unregisterClassNumberMenu(win);
}

function onShutdown(): void {
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

  ztoolkit.log("onNotify->setupSyllabusView");
  await SyllabusManager.setupSyllabusView();

  // Update class number menu when items are modified
  if (type === "item" && (event === "modify" || event === "add")) {
    SyllabusManager.updateClassNumberMenus();
  }
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
