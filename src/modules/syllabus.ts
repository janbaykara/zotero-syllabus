import slugify from "slugify";
/**
 * Syllabus Manager - Core functionality for syllabus view and metadata
 */

import { getLocaleID, getString, compareLocale } from "../utils/locale";
import { renderSyllabusPage } from "./SyllabusPage";
import { renderGalleryPage } from "./GalleryPage";
import { renderExplorerPage } from "./ExplorerPage";
import { setGalleryGroupBy } from "./galleryGroupBy";
import {
  getLibraryViewMode,
  setLibraryViewMode,
  toggleCollectionShelfOnHome,
  isCollectionShelfOnHome,
  getExplorerShelves,
  type LibraryViewMode,
} from "./explorerConfig";
import {
  getSelectedCollection,
  getSelectedLibraryID,
  itemBelongsInCollection,
  libraryIdForNewCollection,
} from "../utils/zotero";
import {
  getSelectedViewScope,
  viewScopeSupportsExplorer,
  viewScopeSupportsGallery,
} from "../utils/viewScope";
import { itemsViewIsFilteredForTreeViewID } from "./react-zotero-sync/itemsViewItems";
import { getCurrentTab, confirmPrompt } from "../utils/window";
import { renderComponent, unmountComponent } from "../utils/react";
import { ItemPane } from "./ItemPane";
import { h } from "preact";
import { uuidv7 } from "uuidv7";
import pluralize from "pluralize";
import { getPref } from "../utils/prefs";
import { ReadingSchedule } from "./ReadingSchedule";
import { MyAnnotationsPage } from "./MyAnnotationsPage";
import { parseXULTemplate } from "../utils/ui";
import { TabManager } from "../utils/tabManager";
import { FEATURE_FLAG } from "./featureFlags";
import {
  isPinnedItem,
  isPinnedSyllabus,
  PINNED_TAG,
  setPinnedItem,
  setPinnedSyllabus,
  unpinItemWithNotePrompt,
  notifyPinnedChanges,
} from "./pinned";
import {
  deleteGalleryNote,
  findGalleryNoteForCollection,
  initializeGalleryNotes,
  openGalleryNote,
  shutdownGalleryNotes,
} from "./galleryNote";
import {
  coerceEnabledViewMode,
  isOptionalFeatureEnabled,
  migrateOptionalFeatures,
  registerOptionalFeaturesChromeRefresh,
  registerOptionalFeaturesPrefObserver,
  unregisterOptionalFeaturesPrefObserver,
} from "./optionalFeatures";
import { getGlobalDefaultPriorities } from "./defaultPriorities";
import {
  ItemSyllabusDataEntity,
  ItemSyllabusAssignmentEntity,
  SettingsClassMetadataSchema,
  SettingsSyllabusMetadataSchema,
  ExportSyllabusMetadataSchema,
  DEFAULT_PRIORITIES,
  assignmentClassNumber,
  classByNumber,
  ensureClassRecord,
  findClassIdByNumber,
  getClassNumberById,
  insertClassAtIndex,
  orderedClassIds,
  shouldCreateSubcollections,
} from "../utils/schemas";
import * as z from "zod";
import { importRDF, getRDFStringForCollection, isRdfFile } from "../utils/rdf";
import {
  getCachedPref,
  getCachedCollection,
  getCachedCollectionById,
  getCachedCollectionByKey,
  zoteroCache,
} from "../utils/cache";
import {
  absorbSyllabusExtraFromItems,
  getCollectionDocument,
  getHydratedItemAssignments,
  getSyllabusCollectionDictionary,
  initializeSyllabusNotes,
  mergeItemAssignmentsInDocument,
  metadataFromDocument,
  mutateCollectionDocument,
  parseSyllabusNote,
  isSyllabusNoteFile,
  buildItemIndex,
  remapDocumentItemKeys,
  setCollectionDocumentMetadata,
  patchCollectionDocumentMetadata,
  setItemAssignmentsInDocument,
  shutdownSyllabusNotes,
  getClassSubcollectionContext,
  collectionHasSyllabusNote,
  ensureSyllabusNoteForUser,
  whenSyllabusNotesReady,
  registerSyllabusNoteDetachedHandler,
  countAssignmentsWithPriority,
  deletePriorityAndRemapAssignments,
  replacePrioritiesAndRemapAssignments,
  SYLLABUS_NOTE_TAG,
} from "./syllabusNote";
import { getItemTitle, readItemNote } from "../utils/items";
import { migrateLegacyCollectionMetadataPrefs } from "./migratePrefsToNotes";
import {
  getReadingScheduleCollectionContext,
  isManagedReadingScheduleCollection,
  enqueuePinnedReadingScheduleSync,
} from "./readingScheduleCollection";
import {
  getCollectionTreeKind,
  isAutoManagedCollection,
} from "./autoManagedCollection";
import {
  applyManagedCollectionTree,
  areCustomIconsEnabled,
  refreshManagedCollectionTrees,
  registerCustomIconsPrefObserver,
  unpatchManagedCollectionTree,
  unpatchManagedCollectionTreePrototype,
  unregisterCustomIconsPrefObserver,
} from "./managedCollectionTree";
import {
  removeManagedCollectionBanner,
  updateManagedCollectionBanner,
} from "./managedCollectionBanner";

enum SyllabusSettingsKey {
  COLLECTION_VIEW_MODES = "collectionViewModes",
}

export type CollectionViewMode =
  "collection" | "gallery" | "syllabus" | "explorer";

const COLLECTION_VIEW_MODES: CollectionViewMode[] = [
  "collection",
  "gallery",
  "syllabus",
];

const CollectionViewModeSchema = z.enum([
  "collection",
  "gallery",
  "syllabus",
  "explorer",
  // Legacy top-tier modes — coerced to gallery + galleryGroupBy
  "tags",
  "subcollections",
]);

/** Coerce legacy boolean prefs and validate string modes. */
function coerceCollectionViewMode(value: unknown): CollectionViewMode {
  if (value === true) return "syllabus";
  if (value === false || value === undefined || value === null) {
    return "collection";
  }
  const parsed = CollectionViewModeSchema.safeParse(value);
  if (!parsed.success) {
    return "collection";
  }
  if (parsed.data === "tags" || parsed.data === "subcollections") {
    return "gallery";
  }
  return parsed.data;
}

function migrateLegacyBrowseViewMode(
  collection: Zotero.Collection,
  stored: unknown,
): boolean {
  if (stored !== "tags" && stored !== "subcollections") {
    return false;
  }
  setGalleryGroupBy(collection.id, stored);
  return true;
}

const XUL_NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";

function isPinnedSyllabusNoteCandidate(item: Zotero.Item): boolean {
  try {
    return (
      item.isNote() &&
      item.isTopLevelItem() &&
      !item.deleted &&
      item.hasTag(SYLLABUS_NOTE_TAG)
    );
  } catch {
    return false;
  }
}

/** Label for the Syllabus/Checklist view radio, or null when that view is not available. */
function syllabusViewModeChrome(): { label: string; tooltip: string } | null {
  const collection = getSelectedCollection();
  if (!collection) {
    return null;
  }
  if (isAutoManagedCollection(collection.id)) {
    return {
      label: getString("view-tab-checklist"),
      tooltip: getString("view-tab-checklist-tooltip"),
    };
  }
  if (
    getCollectionTreeKind(collection.id) === "syllabus" ||
    collectionHasSyllabusNote(collection)
  ) {
    return {
      label: getString("view-tab-syllabus"),
      tooltip: getString("view-tab-syllabus-tooltip"),
    };
  }
  return null;
}

function createXulElement(doc: Document, tag: string, id: string): Element {
  const xulDoc = doc as Document & {
    createXULElement?: (tag: string) => Element;
  };
  const el = xulDoc.createXULElement
    ? xulDoc.createXULElement(tag)
    : doc.createElementNS(XUL_NS, tag);
  el.id = id;
  return el;
}

function confirmEnableSubcollections(
  collectionId: number | GetByLibraryAndKeyArgs,
): boolean {
  const cached = getCachedCollection(collectionId);
  const fetched =
    cached ||
    (typeof collectionId === "number"
      ? Zotero.Collections.get(collectionId)
      : Zotero.Collections.getByLibraryAndKey(...collectionId));
  const name = fetched
    ? fetched.name || getString("this-collection")
    : getString("this-collection");
  return confirmPrompt(
    getString("enable-subcollections-title"),
    getString("enable-subcollections-message", { args: { name } }),
  );
}

type GetByLibraryAndKeyArgs = Parameters<
  typeof Zotero.Collections.getByLibraryAndKey
>;

// Types are now inferred from Zod schemas in utils/schemas.ts
import type {
  ItemSyllabusAssignment,
  ItemSyllabusData,
  AssignmentStatus,
  ClassStatus,
  PrioritySchema,
  SettingsCollectionDictionaryData,
  SettingsSyllabusMetadata,
  SettingsClassMetadata,
  Priority,
} from "../utils/schemas";
import { installReadingListTranslators } from "../utils/translator";
import {
  registerSyllabusClassInstructionColumn,
  registerSyllabusStatusColumn,
  registerReadingTimeColumn,
  registerSyllabusInfoColumn,
} from "./syllabusColumns";

function resolveAssignmentClassNumber(
  assignment: ItemSyllabusAssignment,
  collectionId?: number | GetByLibraryAndKeyArgs,
): number | undefined {
  if (collectionId === undefined) {
    return assignment.classNumber;
  }
  const document = getCollectionDocument(collectionId);
  return assignmentClassNumber(
    assignment,
    document.classes,
    document.classOrder,
  );
}

// Re-export for backward compatibility with other modules
export type {
  ItemSyllabusAssignment,
  ItemSyllabusData,
  AssignmentStatus,
  ClassStatus,
  PrioritySchema,
  SettingsCollectionDictionaryData,
  SettingsSyllabusMetadata,
  SettingsClassMetadata,
};
export { classByNumber } from "../utils/schemas";

// Export GetByLibraryAndKeyArgs for use in other modules
export type { GetByLibraryAndKeyArgs };

// All types are now inferred from Zod schemas in utils/schemas.ts

const tabManager = FEATURE_FLAG.READING_SCHEDULE
  ? new TabManager<Record<string, never>>({
      type: "reading-list",
      title: () => getString("view-tab-reading-schedule"),
      rootElementIdFactory: () => "reading-list-tab-root",
      data: () => (areCustomIconsEnabled() ? { icon: "calendar" } : {}),
      componentFactory: () => h(ReadingSchedule, { libraryID: undefined }),
      getTabId: () => "syllabus-reading-list-tab",
    })
  : null;

const myAnnotationsTabManager = new TabManager<{ libraryID: number }>({
  type: "my-annotations",
  title: () => getString("view-tab-my-annotations"),
  rootElementIdFactory: (p) => `my-annotations-tab-root-${p?.libraryID ?? 0}`,
  // Reader sidebar Annotations stack (same asset as item-pane attachment-annotations).
  data: () => ({ icon: "attachment-annotations" }),
  componentFactory: (p) => h(MyAnnotationsPage, { libraryID: p!.libraryID }),
  getTabId: (p) => `syllabus-my-annotations-tab-${p?.libraryID ?? 0}`,
});

export class SyllabusManager {
  static notifierID: string | null = null;
  static syllabusItemPaneSection: false | string | null = null;
  static readingsTabPanelID: string | null = null;

  static readingScheduleTab = tabManager;
  static myAnnotationsTab = myAnnotationsTabManager;

  static settingsKeys = SyllabusSettingsKey;
  static getPreferenceKey(key: SyllabusSettingsKey): string {
    return `${addon.data.config.prefsPrefix}.${key}`;
  }

  /**
   * Normalize collection identifier to library ID and key
   * Accepts either a numeric collection ID or GetByLibraryAndKeyArgs tuple
   * Returns an object with libraryID and key, or null if collection not found
   */
  static normalizeCollectionIdentifier(
    collectionId: number | GetByLibraryAndKeyArgs,
  ): { libraryID: number; key: string } | null {
    // If it's already a tuple [libraryID, key]
    if (Array.isArray(collectionId) && collectionId.length === 2) {
      const [libraryID, key] = collectionId;
      return { libraryID, key };
    }

    // If it's a number, get the collection and extract libraryID and key
    if (typeof collectionId === "number") {
      const collection = getCachedCollectionById(collectionId);
      if (!collection) {
        return null;
      }
      return {
        libraryID: collection.libraryID,
        key: collection.key,
      };
    }

    return null;
  }

  /**
   * Get collection reference string in format `${libraryID}:${key}`
   * Used as the key for storing collection metadata and item syllabus data
   */
  static getCollectionReferenceString(libraryID: number, key: string): string {
    return `${libraryID}:${key}`;
  }

  /**
   * Get collection object from identifier
   * Accepts either a numeric collection ID or GetByLibraryAndKeyArgs tuple
   */
  static getCollectionFromIdentifier(
    collectionId: number | GetByLibraryAndKeyArgs,
  ): Zotero.Collection | null {
    const collection = getCachedCollection(collectionId);
    return collection || null;
  }

  /**
   * Map Zotero item type to icon name
   */
  static getItemTypeIconName(itemType: string): string {
    // Map item types to icon names
    const iconMap: Record<string, string> = {
      book: "book",
      bookSection: "book",
      journalArticle: "article",
      article: "article",
      magazineArticle: "article",
      newspaperArticle: "article",
      webpage: "web",
      website: "web",
      blogPost: "web",
      videoRecording: "video",
      audioRecording: "audio",
      film: "video",
      tvBroadcast: "video",
      thesis: "document",
      report: "document",
      document: "document",
      letter: "letter",
      email: "email",
      interview: "interview",
      conferencePaper: "paper",
      presentation: "presentation",
      patent: "patent",
      map: "map",
      artwork: "artwork",
      software: "software",
      dataset: "dataset",
    };

    return iconMap[itemType] || "document";
  }

  static SYLLABUS_DATA_KEY = "syllabus";

  static SYLLABUS_CLASS_NUMBER_FIELD = "syllabus-class-number";

  static onStartup(rootURI: string) {
    ztoolkit.log("SyllabusManager.onStartup");
    initializeSyllabusNotes();
    initializeGalleryNotes();
    // Chrome refresh when the selected collection's syllabus note is removed.
    registerSyllabusNoteDetachedHandler((collectionRef) => {
      // Defer past the item save/notifier stack.
      Zotero.Promise.delay(0)
        .then(() => {
          SyllabusManager.onSyllabusNoteDetached(collectionRef);
        })
        .catch((error: unknown) => {
          Zotero.debug(
            `Error handling syllabus note removal: ${String(error)}`,
          );
        });
    });
    void migrateLegacyCollectionMetadataPrefs().catch((error) => {
      ztoolkit.log(
        "Error migrating collectionMetadata prefs to syllabus notes:",
        error,
      );
    });
    this.registerPrefs();
    registerOptionalFeaturesChromeRefresh(() => {
      this.refreshOptionalFeatureChrome();
    });
    migrateOptionalFeatures();
    registerOptionalFeaturesPrefObserver();
    registerCustomIconsPrefObserver(() => {
      for (const win of Zotero.getMainWindows() as _ZoteroTypes.MainWindow[]) {
        this.syncReadingScheduleTabIcon(win);
      }
    });
    this.registerNotifier();
    this.registerSyllabusInfoColumn();
    this.registerSyllabusClassInstructionColumn();
    this.registerSyllabusStatusColumn();
    this.registerReadingTimeColumn();
    this.registerSyllabusItemPaneSection();

    Zotero.Promise.delay(10000).then(() => {
      installReadingListTranslators(rootURI);
    });
  }

  /** Rebuild view chrome after optional-feature prefs change. */
  static refreshOptionalFeatureChrome(): void {
    for (const win of Zotero.getMainWindows() as _ZoteroTypes.MainWindow[]) {
      if (!isOptionalFeatureEnabled("readingSchedule")) {
        try {
          const existing = win.Zotero_Tabs?._getTab(
            "syllabus-reading-list-tab",
          );
          if (existing?.tab) {
            win.Zotero_Tabs.close("syllabus-reading-list-tab");
          }
        } catch {
          // Tab may not exist
        }
        this.removeReadingScheduleTabBarButton(win);
      }
      if (!isOptionalFeatureEnabled("annotations")) {
        try {
          const tabs = win.Zotero_Tabs?._tabs || [];
          for (const tab of [...tabs]) {
            if (
              typeof tab?.id === "string" &&
              tab.id.startsWith("syllabus-my-annotations-tab-")
            ) {
              win.Zotero_Tabs.close(tab.id);
            }
          }
        } catch {
          // Tabs may not exist
        }
        this.removeMyAnnotationsTabBarButton(win);
      }
    }
    const mode = this.getCollectionViewMode();
    const coerced = coerceEnabledViewMode(mode) as CollectionViewMode;
    if (coerced !== mode) {
      void this.setCollectionViewMode(coerced).then(() => {
        this.setupToggleButton();
        void this.setupPage();
      });
      return;
    }
    this.setupToggleButton();
    void this.setupPage();
  }

