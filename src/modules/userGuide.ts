import { config } from "../../package.json";
import { getString } from "../utils/locale";
import type { FluentMessageId } from "../../typings/i10n";
import { clearPref, getPref, setPref } from "../utils/prefs";
import { toLocalDateKey } from "../utils/dates";
import { ensureClassRecord } from "../utils/schemas";
import { mutateCollectionDocument } from "./syllabusNote";
import { SyllabusManager } from "./syllabus";
import { FEATURE_FLAG } from "./featureFlags";
import { getSelectedCollection } from "../utils/zotero";

export {
  showUserGuide,
  registerUserGuideHelpMenu,
  TOUR_EVENT_OPEN_SETTINGS,
  TOUR_EVENT_CLOSE_SETTINGS,
  requestTourOpenSettings,
  requestTourCloseSettings,
};

const LATEST_TOUR_VERSION = 1;
const PLAYGROUND_COLLECTION_NAME = "Syllabus Tour";
const TOUR_EVENT_OPEN_SETTINGS = "syllabus-tour-open-settings";
const TOUR_EVENT_CLOSE_SETTINGS = "syllabus-tour-close-settings";

/** Packaged under addon/content/images/guide/ for chrome:// access in the tour. */
type GuideImage =
  | "classes.png"
  | "module.png"
  | "drag-drop.gif"
  | "editing.png"
  | "reading.png";

function guideChromeUrl(filename: GuideImage): string {
  return `chrome://${config.addonRef}/content/images/guide/${filename}`;
}

/** GuideHelper descriptions are HTML (XUL html: namespace), same pattern as Better Notes. */
function guideStepDescription(
  messageId: FluentMessageId,
  image?: GuideImage,
  width = 320,
): string {
  const text = getString(messageId);
  if (!image) {
    return text;
  }
  return `<html:img src="${guideChromeUrl(image)}" style="width: ${width}px; max-width: 100%; height: auto; display: block; margin: 0 auto 12px; border-radius: 4px;"></html:img>
<html:span style="width: ${width}px; max-width: 100%; display: block; text-align: left;">
  ${text}
</html:span>`;
}

function requestTourOpenSettings(win: Window = Zotero.getMainWindow()) {
  win?.dispatchEvent(new win.CustomEvent(TOUR_EVENT_OPEN_SETTINGS));
}

function requestTourCloseSettings(win: Window = Zotero.getMainWindow()) {
  win?.dispatchEvent(new win.CustomEvent(TOUR_EVENT_CLOSE_SETTINGS));
}

async function waitForElement(
  win: _ZoteroTypes.MainWindow,
  finder: string | (() => Element | null | undefined),
  timeoutMs = 8000,
): Promise<Element | null> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const el =
      typeof finder === "function"
        ? finder()
        : win.document.querySelector(finder);
    if (el) {
      return el;
    }
    await Zotero.Promise.delay(50);
  }
  return null;
}

async function settleTourUi(ms = 500): Promise<void> {
  await Zotero.Promise.delay(ms);
}

function isUsableCollection(
  collection: Zotero.Collection | null | undefined,
): collection is Zotero.Collection {
  if (!collection) {
    return false;
  }
  try {
    return (
      !collection.deleted &&
      typeof collection.id === "number" &&
      collection.id > 0
    );
  } catch {
    return false;
  }
}

async function selectPlaygroundCollection(
  collection: Zotero.Collection,
): Promise<boolean> {
  const pane = ztoolkit.getGlobal("ZoteroPane");
  const started = Date.now();
  while (Date.now() - started < 6000) {
    try {
      const live = Zotero.Collections.get(collection.id);
      if (!isUsableCollection(live)) {
        return false;
      }
      const collectionsView = pane?.collectionsView;
      if (collectionsView) {
        collectionsView.selectByID(live.treeViewID);
      }
      if (getSelectedCollection()?.id === live.id) {
        return true;
      }
    } catch (error) {
      ztoolkit.log("selectPlaygroundCollection retry:", error);
    }
    await Zotero.Promise.delay(100);
  }
  ztoolkit.log(
    "selectPlaygroundCollection timed out for collection",
    collection.id,
  );
  return false;
}

