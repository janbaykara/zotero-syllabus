import slugify from "slugify";
/**
 * Syllabus Manager - Core functionality for syllabus view and metadata
 */

import { getLocaleID, getString, compareLocale } from "../utils/locale";
import type { FluentMessageId } from "../../typings/i10n";
import { renderSyllabusPage } from "./SyllabusPage";
import { renderGalleryPage } from "./GalleryPage";
import { setGalleryGroupBy } from "./galleryGroupBy";
import {
  getSelectedCollection,
  itemBelongsInCollection,
} from "../utils/zotero";
import { getCurrentTab, confirmPrompt } from "../utils/window";
import { renderComponent, unmountComponent } from "../utils/react";
import { ItemPane } from "./ItemPane";
import { h } from "preact";
import { uuidv7 } from "uuidv7";
import pluralize from "pluralize";
import { getPref } from "../utils/prefs";
import { ReadingSchedule } from "./ReadingSchedule";
import { parseXULTemplate } from "../utils/ui";
import { TabManager } from "../utils/tabManager";
import { FEATURE_FLAG } from "./featureFlags";
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
} from "./syllabusNote";
import { getItemTitle, readItemNote } from "../utils/items";
import { migrateLegacyCollectionMetadataPrefs } from "./migratePrefsToNotes";
import {
  getReadingScheduleCollectionContext,
  isManagedReadingScheduleCollection,
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

export type CollectionViewMode = "collection" | "gallery" | "syllabus";

const COLLECTION_VIEW_MODES: CollectionViewMode[] = [
  "collection",
  "gallery",
  "syllabus",
];

const CUSTOM_COLLECTION_VIEW_MODES: CollectionViewMode[] = [
  "gallery",
  "syllabus",
];

const CollectionViewModeSchema = z.enum([
  "collection",
  "gallery",
  "syllabus",
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
  if (getCollectionTreeKind(collection.id) !== "syllabus") {
    return {
      label: getString("view-tab-create-syllabus"),
      tooltip: getString("view-tab-create-syllabus-tooltip"),
    };
  }
  return {
    label: getString("view-tab-syllabus"),
    tooltip: getString("view-tab-syllabus-tooltip"),
  };
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
  return assignmentClassNumber(
    assignment,
    getCollectionDocument(collectionId).classes,
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

export class SyllabusManager {
  static notifierID: string | null = null;
  static syllabusItemPaneSection: false | string | null = null;
  static readingsTabPanelID: string | null = null;

  static readingScheduleTab = tabManager;

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
    void migrateLegacyCollectionMetadataPrefs().catch((error) => {
      ztoolkit.log(
        "Error migrating collectionMetadata prefs to syllabus notes:",
        error,
      );
    });
    this.registerPrefs();
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

  static onMainWindowLoad(win: _ZoteroTypes.MainWindow) {
    ztoolkit.log("SyllabusManager.onMainWindowLoad", win);
    this.registerContextualMenus();
    this.setupUI();
    this.setupSyllabusViewTabListener();
    this.setupSyllabusViewReloadListener();
    applyManagedCollectionTree(win);
    this.syncReadingScheduleTabIcon(win);
    void whenSyllabusNotesReady().then(() => {
      applyManagedCollectionTree(win);
      refreshManagedCollectionTrees();
      this.syncReadingScheduleTabIcon(win);
      this.setupToggleButton();
    });

    // Re-render reading list tab if it exists (for hot reload)
    // Use a small delay to ensure tabs are initialized
    Zotero.Promise.delay(100).then(() => {
      applyManagedCollectionTree(win);
      this.syncReadingScheduleTabIcon(win);
      if (this.readingScheduleTab) {
        ztoolkit.log(
          "SyllabusManager.onMainWindowLoad: rerendering reading schedule tab",
        );
        this.readingScheduleTab.renderAllTabs(win);
      }
    });
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
      if (existing?.tab) {
        existing.tab.data = { ...existing.tab.data, icon: "calendar" };
      }
      tabs._update();
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
    this.cleanupSyllabusViewTabListener();
    if (this.readingScheduleTab) {
      this.readingScheduleTab.cleanupAll();
    }
  }

  static onShutdown() {
    ztoolkit.log("SyllabusManager.onShutdown");
    unregisterCustomIconsPrefObserver();
    this.unregisterNotifier();
    for (const mainWindow of Zotero.getMainWindows() as _ZoteroTypes.MainWindow[]) {
      this.unpatchReadingScheduleTabBar(mainWindow);
      unpatchManagedCollectionTree(mainWindow);
      removeManagedCollectionBanner(mainWindow);
    }
    unpatchManagedCollectionTreePrototype();
    shutdownSyllabusNotes();
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
    });
  }

  // Listen for tab changes and refresh syllabus view
  // Initial setup
  static syllabusViewTabListener: NodeJS.Timeout | null = null;

  static setupSyllabusViewTabListener() {
    ztoolkit.log("SyllabusManager.setupSyllabusViewTabListener");
    let selectedCollectionId = getSelectedCollection()?.id.toString() || "";
    let currentTabId = getCurrentTab()?.id || "";
    const interval = setInterval(async () => {
      const collection = getSelectedCollection();
      const currentCollectionId = collection?.id.toString() || "";
      const tab = getCurrentTab();
      const newTabId = tab?.id || "";

      const collectionChanged = currentCollectionId !== selectedCollectionId;
      const tabChanged = newTabId !== currentTabId;

      if (collectionChanged) {
        ztoolkit.log(
          "Selected collection changed",
          collection?.id || "My Library",
        );
        selectedCollectionId = currentCollectionId;
        currentTabId = newTabId; // Update tab ID when collection changes
        // setupUI() calls setupPage() which re-renders React component for new collection
        // Once mounted, React stores handle all data updates automatically
        SyllabusManager.setupUI();
        // Update button visibility when collection changes
        SyllabusManager.updateButtonVisibility();
        // Reload context menus for the new collection
        SyllabusManager.registerContextualMenus();
      } else if (tabChanged) {
        ztoolkit.log("Tab changed", newTabId);
        currentTabId = newTabId;
        // Update button visibility when tab changes
        SyllabusManager.updateButtonVisibility();
      }
    }, 300);
    this.syllabusViewTabListener = interval;
  }

  static setupSyllabusViewReloadListener() {
    // Re-render custom view when collection or sort changes
    // setupUI() calls setupPage() which re-renders React component
    // Once mounted, React stores handle all data updates automatically
    const pane = ztoolkit.getGlobal("ZoteroPane");
    if (pane) {
      pane.addReloadListener(() => {
        Zotero.Promise.delay(100).then(() => {
          SyllabusManager.setupUI();
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
    const selectedCollection = getSelectedCollection();

    // If no collection is selected, default to collection (tree) view
    if (!selectedCollection) {
      return "collection";
    }

    if (getReadingScheduleCollectionContext(selectedCollection.id)) {
      return "syllabus";
    }

    const collectionId = String(selectedCollection.id);
    const prefKey = SyllabusManager.getPreferenceKey(
      SyllabusSettingsKey.COLLECTION_VIEW_MODES,
    );
    // Accept legacy booleans and current string modes
    const viewModes =
      getCachedPref(prefKey, z.record(z.string(), z.unknown())) || {};

    const stored = viewModes[collectionId];
    if (migrateLegacyBrowseViewMode(selectedCollection, stored)) {
      viewModes[collectionId] = "gallery";
      Zotero.Prefs.set(prefKey, JSON.stringify(viewModes), true);
      zoteroCache.invalidatePref(prefKey);
      return "gallery";
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
    // Class folders and reading-schedule collections open as Checklist.
    if (isAutoManagedCollection(selectedCollection.id)) {
      return "syllabus";
    }
    return "collection";
  }

  static coerceViewModeForCollection(
    _collection: Zotero.Collection,
    value: unknown,
  ): CollectionViewMode {
    return coerceCollectionViewMode(value);
  }

  static async setCollectionViewMode(mode: CollectionViewMode): Promise<void> {
    const selectedCollection = getSelectedCollection();

    // If no collection is selected, don't save preference
    if (!selectedCollection) {
      return;
    }

    if (mode === "syllabus") {
      const enabled = await ensureSyllabusNoteForUser(selectedCollection);
      if (!enabled) {
        return;
      }
    }

    this.writeCollectionViewMode(selectedCollection, mode);
  }

  static writeCollectionViewMode(
    selectedCollection: Zotero.Collection,
    mode: CollectionViewMode,
  ): void {
    const collectionId = String(selectedCollection.id);
    const prefKey = SyllabusManager.getPreferenceKey(
      SyllabusSettingsKey.COLLECTION_VIEW_MODES,
    );
    const viewModes =
      getCachedPref(prefKey, z.record(z.string(), z.unknown())) || {};

    viewModes[collectionId] = mode;
    Zotero.Prefs.set(prefKey, JSON.stringify(viewModes), true);
    zoteroCache.invalidatePref(prefKey);
  }

  static async cycleCollectionViewMode(): Promise<CollectionViewMode> {
    const modes = COLLECTION_VIEW_MODES;
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

  // Function to create/update the view-mode radio control
  static setupToggleButton() {
    const w = Zotero.getMainWindow();
    const doc = w.document;

    // Find the items toolbar
    const itemsToolbar = doc.getElementById("zotero-items-toolbar");
    if (!itemsToolbar) return;

    // Find the search spinner to insert before it
    const searchSpinner = doc.getElementById("zotero-tb-search-spinner");

    // Remove legacy / duplicate toolbar controls (IDs can be duplicated after hot reload)
    for (const el of Array.from(
      doc.querySelectorAll(
        "#syllabus-view-toggle, #syllabus-view-mode-group, .syllabus-view-mode-button, #syllabus-reading-schedule-button, #syllabus-collection-reading-schedule-button",
      ),
    ) as Element[]) {
      el.remove();
    }

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
      {
        mode: "gallery",
        label: getString("view-tab-gallery"),
        tooltip: getString("view-tab-gallery-tooltip"),
      },
      {
        mode: "syllabus",
        ...(syllabusViewModeChrome() ?? {
          label: getString("view-tab-syllabus"),
          tooltip: getString("view-tab-syllabus-tooltip"),
        }),
      },
    ];

    const viewModeButtons: XULButtonElement[] = [];
    for (const option of viewModeOptions) {
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
              void (async () => {
                await SyllabusManager.setCollectionViewMode(option.mode);
                SyllabusManager.updateViewModeButtons();
                SyllabusManager.updateButtonVisibility();
                await SyllabusManager.setupPage();
              })();
            },
          },
        ],
      });
      viewModeButtons.push(button);
    }

    let readingScheduleButton: XULButtonElement | null = null;
    let collectionReadingScheduleButton: XULButtonElement | null = null;

    if (FEATURE_FLAG.READING_SCHEDULE) {
      readingScheduleButton = ztoolkit.UI.createElement(doc, "toolbarbutton", {
        id: "syllabus-reading-schedule-button",
        classList: ["syllabus-toolbar-button"],
        properties: {
          label: getString("toolbar-reading-schedule-review"),
          tooltiptext: getString("toolbar-reading-schedule-open"),
        },
        listeners: [
          {
            type: "click",
            listener: () => {
              SyllabusManager.openReadingListTab();
            },
          },
        ],
      });

      collectionReadingScheduleButton = ztoolkit.UI.createElement(
        doc,
        "toolbarbutton",
        {
          id: "syllabus-collection-reading-schedule-button",
          classList: ["syllabus-toolbar-button"],
          properties: {
            label: getString("view-tab-reading-schedule"),
            tooltiptext: getString("toolbar-reading-schedule-open"),
          },
          listeners: [
            {
              type: "click",
              listener: () => {
                SyllabusManager.openReadingListTab();
              },
            },
          ],
        },
      );
    }

    let spacer = doc.getElementById("syllabus-view-spacer") as Element | null;
    if (!spacer) {
      spacer = doc.createElementNS(
        "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul",
        "spacer",
      );
      spacer.id = "syllabus-view-spacer";
      spacer.setAttribute("flex", "1");
    }

    const insertBefore = (el: Element) => {
      if (searchSpinner && searchSpinner.parentNode) {
        searchSpinner.parentNode.insertBefore(el, searchSpinner);
      } else {
        itemsToolbar.appendChild(el);
      }
    };

    for (const button of viewModeButtons) {
      insertBefore(button);
    }
    if (collectionReadingScheduleButton) {
      insertBefore(collectionReadingScheduleButton);
    }
    if (readingScheduleButton) {
      insertBefore(readingScheduleButton);
    }
    if (!spacer.parentNode) {
      insertBefore(spacer);
    }

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

  // Function to update button visibility based on current state
  static updateButtonVisibility() {
    const w = Zotero.getMainWindow();
    const doc = w.document;

    const viewModeButtons = Array.from(
      doc.querySelectorAll(".syllabus-view-mode-button"),
    ) as XULButtonElement[];
    const readingScheduleButton = doc.getElementById(
      "syllabus-reading-schedule-button",
    ) as XULButtonElement | null;
    const collectionReadingScheduleButton = doc.getElementById(
      "syllabus-collection-reading-schedule-button",
    ) as XULButtonElement | null;

    if (!viewModeButtons.length) return;

    const selectedCollection = getSelectedCollection();
    const currentTab = getCurrentTab();
    const isInMainLibrary = !selectedCollection;
    const isCustomTab =
      currentTab?.type === "syllabus" || currentTab?.type === "reading-list";
    const shouldShowReadingSchedule =
      FEATURE_FLAG.READING_SCHEDULE && isInMainLibrary && !isCustomTab;
    const readingScheduleContext = selectedCollection
      ? getReadingScheduleCollectionContext(selectedCollection.id)
      : null;

    for (const button of viewModeButtons) {
      if (shouldShowReadingSchedule || readingScheduleContext) {
        button.hidden = true;
        continue;
      }
      button.hidden = false;
    }

    if (!FEATURE_FLAG.READING_SCHEDULE) {
      if (readingScheduleButton) readingScheduleButton.hidden = true;
      if (collectionReadingScheduleButton) {
        collectionReadingScheduleButton.hidden = true;
      }
      return;
    }

    if (readingScheduleButton) {
      readingScheduleButton.hidden = !shouldShowReadingSchedule;
    }
    if (collectionReadingScheduleButton) {
      collectionReadingScheduleButton.hidden =
        !selectedCollection ||
        shouldShowReadingSchedule ||
        readingScheduleContext?.kind === "root";
    }
  }

  // Function to render a completely custom syllabus view
  static async setupPage() {
    ztoolkit.log("SyllabusManager.setupPage");
    try {
      /**
       * Lead with a hide/show check
       */

      // Get collection
      const selectedCollection = getSelectedCollection();

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
      if (
        viewMode === "syllabus" &&
        selectedCollection &&
        !isManagedReadingScheduleCollection(selectedCollection.id) &&
        !collectionHasSyllabusNote(selectedCollection)
      ) {
        await mutateCollectionDocument(
          selectedCollection,
          (document) => document,
          { createNote: "legacy" },
        );
        if (!collectionHasSyllabusNote(selectedCollection)) {
          SyllabusManager.writeCollectionViewMode(
            selectedCollection,
            "collection",
          );
          SyllabusManager.updateViewModeButtons();
        }
      }
      const resolvedViewMode = SyllabusManager.getCollectionViewMode();
      const shouldShowCustomView =
        !!selectedCollection &&
        CUSTOM_COLLECTION_VIEW_MODES.includes(resolvedViewMode);

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
        if (customView && selectedCollection) {
          if (resolvedViewMode === "gallery") {
            renderGalleryPage(w, customView, selectedCollection.id);
          } else {
            renderSyllabusPage(w, customView, selectedCollection.id);
          }
        }
      }

      updateManagedCollectionBanner(w, {
        collectionId: selectedCollection?.id ?? null,
        itemsListVisible: !shouldShowCustomView,
      });
    } catch (e) {
      ztoolkit.log("Error in setupPage:", e);
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
   * Display numbers for classes that exist on the collection document.
   * Empty classes from Add Class are included; deleted middle classes stay
   * as gaps (not filled back in as 1..max).
   */
  static getFullClassNumberRange(
    collectionId: number | GetByLibraryAndKeyArgs,
  ): number[] {
    const document = getCollectionDocument(collectionId);
    const classNumbers = new Set<number>();
    for (const meta of Object.values(document.classes || {})) {
      if (meta?.number) {
        classNumbers.add(meta.number);
      }
    }
    return Array.from(classNumbers).sort((a, b) => a - b);
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

    // Check for manual order if item and collectionId are provided
    let manualOrderPosition: string | null = null;
    let hasManualOrder = false;
    if (
      item &&
      collectionId !== undefined &&
      hasClassNumber &&
      classNumber !== undefined
    ) {
      const manualOrder = this.getClassItemOrder(collectionId, classNumber);
      if (manualOrder.length > 0 && assignment.id) {
        hasManualOrder = true;
        const position = manualOrder.indexOf(assignment.id);
        if (position !== -1) {
          // Use position in manual order (padded to ensure proper sorting)
          // Lower numbers come first, so we pad with zeros
          manualOrderPosition = String(position).padStart(6, "0");
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

    const newEntry = ItemSyllabusAssignmentEntity.safeParse({
      classNumber,
      ...metadata,
    });
    if (newEntry.type !== "ok") {
      ztoolkit.log("Error adding new assignment:", newEntry.error);
      return;
    }
    assignments.push(newEntry.value);
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
   * Get manual ordering of items for a specific class
   * Returns array of itemIds in display order, or empty array if no manual order
   */
  static getClassItemOrder(
    collectionId: number | GetByLibraryAndKeyArgs,
    classNumber: number | null,
  ): string[] {
    const metadata = this.getSyllabusMetadata(collectionId);
    if (!metadata.classes) {
      return [];
    }
    const classKey = classNumber === null ? "null" : String(classNumber);
    return metadata.classes[classKey]?.itemOrder || [];
  }

  /**
   * Set manual ordering of items for a specific class
   */
  static async setClassItemOrder(
    collectionId: number | GetByLibraryAndKeyArgs,
    classNumber: number,
    itemIds: string[],
    source: "page" | "item-pane" = "page",
  ): Promise<void> {
    await this.setClassMetadata(
      collectionId,
      classNumber,
      { itemOrder: itemIds },
      source,
    );
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
    return findClassIdByNumber(
      getCollectionDocument(collectionId).classes,
      classNumber,
    );
  }

  static getClassByNumber(
    collectionId: number | GetByLibraryAndKeyArgs,
    classNumber: number,
  ) {
    const document = getCollectionDocument(collectionId);
    const classId = findClassIdByNumber(document.classes, classNumber);
    return classId ? document.classes?.[classId] : undefined;
  }

  static getClassNumber(
    collectionId: number | GetByLibraryAndKeyArgs,
    classId: string | undefined,
  ): number | undefined {
    return getClassNumberById(
      getCollectionDocument(collectionId).classes,
      classId,
    );
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
        classId = ensureClassRecord(classes, classNumber);
        return { ...document, classes };
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
        ensureClassRecord(classes, classNumber);
        return { ...document, classes };
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
      const classId = findClassIdByNumber(classes, classNumber);
      if (classId) {
        delete classes[classId];
      }
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
      return { ...document, classes, items };
    });
    this.onClassListUpdate();
  }

  /**
   * Swap two classes: only the displayed numbers move. Assignments keep
   * their classId, so readings and itemOrder stay with the class identity.
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
      const classes = { ...(document.classes || {}) };
      const idA = findClassIdByNumber(classes, classNumberA);
      const idB = findClassIdByNumber(classes, classNumberB);
      if (idA && classes[idA]) {
        classes[idA] = { ...classes[idA], number: classNumberB };
      }
      if (idB && classes[idB]) {
        classes[idB] = { ...classes[idB], number: classNumberA };
      }
      return { ...document, classes };
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
   * Get default priorities (used when no custom priorities are set)
   */
  static getDefaultPriorities(): Priority[] {
    const names: Record<string, FluentMessageId> = {
      "course-info": "priority-default-course-info",
      essential: "priority-default-essential",
      recommended: "priority-default-recommended",
      optional: "priority-default-optional",
    };
    return DEFAULT_PRIORITIES.map((p) => ({
      ...p,
      name: names[p.id] ? getString(names[p.id]) : p.name,
    }));
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
    const win = Zotero.getMainWindow();
    if (this.readingScheduleTab) {
      this.readingScheduleTab.open(win);
      this.syncReadingScheduleTabIcon(win);
    }
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