  static onMainWindowLoad(win: _ZoteroTypes.MainWindow) {
    ztoolkit.log("SyllabusManager.onMainWindowLoad", win);
    this.registerContextualMenus();
    this.setupUI();
    this.setupSyllabusViewTabListener();
    this.setupSyllabusViewReloadListener();
    applyManagedCollectionTree(win);
    this.syncReadingScheduleTabIcon(win);
    this.syncMyAnnotationsTabIcon(win);
    void whenSyllabusNotesReady().then(() => {
      applyManagedCollectionTree(win);
      refreshManagedCollectionTrees();
      this.syncReadingScheduleTabIcon(win);
      this.syncMyAnnotationsTabIcon(win);
      this.setupToggleButton();
    });

    // Re-render reading list tab if it exists (for hot reload)
    // Use a small delay to ensure tabs are initialized
    Zotero.Promise.delay(100).then(() => {
      applyManagedCollectionTree(win);
      this.syncReadingScheduleTabIcon(win);
      this.syncMyAnnotationsTabIcon(win);
      if (this.readingScheduleTab) {
        ztoolkit.log(
          "SyllabusManager.onMainWindowLoad: bind reading schedule if selected",
        );
        this.readingScheduleTab.invalidateMount();
        if (win.Zotero_Tabs?.selectedID === "syllabus-reading-list-tab") {
          this.readingScheduleTab.ensureRendered(win);
        }
      }
      ztoolkit.log(
        "SyllabusManager.onMainWindowLoad: rerendering My Annotations tabs",
      );
      this.myAnnotationsTab.renderAllTabs(win);
    });
  }

  /** Use Zotero's reader/item-pane annotations stack for My Annotations tabs. */
  static syncMyAnnotationsTabIcon(win: _ZoteroTypes.MainWindow): void {
    try {
      const tabs = win.Zotero_Tabs;
      let changed = false;
      for (const tab of tabs._tabs) {
        if (
          tab.type === "my-annotations" &&
          tab.data?.icon !== "attachment-annotations"
        ) {
          tab.data = {
            ...tab.data,
            icon: "attachment-annotations",
          };
          changed = true;
        }
      }
      if (changed) {
        tabs._update();
      }
    } catch (error) {
      ztoolkit.log("Error updating My Annotations tab icon:", error);
    }
  }

  static syncReadingScheduleTabIcon(win: _ZoteroTypes.MainWindow): void {
    try {
      const tabs = win.Zotero_Tabs as typeof win.Zotero_Tabs & {
        _tabBarRef?: {
          current?: {
            setTabs: (tabs: unknown[]) => void;
            _syllabusSetTabsPatched?: boolean;
            _syllabusOriginalSetTabs?: (tabs: unknown[]) => void;
          };
        };
      };
      if (!areCustomIconsEnabled()) {
        this.unpatchReadingScheduleTabBar(win);
        try {
          const existing = tabs._getTab("syllabus-reading-list-tab");
          if (existing?.tab?.data?.icon === "calendar") {
            const { icon: _icon, ...rest } = existing.tab.data;
            existing.tab.data = rest;
            tabs._update();
          }
        } catch {
          // Reading schedule tab may not exist
        }
        return;
      }
      const bar = tabs._tabBarRef?.current;
      if (bar && !bar._syllabusSetTabsPatched) {
        const original = bar.setTabs.bind(bar);
        bar._syllabusOriginalSetTabs = original;
        bar._syllabusSetTabsPatched = true;
        bar.setTabs = (list: unknown[]) => {
          original(
            list.map((tab) => {
              const t = tab as { id?: string; isItemType?: boolean };
              return t.id === "syllabus-reading-list-tab"
                ? { ...t, isItemType: false }
                : tab;
            }),
          );
        };
      }
      const existing = tabs._getTab("syllabus-reading-list-tab");
      const iconChanged =
        !!existing?.tab && existing.tab.data?.icon !== "calendar";
      if (iconChanged && existing?.tab) {
        existing.tab.data = { ...existing.tab.data, icon: "calendar" };
        tabs._update();
        this.readingScheduleTab?.renderAllTabs(win);
      }
    } catch (error) {
      ztoolkit.log("Error updating Reading Schedule tab icon:", error);
    }
  }

  static unpatchReadingScheduleTabBar(win: _ZoteroTypes.MainWindow): void {
    try {
      const tabs = win.Zotero_Tabs as typeof win.Zotero_Tabs & {
        _tabBarRef?: {
          current?: {
            setTabs: (tabs: unknown[]) => void;
            _syllabusSetTabsPatched?: boolean;
            _syllabusOriginalSetTabs?: (tabs: unknown[]) => void;
          };
        };
      };
      const bar = tabs._tabBarRef?.current;
      if (!bar?._syllabusOriginalSetTabs) {
        return;
      }
      bar.setTabs = bar._syllabusOriginalSetTabs;
      delete bar._syllabusOriginalSetTabs;
      delete bar._syllabusSetTabsPatched;
      tabs._update();
    } catch (error) {
      ztoolkit.log("Error unpatching Reading Schedule tab bar:", error);
    }
  }

  static registerContextualMenus() {
    this.setupContextMenuSetPriority();
    this.setupContextMenuSetClassNumber();
    this.setupContextMenuSetStatus();
    this.setupContextMenuPinned();
    this.setupContextMenuGalleryNote();
    this.setupContextMenuAddCollectionShelf();
  }

  static onNotify(
    event: string,
    type: string,
    ids: (string | number)[],
    extraData: { [key: string]: any },
  ) {
    ztoolkit.log("SyllabusManager.onNotify", { event, type, ids, extraData });
  }

  static onItemUpdate(
    item: Zotero.Item,
    source: "page" | "item-pane" | "context-menu" | "background",
  ) {
    ztoolkit.log("SyllabusManager.onItemUpdate", source, item.id);
    // No need to call setupPage() - React stores will trigger re-render automatically
    // if (source !== "item-pane") this.reloadItemPane();
    // Class numbers are stored in the items, so we need to update the context menu
    this.onClassListUpdate();
  }

  /**
   * E.g. the class title or description has been updated
   */
  static onClassUpdate(classNumber: number, source: "page") {
    ztoolkit.log("SyllabusManager.onClassUpdate", classNumber, source);
    // No need to call setupPage() - React stores will trigger re-render automatically
    this.onClassListUpdate();
  }

  static onClassListUpdate() {
    ztoolkit.log("SyllabusManager.onClassListUpdate");
    this.registerContextualMenus();
  }

  /**
   * E.g. the description of the collection has been updated
   */
  static onCollectionUpdated(
    collection: Zotero.Collection,
    source: "page" | "background",
    reason: string,
  ) {
    ztoolkit.log(
      "SyllabusManager.onCollectionUpdated",
      reason,
      source,
      collection,
    );
    // No need to call setupPage() - React stores will trigger re-render automatically
  }

  static onMainWindowUnload(win: _ZoteroTypes.MainWindow) {
    ztoolkit.log("SyllabusManager.onMainWindowUnload", win);
    unpatchManagedCollectionTree(win);
    removeManagedCollectionBanner(win);
    this.unpatchReadingScheduleTabBar(win);
    this.setupUI();
    this.removeReadingScheduleTabBarButton?.(win);
    this.cleanupSyllabusViewTabListener();
    if (this.readingScheduleTab) {
      this.readingScheduleTab.cleanupAll();
    }
    this.myAnnotationsTab.cleanupAll();
  }

  static onShutdown() {
    ztoolkit.log("SyllabusManager.onShutdown");
    unregisterOptionalFeaturesPrefObserver();
    unregisterCustomIconsPrefObserver();
    this.unregisterNotifier();
    for (const mainWindow of Zotero.getMainWindows() as _ZoteroTypes.MainWindow[]) {
      this.removeReadingScheduleTabBarButton?.(mainWindow);
      this.unpatchReadingScheduleTabBar(mainWindow);
      unpatchManagedCollectionTree(mainWindow);
      removeManagedCollectionBanner(mainWindow);
    }
    unpatchManagedCollectionTreePrototype();
    shutdownSyllabusNotes();
    shutdownGalleryNotes();
  }

  static registerNotifier() {
    // Notifier registration removed - using React stores for updates
  }

  static unregisterNotifier() {
    if (this.notifierID) {
      Zotero.Notifier.unregisterObserver(this.notifierID);
      this.notifierID = null;
    }
  }

  static registerPrefs() {
    Zotero.PreferencePanes.register({
      pluginID: addon.data.config.addonID,
      src: rootURI + "content/preferences.xhtml",
      label: getString("app-name"),
      image: `chrome://${addon.data.config.addonRef}/content/icons/favicon.png`,
      stylesheets: [rootURI + "content/preferences.css"],
    });
  }

  // Listen for tab changes and refresh syllabus view
  // Initial setup
  static syllabusViewTabListener: NodeJS.Timeout | null = null;

  static setupSyllabusViewTabListener() {
    this.cleanupSyllabusViewTabListener();
    ztoolkit.log("SyllabusManager.setupSyllabusViewTabListener");
    let selectedViewKey = getSelectedViewScope().viewKey;
    let currentTabId = Zotero.getMainWindow()?.Zotero_Tabs?.selectedID || "";
    let libraryItemsFiltered =
      viewScopeSupportsExplorer(getSelectedViewScope()) &&
      itemsViewIsFilteredForTreeViewID(selectedViewKey);
    const interval = setInterval(async () => {
      const scope = getSelectedViewScope();
      const currentViewKey = scope.viewKey;
      const newTabId = Zotero.getMainWindow()?.Zotero_Tabs?.selectedID || "";
      const nextLibraryItemsFiltered =
        viewScopeSupportsExplorer(scope) &&
        itemsViewIsFilteredForTreeViewID(currentViewKey);

      SyllabusManager.updateReadingScheduleTabBarButton();
      SyllabusManager.updateMyAnnotationsTabBarButton();

      const collectionChanged = currentViewKey !== selectedViewKey;
      const tabChanged = newTabId !== currentTabId;
      const libraryFilterChanged =
        nextLibraryItemsFiltered !== libraryItemsFiltered;

      if (collectionChanged) {
        ztoolkit.log("Selected collection changed", currentViewKey || "none");
        selectedViewKey = currentViewKey;
        currentTabId = newTabId; // Update tab ID when collection changes
        libraryItemsFiltered = nextLibraryItemsFiltered;
        // setupUI() calls setupPage() which re-renders React component for new collection
        // Once mounted, React stores handle all data updates automatically
        SyllabusManager.setupUI();
        // Update button visibility when collection changes
        SyllabusManager.updateButtonVisibility();
        // Reload context menus for the new collection
        SyllabusManager.registerContextualMenus();
      } else if (libraryFilterChanged) {
        libraryItemsFiltered = nextLibraryItemsFiltered;
        // Home → Table while searching; restore Home when the filter clears.
        SyllabusManager.setupUI();
        SyllabusManager.updateButtonVisibility();
      } else if (tabChanged) {
        ztoolkit.log("Tab changed", newTabId);
        currentTabId = newTabId;
        // Update button visibility when tab changes
        SyllabusManager.updateButtonVisibility();
        if (newTabId === "syllabus-reading-list-tab") {
          SyllabusManager.readingScheduleTab?.ensureRendered(
            Zotero.getMainWindow(),
          );
        }
      }
    }, 300);
    this.syllabusViewTabListener = interval;
  }

  static setupSyllabusViewReloadListener() {
    // Re-sync custom view when collection or sort changes. Prefer setupPage
    // only — full setupUI() rebuilds the toolbar and reloads the item pane,
    // which flashes the syllabus on every ZoteroPane reload.
    const pane = ztoolkit.getGlobal("ZoteroPane");
    if (pane) {
      pane.addReloadListener(() => {
        Zotero.Promise.delay(100).then(() => {
          void SyllabusManager.setupPage();
        });
      });
    }
  }

  static cleanupSyllabusViewTabListener() {
    if (this.syllabusViewTabListener) {
      clearInterval(this.syllabusViewTabListener);
      this.syllabusViewTabListener = null;
    }
  }

  static async setupUI(): Promise<void> {
    ztoolkit.log("Setting up syllabus view");
    SyllabusManager.setupToggleButton();
    // setupPage() renders the React component for the current collection
    // After initial render, React stores handle all updates automatically
    SyllabusManager.setupPage();
    // Also reload ItemPane for hot reload support
    SyllabusManager.reloadItemPane();
  }

  // Function to get/set collection pane view mode (per collection)
  static getCollectionViewMode(): CollectionViewMode {
    const scope = getSelectedViewScope();
    if (viewScopeSupportsExplorer(scope)) {
      const libraryID = scope.libraryID || libraryIdForNewCollection();
      // Searching/filtering hides Home shelves so the items tree is visible.
      // Do not persist — clearing the filter restores explorer if preferred.
      if (
        getLibraryViewMode(libraryID) === "explorer" &&
        !itemsViewIsFilteredForTreeViewID(scope.viewKey) &&
        isOptionalFeatureEnabled("explorer")
      ) {
        return "explorer";
      }
      return "collection";
    }
    if (!viewScopeSupportsGallery(scope)) {
      return "collection";
    }

    if (scope.kind === "collection") {
      const selectedCollection = scope.collection;
      if (getReadingScheduleCollectionContext(selectedCollection.id)) {
        return isOptionalFeatureEnabled("syllabus") ? "syllabus" : "collection";
      }

      const collectionId = scope.viewKey;
      const prefKey = SyllabusManager.getPreferenceKey(
        SyllabusSettingsKey.COLLECTION_VIEW_MODES,
      );
      const viewModes =
        getCachedPref(prefKey, z.record(z.string(), z.unknown())) || {};

      const stored = viewModes[collectionId];
      if (migrateLegacyBrowseViewMode(selectedCollection, stored)) {
        viewModes[collectionId] = "gallery";
        Zotero.Prefs.set(prefKey, JSON.stringify(viewModes), true);
        zoteroCache.invalidatePref(prefKey);
        return isOptionalFeatureEnabled("gallery") ? "gallery" : "collection";
      }
      if (stored !== undefined && stored !== null) {
        return SyllabusManager.coerceViewModeForCollection(
          selectedCollection,
          stored,
        );
      }
      const classContext = getClassSubcollectionContext(selectedCollection);
      if (classContext) {
        const parentStored = viewModes[String(classContext.parent.id)];
        if (parentStored !== undefined && parentStored !== null) {
          return SyllabusManager.coerceViewModeForCollection(
            selectedCollection,
            parentStored,
          );
        }
      }
      if (isAutoManagedCollection(selectedCollection.id)) {
        return isOptionalFeatureEnabled("syllabus") ? "syllabus" : "collection";
      }
      return "collection";
    }

    const prefKey = SyllabusManager.getPreferenceKey(
      SyllabusSettingsKey.COLLECTION_VIEW_MODES,
    );
    const viewModes =
      getCachedPref(prefKey, z.record(z.string(), z.unknown())) || {};
    const mode = coerceCollectionViewMode(viewModes[scope.viewKey]);
    const resolved =
      mode === "syllabus" || mode === "explorer" ? "collection" : mode;
    return coerceEnabledViewMode(resolved) as CollectionViewMode;
  }

  static coerceViewModeForCollection(
    _collection: Zotero.Collection,
    value: unknown,
  ): CollectionViewMode {
    const mode = coerceCollectionViewMode(value);
    const withoutExplorer = mode === "explorer" ? "collection" : mode;
    return coerceEnabledViewMode(withoutExplorer) as CollectionViewMode;
  }