async function findOrCreatePlaygroundCollection(): Promise<Zotero.Collection> {
  const libraryID = Zotero.Libraries.userLibraryID;
  // Skip trashed / unusable rows — after a manual delete, a stale object or
  // name collision must not block creating a fresh playground.
  const existing = Zotero.Collections.getByLibrary(libraryID, true).find(
    (collection) =>
      collection.name === PLAYGROUND_COLLECTION_NAME &&
      isUsableCollection(collection),
  );
  if (existing) {
    await ensurePlaygroundSampleItems(existing);
    return existing;
  }

  const collection = new Zotero.Collection({
    name: PLAYGROUND_COLLECTION_NAME,
    libraryID,
  });
  await collection.saveTx();
  // Give the collections tree a beat to index the new row before select.
  await settleTourUi(200);
  await ensurePlaygroundSampleItems(collection);
  return collection;
}

/**
 * Always return a live, selected playground collection.
 * Recreates after the user deletes “Syllabus Tour”.
 */
async function resolvePlaygroundCollection(
  current: Zotero.Collection | null,
): Promise<Zotero.Collection> {
  if (isUsableCollection(current)) {
    try {
      const live = Zotero.Collections.get(current.id);
      if (isUsableCollection(live)) {
        await ensurePlaygroundSampleItems(live);
        await selectPlaygroundCollection(live);
        return live;
      }
    } catch (error) {
      ztoolkit.log("resolvePlaygroundCollection stale ref:", error);
    }
  }

  const collection = await findOrCreatePlaygroundCollection();
  const selected = await selectPlaygroundCollection(collection);
  if (!selected) {
    await settleTourUi(400);
    await selectPlaygroundCollection(collection);
  }
  return collection;
}

async function ensurePlaygroundSampleItems(
  collection: Zotero.Collection,
): Promise<void> {
  if (!isUsableCollection(collection)) {
    return;
  }

  let regularItems: Zotero.Item[] = [];
  try {
    regularItems = collection.getChildItems().filter((item) => {
      try {
        return item.isRegularItem();
      } catch {
        return false;
      }
    });
  } catch (error) {
    ztoolkit.log("ensurePlaygroundSampleItems getChildItems failed:", error);
    return;
  }
  const titles = [
    getString("tour-sample-reading-1"),
    getString("tour-sample-reading-2"),
    getString("tour-sample-reading-3"),
  ];
  const existingTitles = new Set(
    regularItems.map((item) => String(item.getField("title") || "")),
  );
  const toCreate = titles.filter((title) => !existingTitles.has(title));
  if (regularItems.length >= titles.length || toCreate.length === 0) {
    return;
  }

  try {
    for (const title of toCreate) {
      const item = new Zotero.Item("journalArticle");
      item.libraryID = collection.libraryID;
      item.setField("title", title);
      await item.saveTx({ skipSelect: true });
      // addItems() requires an open DB transaction; addToCollection + saveTx
      // matches the rest of this plugin and works after recreate.
      item.addToCollection(collection.id);
      await item.saveTx({ skipSelect: true });
    }
  } catch (error) {
    ztoolkit.log("ensurePlaygroundSampleItems failed:", error);
  }
}

async function enableSyllabusViewForTour(
  collection: Zotero.Collection,
): Promise<void> {
  if (!isUsableCollection(collection)) {
    throw new Error("enableSyllabusViewForTour: collection is not usable");
  }
  await selectPlaygroundCollection(collection);
  await mutateCollectionDocument(collection, (document) => document, {
    createNote: "always",
  });
  SyllabusManager.writeCollectionViewMode(collection, "syllabus");
  SyllabusManager.updateViewModeButtons();
  SyllabusManager.setupPage();
  const ready = await waitForElement(
    Zotero.getMainWindow(),
    '[data-tour="syllabus-add-class"]',
  );
  if (!ready) {
    // Selection or render may have raced after recreate — try once more.
    await selectPlaygroundCollection(collection);
    SyllabusManager.setupPage();
    await waitForElement(
      Zotero.getMainWindow(),
      '[data-tour="syllabus-add-class"]',
    );
  }
  // Let the syllabus page finish painting before the next coachmark.
  await settleTourUi(600);
}

async function ensureTourClass(
  collection: Zotero.Collection,
  classNumber = 1,
): Promise<void> {
  const range = SyllabusManager.getFullClassNumberRange(collection.id);
  if (range.includes(classNumber)) {
    return;
  }
  // Prefer document mutation only — setupPage() remounts the whole Preact
  // tree and makes the tour feel like it is skipping windows.
  await mutateCollectionDocument(
    collection,
    (document) => {
      const classes = { ...(document.classes || {}) };
      ensureClassRecord(classes, classNumber);
      return { ...document, classes };
    },
    { createNote: "always" },
  );
  SyllabusManager.onClassListUpdate();
  await waitForElement(
    Zotero.getMainWindow(),
    '[data-tour="syllabus-class-group"]',
  );
  await settleTourUi(550);
}