  static async setCollectionViewMode(mode: CollectionViewMode): Promise<void> {
    const enabledMode = coerceEnabledViewMode(mode) as CollectionViewMode;
    const scope = getSelectedViewScope();
    if (viewScopeSupportsExplorer(scope)) {
      if (enabledMode === "explorer" || enabledMode === "collection") {
        const libraryID = scope.libraryID || libraryIdForNewCollection();
        setLibraryViewMode(libraryID, enabledMode as LibraryViewMode);
      }
      return;
    }
    if (enabledMode === "explorer" || !viewScopeSupportsGallery(scope)) {
      return;
    }

    if (enabledMode === "syllabus") {
      if (scope.kind !== "collection") {
        return;
      }
      const enabled = await ensureSyllabusNoteForUser(scope.collection);
      if (!enabled) {
        return;
      }
      this.writeCollectionViewMode(scope.collection, enabledMode);
      return;
    }

    if (scope.kind === "collection") {
      this.writeCollectionViewMode(scope.collection, enabledMode);
      return;
    }

    this.writeViewModeForKey(scope.viewKey, enabledMode);
  }

  static writeViewModeForKey(viewKey: string, mode: CollectionViewMode): void {
    if (!viewKey) {
      return;
    }
    const prefKey = SyllabusManager.getPreferenceKey(
      SyllabusSettingsKey.COLLECTION_VIEW_MODES,
    );
    const viewModes =
      getCachedPref(prefKey, z.record(z.string(), z.unknown())) || {};

    viewModes[viewKey] = mode;
    Zotero.Prefs.set(prefKey, JSON.stringify(viewModes), true);
    zoteroCache.invalidatePref(prefKey);
  }

  static writeCollectionViewMode(
    selectedCollection: Zotero.Collection,
    mode: CollectionViewMode,
  ): void {
    this.writeViewModeForKey(String(selectedCollection.id), mode);
  }

  static async cycleCollectionViewMode(): Promise<CollectionViewMode> {
    const scope = getSelectedViewScope();
    if (viewScopeSupportsExplorer(scope)) {
      const current = SyllabusManager.getCollectionViewMode();
      const next =
        current === "explorer" || !isOptionalFeatureEnabled("explorer")
          ? "collection"
          : "explorer";
      await SyllabusManager.setCollectionViewMode(next);
      return SyllabusManager.getCollectionViewMode();
    }
    let modes = syllabusViewModeChrome()
      ? COLLECTION_VIEW_MODES
      : COLLECTION_VIEW_MODES.filter((mode) => mode !== "syllabus");
    modes = modes.filter((mode) => {
      if (mode === "collection") return true;
      if (mode === "gallery") return isOptionalFeatureEnabled("gallery");
      if (mode === "syllabus") return isOptionalFeatureEnabled("syllabus");
      return true;
    });
    if (modes.length === 1) {
      return SyllabusManager.getCollectionViewMode();
    }
    const current = SyllabusManager.getCollectionViewMode();
    const index = Math.max(0, modes.indexOf(current));
    const next = modes[(index + 1) % modes.length];
    await SyllabusManager.setCollectionViewMode(next);
    return SyllabusManager.getCollectionViewMode();
  }

  /** @deprecated Use getCollectionViewMode() === "syllabus" */
  static getSyllabusPageVisible(): boolean {
    return SyllabusManager.getCollectionViewMode() === "syllabus";
  }

  /** @deprecated Use setCollectionViewMode() */
  static setSyllabusPageVisible(enabled: boolean): void {
    void SyllabusManager.setCollectionViewMode(
      enabled ? "syllabus" : "collection",
    );
  }

  static removeReadingScheduleTabBarButton(
    win?: _ZoteroTypes.MainWindow,
  ): void {
    win = win || Zotero.getMainWindow();
    const doc = win?.document;
    if (!doc) return;
    for (const el of Array.from(
      doc.querySelectorAll(
        "#syllabus-reading-schedule-tab-button, #syllabus-reading-schedule-button, #syllabus-collection-reading-schedule-button",
      ),
    ) as Element[]) {
      el.remove();
    }
  }

  static removeMyAnnotationsTabBarButton(win?: _ZoteroTypes.MainWindow): void {
    win = win || Zotero.getMainWindow();
    const doc = win?.document;
    if (!doc) return;
    for (const el of Array.from(
      doc.querySelectorAll("#syllabus-my-annotations-tab-button"),
    ) as Element[]) {
      el.remove();
    }
  }

  static setupMyAnnotationsTabBarButton(win?: _ZoteroTypes.MainWindow): void {
    win = win || Zotero.getMainWindow();
    const doc = win.document;
    SyllabusManager.removeMyAnnotationsTabBarButton(win);
    if (!isOptionalFeatureEnabled("annotations")) {
      return;
    }

    const tabsToolbar = doc.getElementById("zotero-tabs-toolbar");
    const tabsMenu = doc.getElementById("zotero-tb-tabs-menu");
    const readingScheduleButton = doc.getElementById(
      "syllabus-reading-schedule-tab-button",
    );
    if (!tabsToolbar) return;

    const tooltip = getString("toolbar-my-annotations-open");
    const button = ztoolkit.UI.createElement(doc, "toolbarbutton", {
      id: "syllabus-my-annotations-tab-button",
      classList: ["zotero-tb-button", "syllabus-tab-bar-button"],
      attributes: {
        crop: "none",
        tooltiptext: tooltip,
        image: "chrome://zotero/skin/16/universal/attachment-annotations.svg",
      },
      properties: {
        label: getString("view-tab-my-annotations"),
        tooltiptext: tooltip,
      },
      listeners: [
        {
          type: "command",
          listener: () => {
            SyllabusManager.openMyAnnotationsTabForCurrentLibrary();
          },
        },
        {
          type: "click",
          listener: () => {
            SyllabusManager.openMyAnnotationsTabForCurrentLibrary();
          },
        },
      ],
    });

    if (
      readingScheduleButton &&
      readingScheduleButton.parentNode === tabsToolbar
    ) {
      tabsToolbar.insertBefore(button, readingScheduleButton);
    } else if (tabsMenu && tabsMenu.parentNode === tabsToolbar) {
      tabsToolbar.insertBefore(button, tabsMenu);
    } else {
      tabsToolbar.insertBefore(button, tabsToolbar.firstChild);
    }
    SyllabusManager.updateMyAnnotationsTabBarButton(win);
  }

  static updateMyAnnotationsTabBarButton(win?: _ZoteroTypes.MainWindow): void {
    win = win || Zotero.getMainWindow();
    const button = win?.document.getElementById(
      "syllabus-my-annotations-tab-button",
    );
    if (!button) return;
    let tabOpen = false;
    try {
      const libraryID =
        getSelectedLibraryID() ?? Zotero.Libraries.userLibraryID;
      tabOpen = !!win.Zotero_Tabs?._getTab(
        `syllabus-my-annotations-tab-${libraryID}`,
      )?.tab;
    } catch {
      // Keep false when the tab lookup fails.
    }
    button.setAttribute("data-tab-open", tabOpen ? "true" : "false");
  }

  static setupReadingScheduleTabBarButton(win?: _ZoteroTypes.MainWindow): void {
    win = win || Zotero.getMainWindow();
    const doc = win.document;
    SyllabusManager.removeReadingScheduleTabBarButton(win);
    if (
      !FEATURE_FLAG.READING_SCHEDULE ||
      !isOptionalFeatureEnabled("readingSchedule")
    ) {
      return;
    }

    const tabsToolbar = doc.getElementById("zotero-tabs-toolbar");
    const tabsMenu = doc.getElementById("zotero-tb-tabs-menu");
    if (!tabsToolbar) return;

    const tooltip = getString("toolbar-reading-schedule-open");
    const button = ztoolkit.UI.createElement(doc, "toolbarbutton", {
      id: "syllabus-reading-schedule-tab-button",
      classList: ["zotero-tb-button", "syllabus-tab-bar-button"],
      attributes: {
        crop: "none",
        tooltiptext: tooltip,
        image: "chrome://syllabus/content/icons/calendar.svg",
      },
      properties: {
        label: getString("view-tab-reading-schedule"),
        tooltiptext: tooltip,
      },
      listeners: [
        {
          type: "command",
          listener: () => {
            SyllabusManager.openReadingListTab();
          },
        },
      ],
    });

    if (tabsMenu && tabsMenu.parentNode === tabsToolbar) {
      tabsToolbar.insertBefore(button, tabsMenu);
    } else {
      tabsToolbar.insertBefore(button, tabsToolbar.firstChild);
    }
    SyllabusManager.updateReadingScheduleTabBarButton(win);
  }

  static updateReadingScheduleTabBarButton(
    win?: _ZoteroTypes.MainWindow,
  ): void {
    win = win || Zotero.getMainWindow();
    const button = win?.document.getElementById(
      "syllabus-reading-schedule-tab-button",
    );
    if (!button) return;
    let tabOpen = false;
    try {
      tabOpen = !!win.Zotero_Tabs?._getTab("syllabus-reading-list-tab")?.tab;
    } catch {
      // Keep false when the tab lookup fails.
    }
    button.setAttribute("data-tab-open", tabOpen ? "true" : "false");
  }

  static async applyCollectionViewModeFromToolbar(
    mode: CollectionViewMode,
  ): Promise<void> {
    await SyllabusManager.setCollectionViewMode(mode);
    SyllabusManager.updateViewModeButtons();
    SyllabusManager.updateButtonVisibility();
    await SyllabusManager.setupPage();
  }

  // Function to create/update the view-mode radio control
  static setupToggleButton() {
    const w = Zotero.getMainWindow();
    const doc = w.document;

    SyllabusManager.setupReadingScheduleTabBarButton(w);
    SyllabusManager.setupMyAnnotationsTabBarButton(w);

    // Find the items toolbar
    const itemsToolbar = doc.getElementById("zotero-items-toolbar");
    if (!itemsToolbar) return;

    // Find the search spinner to insert before it
    const searchSpinner = doc.getElementById("zotero-tb-search-spinner");

    // Remove legacy / duplicate toolbar controls (IDs can be duplicated after hot reload)
    for (const el of Array.from(
      doc.querySelectorAll(
        [
          "#syllabus-view-toggle",
          "#syllabus-view-mode-group",
          "#syllabus-view-mode-cluster",
          "#syllabus-view-spacer",
          "#syllabus-view-spacer-start",
          "#syllabus-view-spacer-end",
          "#syllabus-create-syllabus-button",
          ".syllabus-view-mode-button",
        ].join(", "),
      ),
    ) as Element[]) {
      el.remove();
    }

    const syllabusChrome = isOptionalFeatureEnabled("syllabus")
      ? syllabusViewModeChrome()
      : null;
    const viewModeOptions: {
      mode: CollectionViewMode;
      label: string;
      tooltip: string;
    }[] = [
      {
        mode: "collection",
        label: getString("view-tab-table"),
        tooltip: getString("view-tab-table-tooltip"),
      },
    ];
    if (isOptionalFeatureEnabled("gallery")) {
      viewModeOptions.push({
        mode: "gallery",
        label: getString("view-tab-gallery"),
        tooltip: getString("view-tab-gallery-tooltip"),
      });
    }
    if (isOptionalFeatureEnabled("explorer")) {
      viewModeOptions.push({
        mode: "explorer",
        label: getString("view-tab-explorer"),
        tooltip: getString("view-tab-explorer-tooltip"),
      });
    }
    if (isOptionalFeatureEnabled("syllabus")) {
      viewModeOptions.push({
        mode: "syllabus",
        ...(syllabusChrome ?? {
          label: getString("view-tab-syllabus"),
          tooltip: getString("view-tab-syllabus-tooltip"),
        }),
      });
    }

    // Never show a lone Table radio — only build radios when another view exists.
    const showViewRadios = viewModeOptions.some(
      (option) => option.mode !== "collection",
    );
    const radiosToBuild = showViewRadios ? viewModeOptions : [];

    const group = createXulElement(doc, "hbox", "syllabus-view-mode-group");
    group.setAttribute("align", "stretch");

    for (const option of radiosToBuild) {
      const button = ztoolkit.UI.createElement(doc, "toolbarbutton", {
        id: `syllabus-view-mode-${option.mode}`,
        classList: ["syllabus-view-mode-button"],
        attributes: {
          "data-view-mode": option.mode,
          crop: "none",
          tooltiptext: option.tooltip,
        },
        properties: {
          type: "radio",
          group: "syllabus-view-mode",
          label: option.label,
          tooltiptext: option.tooltip,
        },
        listeners: [
          {
            type: "click",
            listener: (e: Event) => {
              e.preventDefault?.();
              void SyllabusManager.applyCollectionViewModeFromToolbar(
                option.mode,
              );
            },
          },
        ],
      });
      group.appendChild(button);
    }

    const createLabel = getString("view-tab-create-syllabus");
    const createTooltip = getString("view-tab-create-syllabus-tooltip");
    const createButton = ztoolkit.UI.createElement(doc, "toolbarbutton", {
      id: "syllabus-create-syllabus-button",
      classList: ["syllabus-create-syllabus-button"],
      attributes: {
        crop: "none",
        tooltiptext: createTooltip,
        image: "chrome://syllabus/content/icons/graduation-cap.svg",
      },
      properties: {
        label: createLabel,
        tooltiptext: createTooltip,
      },
      listeners: [
        {
          type: "click",
          listener: (e: Event) => {
            e.preventDefault?.();
            void SyllabusManager.applyCollectionViewModeFromToolbar("syllabus");
          },
        },
      ],
    });

    const cluster = createXulElement(doc, "hbox", "syllabus-view-mode-cluster");
    cluster.setAttribute("align", "center");
    cluster.setAttribute("flex", "0");
    if (showViewRadios) {
      cluster.appendChild(group);
    }
    cluster.appendChild(createButton);

    const spacerStart = createXulElement(
      doc,
      "spacer",
      "syllabus-view-spacer-start",
    );
    spacerStart.setAttribute("flex", "1");
    const spacerEnd = createXulElement(
      doc,
      "spacer",
      "syllabus-view-spacer-end",
    );
    spacerEnd.setAttribute("flex", "1");

    const insertBefore = (el: Element) => {
      if (searchSpinner && searchSpinner.parentNode) {
        searchSpinner.parentNode.insertBefore(el, searchSpinner);
      } else {
        itemsToolbar.appendChild(el);
      }
    };

    insertBefore(spacerStart);
    insertBefore(cluster);
    insertBefore(spacerEnd);

    SyllabusManager.updateViewModeButtons();
    SyllabusManager.updateButtonVisibility();
  }

  // Highlight the selected view-mode radio button
  static updateViewModeButtons() {
    const w = Zotero.getMainWindow();
    const doc = w.document;
    const mode = SyllabusManager.getCollectionViewMode();
    const buttons = Array.from(
      doc.querySelectorAll(".syllabus-view-mode-button"),
    ) as XULButtonElement[];

    const syllabusChrome = syllabusViewModeChrome();
    for (const button of buttons) {
      const buttonMode = button.getAttribute("data-view-mode");
      const selected = buttonMode === mode;
      button.setAttribute("data-selected", selected ? "true" : "false");
      if (selected) {
        button.setAttribute("checked", "true");
      } else {
        button.removeAttribute("checked");
      }
      if (buttonMode === "syllabus" && syllabusChrome) {
        button.setAttribute("label", syllabusChrome.label);
        button.setAttribute("tooltiptext", syllabusChrome.tooltip);
        button.label = syllabusChrome.label;
      }
    }
  }

  /** @deprecated Use updateViewModeButtons() */
  static updateButtonLabel(_button?: Element) {
    SyllabusManager.updateViewModeButtons();
  }

  /**
   * When the standalone syllabus note is trashed/deleted for the selected
   * collection, leave syllabus view and refresh tab chrome.
   */
  static onSyllabusNoteDetached(collectionRef: string): void {
    try {
      const scope = getSelectedViewScope();
      if (scope.kind !== "collection") {
        return;
      }
      const collection = scope.collection;
      if (`${collection.libraryID}:${collection.key}` !== collectionRef) {
        return;
      }
      if (
        isManagedReadingScheduleCollection(collection.id) ||
        isAutoManagedCollection(collection.id)
      ) {
        return;
      }
      if (SyllabusManager.getCollectionViewMode() === "syllabus") {
        SyllabusManager.writeCollectionViewMode(collection, "collection");
        void SyllabusManager.setupPage().catch((error: unknown) => {
          Zotero.debug(
            `Error leaving syllabus view after note removal: ${String(error)}`,
          );
        });
      }
      if (Zotero.getMainWindow()?.document) {
        SyllabusManager.updateButtonVisibility();
      }
    } catch (error) {
      Zotero.debug(`Error handling syllabus note removal: ${String(error)}`);
    }
  }

  // Function to update button visibility based on current state
  static updateButtonVisibility() {
    const w = Zotero.getMainWindow();
    const doc = w.document;

    SyllabusManager.updateReadingScheduleTabBarButton(w);
    SyllabusManager.updateMyAnnotationsTabBarButton(w);

    const viewModeButtons = Array.from(
      doc.querySelectorAll(".syllabus-view-mode-button"),
    ) as XULButtonElement[];

    const scope = getSelectedViewScope();
    const selectedCollection =
      scope.kind === "collection" ? scope.collection : null;
    const currentTab = getCurrentTab();
    const isCustomTab =
      currentTab?.type === "syllabus" ||
      currentTab?.type === "reading-list" ||
      currentTab?.type === "my-annotations";
    const hideViewModesInLibrary =
      FEATURE_FLAG.READING_SCHEDULE &&
      !viewScopeSupportsGallery(scope) &&
      !viewScopeSupportsExplorer(scope) &&
      !isCustomTab;
    const readingScheduleContext = selectedCollection
      ? getReadingScheduleCollectionContext(selectedCollection.id)
      : null;
    const hideAll = !!(hideViewModesInLibrary || readingScheduleContext);
    const syllabusEnabled = isOptionalFeatureEnabled("syllabus");
    const syllabusChrome = syllabusEnabled ? syllabusViewModeChrome() : null;
    const showCreate =
      !hideAll && syllabusEnabled && !!selectedCollection && !syllabusChrome;
    const isLibraryRoot = viewScopeSupportsExplorer(scope);
    const explorerEnabled = isOptionalFeatureEnabled("explorer");

    for (const button of viewModeButtons) {
      const buttonMode = button.getAttribute("data-view-mode");
      if (isLibraryRoot) {
        // My Library only offers Table / Home. Without Home, hide the whole
        // switcher rather than a lone Table radio.
        button.hidden =
          hideAll ||
          !explorerEnabled ||
          (buttonMode !== "collection" && buttonMode !== "explorer");
      } else if (buttonMode === "explorer") {
        button.hidden = true;
      } else if (buttonMode === "syllabus") {
        button.hidden = hideAll || !syllabusChrome;
      } else if (buttonMode === "gallery") {
        button.hidden = hideAll || !isOptionalFeatureEnabled("gallery");
      } else {
        button.hidden = hideAll;
      }
    }

    // A single radio (e.g. only Table on a non-syllabus with Gallery off) is
    // useless — hide the group entirely. Create Syllabus can still show.
    const visibleRadios = viewModeButtons.filter((button) => !button.hidden);
    if (visibleRadios.length <= 1) {
      for (const button of viewModeButtons) {
        button.hidden = true;
      }
    }

    const createButton = doc.getElementById(
      "syllabus-create-syllabus-button",
    ) as XULButtonElement | null;
    if (createButton) {
      createButton.hidden = !showCreate;
    }

    const anyRadioVisible = viewModeButtons.some((button) => !button.hidden);
    const radioGroup = doc.getElementById(
      "syllabus-view-mode-group",
    ) as HTMLElement | null;
    if (radioGroup) {
      radioGroup.hidden = !anyRadioVisible;
    }
    const hideChrome = hideAll || (!anyRadioVisible && !showCreate);
    for (const id of [
      "syllabus-view-mode-cluster",
      "syllabus-view-spacer-start",
      "syllabus-view-spacer-end",
    ]) {
      const el = doc.getElementById(id) as HTMLElement | null;
      if (el) {
        el.hidden = hideChrome;
      }
    }
  }

  // Function to render a completely custom syllabus view
  static setupPageGeneration = 0;
  static lastSetupPageKey: string | null = null;

  static async setupPage() {
    ztoolkit.log("SyllabusManager.setupPage");
    const generation = ++this.setupPageGeneration;
    try {
      /**
       * Lead with a hide/show check
       */

      const scope = getSelectedViewScope();
      const selectedCollection =
        scope.kind === "collection" ? scope.collection : null;

      // Confirm item tree
      // Find the items tree container
      const w = Zotero.getMainWindow();
      const doc = w.document;
      const itemsTreeContainer = doc.getElementById(
        "zotero-items-pane-container",
      );
      if (!itemsTreeContainer) {
        return;
      }

      // Check if we should show custom view
      // Show if: gallery or syllabus is enabled AND we have a collection
      const viewMode = SyllabusManager.getCollectionViewMode();
      // Standalone note is primary: if it is gone, leave syllabus mode — do not
      // recreate or un-trash the note on navigation.
      if (
        viewMode === "syllabus" &&
        selectedCollection &&
        !isManagedReadingScheduleCollection(selectedCollection.id) &&
        !isAutoManagedCollection(selectedCollection.id) &&
        !collectionHasSyllabusNote(selectedCollection)
      ) {
        SyllabusManager.writeCollectionViewMode(
          selectedCollection,
          "collection",
        );
        SyllabusManager.updateViewModeButtons();
      }
      if (generation !== this.setupPageGeneration) {
        return;
      }
      const resolvedViewMode = SyllabusManager.getCollectionViewMode();
      const shouldShowCustomView =
        (resolvedViewMode === "gallery" && viewScopeSupportsGallery(scope)) ||
        (resolvedViewMode === "syllabus" && !!selectedCollection) ||
        (resolvedViewMode === "explorer" && viewScopeSupportsExplorer(scope));

      const setupKey = shouldShowCustomView
        ? `${resolvedViewMode}:${scope.viewKey}:${selectedCollection?.id ?? ""}`
        : `hidden:${scope.viewKey}`;
      if (setupKey === this.lastSetupPageKey) {
        // Same target already showing — Preact stores keep the tree live.
        updateManagedCollectionBanner(w, {
          collectionId: selectedCollection?.id ?? null,
          itemsListVisible: !shouldShowCustomView,
        });
        return;
      }

      // Find or create custom syllabus view container
      let customView = doc.getElementById(
        "syllabus-custom-view",
      ) as HTMLElement | null;
      const itemsTree = doc.getElementById(
        "zotero-items-tree",
      ) as HTMLElement | null;

      if (!shouldShowCustomView) {
        // Hide custom view and show default tree. Unmount so Gallery/Syllabus
        // document keydown listeners cannot intercept native list navigation.
        unmountComponent(w, "syllabus-custom-view");
        if (customView) {
          customView.style.display = "none";
        }
        if (itemsTree) {
          itemsTree.style.display = "";
        }
      } else {
        /**
         * If we should show custom view, create it
         */

        // Hide the default tree
        if (itemsTree) {
          itemsTree.style.display = "none";
        }

        // Create custom view if it doesn't exist
        if (!customView) {
          customView = doc.createElement("div");
          customView.id = "syllabus-custom-view";
          customView.className = "syllabus-custom-view";
          // Insert before items tree or append to container
          if (itemsTree && itemsTree.parentNode) {
            itemsTree.parentNode.insertBefore(customView, itemsTree);
          } else {
            itemsTreeContainer.appendChild(customView);
          }
        }

        // Show custom view
        customView.style.display = "block";

        // Insert the master template
        if (customView && resolvedViewMode === "explorer") {
          const libraryID =
            (scope.kind === "library" && scope.libraryID) ||
            libraryIdForNewCollection();
          renderExplorerPage(w, customView, libraryID);
        } else if (customView && resolvedViewMode === "gallery") {
          if (scope.kind === "collection") {
            renderGalleryPage(w, customView, {
              viewKey: scope.viewKey,
              collectionId: scope.collection.id,
            });
          } else if (scope.kind === "special") {
            renderGalleryPage(w, customView, {
              viewKey: scope.viewKey,
              treeViewID: scope.treeViewID,
              includeDeleted: scope.type === "trash",
              includeFeedItems: scope.type === "feed" || scope.type === "feeds",
            });
          }
        } else if (customView && selectedCollection) {
          renderSyllabusPage(w, customView, selectedCollection.id);
        }
      }

      if (generation !== this.setupPageGeneration) {
        return;
      }
      this.lastSetupPageKey = setupKey;

      updateManagedCollectionBanner(w, {
        collectionId: selectedCollection?.id ?? null,
        itemsListVisible: !shouldShowCustomView,
      });
    } catch (e) {
      ztoolkit.log("Error in setupPage:", e);
      this.lastSetupPageKey = null;
      // Restore the items tree if we hid it before a failed custom-view render.
      try {
        const w = Zotero.getMainWindow();
        const doc = w?.document;
        const itemsTree = doc?.getElementById(
          "zotero-items-tree",
        ) as HTMLElement | null;
        const customView = doc?.getElementById(
          "syllabus-custom-view",
        ) as HTMLElement | null;
        if (itemsTree) {
          itemsTree.style.display = "";
        }
        if (customView) {
          customView.style.display = "none";
        }
        if (w) {
          unmountComponent(w, "syllabus-custom-view");
        }
      } catch (restoreErr) {
        ztoolkit.log(
          "Error restoring items tree after setupPage failure:",
          restoreErr,
        );
      }
    }
  }

  static registerSyllabusClassInstructionColumn =
    registerSyllabusClassInstructionColumn;
  static registerSyllabusStatusColumn = registerSyllabusStatusColumn;
  static registerReadingTimeColumn = registerReadingTimeColumn;
  static registerSyllabusInfoColumn = registerSyllabusInfoColumn;

  static reloadItemPane() {
    ztoolkit.log("SyllabusManager.reloadItemPane");
    // Actually, don't. Let React handle the updates via subscribers.
    this.destroyItemPaneSection();
    setTimeout(() => {
      this.registerSyllabusItemPaneSection();
    }, 500);
  }

  static destroyItemPaneSection() {
    ztoolkit.log("SyllabusManager.destroyItemPaneSection");
    if (this.syllabusItemPaneSection) {
      try {
        Zotero.ItemPaneManager.unregisterSection(this.syllabusItemPaneSection);
      } catch (e) {
        ztoolkit.log("Error unregistering item pane section:", e);
      }
      this.syllabusItemPaneSection = null;
    }
  }

  static registerSyllabusItemPaneSection() {
    ztoolkit.log("SyllabusManager.registerSyllabusItemPaneSection");
    // Always unregister first to avoid duplicate registration errors
    this.destroyItemPaneSection();

    this.syllabusItemPaneSection = Zotero.ItemPaneManager.registerSection({
      paneID: "syllabus",
      pluginID: addon.data.config.addonID,
      header: {
        l10nID: getLocaleID("item-section-syllabus-head-text"),
        icon: "chrome://zotero/skin/16/universal/book.svg",
      },
      sidenav: {
        l10nID: getLocaleID("item-section-syllabus-sidenav-tooltip"),
        icon: "chrome://zotero/skin/16/universal/book.svg",
      },
      onRender: ({ body, item, editable }) => {
        const selectedCollection = getSelectedCollection();
        const win = Zotero.getMainWindow();

        body.textContent = "";

        const root = body.ownerDocument?.createElement("div");
        body.appendChild(root);

        //   // Render Preact component
        renderComponent(
          win,
          body,
          selectedCollection
            ? h(ItemPane, {
                currentCollectionId: selectedCollection.id,
                editable,
              })
            : h("div", {
                innerText: getString("item-pane-select-collection"),
                className: "text-center text-gray-500 p-4",
              }),
          "syllabus-item-pane",
        );
      },
    });
  }

  /**
   * Apply a change to the first assignment or create one if none exists
   */
  static async applyToFirstAssignment(
    item: Zotero.Item,
    collectionId: number | GetByLibraryAndKeyArgs,
    update: Partial<ItemSyllabusAssignment>,
  ): Promise<void> {
    const assignment = this.getFirstAssignment(item, collectionId);
    if (assignment?.id) {
      await this.updateClassAssignment(
        item,
        collectionId,
        assignment.id,
        update,
        "context-menu",
      );
    } else {
      await this.addClassAssignment(
        item,
        collectionId,
        undefined,
        update,
        "context-menu",
      );
    }
  }

  /**
   * Toggle or set reading done status. For further-reading items with no
   * assignment yet, creates a classless status-only row. Clearing done on a
   * bare classless row removes it so the note stays clean.
   */
  static async setReadingStatus(
    item: Zotero.Item,
    collectionId: number | GetByLibraryAndKeyArgs,
    assignmentId: string | undefined,
    status: "done" | null,
    source: "page" | "item-pane" | "context-menu",
  ): Promise<void> {
    if (assignmentId) {
      const assignments = this.getItemSyllabusDataForCollection(
        item,
        collectionId,
      );
      const existing = assignments.find((entry) => entry.id === assignmentId);
      if (!existing) {
        ztoolkit.log("Warning: Assignment not found by ID:", assignmentId);
        return;
      }

      const resolvedClassNumber =
        this.getClassNumber(collectionId, existing.classId) ??
        existing.classNumber;
      const isBare =
        !existing.priority &&
        !existing.classInstruction &&
        resolvedClassNumber === undefined;

      if (status === null && isBare) {
        await this.removeAssignmentById(
          item,
          collectionId,
          assignmentId,
          source,
        );
        return;
      }

      await this.updateClassAssignment(
        item,
        collectionId,
        assignmentId,
        { status },
        source,
      );
      return;
    }

    if (status === "done") {
      await this.addClassAssignment(
        item,
        collectionId,
        undefined,
        { status },
        source,
      );
    }
  }

  static setupContextMenuSetPriority() {
    ztoolkit.Menu.unregister("syllabus-set-priority-menu");
    const createPriorityHandler = (priority: string) => async () => {
      const zoteroPane = ztoolkit.getGlobal("ZoteroPane");
      const selectedCollection = getSelectedCollection();
      if (!selectedCollection) return;
      const items = zoteroPane.getSelectedItems();
      for (const item of items) {
        if (item.isRegularItem()) {
          await this.applyToFirstAssignment(item, selectedCollection.id, {
            priority: priority || undefined,
          });
          await item.saveTx();
        }
      }
    };

    // Get the selected collection to use collection-specific priorities
    const selectedCollection = getSelectedCollection();

    // Get collection-specific priority options if a collection is selected
    // Otherwise use default priorities
    const priorityOptions = (() => {
      const priorities = selectedCollection
        ? this.getPrioritiesForCollection(selectedCollection.id)
        : [];
      const options = priorities.map((p) => ({
        value: p.id,
        label: p.name,
        color: p.color,
      }));
      // Add "(None)" option
      options.push({ value: "", label: getString("menu-none"), color: "" });
      return options;
    })();

    ztoolkit.Menu.register("item", {
      tag: "menu",
      id: "syllabus-set-priority-menu",
      label: getString("menu-set-priority"),
      icon: "chrome://zotero/skin/16/universal/book.svg",
      children: priorityOptions
        .map((opt) => {
          // Separate "(None)" option with a separator before it
          if (opt.value === "") {
            return [
              { tag: "menuseparator" as const },
              {
                tag: "menuitem" as const,
                label: opt.label,
                commandListener: createPriorityHandler(""),
              },
            ];
          }
          return {
            tag: "menuitem" as const,
            label: opt.label,
            commandListener: createPriorityHandler(opt.value),
          };
        })
        .flat(),
    });
  }

  // Register the menu with dynamic children
  static setupContextMenuSetClassNumber() {
    // Unregister and re-register to update children
    ztoolkit.Menu.unregister("syllabus-reassign-class-number-menu");
    ztoolkit.Menu.register("item", {
      tag: "menu",
      id: "syllabus-reassign-class-number-menu",
      icon: "chrome://zotero/skin/16/universal/book.svg",
      label: getString("menu-assign-to-class"),
      children: SyllabusManager.buildClassNumberChildren(),
    });
  }