function itemIsAssignedToClass(
  item: Zotero.Item,
  collection: Zotero.Collection,
): boolean {
  const assignments = SyllabusManager.getItemSyllabusDataForCollection(
    item,
    collection.id,
  );
  return !!assignments?.some((a) => {
    const classNumber =
      SyllabusManager.getClassNumber(collection.id, a.classId) ?? a.classNumber;
    return classNumber !== undefined;
  });
}

async function ensureTourClassAndAssignment(
  collection: Zotero.Collection,
): Promise<Zotero.Item | null> {
  await ensureTourClass(collection, 1);

  const items = collection.getChildItems().filter((item) => {
    try {
      return item.isRegularItem();
    } catch {
      return false;
    }
  });
  const unassigned = items.find(
    (item) => !itemIsAssignedToClass(item, collection),
  );
  const target = unassigned || items[0] || null;
  if (!target) {
    return null;
  }

  if (!itemIsAssignedToClass(target, collection)) {
    await SyllabusManager.addClassAssignment(
      target,
      collection.id,
      1,
      {},
      "page",
    );
    await settleTourUi(550);
  }

  try {
    await Zotero.getMainWindow().ZoteroPane.selectItem(target.id);
  } catch {
    // ignore selection failures during tour
  }
  await settleTourUi(250);
  return target;
}

async function selectTourAssignedItem(
  collection: Zotero.Collection,
): Promise<void> {
  const items = collection.getChildItems().filter((item) => {
    try {
      return item.isRegularItem();
    } catch {
      return false;
    }
  });
  const assigned = items.find((item) =>
    itemIsAssignedToClass(item, collection),
  );
  const target = assigned || items[0];
  if (!target) {
    return;
  }
  try {
    await Zotero.getMainWindow().ZoteroPane.selectItem(target.id);
  } catch {
    // ignore
  }
  await settleTourUi(300);
}

/** Match ReadingDateInput: local calendar day → ISO string. */
function tourSampleReadingDateIso(daysFromNow = 7): string {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + daysFromNow);
  return new Date(toLocalDateKey(date)).toISOString();
}

async function ensureTourClassReadingDate(
  collection: Zotero.Collection,
  classNumber = 1,
): Promise<void> {
  await ensureTourClass(collection, classNumber);
  await SyllabusManager.setClassReadingDate(
    collection.id,
    classNumber,
    tourSampleReadingDateIso(7),
    "page",
  );
  await waitForElement(
    Zotero.getMainWindow(),
    '[data-tour="syllabus-class-reading-date"]',
  );
  await settleTourUi(400);
}

function registerUserGuideHelpMenu() {
  const onCommand = () => {
    const win = Zotero.getMainWindow();
    if (win) {
      void showUserGuide(win, true);
    }
  };

  if (typeof Zotero.MenuManager?.registerMenu === "function") {
    try {
      Zotero.MenuManager.unregisterMenu(`${config.addonRef}-menuHelp`);
    } catch {
      // ignore if not registered yet
    }
    Zotero.MenuManager.registerMenu({
      menuID: `${config.addonRef}-menuHelp`,
      pluginID: config.addonID,
      target: "main/menubar/help",
      menus: [
        {
          menuType: "menuitem",
          l10nID: `${config.addonRef}-menuHelp-openUserGuide`,
          icon: `chrome://${config.addonRef}/content/icons/favicon.png`,
          onCommand,
        },
      ],
    });
    return;
  }

  ztoolkit.Menu.unregister(`${config.addonRef}-menuHelp-openUserGuide`);
  ztoolkit.Menu.register("menuHelp", {
    tag: "menuitem",
    id: `${config.addonRef}-menuHelp-openUserGuide`,
    label: getString("menuHelp-openUserGuide"),
    commandListener: onCommand,
  });
}