  static buildClassNumberChildren() {
    const selectedCollection = getSelectedCollection();
    if (!selectedCollection) {
      return [
        {
          tag: "menuitem" as const,
          label: getString("menu-no-collection"),
          disabled: true,
        },
      ];
    }

    // Get full range of class numbers (same logic as SyllabusPage)
    const sortedClassNumbers = this.getFullClassNumberRange(
      selectedCollection.id,
    );

    // Calculate next class number
    const nextClassNumber =
      sortedClassNumbers.length > 0 ? Math.max(...sortedClassNumbers) + 1 : 1;

    const createClassHandler =
      (classNumber: number | undefined) => async () => {
        const zoteroPane = ztoolkit.getGlobal("ZoteroPane");
        const selectedCollection = getSelectedCollection();
        if (!selectedCollection) return;
        const items = zoteroPane.getSelectedItems();
        for (const item of items) {
          if (item.isRegularItem()) {
            await this.applyToFirstAssignment(item, selectedCollection.id, {
              classNumber,
            });
            await item.saveTx();
          }
        }
      };

    const { singularCapitalized } = this.getNomenclatureFormatted(
      selectedCollection.id,
    );

    const children: any[] = sortedClassNumbers.map((classNumber) => {
      const classTitle = this.getClassTitle(
        selectedCollection.id,
        classNumber,
        true,
      );
      return {
        tag: "menuitem" as const,
        label:
          classTitle ||
          getString("menu-class-label", {
            args: { nomenclature: singularCapitalized, number: classNumber },
          }),
        commandListener: createClassHandler(classNumber),
      };
    });

    // Add separator before "Add to new class" if there are existing classes
    if (sortedClassNumbers.length > 0) {
      children.push({ tag: "menuseparator" as const });
    }

    children.push({
      tag: "menuitem" as const,
      label: getString("menu-add-to-new-class", {
        args: {
          nomenclature: singularCapitalized,
          number: nextClassNumber,
        },
      }),
      commandListener: createClassHandler(nextClassNumber),
    });

    // Add separator before "(None)"
    children.push({ tag: "menuseparator" as const });

    children.push({
      tag: "menuitem" as const,
      label: getString("menu-none"),
      commandListener: createClassHandler(undefined),
    });

    return children;
  }

  static setupContextMenuSetStatus() {
    ztoolkit.Menu.unregister("syllabus-set-status-menu");
    const createStatusHandler = (status: "done" | null) => async () => {
      const zoteroPane = ztoolkit.getGlobal("ZoteroPane");
      const selectedCollection = getSelectedCollection();
      if (!selectedCollection) return;
      const items = zoteroPane.getSelectedItems();
      for (const item of items) {
        if (item.isRegularItem()) {
          await this.applyToFirstAssignment(item, selectedCollection.id, {
            status: status || undefined,
          });
          await item.saveTx();
        }
      }
    };

    ztoolkit.Menu.register("item", {
      tag: "menu",
      id: "syllabus-set-status-menu",
      label: getString("menu-set-reading-status"),
      icon: "chrome://zotero/skin/16/universal/book.svg",
      children: [
        {
          tag: "menuitem" as const,
          label: getString("status-done"),
          commandListener: createStatusHandler("done"),
        },
        {
          tag: "menuitem" as const,
          label: getString("status-not-done"),
          commandListener: createStatusHandler(null),
        },
      ],
    });
  }

  static setupContextMenuPinned() {
    ztoolkit.Menu.unregister("syllabus-pin-item-menu");
    ztoolkit.Menu.unregister("syllabus-pin-collection-menu");

    const selectedRegularItems = (): Zotero.Item[] => {
      try {
        const items = ztoolkit.getGlobal("ZoteroPane").getSelectedItems() || [];
        return items.filter((item) => {
          try {
            return item.isRegularItem();
          } catch {
            return false;
          }
        });
      } catch {
        return [];
      }
    };

    const selectedSyllabusNotes = (): Zotero.Item[] => {
      try {
        const items = ztoolkit.getGlobal("ZoteroPane").getSelectedItems() || [];
        return items.filter((item) => isPinnedSyllabusNoteCandidate(item));
      } catch {
        return [];
      }
    };

    const pinIcon = "chrome://zotero/skin/16/universal/pin.svg";
    // Data URI: extension chrome:// SVGs often fail as menuitem list-style-image.
    const pinOffIcon = `data:image/svg+xml,${encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none"><path fill-rule="evenodd" clip-rule="evenodd" d="M9.45442 0.747313C8.91526 0.208154 7.99526 0.446553 7.78579 1.1797L7.07966 3.65115L0.896869 6.74255C0.286372 7.04779 0.154333 7.86144 0.636975 8.34408L3.79293 11.5L0 15.2929L9.87947e-05 16L0.707182 16L4.50004 12.2071L7.65592 15.363C8.13856 15.8457 8.9522 15.7136 9.25745 15.1031L12.3488 8.92033L14.8203 8.21421C15.5534 8.00474 15.7918 7.08473 15.2527 6.54558L9.45442 0.747313ZM8.74732 1.45442L14.5456 7.25268L11.8626 8.01924L11.6512 8.07966L11.5528 8.27639L8.36302 14.6559L1.34408 7.63697L7.72361 4.44721L7.92034 4.34885L7.98076 4.13736L8.74732 1.45442Z" fill="context-fill"/><path d="M1.4 2.8 2.8 1.4 14.6 13.2 13.2 14.6Z" fill="context-fill"/></svg>`,
    )}`;
    const setPinMenuIcon = (elem: Element, unpin: boolean) => {
      const url = unpin ? pinOffIcon : pinIcon;
      try {
        const el = elem as HTMLElement;
        el.style.setProperty("list-style-image", `url("${url}")`);
      } catch {
        // Ignore if the host menuitem has no style object.
      }
    };

    ztoolkit.Menu.register("item", {
      tag: "menuitem",
      id: "syllabus-pin-item-menu",
      label: getString("pinned-menu-pin-item"),
      icon: pinIcon,
      isHidden: () => {
        return (
          selectedRegularItems().length === 0 &&
          selectedSyllabusNotes().length === 0
        );
      },
      onShowing: (elem) => {
        const regular = selectedRegularItems();
        if (regular.length > 0) {
          const allPinned = regular.every((item) => isPinnedItem(item));
          elem.setAttribute(
            "label",
            allPinned
              ? getString("pinned-menu-unpin-item")
              : getString("pinned-menu-pin-item"),
          );
          setPinMenuIcon(elem, allPinned);
          return;
        }
        const notes = selectedSyllabusNotes();
        if (notes.length > 0) {
          const allPinned = notes.every((item) => {
            try {
              return item.hasTag(PINNED_TAG);
            } catch {
              return false;
            }
          });
          elem.setAttribute(
            "label",
            allPinned
              ? getString("pinned-menu-unpin-syllabus")
              : getString("pinned-menu-pin-syllabus"),
          );
          setPinMenuIcon(elem, allPinned);
        }
      },
      commandListener: async () => {
        const regular = selectedRegularItems();
        if (regular.length > 0) {
          const allPinned = regular.every((item) => isPinnedItem(item));
          if (allPinned) {
            for (const item of regular) {
              await unpinItemWithNotePrompt(item);
            }
          } else {
            for (const item of regular) {
              if (!isPinnedItem(item)) {
                await setPinnedItem(item, true);
              }
            }
          }
          enqueuePinnedReadingScheduleSync();
          return;
        }

        const notes = selectedSyllabusNotes();
        if (notes.length === 0) {
          return;
        }
        const allPinned = notes.every((item) => {
          try {
            return item.hasTag(PINNED_TAG);
          } catch {
            return false;
          }
        });
        for (const note of notes) {
          if (allPinned) {
            note.removeTag(PINNED_TAG);
          } else if (!note.hasTag(PINNED_TAG)) {
            note.addTag(PINNED_TAG);
          }
          await note.saveTx({ skipSelect: true });
        }
        notifyPinnedChanges();
        enqueuePinnedReadingScheduleSync();
      },
    });

    ztoolkit.Menu.register("collection", {
      tag: "menuitem",
      id: "syllabus-pin-collection-menu",
      label: getString("pinned-menu-pin-syllabus"),
      icon: pinIcon,
      isHidden: () => {
        const collection = getSelectedCollection();
        if (!collection) {
          return true;
        }
        // Managed folders and class subcollections are not pin targets —
        // pin the syllabus root (or turn a plain collection into one).
        if (
          isManagedReadingScheduleCollection(collection.id) ||
          isAutoManagedCollection(collection.id) ||
          getClassSubcollectionContext(collection)
        ) {
          return true;
        }
        return false;
      },
      onShowing: (elem) => {
        const collection = getSelectedCollection();
        if (!collection) {
          return;
        }
        const pinned = isPinnedSyllabus(collection);
        elem.setAttribute(
          "label",
          pinned
            ? getString("pinned-menu-unpin-syllabus")
            : getString("pinned-menu-pin-syllabus"),
        );
        setPinMenuIcon(elem, pinned);
      },
      commandListener: async () => {
        const collection = getSelectedCollection();
        if (!collection) {
          return;
        }
        const pinned = isPinnedSyllabus(collection);
        const ok = await setPinnedSyllabus(collection, !pinned);
        if (!ok) {
          ztoolkit.log("Could not update pinned collection");
          return;
        }
        enqueuePinnedReadingScheduleSync();
      },
    });
  }

  static setupContextMenuGalleryNote() {
    ztoolkit.Menu.unregister("syllabus-gallery-note-edit-menu");
    ztoolkit.Menu.unregister("syllabus-gallery-note-remove-menu");

    const selectedRegularItems = (): Zotero.Item[] => {
      try {
        const items = ztoolkit.getGlobal("ZoteroPane").getSelectedItems() || [];
        return items.filter((item) => {
          try {
            return item.isRegularItem();
          } catch {
            return false;
          }
        });
      } catch {
        return [];
      }
    };

    ztoolkit.Menu.register("item", {
      tag: "menuitem",
      id: "syllabus-gallery-note-edit-menu",
      label: getString("gallery-note-edit"),
      icon: "chrome://zotero/skin/16/universal/note.svg",
      isHidden: () => {
        const collection = getSelectedCollection();
        return !collection || selectedRegularItems().length === 0;
      },
      onShowing: (elem) => {
        const collection = getSelectedCollection();
        const items = selectedRegularItems();
        if (!collection || items.length === 0) {
          return;
        }
        const allHave = items.every(
          (item) => findGalleryNoteForCollection(item, collection.id) != null,
        );
        elem.setAttribute(
          "label",
          allHave
            ? getString("gallery-note-edit")
            : getString("gallery-note-add"),
        );
      },
      commandListener: async () => {
        const collection = getSelectedCollection();
        if (!collection) {
          return;
        }
        const items = selectedRegularItems();
        for (const item of items) {
          await openGalleryNote(item, collection);
        }
      },
    });

    ztoolkit.Menu.register("item", {
      tag: "menuitem",
      id: "syllabus-gallery-note-remove-menu",
      label: getString("gallery-note-remove"),
      icon: "chrome://zotero/skin/16/universal/trash.svg",
      isHidden: () => {
        const collection = getSelectedCollection();
        if (!collection) {
          return true;
        }
        return !selectedRegularItems().some(
          (item) => findGalleryNoteForCollection(item, collection.id) != null,
        );
      },
      commandListener: async () => {
        const collection = getSelectedCollection();
        if (!collection) {
          return;
        }
        for (const item of selectedRegularItems()) {
          await deleteGalleryNote(item, collection.id);
        }
      },
    });
  }

  static setupContextMenuAddCollectionShelf() {
    ztoolkit.Menu.unregister("syllabus-add-collection-shelf-menu");

    // Same chrome://zotero pattern as pin — data/extension URLs don't show on Mac menuitems.
    const homeIcon = "chrome://zotero/skin/16/universal/library.svg";

    ztoolkit.Menu.register("collection", {
      tag: "menuitem",
      id: "syllabus-add-collection-shelf-menu",
      label: getString("explorer-menu-add-to-home"),
      icon: homeIcon,
      isHidden: () => {
        if (!isOptionalFeatureEnabled("explorer")) {
          return true;
        }
        return !getSelectedCollection();
      },
      onShowing: (elem) => {
        const collection = getSelectedCollection();
        if (!collection) {
          return;
        }
        const onHome = isCollectionShelfOnHome(
          getExplorerShelves(),
          collection.libraryID,
          collection.key,
        );
        elem.setAttribute(
          "label",
          getString(
            onHome
              ? "explorer-menu-remove-from-home"
              : "explorer-menu-add-to-home",
          ),
        );
        try {
          (elem as unknown as HTMLElement).style.setProperty(
            "list-style-image",
            `url("${homeIcon}")`,
          );
        } catch {
          // Ignore if the host menuitem has no style object.
        }
      },
      commandListener: () => {
        const collection = getSelectedCollection();
        if (!collection) {
          return;
        }
        toggleCollectionShelfOnHome(collection.libraryID, collection.key);
      },
    });
  }

  static setCollectionTitle(
    collectionId: number,
    title: string,
    source: "page" | "background",
  ) {
    const collection = getCachedCollectionById(collectionId);
    if (collection) {
      try {
        // Feeds may be read-only, so wrap in try-catch
        collection.name = title;
        collection.saveTx();
      } catch (e) {
        // If collection is read-only (e.g., a feed), log but don't throw
        ztoolkit.log("Could not set collection title (may be read-only):", e);
      }
    }
    if (collection) {
      this.onCollectionUpdated(collection, source, "setCollectionTitle");
    }
  }

  /**
   * Get syllabus assignments for an item across every collection it belongs to.
   * Built from collection notes (not item Extra).
   */
  static getItemSyllabusData(item: Zotero.Item): ItemSyllabusData | undefined {
    const data: ItemSyllabusData = {};
    let hasAny = false;
    for (const collectionId of item.getCollections()) {
      const collection = getCachedCollectionById(collectionId);
      if (!collection) {
        continue;
      }
      const collectionKeyStr = this.getCollectionReferenceString(
        collection.libraryID,
        collection.key,
      );
      const assignments = getHydratedItemAssignments(
        getCollectionDocument(collection),
        item.key,
        item,
      );
      if (assignments.length > 0) {
        data[collectionKeyStr] = assignments;
        hasAny = true;
      }
    }
    return hasAny ? data : undefined;
  }

  static getItemSyllabusDataForCollection(
    item: Zotero.Item,
    collectionId: number | GetByLibraryAndKeyArgs,
  ): ItemSyllabusAssignment[] {
    return getHydratedItemAssignments(
      getCollectionDocument(collectionId),
      item.key,
      item,
    );
  }

  /**
   * Write one item's assignments into the collection syllabus note.
   * `data` is still keyed by collection reference for call-site compatibility.
   */
  static async setItemData(
    item: Zotero.Item,
    data: ItemSyllabusData,
    source: "page" | "item-pane" | "context-menu" | "background",
  ): Promise<void> {
    const inputResult = ItemSyllabusDataEntity.safeParse(data);
    if (inputResult.type !== "ok") {
      ztoolkit.log(
        "[Zotero Syllabus] Error validating syllabus data input before saving:",
        inputResult.error,
        "Input data:",
        data,
      );
      return;
    }
    const validatedData = inputResult.value;

    for (const [collectionKeyStr, assignments] of Object.entries(
      validatedData,
    )) {
      const parts = collectionKeyStr.split(":");
      if (parts.length < 2) {
        continue;
      }
      const libraryID = parseInt(parts[0], 10);
      const collectionKey = parts.slice(1).join(":");
      if (isNaN(libraryID) || !collectionKey) {
        continue;
      }
      await setItemAssignmentsInDocument(
        [libraryID, collectionKey],
        item.key,
        assignments,
      );
    }
    this.onItemUpdate(item, source);
  }

  static async setItemAssignments(
    item: Zotero.Item,
    collectionId: number | GetByLibraryAndKeyArgs,
    assignments: ItemSyllabusAssignment[],
    source: "page" | "item-pane" | "context-menu" | "background",
  ): Promise<void> {
    const collection = this.getCollectionFromIdentifier(collectionId);
    if (collection && !itemBelongsInCollection(item, collection)) {
      ztoolkit.log(
        "Skipping syllabus assignment; item and collection are in different libraries",
        item.id,
        collection.id,
      );
      return;
    }
    await setItemAssignmentsInDocument(collectionId, item.key, assignments);
    this.onItemUpdate(item, source);
  }

  /**
   * Display numbers for classes on the collection document (1..n in list
   * order). Empty placeholder classes are included; deleting a class removes
   * that slot and later numbers compact.
   */
  static getFullClassNumberRange(
    collectionId: number | GetByLibraryAndKeyArgs,
  ): number[] {
    return orderedClassIds(getCollectionDocument(collectionId)).map(
      (_, index) => index + 1,
    );
  }

  /**
   * Set syllabus class number for a specific collection
   * If the item already has an entry for this classNumber, updates it
   * Otherwise, creates a new entry or updates the first entry if no classNumber specified
   */
  static async setSyllabusClassNumber(
    item: Zotero.Item,
    collectionId: number | GetByLibraryAndKeyArgs,
    classNumber: number | undefined,
    source: "page" | "item-pane" | "context-menu",
  ) {
    const assignments = this.getItemSyllabusDataForCollection(
      item,
      collectionId,
    );

    if (classNumber) {
      const assignment = assignments.find((e) => e.classNumber === classNumber);
      if (!assignment) {
        await this.addClassAssignment(
          item,
          collectionId,
          classNumber,
          {},
          source,
        );
      } else {
        await this.updateClassAssignment(
          item,
          collectionId,
          assignment.id,
          { classNumber },
          source,
        );
      }
    } else if (assignments.length > 0) {
      await this.updateClassAssignment(
        item,
        collectionId,
        assignments[0].id,
        { classNumber: undefined, classId: undefined },
        source,
      );
    }
  }

  /**
   * Get all class assignments for an item in a collection
   */
  static getAllClassAssignments(
    item: Zotero.Item,
    collectionId: number | GetByLibraryAndKeyArgs,
  ): ItemSyllabusAssignment[] {
    return this.getItemSyllabusDataForCollection(item, collectionId);
  }

  /**
   * Get the first assignment for an item in a collection (sorted by compareAssignments).
   * This is used to drive column rendering and sorting consistently.
   */
  static getFirstAssignment(
    item: Zotero.Item,
    collectionId: number | GetByLibraryAndKeyArgs,
  ): ItemSyllabusAssignment | undefined {
    const assignments = this.getAllClassAssignments(item, collectionId);
    if (!Array.isArray(assignments) || assignments.length === 0) {
      return undefined;
    }
    // Sort and return the first one
    const sorted = [...assignments].sort(this.compareAssignments);
    return sorted[0];
  }

  /**
   * Compare two assignments for sorting.
   * Sort order: class number (undefined last), then priority, then by assignment ID for stability.
   * Returns: negative if a < b, positive if a > b, 0 if equal
   */
  static compareAssignments(
    a: ItemSyllabusAssignment,
    b: ItemSyllabusAssignment,
  ): number {
    return SyllabusManager.getAssignmentSortKey(a).localeCompare(
      SyllabusManager.getAssignmentSortKey(b),
    );
  }

  /**
   * Generate a sort key for an assignment (for column renderer compatibility).
   * Here's the rule:
   * 1. No-class, priority'd items go first; by priority order.
   * 2. Then class assignments; by priority order
   * 3. Then everything else (no-class, no-priority)
   *
   * Within each group, sort by class number, then priority, then assignmentID.
   * If manual order exists for the class, it takes precedence.
   *
   * @param assignment The assignment to generate a sort key for
   * @param item Optional item (needed to check manual order)
   * @param collectionId Optional collection ID (needed to check manual order)
   */
  static getAssignmentSortKey(
    assignment: ItemSyllabusAssignment,
    item?: Zotero.Item,
    collectionId?: number | GetByLibraryAndKeyArgs,
  ): string {
    const hasPriority = !!assignment.priority;
    const classNumber = resolveAssignmentClassNumber(assignment, collectionId);
    const hasClassNumber = classNumber !== undefined;

    // Check for manual order if item and collectionId are provided.
    // Unnumbered (no-class + priority) items use classNumber null.
    let manualOrderPosition: string | null = null;
    let hasManualOrder = false;
    if (item && collectionId !== undefined && assignment.id) {
      const orderClassNumber = hasClassNumber ? (classNumber ?? null) : null;
      const appliesToUnnumbered = !hasClassNumber && hasPriority;
      if (hasClassNumber || appliesToUnnumbered) {
        const manualOrder = this.getClassItemOrder(
          collectionId,
          orderClassNumber,
        );
        if (manualOrder.length > 0) {
          hasManualOrder = true;
          const position = manualOrder.indexOf(assignment.id);
          if (position !== -1) {
            // Use position in manual order (padded to ensure proper sorting)
            // Lower numbers come first, so we pad with zeros
            manualOrderPosition = String(position).padStart(6, "0");
          }
        }
      }
    }

    // Determine group: 1=no-class+priority, 2=class, 3=no-class+no-priority
    let group: string;
    if (!hasClassNumber && hasPriority) {
      group = "AAAA"; // Group 1: No-class, priority'd
    } else if (hasClassNumber) {
      group = "BBBB"; // Group 2: Class assignments
    } else {
      group = "CCCC"; // Group 3: No-class, unprioritized
    }

    // Build sort key parts
    const sortKeyParts = [group];

    // Class number comes first (after group)
    sortKeyParts.push(
      hasClassNumber ? String(classNumber).padStart(4, "0") : "9999",
    );

    // Only include manual order position if manual order exists for this class
    // Items in manual order get their position, items not in manual order get "999999" to sort after
    // This comes after class number so items in the same class sort by manual order
    if (hasManualOrder) {
      sortKeyParts.push(
        manualOrderPosition !== null ? manualOrderPosition : "999999",
      );
    }

    // Then priority order, etc.
    // Use collection-specific priorities if collectionId is provided, otherwise use default
    const priorityOrder: number =
      collectionId !== undefined
        ? this.getPriorityOrderForCollection(collectionId, assignment.priority)
        : 9999;
    sortKeyParts.push(
      String(priorityOrder).padStart(4, "0"),
      // For priority value: use the priority string, or "zzzz" for unprioritized
      // This ensures OPTIONAL ("optional") sorts before unprioritized ("zzzz")
      assignment.priority || "zzzz",
      assignment.classInstruction?.slice(0, 4).replace(/[^a-zA-Z0-9]/g, "_") ||
        "",
      assignment.id || "",
    );

    return sortKeyParts.join("___");
  }

  /**
   * Sort items within a class, respecting manual order if it exists.
   * Manual order takes full precedence over priority-based sorting.
   *
   * @param items Array of items with their assignments for a specific class
   * @param collectionId The collection ID
   * @param classNumber The class number (or null for unassigned)
   * @returns Sorted array of items with assignments
   */
  static sortClassItems<
    T extends { item: Zotero.Item; assignment: ItemSyllabusAssignment },
  >(
    items: T[],
    collectionId: number | GetByLibraryAndKeyArgs,
    classNumber: number | null,
  ): T[] {
    // Get manual ordering from preferences
    const manualOrder = this.getClassItemOrder(collectionId, classNumber);

    if (manualOrder.length > 0) {
      // Apply manual ordering - takes full precedence over priority
      // Manual order now uses assignment IDs to allow independent sorting of multiple assignments
      const assignmentMap = new Map(
        items.map((entry) => [entry.assignment.id, entry]),
      );

      const orderedItems: T[] = [];
      const unorderedItems: T[] = [];

      // Add assignments in manual order (by assignment ID)
      for (const assignmentId of manualOrder) {
        if (assignmentMap.has(assignmentId)) {
          orderedItems.push(assignmentMap.get(assignmentId)!);
          assignmentMap.delete(assignmentId);
        }
        // Note: If assignmentId doesn't exist (e.g., assignment was deleted),
        // it's simply skipped - no need to handle it
      }

      // Add remaining assignments that weren't in manual order
      assignmentMap.forEach((entry) => unorderedItems.push(entry));

      // Sort unordered items by title only (manual order takes precedence, so no priority sorting)
      unorderedItems.sort((a, b) => {
        return compareLocale(getItemTitle(a.item), getItemTitle(b.item));
      });

      return [...orderedItems, ...unorderedItems];
    } else {
      // Natural order: by class number, then priority (using collection-specific order), then title
      return [...items].sort((a, b) => {
        // First compare by class number
        const classNumA =
          resolveAssignmentClassNumber(a.assignment, collectionId) ?? 9999;
        const classNumB =
          resolveAssignmentClassNumber(b.assignment, collectionId) ?? 9999;
        if (classNumA !== classNumB) {
          return classNumA - classNumB;
        }

        // Then by priority order (using collection-specific priorities)
        const priorityOrderA = this.getPriorityOrderForCollection(
          collectionId,
          a.assignment.priority,
        );
        const priorityOrderB = this.getPriorityOrderForCollection(
          collectionId,
          b.assignment.priority,
        );
        if (priorityOrderA !== priorityOrderB) {
          return priorityOrderA - priorityOrderB;
        }

        // Then by title
        return compareLocale(getItemTitle(a.item), getItemTitle(b.item));
      });
    }
  }

  /**
   * Add a new class assignment for an item
   */
  static async addClassAssignment(
    item: Zotero.Item,
    collectionId: number | GetByLibraryAndKeyArgs,
    classNumber: number | null | undefined,
    metadata: Partial<ItemSyllabusAssignment>,
    source: "page" | "item-pane" | "context-menu",
  ): Promise<void> {
    const assignments = [
      ...this.getItemSyllabusDataForCollection(item, collectionId),
    ];

    const newEntry = ItemSyllabusAssignmentEntity.latestSchema.safeParse({
      ...(typeof classNumber === "number" ? { classNumber } : {}),
      ...metadata,
    });
    if (!newEntry.success) {
      ztoolkit.log("Error adding new assignment:", newEntry.error);
      return;
    }
    assignments.push(newEntry.data);
    await this.setItemAssignments(item, collectionId, assignments, source);
  }

  /**
   * Remove a specific class assignment from an item by classNumber
   * Note: For more precise removal, use removeAssignmentById
   */
  static async removeClassAssignment(
    item: Zotero.Item,
    collectionId: number | GetByLibraryAndKeyArgs,
    classNumber: number,
    source: "page" | "item-pane" | "context-menu",
  ): Promise<void> {
    const classId = this.getClassIdByNumber(collectionId, classNumber);
    const assignments = this.getItemSyllabusDataForCollection(
      item,
      collectionId,
    ).filter((entry) => {
      if (classId && entry.classId === classId) {
        return false;
      }
      return entry.classNumber !== classNumber;
    });
    await this.setItemAssignments(item, collectionId, assignments, source);
  }

  /**
   * Remove a specific assignment from an item by its ID
   */
  static async removeAssignmentById(
    item: Zotero.Item,
    collectionId: number | GetByLibraryAndKeyArgs,
    assignmentId: string,
    source: "page" | "item-pane" | "context-menu",
  ): Promise<void> {
    const assignments = this.getItemSyllabusDataForCollection(
      item,
      collectionId,
    ).filter((entry) => entry.id !== assignmentId);
    await this.setItemAssignments(item, collectionId, assignments, source);
  }

  /**
   * Remove all assignments for an item in a collection
   */
  static async removeAllAssignments(
    item: Zotero.Item,
    collectionId: number | GetByLibraryAndKeyArgs,
    source: "page" | "item-pane" | "context-menu",
  ): Promise<void> {
    await this.setItemAssignments(item, collectionId, [], source);
  }

  /**
   * Update an existing class assignment by its ID
   * Uses the assignment ID to find the exact assignment to update
   */
  static async updateClassAssignment(
    item: Zotero.Item,
    collectionId: number | GetByLibraryAndKeyArgs,
    assignmentId: string,
    metadata: Partial<ItemSyllabusAssignment>,
    source: "page" | "item-pane" | "context-menu",
  ): Promise<void> {
    const assignments = [
      ...this.getItemSyllabusDataForCollection(item, collectionId),
    ];
    const entryIndex = assignments.findIndex(
      (entry) => entry.id === assignmentId,
    );

    if (entryIndex >= 0) {
      const next = { ...assignments[entryIndex], ...metadata };
      if (
        Object.prototype.hasOwnProperty.call(metadata, "classNumber") &&
        metadata.classNumber === undefined
      ) {
        next.classId = undefined;
        next.classNumber = undefined;
      }
      assignments[entryIndex] = next;
    } else {
      ztoolkit.log("Warning: Assignment not found by ID:", assignmentId);
    }

    await this.setItemAssignments(item, collectionId, assignments, source);
  }

  /**
   * Get manual ordering of items for a specific class.
   * Pass `null` for the unnumbered (Course Information) section.
   * Returns assignment IDs in display order, or [] if no manual order.
   */
  static getClassItemOrder(
    collectionId: number | GetByLibraryAndKeyArgs,
    classNumber: number | null,
  ): string[] {
    if (classNumber === null) {
      return getCollectionDocument(collectionId).unnumberedOrder || [];
    }
    const metadata = this.getSyllabusMetadata(collectionId);
    if (!metadata.classes) {
      return [];
    }
    return metadata.classes[String(classNumber)]?.itemOrder || [];
  }

  /**
   * Set manual ordering of items for a specific class.
   * Pass `null` for the unnumbered (Course Information) section.
   * Pass [] to clear and fall back to natural (priority/title) order.
   */
  static async setClassItemOrder(
    collectionId: number | GetByLibraryAndKeyArgs,
    classNumber: number | null,
    itemIds: string[],
    source: "page" | "item-pane" = "page",
  ): Promise<void> {
    if (classNumber === null) {
      await mutateCollectionDocument(
        collectionId,
        (document) => ({
          ...document,
          unnumberedOrder: itemIds.length > 0 ? itemIds : undefined,
        }),
        { createNote: source === "page" ? "prompt" : "always" },
      );
      if (source !== "page") {
        this.setupPage();
      }
      this.onClassListUpdate();
      return;
    }
    await this.setClassMetadata(
      collectionId,
      classNumber,
      { itemOrder: itemIds },
      source,
    );
  }

  /**
   * Manual order of further-reading items (Zotero item.keys), or [].
   */
  static getFurtherReadingOrder(
    collectionId: number | GetByLibraryAndKeyArgs,
  ): string[] {
    return getCollectionDocument(collectionId).furtherReadingOrder || [];
  }

  /**
   * Set manual order of further-reading items by item.key.
   * Pass [] to clear and fall back to the local sort preference.
   */
  static async setFurtherReadingOrder(
    collectionId: number | GetByLibraryAndKeyArgs,
    itemKeys: string[],
    source: "page" | "item-pane" = "page",
  ): Promise<void> {
    await mutateCollectionDocument(
      collectionId,
      (document) => ({
        ...document,
        furtherReadingOrder: itemKeys.length > 0 ? itemKeys : undefined,
      }),
      { createNote: source === "page" ? "prompt" : "always" },
    );
    if (source !== "page") {
      this.setupPage();
    }
    this.onClassListUpdate();
  }

  static getSettingsCollectionDictionaryData(): SettingsCollectionDictionaryData {
    return getSyllabusCollectionDictionary();
  }

  /**
   * Get collection metadata from the collection syllabus note
   */
  static getSyllabusMetadata(
    collectionId: number | GetByLibraryAndKeyArgs,
  ): SettingsSyllabusMetadata {
    return metadataFromDocument(getCollectionDocument(collectionId));
  }

  /**
   * Set collection metadata in the collection syllabus note.
   * Assignment data on the note is preserved.
   * Prefer {@link patchCollectionMetadata} for single-field updates.
   */
  static async setCollectionMetadata(
    collectionId: number | GetByLibraryAndKeyArgs,
    metadata: SettingsSyllabusMetadata,
    source: "page" | "item-pane" | "background",
  ): Promise<void> {
    const parsed = SettingsSyllabusMetadataSchema.safeParse(metadata);
    if (!parsed.success) {
      ztoolkit.log("Error validating collection metadata:", parsed.error);
      return;
    }
    await setCollectionDocumentMetadata(collectionId, parsed.data, {
      createNote: source === "background" ? "always" : "prompt",
    });
    if (source !== "page") {
      this.setupPage();
    }
    this.onClassListUpdate();
  }

  /**
   * Apply a partial metadata patch against the live document (queued write).
   * Only provided fields are updated — safe for concurrent single-field edits.
   */
  static async patchCollectionMetadata(
    collectionId: number | GetByLibraryAndKeyArgs,
    patch: Partial<SettingsSyllabusMetadata>,
    source: "page" | "item-pane" | "background",
  ): Promise<void> {
    await patchCollectionDocumentMetadata(collectionId, patch, {
      createNote: source === "background" ? "always" : "prompt",
    });
    if (source !== "page") {
      this.setupPage();
    }
    this.onClassListUpdate();
  }

  /**
   * Get collection description for a specific collection
   */
  static getCollectionDescription(
    collectionId: number | GetByLibraryAndKeyArgs,
  ): string {
    const metadata = SyllabusManager.getSyllabusMetadata(collectionId);
    return metadata.description || "";
  }

  /**
   * Set collection description for a specific collection
   */
  static async setCollectionDescription(
    collectionId: number | GetByLibraryAndKeyArgs,
    description: string,
    source: "page" | "background",
  ): Promise<void> {
    await SyllabusManager.patchCollectionMetadata(
      collectionId,
      { description: description.trim() },
      source,
    );
  }

  /**
   * Get collection institution for a specific collection
   */
  static getInstitution(collectionId: number | GetByLibraryAndKeyArgs): string {
    const metadata = SyllabusManager.getSyllabusMetadata(collectionId);
    return metadata.institution || "";
  }

  /**
   * Set collection institution for a specific collection
   */
  static async setInstitution(
    collectionId: number | GetByLibraryAndKeyArgs,
    institution: string,
    source: "page" | "background",
  ): Promise<void> {
    await SyllabusManager.patchCollectionMetadata(
      collectionId,
      { institution: institution.trim() },
      source,
    );
  }

  /**
   * Get collection course code for a specific collection
   */
  static getCourseCode(collectionId: number | GetByLibraryAndKeyArgs): string {
    const metadata = SyllabusManager.getSyllabusMetadata(collectionId);
    return metadata.courseCode || "";
  }

  /**
   * Set collection course code for a specific collection
   */
  static async setCourseCode(
    collectionId: number | GetByLibraryAndKeyArgs,
    courseCode: string,
    source: "page" | "background",
  ): Promise<void> {
    await SyllabusManager.patchCollectionMetadata(
      collectionId,
      { courseCode: courseCode.trim() },
      source,
    );
  }

  /**
   * Set collection nomenclature for a specific collection
   */
  static async setNomenclature(
    collectionId: number | GetByLibraryAndKeyArgs,
    nomenclature: string,
    source: "page",
  ): Promise<void> {
    await SyllabusManager.patchCollectionMetadata(
      collectionId,
      { nomenclature: nomenclature.trim().toLowerCase() },
      source,
    );
  }

  /**
   * Get collection links for a specific collection
   */
  static getCollectionLinks(
    collectionId: number | GetByLibraryAndKeyArgs,
  ): string[] {
    const metadata = SyllabusManager.getSyllabusMetadata(collectionId);
    return metadata.links || [];
  }

  /**
   * Set collection links for a specific collection
   */
  static async setCollectionLinks(
    collectionId: number | GetByLibraryAndKeyArgs,
    links: string[],
    source: "page",
  ): Promise<void> {
    await SyllabusManager.patchCollectionMetadata(
      collectionId,
      { links: links.map((link) => link.trim()).filter(Boolean) },
      source,
    );
  }

  /**
   * Set collection priorities for a specific collection
   */
  static async setPriorities(
    collectionId: number | GetByLibraryAndKeyArgs,
    priorities: Priority[],
    source: "page" | "background",
  ): Promise<void> {
    await SyllabusManager.patchCollectionMetadata(
      collectionId,
      { priorities },
      source,
    );
  }

  /**
   * Delete a priority and remapping assignments that used it.
   * `remapToPriorityId` null clears those assignments' priority.
   */
  static async deletePriorityAndRemap(
    collectionId: number | GetByLibraryAndKeyArgs,
    priorityId: string,
    remapToPriorityId: string | null,
  ): Promise<void> {
    await deletePriorityAndRemapAssignments(
      collectionId,
      priorityId,
      remapToPriorityId,
    );
  }

  /**
   * Replace priorities and remap assignments whose ids are no longer present.
   * `remaps` maps removed id → new id (or null to clear).
   */
  static async replacePrioritiesAndRemap(
    collectionId: number | GetByLibraryAndKeyArgs,
    nextPriorities: Priority[],
    remaps: ReadonlyMap<string, string | null> = new Map(),
  ): Promise<void> {
    await replacePrioritiesAndRemapAssignments(
      collectionId,
      nextPriorities,
      remaps,
    );
  }

  /**
   * Count assignments using a priority id in this collection's note.
   */
  static countAssignmentsWithPriority(
    collectionId: number | GetByLibraryAndKeyArgs,
    priorityId: string,
  ): number {
    return countAssignmentsWithPriority(
      getCollectionDocument(collectionId),
      priorityId,
    );
  }

  /**
   * Get locked state for a collection
   */
  static getLocked(collectionId: number | GetByLibraryAndKeyArgs): boolean {
    const metadata = this.getSyllabusMetadata(collectionId);
    return metadata.locked || false;
  }

  /**
   * Set locked state for a collection
   */
  static async setLocked(
    collectionId: number | GetByLibraryAndKeyArgs,
    locked: boolean,
    source: "page",
  ): Promise<void> {
    await SyllabusManager.patchCollectionMetadata(
      collectionId,
      { locked },
      source,
    );
  }

  /**
   * Whether class folders should be created and deleted for this syllabus.
   * Only an explicit true enables them.
   */
  static getCreateSubcollections(
    collectionId: number | GetByLibraryAndKeyArgs,
  ): boolean {
    return shouldCreateSubcollections(this.getSyllabusMetadata(collectionId));
  }

  static async setCreateSubcollections(
    collectionId: number | GetByLibraryAndKeyArgs,
    createSubcollections: boolean,
    source: "page",
  ): Promise<void> {
    if (
      createSubcollections &&
      !this.getCreateSubcollections(collectionId) &&
      !confirmEnableSubcollections(collectionId)
    ) {
      return;
    }
    await SyllabusManager.patchCollectionMetadata(
      collectionId,
      { createSubcollections },
      source,
    );
    SyllabusManager.setupToggleButton();
  }

  /**
   * Get CSL style for a specific collection
   */
  static getCslStyle(
    collectionId: number | GetByLibraryAndKeyArgs,
  ): string | null {
    const metadata = this.getSyllabusMetadata(collectionId);
    return metadata.cslStyle || null;
  }

  /**
   * Set CSL style for a specific collection
   */
  static async setCslStyle(
    collectionId: number | GetByLibraryAndKeyArgs,
    cslStyle: string | null,
    source: "page",
  ): Promise<void> {
    await SyllabusManager.patchCollectionMetadata(
      collectionId,
      { cslStyle: cslStyle?.trim() || null },
      source,
    );
  }

  static getClassIdByNumber(
    collectionId: number | GetByLibraryAndKeyArgs,
    classNumber: number,
  ): string | undefined {
    const document = getCollectionDocument(collectionId);
    return findClassIdByNumber(
      document.classes,
      classNumber,
      document.classOrder,
    );
  }

  static getClassByNumber(
    collectionId: number | GetByLibraryAndKeyArgs,
    classNumber: number,
  ) {
    const document = getCollectionDocument(collectionId);
    const classId = findClassIdByNumber(
      document.classes,
      classNumber,
      document.classOrder,
    );
    return classId ? document.classes?.[classId] : undefined;
  }

  static getClassNumber(
    collectionId: number | GetByLibraryAndKeyArgs,
    classId: string | undefined,
  ): number | undefined {
    const document = getCollectionDocument(collectionId);
    return getClassNumberById(document.classes, classId, document.classOrder);
  }

  static async ensureClass(
    collectionId: number | GetByLibraryAndKeyArgs,
    classNumber: number,
  ): Promise<string> {
    let classId = "";
    await mutateCollectionDocument(
      collectionId,
      (document) => {
        const classes = { ...(document.classes || {}) };
        const classOrder = orderedClassIds(document);
        classId = ensureClassRecord(classes, classNumber, classOrder);
        return { ...document, classes, classOrder };
      },
      { createNote: "prompt" },
    );
    return classId;
  }

  static getClassMetadata(
    collectionId: number | GetByLibraryAndKeyArgs,
    classNumber: number,
  ) {
    return (
      classByNumber(
        SyllabusManager.getSyllabusMetadata(collectionId),
        classNumber,
      ) || {}
    );
  }

  /**
   * Get class title for a specific collection and class number
   * Uses caching to avoid repeated preference reads
   */
  static getClassTitle(
    collectionId: number | GetByLibraryAndKeyArgs,
    classNumber: number,
    includeClassNumber: boolean = false,
  ): string {
    const classMetadata = SyllabusManager.getClassMetadata(
      collectionId,
      classNumber,
    );
    const title = classMetadata.title || "";
    if (includeClassNumber) {
      const singularCapitalized =
        SyllabusManager.getNomenclatureFormatted(
          collectionId,
        ).singularCapitalized;
      return `${singularCapitalized} ${classNumber}${title ? `: ${title}` : ""}`;
    }
    return title;
  }

  static async setClassMetadata(
    collectionId: number | GetByLibraryAndKeyArgs,
    classNumber: number,
    metadata: Partial<SettingsClassMetadata>,
    source: "page" | "item-pane",
  ): Promise<void> {
    const parsed = SettingsClassMetadataSchema.partial().safeParse(metadata);
    if (!parsed.success) {
      ztoolkit.log("Error validating class metadata:", parsed.error);
      return;
    }
    await SyllabusManager.patchCollectionMetadata(
      collectionId,
      { classes: { [String(classNumber)]: parsed.data } },
      source,
    );
  }

  /**
   * Set class title for a specific collection and class number
   */
  static async setClassTitle(
    collectionId: number | GetByLibraryAndKeyArgs,
    classNumber: number,
    title: string | null | undefined,
    source: "page" | "item-pane",
  ): Promise<void> {
    await SyllabusManager.setClassMetadata(
      collectionId,
      classNumber,
      { title },
      source,
    );
  }

  /**
   * Get class description for a specific collection and class number
   */
  static getClassDescription(
    collectionId: number | GetByLibraryAndKeyArgs,
    classNumber: number,
  ): string {
    const metadata = SyllabusManager.getClassMetadata(
      collectionId,
      classNumber,
    );
    return metadata.description || "";
  }

  /**
   * Set class description for a specific collection and class number
   */
  static async setClassDescription(
    collectionId: number | GetByLibraryAndKeyArgs,
    classNumber: number,
    description: string | null | undefined,
    source: "page",
  ): Promise<void> {
    await SyllabusManager.setClassMetadata(
      collectionId,
      classNumber,
      { description },
      source,
    );
  }

  /**
   * Get reading date for a specific collection and class number
   * Returns ISO date string or undefined
   */
  static getClassReadingDate(
    collectionId: number | GetByLibraryAndKeyArgs,
    classNumber: number,
  ): SettingsClassMetadata["readingDate"] {
    const metadata = SyllabusManager.getClassMetadata(
      collectionId,
      classNumber,
    );
    return metadata.readingDate;
  }

  /**
   * Set reading date for a specific collection and class number
   * Accepts ISO date string or undefined/null
   */
  static async setClassReadingDate(
    collectionId: number | GetByLibraryAndKeyArgs,
    classNumber: number,
    readingDate: string | null | undefined,
    source: "page" | "item-pane",
  ): Promise<void> {
    await SyllabusManager.setClassMetadata(
      collectionId,
      classNumber,
      // Explicit null so merges overwrite the previous date (omitting the key
      // leaves the existing value in place via object spread).
      { readingDate: readingDate || null },
      source,
    );
  }

  /**
   * Get class status for a specific collection and class number
   */
  static getClassStatus(
    collectionId: number | GetByLibraryAndKeyArgs,
    classNumber: number,
  ): ClassStatus {
    const metadata = SyllabusManager.getClassMetadata(
      collectionId,
      classNumber,
    );
    return metadata.status || null;
  }

  /**
   * Set class status for a specific collection and class number
   */
  static async setClassStatus(
    collectionId: number | GetByLibraryAndKeyArgs,
    classNumber: number,
    status: ClassStatus,
    source: "page" | "item-pane",
  ): Promise<void> {
    await SyllabusManager.setClassMetadata(
      collectionId,
      classNumber,
      { status },
      source,
    );
  }

  /**
   * Create an additional class (even if empty) to extend the range
   * This ensures the class appears in the rendered range
   */
  static async addClass(
    collectionId: number | GetByLibraryAndKeyArgs,
    classNumber: number,
    source: "page",
  ): Promise<void> {
    ztoolkit.log("SyllabusManager.addClass", collectionId, classNumber);
    await mutateCollectionDocument(
      collectionId,
      (document) => {
        const classes = { ...(document.classes || {}) };
        const classOrder = orderedClassIds(document);
        ensureClassRecord(classes, classNumber, classOrder);
        return { ...document, classes, classOrder };
      },
      { createNote: "prompt" },
    );
    this.onClassListUpdate();
  }

  /**
   * Insert an empty class before `classNumber`, shifting later classes down.
   */
  static async insertClassBefore(
    collectionId: number | GetByLibraryAndKeyArgs,
    classNumber: number,
    source: "page",
  ): Promise<void> {
    ztoolkit.log(
      "SyllabusManager.insertClassBefore",
      collectionId,
      classNumber,
    );
    await mutateCollectionDocument(
      collectionId,
      (document) => {
        const classes = { ...(document.classes || {}) };
        const classOrder = orderedClassIds(document);
        insertClassAtIndex(classes, classOrder, classNumber - 1);
        return { ...document, classes, classOrder };
      },
      { createNote: "prompt" },
    );
    this.onClassListUpdate();
  }

  /**
   * Delete a class: drop its metadata and unassign items from it.
   */
  static async deleteClass(
    collectionId: number | GetByLibraryAndKeyArgs,
    classNumber: number,
    source: "page",
  ): Promise<void> {
    ztoolkit.log("SyllabusManager.deleteClass", collectionId, classNumber);
    await mutateCollectionDocument(collectionId, (document) => {
      const classes = { ...(document.classes || {}) };
      const classId = findClassIdByNumber(
        classes,
        classNumber,
        document.classOrder,
      );
      if (classId) {
        delete classes[classId];
      }
      const classOrder = orderedClassIds({
        classes,
        classOrder: document.classOrder,
      });
      const items: typeof document.items = {};
      for (const [itemKey, assignments] of Object.entries(
        document.items || {},
      )) {
        const remaining = assignments.filter((assignment) => {
          if (classId && assignment.classId === classId) {
            return false;
          }
          return assignment.classNumber !== classNumber;
        });
        if (remaining.length) {
          items[itemKey] = remaining;
        }
      }
      return { ...document, classes, classOrder, items };
    });
    this.onClassListUpdate();
  }

  /**
   * Swap two classes in list order. Display numbers follow index; assignments
   * keep their classId, so readings and folders stay with the class identity.
   */
  static async swapClasses(
    collectionId: number | GetByLibraryAndKeyArgs,
    classNumberA: number,
    classNumberB: number,
  ): Promise<void> {
    if (classNumberA === classNumberB) {
      return;
    }
    ztoolkit.log(
      "SyllabusManager.swapClasses",
      collectionId,
      classNumberA,
      classNumberB,
    );
    await mutateCollectionDocument(collectionId, (document) => {
      const classOrder = [...orderedClassIds(document)];
      const indexA = classNumberA - 1;
      const indexB = classNumberB - 1;
      if (
        indexA < 0 ||
        indexB < 0 ||
        indexA >= classOrder.length ||
        indexB >= classOrder.length
      ) {
        return document;
      }
      const swapped = classOrder[indexA];
      classOrder[indexA] = classOrder[indexB];
      classOrder[indexB] = swapped;
      return { ...document, classOrder };
    });
    this.onClassListUpdate();
  }

  static async moveClass(
    collectionId: number | GetByLibraryAndKeyArgs,
    classNumber: number,
    direction: "up" | "down",
    _source: "page",
  ): Promise<void> {
    const range = this.getFullClassNumberRange(collectionId);
    const index = range.indexOf(classNumber);
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (index < 0 || targetIndex < 0 || targetIndex >= range.length) {
      return;
    }
    await this.swapClasses(collectionId, classNumber, range[targetIndex]);
  }

  /**
   * Get nomenclature for a collection (defaults to "class")
   */
  static getNomenclature(
    collectionId: number | GetByLibraryAndKeyArgs,
  ): string {
    const metadata = this.getSyllabusMetadata(collectionId);
    return metadata.nomenclature || "class";
  }

  /**
   * Get formatted nomenclature for a collection
   */
  static getNomenclatureFormatted(
    collectionId: number | GetByLibraryAndKeyArgs,
  ): {
    singular: string;
    plural: string;
    singularCapitalized: string;
    pluralCapitalized: string;
  } {
    const singular = SyllabusManager.getNomenclature(collectionId);
    const plural = pluralize(singular);

    return {
      singular,
      plural,
      singularCapitalized: singular.charAt(0).toUpperCase() + singular.slice(1),
      pluralCapitalized: plural.charAt(0).toUpperCase() + plural.slice(1),
    };
  }

  /**
   * Get default priorities (global pref, or built-in locale-aware defaults).
   */
  static getDefaultPriorities(): Priority[] {
    return getGlobalDefaultPriorities();
  }

  /**
   * Get priorities for a collection (custom or default)
   */
  static getPrioritiesForCollection(
    collectionId: number | GetByLibraryAndKeyArgs,
  ): Priority[] {
    const metadata = this.getSyllabusMetadata(collectionId);
    if (metadata.priorities && metadata.priorities.length > 0) {
      // Sort by order
      return [...metadata.priorities].sort((a, b) => a.order - b.order);
    }
    return this.getDefaultPriorities();
  }

  /**
   * Get priority order for a specific priority in a collection
   */
  static getPriorityOrderForCollection(
    collectionId: number | GetByLibraryAndKeyArgs,
    priority: string | "" | null | undefined,
  ): number {
    if (!priority) {
      return 999; // No priority = lowest
    }
    const priorities = this.getPrioritiesForCollection(collectionId);
    const customPriority = priorities.find((p) => p.id === priority);
    return customPriority?.order ?? 999;
  }

  /**
   * Get priority color for a specific priority in a collection
   */
  static getPriorityColorForCollection(
    collectionId: number | GetByLibraryAndKeyArgs,
    priority: string | "" | undefined,
  ): string {
    if (!priority) {
      return "#AAA";
    }
    const priorities = this.getPrioritiesForCollection(collectionId);
    const customPriority = priorities.find((p) => p.id === priority);
    return customPriority?.color ?? "#AAA";
  }

  /**
   * Get priority label for a specific priority in a collection
   */
  static getPriorityLabelForCollection(
    collectionId: number | GetByLibraryAndKeyArgs,
    priority: string | "" | undefined,
  ): string {
    if (!priority) {
      return "";
    }
    const priorities = this.getPrioritiesForCollection(collectionId);
    const customPriority = priorities.find((p) => p.id === priority);
    return customPriority?.name ?? "";
  }

  /**
   * Get priority color and label for a collection
   * Returns both in a single call to avoid duplicate lookups
   */
  static getPriorityDisplay(
    collectionId: number | GetByLibraryAndKeyArgs | undefined,
    id: string | undefined,
  ): { color: string; label: string; value: string } {
    if (!id) {
      return { color: "#AAA", label: "", value: "" };
    }

    if (collectionId !== undefined) {
      return {
        color: this.getPriorityColorForCollection(collectionId, id),
        label: this.getPriorityLabelForCollection(collectionId, id),
        value: id,
      };
    }

    // Fall back to default priorities when no collection is provided
    const defaultPriority = DEFAULT_PRIORITIES.find((p) => p.id === id);
    return {
      color: defaultPriority?.color ?? "#AAA",
      label: defaultPriority?.name ?? "",
      value: id,
    };
  }

  /**
   * Render a priority dot element (for DOM manipulation contexts like column rendering)
   */
  static createPriorityDot(
    doc: Document,
    color: string,
    size: number = 8,
  ): HTMLElement {
    const dot = doc.createElement("span");
    dot.style.width = `${size}px`;
    dot.style.height = `${size}px`;
    dot.style.borderRadius = "50%";
    dot.style.backgroundColor = color;
    dot.style.flexShrink = "0";
    return dot;
  }

  /**
   * Render a priority label element (for DOM manipulation contexts like column rendering)
   */
  static createPriorityLabel(doc: Document, label: string): HTMLElement {
    const labelElement = doc.createElement("span");
    labelElement.textContent = label;
    return labelElement;
  }

  /**
   * Render a complete priority display (dot + label) for DOM manipulation contexts
   */
  static createPriorityDisplay(
    doc: Document,
    collectionId: number | GetByLibraryAndKeyArgs | undefined,
    priority: string | "" | undefined,
    options?: {
      dotSize?: number;
      showDot?: boolean;
    },
  ): HTMLElement[] {
    const { color, label } = this.getPriorityDisplay(collectionId, priority);
    if (!label) {
      return [];
    }

    const elements: HTMLElement[] = [];
    const { dotSize = 8, showDot = true } = options || {};

    if (showDot) {
      elements.push(this.createPriorityDot(doc, color, dotSize));
    }
    elements.push(this.createPriorityLabel(doc, label));

    return elements;
  }

  /**
   * Open and render the reading list tab
   */
  static openReadingListTab() {
    if (!isOptionalFeatureEnabled("readingSchedule")) {
      return;
    }
    const win = Zotero.getMainWindow();
    if (this.readingScheduleTab) {
      this.readingScheduleTab.open(win);
      this.syncReadingScheduleTabIcon(win);
      this.updateReadingScheduleTabBarButton(win);
    }
  }

  /**
   * Open and render the My Annotations tab for a library
   */
  static openMyAnnotationsTab(libraryID: number) {
    if (!isOptionalFeatureEnabled("annotations")) {
      return;
    }
    const win = Zotero.getMainWindow();
    this.myAnnotationsTab.open(win, { libraryID });
    this.syncMyAnnotationsTabIcon(win);
    this.updateMyAnnotationsTabBarButton(win);
  }

  static openMyAnnotationsTabForCurrentLibrary() {
    const libraryID = getSelectedLibraryID() ?? Zotero.Libraries.userLibraryID;
    this.openMyAnnotationsTab(libraryID);
  }

  /**
   * Deep merge function for merging imported metadata with existing metadata
   * Arrays are replaced entirely, objects are merged recursively
   */
  static deepMergeMetadata(
    existing: SettingsSyllabusMetadata,
    imported: SettingsSyllabusMetadata,
  ): SettingsSyllabusMetadata {
    const merged: SettingsSyllabusMetadata = { ...existing };
    const {
      description,
      classes,
      nomenclature,
      priorities,
      locked,
      createSubcollections,
      ...restOfImported
    } = imported;

    // Merge description (imported takes precedence if provided)
    if (imported.description !== undefined) {
      merged.description = imported.description;
    }

    // Merge classes object (merge class by class)
    if (imported.classes) {
      merged.classes = { ...existing.classes };
      for (const [classKey, classData] of Object.entries(imported.classes)) {
        if (classData) {
          merged.classes[classKey] = {
            ...(existing.classes?.[classKey] || {}),
            ...classData,
            // Merge itemOrder arrays (imported replaces existing)
            itemOrder:
              classData.itemOrder || existing.classes?.[classKey]?.itemOrder,
          };
        }
      }
    }

    // Replace nomenclature if provided
    if (imported.nomenclature !== undefined) {
      merged.nomenclature = imported.nomenclature;
    }

    // Replace priorities array entirely if provided
    if (imported.priorities !== undefined) {
      merged.priorities = imported.priorities;
    }

    // Replace locked status if provided
    if (imported.locked !== undefined) {
      merged.locked = imported.locked;
    }

    if (imported.createSubcollections !== undefined) {
      merged.createSubcollections = imported.createSubcollections;
    }

    for (const key in restOfImported) {
      // @ts-expect-error - key is a valid key in SettingsSyllabusMetadata
      merged[key] = restOfImported[key];
    }

    return merged;
  }

  /**
   * Export the collection as Zotero RDF, including the syllabus note.
   */
  static async prepareExportData(
    collectionId: number | GetByLibraryAndKeyArgs,
    _collectionTitle?: string,
  ): Promise<string> {
    const collection = this.getCollectionFromIdentifier(collectionId);
    if (!collection) {
      throw new Error("prepareExportData: Collection not found");
    }
    await mutateCollectionDocument(collectionId, (document) => ({
      ...document,
      itemIndex: buildItemIndex(collection, document),
    }));
    const rdf = await getRDFStringForCollection(collection);
    if (typeof rdf !== "string" || !rdf) {
      throw new Error("prepareExportData: RDF export did not return a string");
    }
    return rdf;
  }

  /**
   * Import a .syllabus file (collection RDF with syllabus note), note HTML,
   * or legacy JSON / Talis metadata.
   */
  static async importSyllabusMetadata(
    collectionId: number | GetByLibraryAndKeyArgs,
    importedContents: string,
    source: "page" | "background" = "page",
  ): Promise<{
    collectionAndLibraryKey: string;
    syllabusData: SettingsSyllabusMetadata;
  }> {
    const targetCollection = this.getCollectionFromIdentifier(collectionId);
    if (!targetCollection) {
      throw new Error("importSyllabusMetadata: Target collection not found");
    }

    if (isRdfFile(importedContents)) {
      return this.importSyllabusRdf(targetCollection, importedContents, source);
    }

    if (isSyllabusNoteFile(importedContents)) {
      const document = parseSyllabusNote(importedContents);
      if (!document) {
        throw new Error(
          "importSyllabusMetadata: The file is not a valid syllabus note",
        );
      }
      const saved = await mutateCollectionDocument(
        collectionId,
        () => document,
        { createNote: "always" },
      );
      if (source !== "page") {
        this.setupPage();
      }
      this.onClassListUpdate();
      return {
        collectionAndLibraryKey: this.getCollectionReferenceString(
          targetCollection.libraryID,
          targetCollection.key,
        ),
        syllabusData: metadataFromDocument(saved),
      };
    }

    return this.importLegacySyllabusMetadata(
      targetCollection,
      importedContents,
      source,
    );
  }

  private static async importSyllabusRdf(
    targetCollection: Zotero.Collection,
    rdfString: string,
    source: "page" | "background",
  ): Promise<{
    collectionAndLibraryKey: string;
    syllabusData: SettingsSyllabusMetadata;
  }> {
    const importedItems = await importRDF(rdfString);
    const syllabusNotes: Zotero.Item[] = [];
    const otherItems: Zotero.Item[] = [];
    for (const item of importedItems) {
      if (!item) {
        continue;
      }
      const noteHtml = readItemNote(item);
      if (noteHtml && parseSyllabusNote(noteHtml)) {
        syllabusNotes.push(item);
      } else {
        otherItems.push(item);
      }
    }

    for (const item of otherItems) {
      if (!itemBelongsInCollection(item, targetCollection)) {
        continue;
      }
      item.addToCollection(targetCollection.id);
      await item.saveTx();
    }

    let importedDocument = syllabusNotes
      .map((note) => parseSyllabusNote(readItemNote(note)))
      .find((document) => document);
    if (importedDocument) {
      importedDocument = remapDocumentItemKeys(importedDocument, otherItems);
      await mutateCollectionDocument(
        targetCollection,
        () => importedDocument!,
        {
          createNote: "always",
        },
      );
    }

    await absorbSyllabusExtraFromItems(otherItems);

    for (const note of syllabusNotes) {
      try {
        note.deleted = true;
        await note.saveTx();
      } catch (error) {
        ztoolkit.log(
          "Could not remove duplicate imported syllabus note:",
          error,
        );
      }
    }

    if (source !== "page") {
      this.setupPage();
    }
    this.onClassListUpdate();
    return {
      collectionAndLibraryKey: this.getCollectionReferenceString(
        targetCollection.libraryID,
        targetCollection.key,
      ),
      syllabusData: this.getSyllabusMetadata(targetCollection.id),
    };
  }

  /**
   * Talis translator JSON and older .syllabus files (number-keyed classes, RDF).
   */
  private static async importLegacySyllabusMetadata(
    targetCollection: Zotero.Collection,
    importedJsonString: string,
    source: "page" | "background",
  ): Promise<{
    collectionAndLibraryKey: string;
    syllabusData: SettingsSyllabusMetadata;
  }> {
    let parsedData: unknown;
    try {
      parsedData = JSON.parse(importedJsonString);
    } catch (parseError) {
      throw new Error(
        `importSyllabusMetadata: The file is not a valid syllabus note or JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
        { cause: parseError },
      );
    }

    const validationResult = ExportSyllabusMetadataSchema.safeParse(parsedData);
    if (!validationResult.success) {
      throw new Error(
        `importSyllabusMetadata: The file does not match the expected syllabus metadata format: ${validationResult.error.message}`,
      );
    }

    const exportData = validationResult.data;
    const {
      collectionTitle,
      rdf,
      items: exportedItems,
      ...metadataData
    } = exportData;
    const collectionId = targetCollection.id;

    // Update collection title if provided
    if (collectionTitle) {
      this.setCollectionTitle(targetCollection.id, collectionTitle, source);
    }

    // Import RDF items if present
    if (rdf) {
      try {
        const importedItems = await importRDF(rdf);
        ztoolkit.log(
          "importSyllabusMetadata: Imported RDF items:",
          importedItems,
        );

        if (importedItems.length > 0) {
          // Ensure all items have IDs (they should already be saved by the import process)
          const itemIDs = importedItems
            .map((item) => item.id)
            .filter((id): id is number => id !== undefined);

          if (itemIDs.length === 0) {
            ztoolkit.log(
              "importSyllabusMetadata: No valid item IDs found in imported items",
            );
          } else {
            ztoolkit.log(
              `importSyllabusMetadata: Adding ${itemIDs.length} items to collection`,
            );

            // Add items to the target collectio
            ztoolkit.log(
              "importSyllabusMetadata: Adding items to collection:",
              targetCollection,
              importedItems,
            );
            for (const item of importedItems) {
              if (!itemBelongsInCollection(item, targetCollection)) {
                continue;
              }
              item.addToCollection(targetCollection.id);
              await item.saveTx();
            }

            // Wait a moment for the collection to update
            await Zotero.Promise.delay(200);

            // Verify items are in the collection
            const collectionItemIDs = targetCollection
              .getChildItems()
              .filter((item) => item.isRegularItem())
              .map((item) => item.id);

            const itemsInCollection = itemIDs.filter((id: number) =>
              collectionItemIDs.includes(id),
            );

            if (itemsInCollection.length !== itemIDs.length) {
              ztoolkit.log(
                `importSyllabusMetadata: Warning: Only ${itemsInCollection.length} of ${itemIDs.length} items were added to collection`,
              );
              ztoolkit.log(
                `importSyllabusMetadata: Expected IDs: ${itemIDs.join(", ")}`,
              );
              ztoolkit.log(
                `importSyllabusMetadata: Collection IDs: ${collectionItemIDs.join(", ")}`,
              );
            }

            ztoolkit.log(
              `importSyllabusMetadata: Added ${itemsInCollection.length} items to collection`,
            );
          }

          // Absorb Extra payloads (Talis/RDF transport) into the collection note.
          await absorbSyllabusExtraFromItems(importedItems);
        }
      } catch (error) {
        // Log error but don't fail the entire import
        // Metadata import should still proceed
        ztoolkit.log(
          "importSyllabusMetadata: Error importing RDF items (continuing with metadata import):",
          error,
        );
      }
    }

    // Validate the metadata part against SettingsSyllabusMetadataSchema
    // (to ensure it's compatible with our internal format)
    const metadataValidation =
      SettingsSyllabusMetadataSchema.safeParse(metadataData);
    if (!metadataValidation.success) {
      throw new Error(
        `importSyllabusMetadata: The metadata in the file is invalid: ${metadataValidation.error.message}`,
      );
    }

    // Get current metadata and merge with imported data
    const existingMetadata = this.getSyllabusMetadata(collectionId);
    ztoolkit.log("importSyllabusMetadata: metadata before merge:", {
      metadataData,
      existingMetadata,
    });
    const mergedMetadata = this.deepMergeMetadata(
      existingMetadata,
      metadataValidation.data,
    );
    ztoolkit.log("importSyllabusMetadata: metadata after merge:", {
      mergedMetadata,
    });

    // Save merged metadata
    await this.setCollectionMetadata(
      collectionId,
      mergedMetadata,
      "background",
    );

    if (exportedItems && Object.keys(exportedItems).length > 0) {
      const collectionItemKeys = new Set(
        targetCollection
          .getChildItems()
          .filter((item) => item.isRegularItem())
          .map((item) => item.key),
      );
      const matchingItems: Record<string, (typeof exportedItems)[string]> = {};
      for (const [itemKey, assignments] of Object.entries(exportedItems)) {
        if (collectionItemKeys.has(itemKey) && assignments?.length) {
          matchingItems[itemKey] = assignments.map((assignment) => ({
            ...assignment,
            status: null,
          }));
        }
      }
      if (Object.keys(matchingItems).length > 0) {
        await mergeItemAssignmentsInDocument(targetCollection, matchingItems);
      }
    }

    return {
      collectionAndLibraryKey: this.getCollectionReferenceString(
        targetCollection.libraryID,
        targetCollection.key,
      ),
      syllabusData: mergedMetadata,
    };
  }
}