async function showUserGuide(win: _ZoteroTypes.MainWindow, force = false) {
  if (!force && getPref("latestTourVersion") == LATEST_TOUR_VERSION) {
    return;
  }
  setPref("latestTourVersion", LATEST_TOUR_VERSION);

  const doc = win.document;
  let playgroundCollection: Zotero.Collection | null = null;

  const guide = new ztoolkit.Guide();

  guide.addStep({
    title: getString("userGuide-start-title"),
    description: guideStepDescription(
      "userGuide-start-desc",
      "classes.png",
      340,
    ),
    position: "center",
    showButtons: ["next", "close"],
    closeBtnText: getString("userGuide-start-close"),
    showProgress: true,
    onCloseClick: () => {
      clearPref("latestTourVersion");
    },
  });

  guide.addStep({
    title: getString("userGuide-collection-title"),
    description: getString("userGuide-collection-desc"),
    element: "#zotero-collections-tree",
    showButtons: ["prev", "next"],
    showProgress: true,
    onBeforeRender: async () => {
      win.Zotero_Tabs?.select("zotero-pane");
      playgroundCollection =
        await resolvePlaygroundCollection(playgroundCollection);
    },
  });

  guide.addStep({
    title: getString("userGuide-syllabusButton-title"),
    description: guideStepDescription(
      "userGuide-syllabusButton-desc",
      "module.png",
      300,
    ),
    element: "#syllabus-view-mode-syllabus",
    showButtons: ["prev", "next"],
    showProgress: true,
    onBeforeRender: async () => {
      win.Zotero_Tabs?.select("zotero-pane");
      playgroundCollection =
        await resolvePlaygroundCollection(playgroundCollection);
      await waitForElement(win, "#syllabus-view-mode-syllabus");
    },
    onExit: async () => {
      playgroundCollection =
        await resolvePlaygroundCollection(playgroundCollection);
      await enableSyllabusViewForTour(playgroundCollection);
    },
  });

  guide.addStep({
    title: getString("userGuide-addClass-title"),
    description: getString("userGuide-addClass-desc"),
    // Center so the coachmark stays readable while the empty state may reflow.
    position: "center",
    element: () =>
      doc.querySelector('[data-tour="syllabus-add-class"]') ||
      doc.documentElement!,
    showButtons: ["prev", "next"],
    showProgress: true,
    onMask: ({ mask }) => {
      const target = doc.querySelector('[data-tour="syllabus-add-class"]');
      if (target) {
        mask(target);
      }
    },
    onBeforeRender: async () => {
      requestTourCloseSettings(win);
      await waitForElement(win, '[data-tour="syllabus-add-class"]');
    },
    // Run on Next (while the tip is still visible), not onExit after hide —
    // otherwise the card vanishes and the action feels like it auto-skipped.
    onNextClick: async () => {
      playgroundCollection =
        await resolvePlaygroundCollection(playgroundCollection);
      await ensureTourClass(playgroundCollection, 1);
    },
  });

  guide.addStep({
    title: getString("userGuide-assign-title"),
    description: guideStepDescription(
      "userGuide-assign-desc",
      "drag-drop.gif",
      280,
    ),
    // Keep this teaching card centered — anchoring to Further reading (often
    // near the bottom) plus live DOM updates felt like skipped windows.
    position: "center",
    element: () =>
      doc.querySelector('[data-tour="syllabus-further-reading"]') ||
      doc.querySelector('[data-tour="syllabus-class-group"]') ||
      doc.documentElement!,
    showButtons: ["prev", "next"],
    showProgress: true,
    onMask: ({ mask }) => {
      const target =
        doc.querySelector('[data-tour="syllabus-further-reading"]') ||
        doc.querySelector('[data-tour="syllabus-class-group"]');
      if (target) {
        mask(target);
      }
    },
    onBeforeRender: async () => {
      requestTourCloseSettings(win);
      // Ensure class exists from the previous step, but do not assign yet —
      // let the user read this tip and click Next first.
      playgroundCollection =
        await resolvePlaygroundCollection(playgroundCollection);
      await waitForElement(
        win,
        () =>
          doc.querySelector('[data-tour="syllabus-further-reading"]') ||
          doc.querySelector('[data-tour="syllabus-class-group"]'),
      );
      await settleTourUi(200);
    },
    onNextClick: async () => {
      playgroundCollection =
        await resolvePlaygroundCollection(playgroundCollection);
      await ensureTourClassAndAssignment(playgroundCollection);
    },
  });

  guide.addStep({
    title: getString("userGuide-itemPane-title"),
    description: guideStepDescription(
      "userGuide-itemPane-desc",
      "editing.png",
      280,
    ),
    // Keep the panel centered — anchoring to the side/bottom item pane
    // often pushes Next/Done off-screen so users can't continue.
    position: "center",
    element: () =>
      doc.querySelector('[data-tour="syllabus-item-pane"]') ||
      doc.querySelector("#zotero-item-pane") ||
      doc.documentElement!,
    showButtons: ["prev", "next"],
    showProgress: true,
    onMask: ({ mask }) => {
      const target =
        doc.querySelector('[data-tour="syllabus-item-pane"]') ||
        doc.querySelector("#zotero-item-pane");
      if (target) {
        mask(target);
      }
    },
    onBeforeRender: async () => {
      requestTourCloseSettings(win);
      playgroundCollection =
        await resolvePlaygroundCollection(playgroundCollection);
      // Assignment happens on Next of the previous step — only select here.
      await selectTourAssignedItem(playgroundCollection);
      await waitForElement(
        win,
        () =>
          doc.querySelector('[data-tour="syllabus-item-pane"]') ||
          doc.querySelector("#zotero-item-pane"),
      );
      await settleTourUi(200);
    },
  });

  if (FEATURE_FLAG.READING_SCHEDULE) {
    guide.addStep({
      title: getString("userGuide-readingDate-title"),
      description: getString("userGuide-readingDate-desc"),
      position: "center",
      element: () =>
        doc.querySelector('[data-tour="syllabus-class-reading-date"]') ||
        doc.documentElement!,
      showButtons: ["prev", "next"],
      showProgress: true,
      onMask: ({ mask }) => {
        const target = doc.querySelector(
          '[data-tour="syllabus-class-reading-date"]',
        );
        if (target) {
          mask(target);
        }
      },
      onBeforeRender: async () => {
        // Show the tip immediately — no syllabus remount here (that caused a
        // glitchy flash). Setup + setting the date happen on Next.
        requestTourCloseSettings(win);
      },
      onNextClick: async () => {
        playgroundCollection =
          await resolvePlaygroundCollection(playgroundCollection);
        if (SyllabusManager.getCollectionViewMode() !== "syllabus") {
          await enableSyllabusViewForTour(playgroundCollection);
        } else {
          await selectPlaygroundCollection(playgroundCollection);
        }
        await ensureTourClassReadingDate(playgroundCollection, 1);
      },
    });

    guide.addStep({
      title: getString("userGuide-readingSchedule-title"),
      description: guideStepDescription(
        "userGuide-readingSchedule-desc",
        "reading.png",
        300,
      ),
      position: "center",
      element: () =>
        doc.querySelector("#syllabus-reading-schedule-tab-button") ||
        doc.documentElement!,
      showButtons: ["prev", "next"],
      showProgress: true,
      onMask: ({ mask }) => {
        const target = doc.querySelector(
          "#syllabus-reading-schedule-tab-button",
        );
        if (target) {
          mask(target);
        }
      },
      onBeforeRender: async () => {
        requestTourCloseSettings(win);
        // Date was just set on the previous Next — avoid remounting again.
        await waitForElement(
          win,
          () => doc.querySelector("#syllabus-reading-schedule-tab-button"),
          3000,
        );
      },
      onNextClick: async () => {
        SyllabusManager.openReadingListTab();
        await settleTourUi(400);
      },
    });
  }

  guide.addStep({
    title: getString("userGuide-subcollections-title"),
    description: getString("userGuide-subcollections-desc"),
    element: () =>
      doc.querySelector('[data-tour="syllabus-class-subcollections"]') ||
      doc.querySelector('[data-tour="syllabus-settings-button"]') ||
      doc.documentElement!,
    showButtons: ["prev", "next"],
    showProgress: true,
    onBeforeRender: async () => {
      win.Zotero_Tabs?.select("zotero-pane");
      playgroundCollection =
        await resolvePlaygroundCollection(playgroundCollection);
      // Settings live inside Syllabus view — switch back if we left for Items
      // or the Reading Schedule tab.
      await enableSyllabusViewForTour(playgroundCollection);
      requestTourOpenSettings(win);
      await waitForElement(win, '[data-tour="syllabus-class-subcollections"]');
    },
  });

  guide.addStep({
    title: getString("userGuide-finish-title"),
    description: guideStepDescription(
      "userGuide-finish-desc",
      "module.png",
      320,
    ),
    position: "center",
    showButtons: ["prev", "close"],
    showProgress: true,
    onBeforeRender: async () => {
      requestTourCloseSettings(win);
      await Zotero.Promise.delay(50);
    },
  });

  await guide.show(doc);
}
