import slugify from "slugify";
/**
 * Syllabus Manager - Core functionality for syllabus view and metadata
 */

import { getLocaleID, getString } from "../utils/locale";
import { ExtraFieldTool, ZoteroToolkit } from "zotero-plugin-toolkit";
import { renderSyllabusPage } from "./SyllabusPage";
import { getSelectedCollection } from "../utils/zotero";
import { getCurrentTab } from "../utils/window";
import { set } from "lodash-es";
import { renderComponent } from "../utils/react";
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
  SettingsCollectionDictionaryDataSchema,
  SettingsCollectionDictionaryDataEntity,
  SettingsClassMetadataSchema,
  SettingsSyllabusMetadataSchema,
  ExportSyllabusMetadataSchema,
  DEFAULT_PRIORITIES,
} from "../utils/schemas";
import * as z from "zod";
import { getRDFStringForCollection, importRDF } from "../utils/rdf";

enum SyllabusSettingsKey {
  COLLECTION_METADATA = "collectionMetadata",
  COLLECTION_VIEW_MODES = "collectionViewModes",
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
import { installTalisAspireTranslator } from "../utils/translator";

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

// Export GetByLibraryAndKeyArgs for use in other modules
export type { GetByLibraryAndKeyArgs };

// All types are now inferred from Zod schemas in utils/schemas.ts

const tabManager = FEATURE_FLAG.READING_SCHEDULE
  ? new TabManager<Record<string, never>>({
    type: "reading-list",
    title: "Reading Schedule",
    rootElementIdFactory: () => "reading-list-tab-root",
    data: { icon: "book" },
    componentFactory: () => h(ReadingSchedule, {}),
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

  // Event emitter for collection metadata changes
  private static collectionMetadataListeners = new Set<() => void>();

  static onCollectionMetadataChange(listener: () => void): () => void {
    this.collectionMetadataListeners.add(listener);
    return () => {
      this.collectionMetadataListeners.delete(listener);
    };
  }

  private static emitCollectionMetadataChange() {
    this.collectionMetadataListeners.forEach((listener) => listener());
  }

  // Cache for parsed syllabus data per item to avoid repeated JSON parsing
  private static syllabusDataCache = new WeakMap<
    Zotero.Item,
    ItemSyllabusData
  >();

  // Cache for class titles per collection to avoid repeated preference reads
  private static classTitleCache = new Map<string, Map<number, string>>();
  private static classTitleCacheCollectionId: string | null = null;

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
      const collection = Zotero.Collections.get(collectionId);
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
    const normalized = this.normalizeCollectionIdentifier(collectionId);
    if (!normalized) {
      return null;
    }
    const collection = Zotero.Collections.getByLibraryAndKey(
      normalized.libraryID,
      normalized.key,
    );
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

  // Create an ExtraFieldTool instance for safe extra field operations
  static extraFieldTool = new ExtraFieldTool();

  static onStartup() {
    ztoolkit.log("SyllabusManager.onStartup");
    // this.migrateCollectionIdentifiers();
    this.registerPrefs();
    this.registerNotifier();
    this.registerSyllabusInfoColumn();
    this.registerSyllabusClassInstructionColumn();
    this.registerSyllabusStatusColumn();
    this.registerSyllabusItemPaneSection();

    Zotero.Promise.delay(10000).then(() => {
      installTalisAspireTranslator();
    });
  }

  // /**
  //  * Migrate collection identifiers from numeric IDs to libraryID:key format
  //  * This is a one-time migration that runs on startup
  //  */
  // static async migrateCollectionIdentifiers() {
  //   ztoolkit.log("SyllabusManager.migrateCollectionIdentifiers: Starting migration");

  //   // Migrate collection metadata (preferences)
  //   try {
  //     const prefKey = SyllabusManager.getPreferenceKey(
  //       SyllabusSettingsKey.COLLECTION_METADATA,
  //     );
  //     const metadataStr = String(Zotero.Prefs.get(prefKey, true) || "");
  //     if (metadataStr) {
  //       const parsed = JSON.parse(metadataStr);
  //       const result = SettingsCollectionDictionaryDataEntity.safeParse(parsed);
  //       if (result.type === "ok" && !SettingsCollectionDictionaryDataEntity.isLatest(parsed)) {
  //         ztoolkit.log(
  //           "SyllabusManager.migrateCollectionIdentifiers: Migrating collection metadata",
  //         );
  //         Zotero.Prefs.set(prefKey, JSON.stringify(result.value), true);
  //       }
  //     }
  //   } catch (e) {
  //     ztoolkit.log("Error migrating collection metadata:", e);
  //   }

  //   // Migrate item syllabus data (extra fields)
  //   // This is done lazily when items are accessed, but we can trigger it for all items
  //   try {
  //     const libraries = Array.from(Zotero.Libraries.getAll());
  //     let migratedCount = 0;
  //     for (const library of libraries) {
  //       const items = await Zotero.Items.getAll(library.id);
  //       for (const item of items) {
  //         if (item.isRegularItem()) {
  //           const jsonStr = this.extraFieldTool.getExtraField(
  //             item,
  //             this.SYLLABUS_DATA_KEY,
  //           );
  //           if (jsonStr) {
  //             try {
  //               const parsed = JSON.parse(jsonStr);
  //               const result = ItemSyllabusDataEntity.safeParse(parsed);
  //               if (
  //                 result.type === "ok" &&
  //                 !ItemSyllabusDataEntity.isLatest(parsed)
  //               ) {
  //                 // Migrate and save back
  //                 this.invalidateSyllabusDataCache(item);
  //                 const migratedJsonStr = JSON.stringify(result.value);
  //                 this.extraFieldTool
  //                   .setExtraField(item, this.SYLLABUS_DATA_KEY, migratedJsonStr)
  //                   .catch((e) => {
  //                     ztoolkit.log("Error saving migrated item syllabus data:", e);
  //                   });
  //                 migratedCount++;
  //               }
  //             } catch (e) {
  //               // Skip items with invalid data
  //               ztoolkit.log("Error parsing item syllabus data during migration:", e);
  //             }
  //           }
  //         }
  //       }
  //     }
  //     if (migratedCount > 0) {
  //       ztoolkit.log(
  //         `SyllabusManager.migrateCollectionIdentifiers: Migrated ${migratedCount} items`,
  //       );
  //     }
  //   } catch (e) {
  //     ztoolkit.log("Error migrating item syllabus data:", e, item);
  //   }

  //   ztoolkit.log("SyllabusManager.migrateCollectionIdentifiers: Migration complete");
  // }

  static onMainWindowLoad(win: _ZoteroTypes.MainWindow) {
    ztoolkit.log("SyllabusManager.onMainWindowLoad", win);
    this.registerContextualMenus();
    this.setupUI();
    this.setupSyllabusViewTabListener();
    this.setupSyllabusViewReloadListener();

    // Re-render reading list tab if it exists (for hot reload)
    // Use a small delay to ensure tabs are initialized
    Zotero.Promise.delay(100).then(() => {
      if (this.readingScheduleTab) {
        ztoolkit.log(
          "SyllabusManager.onMainWindowLoad: rerendering reading schedule tab",
        );
        this.readingScheduleTab.renderAllTabs(win);
      }
    });
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
    this.setupUI();
    this.cleanupSyllabusViewTabListener();
    if (this.readingScheduleTab) {
      this.readingScheduleTab.cleanupAll();
    }
  }

  static onShutdown() {
    ztoolkit.log("SyllabusManager.onShutdown");
    this.unregisterNotifier();
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
      label: "Zotero Syllabus",
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

  // Function to get/set syllabus view toggle state (per collection)
  static getSyllabusPageVisible(): boolean {
    const pane = ztoolkit.getGlobal("ZoteroPane");
    const selectedCollection = pane?.getSelectedCollection();

    // If no collection is selected, default to false (tree view)
    if (!selectedCollection) {
      return false;
    }

    const collectionId = String(selectedCollection.id);
    const prefKey = SyllabusManager.getPreferenceKey(
      SyllabusSettingsKey.COLLECTION_VIEW_MODES,
    );
    const _viewModes = String(Zotero.Prefs.get(prefKey, true) || "");
    const viewModes = _viewModes
      ? (JSON.parse(_viewModes) as Record<string, boolean>)
      : {};

    // Default to false (tree view) if not set for this collection
    return viewModes?.[collectionId] === true;
  }

  static setSyllabusPageVisible(enabled: boolean): void {
    const pane = ztoolkit.getGlobal("ZoteroPane");
    const selectedCollection = pane?.getSelectedCollection();

    // If no collection is selected, don't save preference
    if (!selectedCollection) {
      return;
    }

    const collectionId = String(selectedCollection.id);
    const prefKey = SyllabusManager.getPreferenceKey(
      SyllabusSettingsKey.COLLECTION_VIEW_MODES,
    );
    const _viewModes = String(Zotero.Prefs.get(prefKey, true) || "");
    const viewModes = _viewModes
      ? (JSON.parse(_viewModes) as Record<string, boolean>)
      : {};

    // Update the preference for this collection
    viewModes[collectionId] = enabled;
    Zotero.Prefs.set(prefKey, JSON.stringify(viewModes), true);
  }

  // Function to create/update the toggle button
  static setupToggleButton() {
    const pane = ztoolkit.getGlobal("ZoteroPane");
    const w = Zotero.getMainWindow();
    const doc = w.document;

    // Find the items toolbar
    const itemsToolbar = doc.getElementById("zotero-items-toolbar");
    if (!itemsToolbar) return;

    // Find the search spinner to insert before it
    const searchSpinner = doc.getElementById("zotero-tb-search-spinner");

    // Check if toggle button already exists
    let toggleButton = doc.getElementById(
      "syllabus-view-toggle",
    ) as unknown as XULButtonElement;
    let readingScheduleButton = doc.getElementById(
      "syllabus-reading-schedule-button",
    ) as unknown as XULButtonElement;
    let collectionReadingScheduleButton = doc.getElementById(
      "syllabus-collection-reading-schedule-button",
    ) as unknown as XULButtonElement;
    let spacer = doc.getElementById("syllabus-view-spacer") as Element | null;

    if (!toggleButton) {
      // Create toggle button
      toggleButton = ztoolkit.UI.createElement(doc, "toolbarbutton", {
        id: "syllabus-view-toggle",
        classList: ["syllabus-view-toggle"],
        properties: {
          type: "menu",
        },
        listeners: [
          {
            type: "click",
            listener: (e: Event) => {
              const target = e.target as XUL.MenuItem;
              const checked = !SyllabusManager.getSyllabusPageVisible();
              SyllabusManager.setSyllabusPageVisible(checked);
              SyllabusManager.updateButtonLabel(target);
              SyllabusManager.updateButtonVisibility();
              SyllabusManager.setupPage();
            },
          },
        ],
      });

      // Set initial label
      SyllabusManager.updateButtonLabel(toggleButton);

      // Create "Review your Reading Schedule" button (for Main Library)
      if (FEATURE_FLAG.READING_SCHEDULE) {
        readingScheduleButton = ztoolkit.UI.createElement(
          doc,
          "toolbarbutton",
          {
            id: "syllabus-reading-schedule-button",
            classList: ["syllabus-view-toggle"],
            properties: {
              label: "Review your Reading Schedule",
              tooltiptext: "Open Reading Schedule",
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

        // Create "Reading Schedule" button (for collection pages)
        collectionReadingScheduleButton = ztoolkit.UI.createElement(
          doc,
          "toolbarbutton",
          {
            id: "syllabus-collection-reading-schedule-button",
            classList: ["syllabus-view-toggle"],
            properties: {
              label: "Reading Schedule",
              tooltiptext: "Open Reading Schedule",
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

      // Create spacer element if it doesn't exist
      if (!spacer) {
        spacer = doc.createElementNS(
          "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul",
          "spacer",
        );
        spacer.id = "syllabus-view-spacer";
        spacer.setAttribute("flex", "1");
      }

      // Insert buttons and spacer before the search spinner, or append to toolbar if spinner not found
      if (searchSpinner && searchSpinner.parentNode) {
        searchSpinner.parentNode.insertBefore(toggleButton, searchSpinner);
        if (FEATURE_FLAG.READING_SCHEDULE && collectionReadingScheduleButton) {
          searchSpinner.parentNode.insertBefore(
            collectionReadingScheduleButton,
            searchSpinner,
          );
        }
        if (FEATURE_FLAG.READING_SCHEDULE && readingScheduleButton) {
          searchSpinner.parentNode.insertBefore(
            readingScheduleButton,
            searchSpinner,
          );
        }
        searchSpinner.parentNode.insertBefore(spacer, searchSpinner);
      } else {
        itemsToolbar.appendChild(toggleButton);
        if (FEATURE_FLAG.READING_SCHEDULE && collectionReadingScheduleButton) {
          itemsToolbar.appendChild(collectionReadingScheduleButton);
        }
        if (FEATURE_FLAG.READING_SCHEDULE && readingScheduleButton) {
          itemsToolbar.appendChild(readingScheduleButton);
        }
        itemsToolbar.appendChild(spacer);
      }
    } else {
      // Ensure reading schedule buttons exist (only if feature is enabled)
      if (FEATURE_FLAG.READING_SCHEDULE) {
        if (!readingScheduleButton) {
          readingScheduleButton = doc.getElementById(
            "syllabus-reading-schedule-button",
          ) as unknown as XULButtonElement;
          if (!readingScheduleButton) {
            readingScheduleButton = ztoolkit.UI.createElement(
              doc,
              "toolbarbutton",
              {
                id: "syllabus-reading-schedule-button",
                classList: ["syllabus-view-toggle"],
                properties: {
                  label: "Review your Reading Schedule",
                  tooltiptext: "Open Reading Schedule",
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

            // Insert after toggle button
            if (toggleButton.parentNode) {
              toggleButton.parentNode.insertBefore(
                readingScheduleButton,
                toggleButton.nextSibling,
              );
            }
          }
        }

        if (!collectionReadingScheduleButton) {
          collectionReadingScheduleButton = doc.getElementById(
            "syllabus-collection-reading-schedule-button",
          ) as unknown as XULButtonElement;
          if (!collectionReadingScheduleButton) {
            collectionReadingScheduleButton = ztoolkit.UI.createElement(
              doc,
              "toolbarbutton",
              {
                id: "syllabus-collection-reading-schedule-button",
                classList: ["syllabus-view-toggle"],
                properties: {
                  label: "Reading Schedule",
                  tooltiptext: "Open Reading Schedule",
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

            // Insert right after toggle button
            if (toggleButton.parentNode) {
              toggleButton.parentNode.insertBefore(
                collectionReadingScheduleButton,
                toggleButton.nextSibling,
              );
            }
          }
        }
      }

      // Update button state and label
      SyllabusManager.updateButtonLabel(toggleButton);
    }

    // Update visibility of both buttons
    SyllabusManager.updateButtonVisibility();
  }

  // Function to update button label based on current state
  static updateButtonLabel(button: Element) {
    const isEnabled = SyllabusManager.getSyllabusPageVisible();

    button.setAttribute(
      "data-syllabus-current-ui-mode",
      SyllabusManager.getSyllabusPageVisible() ? "syllabus" : "collection",
    );

    (button as XUL.Button).label = isEnabled
      ? "View as Collection"
      : "View as Syllabus";

    (button as XUL.Button).tooltiptext = isEnabled
      ? "Switch to Collection View"
      : "Switch to Syllabus View";
  }

  // Function to update button visibility based on current state
  static updateButtonVisibility() {
    const w = Zotero.getMainWindow();
    const doc = w.document;

    const toggleButton = doc.getElementById(
      "syllabus-view-toggle",
    ) as XULButtonElement | null;
    const readingScheduleButton = doc.getElementById(
      "syllabus-reading-schedule-button",
    ) as XULButtonElement | null;
    const collectionReadingScheduleButton = doc.getElementById(
      "syllabus-collection-reading-schedule-button",
    ) as XULButtonElement | null;

    if (!toggleButton) return;

    // If reading schedule feature is disabled, hide all reading schedule buttons
    if (!FEATURE_FLAG.READING_SCHEDULE) {
      if (readingScheduleButton) readingScheduleButton.hidden = true;
      if (collectionReadingScheduleButton)
        collectionReadingScheduleButton.hidden = true;
      return;
    }

    if (!readingScheduleButton || !collectionReadingScheduleButton) return;

    const selectedCollection = getSelectedCollection();
    const currentTab = getCurrentTab();

    // Check if we're in Main Library and in a collection tab (not a custom tab)
    // Collection tabs are the default tabs (type is undefined or not a custom type)
    // Custom tabs have types like "syllabus" or "reading-list"
    const isInMainLibrary = !selectedCollection;
    const isCustomTab =
      currentTab?.type === "syllabus" || currentTab?.type === "reading-list";
    const isInCollectionTab = !isCustomTab;
    const shouldShowReadingSchedule = isInMainLibrary && isInCollectionTab;
    const isInCollection = !!selectedCollection;

    // Hide/show buttons based on conditions
    toggleButton.hidden = shouldShowReadingSchedule;
    readingScheduleButton.hidden = !shouldShowReadingSchedule;
    // Show "Reading Schedule" button when viewing a collection, hide it in Main Library
    collectionReadingScheduleButton.hidden =
      !isInCollection || shouldShowReadingSchedule;
  }

  // Function to render a completely custom syllabus view
  static async setupPage() {
    ztoolkit.log("SyllabusManager.setupPage");
    try {
      /**
       * Lead with a hide/show check
       */

      // Get collection
      const pane = ztoolkit.getGlobal("ZoteroPane");
      const selectedCollection = pane.getSelectedCollection();

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
      // Show if: syllabus view is enabled AND we have a collection
      const syllabusViewEnabled = SyllabusManager.getSyllabusPageVisible();
      const shouldShowCustomView = syllabusViewEnabled && selectedCollection;

      // Find or create custom syllabus view container
      let customView = doc.getElementById(
        "syllabus-custom-view",
      ) as HTMLElement | null;
      const itemsTree = doc.getElementById(
        "zotero-items-tree",
      ) as HTMLElement | null;

      if (!shouldShowCustomView) {
        // Hide custom view and show default tree
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
          renderSyllabusPage(w, customView, selectedCollection.id);
        }
      }
    } catch (e) {
      ztoolkit.log("Error in setupPage:", e);
    }
  }

  static async registerSyllabusClassInstructionColumn() {
    const field = "syllabus-class-instruction";
    await Zotero.ItemTreeManager.registerColumns({
      pluginID: addon.data.config.addonID,
      dataKey: field,
      label: "Reading Instructions",
      dataProvider: (item: Zotero.Item, dataKey: string) => {
        const zoteroPane = ztoolkit.getGlobal("ZoteroPane");
        const selectedCollection = zoteroPane.getSelectedCollection();

        if (selectedCollection) {
          const firstAssignment = SyllabusManager.getFirstAssignment(
            item,
            selectedCollection.id,
          );
          // Use sort key for sorting, but we'll extract instruction in renderCell if needed
          // For now, just return the instruction for sorting (empty string sorts first)
          return firstAssignment?.classInstruction || "";
        }

        return "";
      },
    });
  }

  static async registerSyllabusStatusColumn() {
    const field = "syllabus-status";
    await Zotero.ItemTreeManager.registerColumns({
      pluginID: addon.data.config.addonID,
      dataKey: field,
      label: "Status",
      // iconLabel: "chrome://zotero/skin/16/universal/checkmark.svg",
      iconPath: "chrome://zotero/skin/16/universal/tick.svg",
      width: "100px",
      fixedWidth: true,
      dataProvider: (item: Zotero.Item, dataKey: string) => {
        const zoteroPane = ztoolkit.getGlobal("ZoteroPane");
        const selectedCollection = zoteroPane.getSelectedCollection();

        if (selectedCollection) {
          const firstAssignment = SyllabusManager.getFirstAssignment(
            item,
            selectedCollection.id,
          );
          // Return "done" or "" for sorting (empty string sorts first)
          return firstAssignment?.status === "done" ? "done" : "";
        }

        return "";
      },
      renderCell: (index, data, column, isFirstColumn, doc) => {
        const container = doc.createElement("span");
        container.className = `cell ${column.className}`;
        container.style.display = "flex";
        container.style.alignItems = "center";
        container.style.justifyContent = "center";

        if (data === "done") {
          const checkmark = doc.createElement("span");
          checkmark.textContent = "✓";
          checkmark.style.color = "var(--zotero-color-accent-green)";
          checkmark.style.fontWeight = "bold";
          checkmark.style.fontSize = "14px";
          container.appendChild(checkmark);
        }

        return container;
      },
    });
  }

  static async registerSyllabusInfoColumn() {
    const field = "syllabus-info";
    // Track previous class number and collection to detect first item in each class group
    // These persist across renderCell calls within the same column registration
    let previousClassNumber: string | null = null;
    let previousCollectionId: string | null = null;
    let previousSortKey: string | null = null;

    await Zotero.ItemTreeManager.registerColumns({
      pluginID: addon.data.config.addonID,
      dataKey: field,
      label: "Syllabus Info",
      dataProvider: (item: Zotero.Item, dataKey: string) => {
        const zoteroPane = ztoolkit.getGlobal("ZoteroPane");
        const selectedCollection = zoteroPane.getSelectedCollection();

        if (selectedCollection) {
          const firstAssignment = SyllabusManager.getFirstAssignment(
            item,
            selectedCollection.id,
          );
          if (firstAssignment) {
            // Use sort key for consistent sorting
            const sortKey = SyllabusManager.getAssignmentSortKey(
              firstAssignment,
              item,
              selectedCollection.id,
            );
            // Encode data for display: "sortKey|priority|classNumber|classTitle|collectionId"
            const classNumber = firstAssignment.classNumber;
            const classTitle =
              classNumber !== undefined
                ? SyllabusManager.getClassTitle(
                  selectedCollection.id,
                  classNumber,
                )
                : "";
            const priority = firstAssignment.priority || "";
            return `${sortKey}|${priority}|${classNumber ?? ""}|${classTitle}|${selectedCollection.id}`;
          }
        }

        return "";
      },
      renderCell: (index, data, column, isFirstColumn, doc) => {
        const container = doc.createElement("span");
        container.className = `cell ${column.className}`;
        container.style.display = "flex";
        container.style.alignItems = "center";
        container.style.gap = "6px";
        container.style.flexWrap = "nowrap";

        // Parse: "sortKey|priority|classNumber|classTitle|collectionId"
        const dataStr = String(data);
        const parts = dataStr.split("|");

        // Generate color for left border based on class number
        let currentClassNumber: string | null = null;
        let currentCollectionId: string | null = null;
        let isFirstInClassGroup = false;

        if (parts.length >= 5) {
          const priority = parts[1];
          const classNumber = parts[2];
          const classTitle = parts[3];
          const collectionId = parts[4];
          currentClassNumber = classNumber || null;
          currentCollectionId = collectionId || null;

          // Check if this is the first item in a class group
          // Reset tracking if collection changed
          if (currentCollectionId !== previousCollectionId) {
            previousClassNumber = null;
            previousCollectionId = currentCollectionId;
            previousSortKey = null;
          }

          // Extract sort key - if present, indicates this column is being used for sorting
          const sortKey = parts[0] || "";

          // Check if class number changed (first item in new class group)
          // When sorted by this column, items are grouped by class number
          // Only add border if we have a sortKey (indicating sorting) and class number changed
          if (sortKey && currentClassNumber !== previousClassNumber) {
            isFirstInClassGroup = true;
          }
          previousClassNumber = currentClassNumber;
          previousSortKey = sortKey;

          // Display class number if available
          if (classNumber) {
            const classNumberSpan = doc.createElement("span");
            classNumberSpan.textContent = `#${classNumber}`;
            classNumberSpan.style.fontWeight = "500";
            container.appendChild(classNumberSpan);
          }

          // Display priority if available - use collection-specific colors and labels
          if (priority) {
            const collectionIdNum = collectionId
              ? parseInt(collectionId, 10)
              : undefined;
            const priorityElements = SyllabusManager.createPriorityDisplay(
              doc,
              collectionIdNum,
              priority,
            );
            for (const element of priorityElements) {
              container.appendChild(element);
            }
          }

          // Display class title at the end if available
          if (classTitle) {
            const titleSpan = doc.createElement("span");
            titleSpan.textContent = classTitle;
            titleSpan.style.color = "var(--fill-secondary)";
            titleSpan.style.fontSize = "1em";
            container.appendChild(titleSpan);
          }
        } else if (parts.length >= 4) {
          // Backward compatibility: handle old format without collectionId
          const priority = parts[1];
          const classNumber = parts[2];
          const classTitle = parts[3];
          currentClassNumber = classNumber || null;

          // Extract sort key - if present, indicates this column is being used for sorting
          const sortKey = parts[0] || "";

          // Check if class number changed (first item in new class group)
          // When sorted by this column, items are grouped by class number
          // Only add border if we have a sortKey (indicating sorting) and class number changed
          if (sortKey && currentClassNumber !== previousClassNumber) {
            isFirstInClassGroup = true;
          }
          previousClassNumber = currentClassNumber;

          // Display class number if available
          if (classNumber) {
            const classNumberSpan = doc.createElement("span");
            classNumberSpan.textContent = `#${classNumber}`;
            classNumberSpan.style.fontWeight = "500";
            container.appendChild(classNumberSpan);
          }

          // Display priority if available (using default colors/labels - no collectionId)
          if (priority) {
            const priorityElements = SyllabusManager.createPriorityDisplay(
              doc,
              undefined, // No collectionId for backward compatibility
              priority,
            );
            for (const element of priorityElements) {
              container.appendChild(element);
            }
          }

          // Display class title at the end if available
          if (classTitle) {
            const titleSpan = doc.createElement("span");
            titleSpan.textContent = classTitle;
            titleSpan.style.color = "var(--fill-secondary)";
            titleSpan.style.fontSize = "1em";
            container.appendChild(titleSpan);
          }
        }

        // Add thin left border colored by class number
        const shouldColourSyllabusRows = getPref("shouldColourSyllabusRows");
        if (shouldColourSyllabusRows && currentClassNumber) {
          const classNum = parseInt(currentClassNumber, 10);
          if (!isNaN(classNum)) {
            // Get the max class number range to calculate position on color wheel
            let maxRange = 1;
            let collectionIdForRange: string | undefined;

            if (parts.length >= 5) {
              collectionIdForRange = parts[4];
            }

            if (collectionIdForRange) {
              try {
                // collectionIdForRange is a string in format "libraryID:key" or old numeric ID
                // Try to parse as number first (old format), otherwise treat as libraryID:key
                const collectionIdNum = parseInt(collectionIdForRange, 10);
                if (
                  !isNaN(collectionIdNum) &&
                  !collectionIdForRange.includes(":")
                ) {
                  // Old numeric format
                  const fullRange =
                    this.getFullClassNumberRange(collectionIdNum);
                  if (fullRange.length > 0) {
                    maxRange = Math.max(...fullRange);
                  }
                } else if (collectionIdForRange.includes(":")) {
                  // New libraryID:key format - parse it
                  const [libraryIDStr, key] = collectionIdForRange.split(":");
                  const libraryID = parseInt(libraryIDStr, 10);
                  if (!isNaN(libraryID) && key) {
                    const fullRange = this.getFullClassNumberRange([
                      libraryID,
                      key,
                    ]);
                    if (fullRange.length > 0) {
                      maxRange = Math.max(...fullRange);
                    }
                  }
                }
              } catch (e) {
                ztoolkit.log("Error getting class range for color:", e);
              }
            }

            // Generate color using 360-degree rotation: class 1 starts at 0°, evenly distributed
            // Map class number to position in 360-degree color wheel
            const hue =
              maxRange > 1 ? ((classNum - 1) * (360 / maxRange)) % 360 : 0;
            const saturation = 45; // Moderate saturation for subtlety
            const lightness = 65; // Light enough to be subtle
            const borderColor = `hsla(${hue}, ${saturation}%, ${lightness}%)`;

            container.style.borderLeft = `3px solid ${borderColor}`;
            container.style.paddingLeft = "6px";
            container.style.marginLeft = "-2px"; // Compensate for border width

            container.style.background = `hsla(${hue}, ${saturation}%, ${lightness}%, 20%)`;

            // // Add top border to first item in each class group when sorted by this column
            // // isFirstInClassGroup is only true when sortKey is present (indicating sorting)
            // if (isFirstInClassGroup && index > 0) {
            //   container.style.borderTop = `2px solid ${borderColor}`;
            //   container.style.paddingTop = "4px";
            //   container.style.marginTop = "2px";
            // }
          }
        }

        return container;
      },
    });
  }

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
        const zoteroPane = ztoolkit.getGlobal("ZoteroPane");
        const selectedCollection = zoteroPane.getSelectedCollection();
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
              innerText: "Select a collection to view syllabus assignments",
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
    const createPriorityHandler =
      (priority: string) => async () => {
        const zoteroPane = ztoolkit.getGlobal("ZoteroPane");
        const selectedCollection = zoteroPane.getSelectedCollection();
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
        if (zoteroPane.itemPane) {
          zoteroPane.itemPane.render();
        }
      };

    // Get the selected collection to use collection-specific priorities
    const zoteroPane = ztoolkit.getGlobal("ZoteroPane");
    const selectedCollection = zoteroPane?.getSelectedCollection();

    // Get collection-specific priority options if a collection is selected
    // Otherwise use default priorities
    const priorityOptions = (() => {
      const priorities = selectedCollection
        ? this.getPrioritiesForCollection(selectedCollection.id)
        : []
      const options = priorities.map((p) => ({
        value: p.id,
        label: p.name,
        color: p.color,
      }));
      // Add "(None)" option
      options.push({ value: "", label: "(None)", color: "" });
      return options;
    })();

    ztoolkit.Menu.register("item", {
      tag: "menu",
      id: "syllabus-set-priority-menu",
      label: "Set Priority",
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
      label: "Set Class Number",
      children: SyllabusManager.buildClassNumberChildren(),
    });
  }

  static buildClassNumberChildren() {
    const zoteroPane = ztoolkit.getGlobal("ZoteroPane");
    const selectedCollection = zoteroPane.getSelectedCollection();
    if (!selectedCollection) {
      return [
        {
          tag: "menuitem" as const,
          label: "(No collection selected)",
          disabled: true,
        },
      ];
    }

    // Get full range of class numbers (same logic as SyllabusPage)
    const sortedClassNumbers = this.getFullClassNumberRange(
      selectedCollection.id,
    );

    const createClassHandler =
      (classNumber: number | undefined) => async () => {
        const zoteroPane = ztoolkit.getGlobal("ZoteroPane");
        const selectedCollection = zoteroPane.getSelectedCollection();
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
        if (zoteroPane.itemPane) {
          zoteroPane.itemPane.render();
        }
      };

    const children: any[] = sortedClassNumbers.map((classNumber) => {
      const classTitle = this.getClassTitle(
        selectedCollection.id,
        classNumber,
        true,
      );
      return {
        tag: "menuitem" as const,
        label: classTitle || `Class ${classNumber}`,
        commandListener: createClassHandler(classNumber),
      };
    });

    if (sortedClassNumbers.length > 0) {
      children.push({ tag: "menuseparator" as const });
    }

    children.push({
      tag: "menuitem" as const,
      label: "(None)",
      commandListener: createClassHandler(undefined),
    });

    return children;
  }

  static setupContextMenuSetStatus() {
    ztoolkit.Menu.unregister("syllabus-set-status-menu");
    const createStatusHandler = (status: "done" | null) => async () => {
      const zoteroPane = ztoolkit.getGlobal("ZoteroPane");
      const selectedCollection = zoteroPane.getSelectedCollection();
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
      if (zoteroPane.itemPane) {
        zoteroPane.itemPane.render();
      }
    };

    ztoolkit.Menu.register("item", {
      tag: "menu",
      id: "syllabus-set-status-menu",
      label: "Set Reading Status",
      icon: "chrome://zotero/skin/16/universal/book.svg",
      children: [
        {
          tag: "menuitem" as const,
          label: "Done",
          commandListener: createStatusHandler("done"),
        },
        {
          tag: "menuitem" as const,
          label: "Not Done",
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
    const collection = Zotero.Collections.get(collectionId);
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
    this.onCollectionUpdated(collection, source, "setCollectionTitle");
  }

  /**
   * Get syllabus data from an item's extra field
   * Uses caching to avoid repeated JSON parsing for the same item
   * Handles migration from old format (single object) to new format (array)
   * Now uses Zod validation with verzod for versioning
   */
  static getItemSyllabusData(item: Zotero.Item): ItemSyllabusData | undefined {
    // Check cache first
    const cached = this.syllabusDataCache.get(item);
    if (cached !== undefined) {
      return cached;
    }

    const jsonStr = this.extraFieldTool.getExtraField(
      item,
      this.SYLLABUS_DATA_KEY,
    );

    if (jsonStr) {
      try {
        const parsed = JSON.parse(jsonStr);
        // Use Zod schema with verzod for parsing and migration
        const result = ItemSyllabusDataEntity.safeParse(parsed);
        if (result.type === "ok") {
          (async () => {
            const isLatest = ItemSyllabusDataEntity.isLatest(parsed);
            // ztoolkit.log("item - considering migration save", { result, parsed, isLatest });
            // Save the result back to the extra field if it was upgraded
            if (!isLatest) {
              // ztoolkit.log(
              //   "Upgrading item syllabus data to latest version",
              //   parsed,
              //   result.value,
              // );
              // Invalidate cache before saving to avoid stale data
              this.invalidateSyllabusDataCache(item);
              // Save without triggering item update to avoid recursion
              // Use fire-and-forget to avoid making this method async
              const jsonStr = JSON.stringify(result.value);
              this.extraFieldTool
                .setExtraField(item, this.SYLLABUS_DATA_KEY, jsonStr)
                .catch((e) => {
                  ztoolkit.log("Error saving upgraded syllabus data:", e);
                })
                .finally(() => {
                  ztoolkit.log(
                    "item - migrated syllabus data saved",
                    item.id,
                    item.getDisplayTitle(),
                    jsonStr,
                  );
                });
            }
          })();

          return result.value;
        } else {
          ztoolkit.log("Error parsing syllabus data - after JSON.parse:", {
            result,
            parsed,
          });
        }
      } catch (e) {
        ztoolkit.log("Error parsing syllabus data:", e, jsonStr);
      }
    }
  }

  static getItemSyllabusDataForCollection(
    item: Zotero.Item,
    collectionId: number | GetByLibraryAndKeyArgs,
  ): ItemSyllabusAssignment[] {
    const normalized = this.normalizeCollectionIdentifier(collectionId);
    if (!normalized) {
      return [];
    }
    const data = this.getItemSyllabusData(item);
    if (!data) {
      return [];
    }
    const assignments =
      data[
      this.getCollectionReferenceString(normalized.libraryID, normalized.key)
      ];
    if (!assignments || !Array.isArray(assignments)) {
      return [];
    }
    return assignments;
  }

  /**
   * Invalidate cached syllabus data for an item
   * Call this when an item's extra fields are modified
   */
  static invalidateSyllabusDataCache(item: Zotero.Item) {
    this.syllabusDataCache.delete(item);
  }

  /**
   * Set syllabus data in an item's extra field
   * Validates with Zod before saving to ensure 100% type safety
   */
  static async setItemData(
    item: Zotero.Item,
    data: ItemSyllabusData,
    source: "page" | "item-pane" | "context-menu" | "background",
  ): Promise<void> {
    // Validate input data with Zod before saving
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

    // Double-check: validate the stringified JSON will parse correctly
    const jsonStr = JSON.stringify(validatedData);
    try {
      const parsed = JSON.parse(jsonStr);
      const revalidationResult = ItemSyllabusDataEntity.safeParse(parsed);
      if (revalidationResult.type !== "ok") {
        ztoolkit.log(
          "[Zotero Syllabus] Error: Validated data failed revalidation after JSON.stringify:",
          revalidationResult.error,
          "Validated data:",
          validatedData,
        );
        return;
      }
    } catch (e) {
      ztoolkit.log(
        "[Zotero Syllabus] Error: Failed to parse JSON string:",
        e,
        "JSON string:",
        jsonStr,
      );
      return;
    }

    await this.extraFieldTool.setExtraField(
      item,
      this.SYLLABUS_DATA_KEY,
      jsonStr,
    );
    // Invalidate cache when data changes
    this.invalidateSyllabusDataCache(item);
    this.onItemUpdate(item, source);
  }

  // /**
  //  * Get syllabus priority for a specific collection and class
  //  * If classNumber is provided, returns priority for that class
  //  * Otherwise, returns priority from first entry
  //  */
  // static getSyllabusPriority(
  //   item: Zotero.Item,
  //   collectionId: number | GetByLibraryAndKeyArgs,
  //   classNumber?: number,
  // ): string {
  //   const normalized = this.normalizeCollectionIdentifier(collectionId);
  //   if (!normalized) {
  //     return "";
  //   }
  //   const data = this.getItemSyllabusData(item);
  //   if (!data) {
  //     return "";
  //   }
  //   const collectionKeyStr = this.getCollectionReferenceString(
  //     normalized.libraryID,
  //     normalized.key,
  //   );
  //   const entries = data[collectionKeyStr] || [];

  //   if (classNumber !== undefined) {
  //     const entry = entries.find((e) => e.classNumber === classNumber);
  //     return entry?.priority || "";
  //   }

  //   // Return first entry's priority if no classNumber specified
  //   return entries[0]?.priority || "";
  // }

  /**
   * Get the full range of class numbers for a collection
   * Returns all class numbers from 1 to max, plus any classes with items outside that range
   * This is the same logic used in SyllabusPage and the contextual menu
   */
  static getFullClassNumberRange(
    collectionId: number | GetByLibraryAndKeyArgs,
  ): number[] {
    const normalized = this.normalizeCollectionIdentifier(collectionId);
    if (!normalized) {
      return [];
    }
    const collection = this.getCollectionFromIdentifier(collectionId);
    if (!collection) {
      return [];
    }

    const classNumbers = new Set<number>();

    // Get class numbers from items in the collection
    try {
      const items = collection.getChildItems();
      for (const item of items) {
        if (item.isRegularItem()) {
          // Get all class assignments for this item
          const assignments = this.getAllClassAssignments(item, collectionId);
          for (const assignment of assignments) {
            if (assignment.classNumber !== undefined) {
              classNumbers.add(assignment.classNumber);
            }
          }
        }
      }
    } catch (e) {
      ztoolkit.log("Error getting class numbers from items:", e);
    }

    // Get class numbers from metadata
    const metadata = this.getSyllabusMetadata(collectionId);
    if (metadata.classes) {
      for (const classNumStr of Object.keys(metadata.classes)) {
        const classNum = parseInt(classNumStr, 10);
        if (!isNaN(classNum)) {
          classNumbers.add(classNum);
        }
      }
    }

    // Calculate min/max from collected class numbers
    let max: number | null = null;
    if (classNumbers.size > 0) {
      const sortedNumbers = Array.from(classNumbers).sort((a, b) => a - b);
      max = sortedNumbers[sortedNumbers.length - 1];
    }

    // Generate all class numbers from 1 to max (even if empty)
    // Always start from 1, even if the minimum class number is greater than 1
    const allClassNumbers: number[] = [];
    if (max !== null) {
      for (let i = 1; i <= max; i++) {
        allClassNumbers.push(i);
      }
    }

    // Merge: use allClassNumbers as base, but ensure we include any classes with items
    const finalClassNumbers = new Set<number>();
    for (const num of allClassNumbers) {
      finalClassNumbers.add(num);
    }
    for (const num of classNumbers) {
      finalClassNumbers.add(num);
    }

    return Array.from(finalClassNumbers).sort((a, b) => a - b);
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
    const normalized = this.normalizeCollectionIdentifier(collectionId);
    if (!normalized) {
      return;
    }
    const data = this.getItemSyllabusData(item);
    const collectionKeyStr = this.getCollectionReferenceString(
      normalized.libraryID,
      normalized.key,
    );
    let assignments = data?.[collectionKeyStr] || [];

    if (classNumber) {
      // Find or create assignment for this class number
      const assignment = assignments.find((e) => e.classNumber === classNumber);
      if (!assignment) {
        // Create new assignment
        await this.addClassAssignment(
          item,
          collectionId,
          classNumber,
          {},
          source,
        );
        // Re-fetch data after adding
        const updatedData = this.getItemSyllabusData(item);
        if (!updatedData) {
          return;
        }
        assignments = updatedData[collectionKeyStr] || [];
      } else {
        // Update existing assignment
        await this.updateClassAssignment(
          item,
          collectionId,
          assignment.id,
          { classNumber },
          source,
        );
        // Re-fetch data after updating
        const updatedData = this.getItemSyllabusData(item);
        if (!updatedData) {
          return;
        }
        assignments = updatedData[collectionKeyStr] || [];
      }
    } else {
      // Remove classNumber from first assignment
      if (assignments.length > 0) {
        delete assignments[0].classNumber;
      }
    }

    // if (!Array.isArray(assignments) || assignments.length === 0) {
    //   delete data[collectionKeyStr];
    // } else {
    //   data[collectionKeyStr] = assignments;
    // }

    // await this.setItemData(item, data, source);
  }

  /**
   * Get all class assignments for an item in a collection
   */
  static getAllClassAssignments(
    item: Zotero.Item,
    collectionId: number | GetByLibraryAndKeyArgs,
  ): ItemSyllabusAssignment[] {
    const normalized = this.normalizeCollectionIdentifier(collectionId);
    if (!normalized) {
      return [];
    }
    const data = this.getItemSyllabusData(item);
    if (!data) {
      return [];
    }
    const collectionKeyStr = this.getCollectionReferenceString(
      normalized.libraryID,
      normalized.key,
    );
    // Data from getItemSyllabusData is already validated and has IDs via Zod
    const res = data[collectionKeyStr] || [];
    if (!Array.isArray(res)) {
      return [];
    }
    return res;
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
    const hasClassNumber = assignment.classNumber !== undefined;

    // Check for manual order if item and collectionId are provided
    let manualOrderPosition: string | null = null;
    let hasManualOrder = false;
    if (
      item &&
      collectionId !== undefined &&
      hasClassNumber &&
      assignment.classNumber !== undefined
    ) {
      const manualOrder = this.getClassItemOrder(
        collectionId,
        assignment.classNumber,
      );
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
      hasClassNumber ? String(assignment.classNumber).padStart(4, "0") : "9999",
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
    const priorityOrder: number = collectionId !== undefined
      ? this.getPriorityOrderForCollection(collectionId, assignment.priority)
      : 9999
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
        const titleA = a.item.getField("title") || "";
        const titleB = b.item.getField("title") || "";
        return titleA.localeCompare(titleB);
      });

      return [...orderedItems, ...unorderedItems];
    } else {
      // Natural order: by class number, then priority (using collection-specific order), then title
      return [...items].sort((a, b) => {
        // First compare by class number
        const classNumA = a.assignment.classNumber ?? 9999;
        const classNumB = b.assignment.classNumber ?? 9999;
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
        const titleA = a.item.getField("title") || "";
        const titleB = b.item.getField("title") || "";
        return titleA.localeCompare(titleB);
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
    const normalized = this.normalizeCollectionIdentifier(collectionId);
    if (!normalized) {
      return;
    }
    const data =
      this.getItemSyllabusData(item) ||
      ItemSyllabusDataEntity.latestSchema.parse({});
    const collectionKeyStr = this.getCollectionReferenceString(
      normalized.libraryID,
      normalized.key,
    );
    const assignments = data[collectionKeyStr] || [];

    // Add new entry with ID
    const newEntry = ItemSyllabusAssignmentEntity.safeParse({
      classNumber,
      ...metadata,
    });
    if (newEntry.type !== "ok") {
      ztoolkit.log("Error adding new assignment:", newEntry.error);
      return;
    }
    assignments.push(newEntry.value);

    // New entry already has ID, existing entries validated via getItemSyllabusData
    data[collectionKeyStr] = assignments;
    await this.setItemData(item, data, source);
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
    const normalized = this.normalizeCollectionIdentifier(collectionId);
    if (!normalized) {
      return;
    }
    const data = this.getItemSyllabusData(item);
    if (!data) {
      return;
    }
    const collectionKeyStr = this.getCollectionReferenceString(
      normalized.libraryID,
      normalized.key,
    );
    let entries = data[collectionKeyStr] || [];

    entries = entries.filter((e) => e.classNumber !== classNumber);

    if (entries.length === 0) {
      delete data[collectionKeyStr];
    } else {
      data[collectionKeyStr] = entries;
    }

    await this.setItemData(item, data, source);
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
    const normalized = this.normalizeCollectionIdentifier(collectionId);
    if (!normalized) {
      return;
    }
    const data = this.getItemSyllabusData(item);
    if (!data) {
      return;
    }
    const collectionKeyStr = this.getCollectionReferenceString(
      normalized.libraryID,
      normalized.key,
    );
    let entries = data[collectionKeyStr] || [];

    entries = entries.filter((e) => e.id !== assignmentId);

    if (entries.length === 0) {
      delete data[collectionKeyStr];
    } else {
      data[collectionKeyStr] = entries;
    }

    await this.setItemData(item, data, source);
  }

  /**
   * Remove all assignments for an item in a collection
   */
  static async removeAllAssignments(
    item: Zotero.Item,
    collectionId: number | GetByLibraryAndKeyArgs,
    source: "page" | "item-pane" | "context-menu",
  ): Promise<void> {
    const normalized = this.normalizeCollectionIdentifier(collectionId);
    if (!normalized) {
      return;
    }
    const data = this.getItemSyllabusData(item);
    if (!data) {
      return;
    }
    const collectionKeyStr = this.getCollectionReferenceString(
      normalized.libraryID,
      normalized.key,
    );
    delete data[collectionKeyStr];
    await this.setItemData(item, data, source);
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
    const normalized = this.normalizeCollectionIdentifier(collectionId);
    if (!normalized) {
      return;
    }
    const data = this.getItemSyllabusData(item);
    if (!data) {
      // Can't update an assignment that doesn't exist
      return;
    }
    const collectionKeyStr = this.getCollectionReferenceString(
      normalized.libraryID,
      normalized.key,
    );
    const entries = data[collectionKeyStr] || [];

    // Find the entry by ID
    const entryIndex = entries.findIndex((e) => e.id === assignmentId);

    if (entryIndex >= 0) {
      // Update existing entry
      entries[entryIndex] = { ...entries[entryIndex], ...metadata };
    } else {
      // Assignment not found by ID - this shouldn't happen, but log it
      ztoolkit.log("Warning: Assignment not found by ID:", assignmentId);
    }

    // Entries from getItemSyllabusData are already validated and have IDs via Zod
    if (entries.length === 0) {
      delete data[collectionKeyStr];
    } else {
      data[collectionKeyStr] = entries;
    }

    await this.setItemData(item, data, source);
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
    const classMetadata = SyllabusManager.getClassMetadata(
      collectionId,
      classNumber,
    );
    const classKey = classNumber === null ? "null" : String(classNumber);
    classMetadata.itemOrder = itemIds;
    await this.setClassMetadata(
      collectionId,
      classNumber,
      classMetadata,
      source,
    );
  }

  static getSettingsCollectionDictionaryData(): SettingsCollectionDictionaryData {
    const prefKey = SyllabusManager.getPreferenceKey(
      SyllabusSettingsKey.COLLECTION_METADATA,
    );
    const metadataStr = String(Zotero.Prefs.get(prefKey, true) || "");
    if (!metadataStr) {
      return {};
    }
    try {
      const parsed = JSON.parse(metadataStr);
      // Use verzod versioned entity for validation and migration
      const result = SettingsCollectionDictionaryDataEntity.safeParse(parsed);
      if (result.type === "ok") {
        // If data was migrated, save it back
        if (!SettingsCollectionDictionaryDataEntity.isLatest(parsed)) {
          ztoolkit.log(
            "Migrated collection metadata to latest version, saving back",
          );
          Zotero.Prefs.set(prefKey, JSON.stringify(result.value), true);
        }
        return result.value;
      } else {
        ztoolkit.log("Error validating collection metadata:", result.error);
        return {};
      }
    } catch (e) {
      ztoolkit.log("Error parsing collection metadata:", e);
      return {};
    }
  }

  static setSettingsCollectionDictionaryData(
    metadata: SettingsCollectionDictionaryData,
    source: "page" | "item-pane" | "background",
    emitChange: boolean = true,
  ) {
    const inputResult =
      SettingsCollectionDictionaryDataSchema.safeParse(metadata);
    if (!inputResult.success) {
      ztoolkit.log("Error validating collection metadata:", inputResult.error);
      return;
    }
    const prefKey = SyllabusManager.getPreferenceKey(
      SyllabusSettingsKey.COLLECTION_METADATA,
    );
    Zotero.Prefs.set(prefKey, JSON.stringify(inputResult.data), true);
    if (emitChange) {
      ztoolkit.log("Emitting collection metadata change for source");
      this.emitCollectionMetadataChange();
      // if (source !== "item-pane") this.reloadItemPane();
      if (source !== "page") this.setupPage();
      this.onClassListUpdate();
    }
  }

  /**
   * Get collection metadata from preferences
   */
  static getSyllabusMetadata(
    collectionId: number | GetByLibraryAndKeyArgs,
  ): SettingsSyllabusMetadata {
    const normalized = this.normalizeCollectionIdentifier(collectionId);
    if (!normalized) {
      return SettingsSyllabusMetadataSchema.parse({});
    }
    const data = this.getSettingsCollectionDictionaryData();
    const collectionKeyStr = this.getCollectionReferenceString(
      normalized.libraryID,
      normalized.key,
    );
    if (!data[collectionKeyStr]) {
      data[collectionKeyStr] = SettingsSyllabusMetadataSchema.parse({});
    }
    return data[collectionKeyStr];
  }

  /**
   * Set collection metadata in preferences
   * Validates with Zod before saving to ensure 100% type safety
   * Note: This method is called with the full dictionary (SettingsCollectionDictionaryData)
   * even though it's typed as SettingsSyllabusMetadata for backward compatibility
   */
  static async setCollectionMetadata(
    collectionId: number | GetByLibraryAndKeyArgs,
    metadata: SettingsSyllabusMetadata,
    source: "page" | "item-pane" | "background",
  ): Promise<void> {
    const normalized = this.normalizeCollectionIdentifier(collectionId);
    if (!normalized) {
      return;
    }
    const allData = this.getSettingsCollectionDictionaryData();
    const collectionKeyStr = this.getCollectionReferenceString(
      normalized.libraryID,
      normalized.key,
    );
    allData[collectionKeyStr] = metadata;
    this.setSettingsCollectionDictionaryData(allData, source);
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
    const syllabusMetadata = SyllabusManager.getSyllabusMetadata(collectionId);
    syllabusMetadata.description = description.trim();
    await SyllabusManager.setCollectionMetadata(
      collectionId,
      syllabusMetadata,
      source,
    );
  }

  /**
   * Get collection institution for a specific collection
   */
  static getInstitution(
    collectionId: number | GetByLibraryAndKeyArgs,
  ): string {
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
    const syllabusMetadata = SyllabusManager.getSyllabusMetadata(collectionId);
    syllabusMetadata.institution = institution.trim();
    await SyllabusManager.setCollectionMetadata(
      collectionId,
      syllabusMetadata,
      source,
    );
  }

  /**
   * Get collection course code for a specific collection
   */
  static getCourseCode(
    collectionId: number | GetByLibraryAndKeyArgs,
  ): string {
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
    const syllabusMetadata = SyllabusManager.getSyllabusMetadata(collectionId);
    syllabusMetadata.courseCode = courseCode.trim();
    await SyllabusManager.setCollectionMetadata(
      collectionId,
      syllabusMetadata,
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
    const syllabusMetadata = SyllabusManager.getSyllabusMetadata(collectionId);
    syllabusMetadata.nomenclature = nomenclature.trim().toLowerCase();
    await SyllabusManager.setCollectionMetadata(
      collectionId,
      syllabusMetadata,
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
    const syllabusMetadata = SyllabusManager.getSyllabusMetadata(collectionId);
    syllabusMetadata.priorities = priorities;
    await SyllabusManager.setCollectionMetadata(
      collectionId,
      syllabusMetadata,
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
    const syllabusMetadata = SyllabusManager.getSyllabusMetadata(collectionId);
    syllabusMetadata.locked = locked;
    await SyllabusManager.setCollectionMetadata(
      collectionId,
      syllabusMetadata,
      source,
    );
  }

  static getClassMetadata(
    collectionId: number | GetByLibraryAndKeyArgs,
    classNumber: number,
  ) {
    const syllabusMetadata = SyllabusManager.getSyllabusMetadata(collectionId);
    return syllabusMetadata.classes?.[classNumber] || {};
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

  /**
   * Invalidate class title cache
   * Call this when collection metadata is updated
   */
  static invalidateClassTitleCache(
    collectionId?: number | GetByLibraryAndKeyArgs,
  ) {
    if (collectionId !== undefined) {
      const normalized = this.normalizeCollectionIdentifier(collectionId);
      if (normalized) {
        const collectionKeyStr = this.getCollectionReferenceString(
          normalized.libraryID,
          normalized.key,
        );
        this.classTitleCache.delete(collectionKeyStr);
        if (this.classTitleCacheCollectionId === collectionKeyStr) {
          this.classTitleCacheCollectionId = null;
        }
      }
    } else {
      // Invalidate all
      this.classTitleCache.clear();
      this.classTitleCacheCollectionId = null;
    }
  }

  static async setClassMetadata(
    collectionId: number | GetByLibraryAndKeyArgs,
    classNumber: number,
    metadata: Partial<SettingsClassMetadata>,
    source: "page" | "item-pane",
  ): Promise<void> {
    const syllabusMetadata = SyllabusManager.getSyllabusMetadata(collectionId);
    if (!syllabusMetadata.classes[classNumber]) {
      syllabusMetadata.classes[classNumber] = SettingsClassMetadataSchema.parse(
        {},
      );
    }
    syllabusMetadata.classes[classNumber] = {
      ...syllabusMetadata.classes[classNumber],
      ...metadata,
    };
    await SyllabusManager.setCollectionMetadata(
      collectionId,
      syllabusMetadata,
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
    const classMetadata = SyllabusManager.getClassMetadata(
      collectionId,
      classNumber,
    );
    classMetadata.title = title;
    await SyllabusManager.setClassMetadata(
      collectionId,
      classNumber,
      classMetadata,
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
    const classMetadata = SyllabusManager.getClassMetadata(
      collectionId,
      classNumber,
    );
    classMetadata.description = description;
    await SyllabusManager.setClassMetadata(
      collectionId,
      classNumber,
      classMetadata,
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
  ): SettingsClassMetadata['readingDate'] {
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
    const classMetadata = SyllabusManager.getClassMetadata(
      collectionId,
      classNumber,
    );
    if (readingDate) {
      classMetadata.readingDate = readingDate;
    } else {
      // Remove reading date if undefined
      delete classMetadata.readingDate;
    }
    await SyllabusManager.setClassMetadata(
      collectionId,
      classNumber,
      classMetadata,
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
    const classMetadata = SyllabusManager.getClassMetadata(
      collectionId,
      classNumber,
    );
    classMetadata.status = status;
    await SyllabusManager.setClassMetadata(
      collectionId,
      classNumber,
      classMetadata,
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
    const syllabusMetadata = SyllabusManager.getSyllabusMetadata(collectionId);
    syllabusMetadata.classes[classNumber] = SettingsClassMetadataSchema.parse(
      {},
    );
    await SyllabusManager.setCollectionMetadata(
      collectionId,
      syllabusMetadata,
      source,
    );
  }

  /**
   * Delete a class from metadata
   */
  static async deleteClass(
    collectionId: number | GetByLibraryAndKeyArgs,
    classNumber: number,
    source: "page",
  ): Promise<void> {
    const syllabusMetadata = SyllabusManager.getSyllabusMetadata(collectionId);
    if (syllabusMetadata.classes[classNumber]) {
      delete syllabusMetadata.classes[classNumber];
      await SyllabusManager.setCollectionMetadata(
        collectionId,
        syllabusMetadata,
        source,
      );
    }
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
    const singular = this.getNomenclature(collectionId);
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
    return [...DEFAULT_PRIORITIES];
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
  ): { color: string; label: string, value: string } {
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
    const defaultPriority = DEFAULT_PRIORITIES.find(p => p.id === id);
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
   * Get readings grouped by date, then by class
   * Returns Map<isoDateString, Map<classNumber, Array<{item, assignment}>>>
   * Only includes classes that have reading dates set
   */
  static getReadingsByDate(
    collectionId: number | GetByLibraryAndKeyArgs,
  ): Map<
    string,
    Map<
      number,
      Array<{ item: Zotero.Item; assignment: ItemSyllabusAssignment }>
    >
  > {
    const result = new Map<
      string,
      Map<
        number,
        Array<{ item: Zotero.Item; assignment: ItemSyllabusAssignment }>
      >
    >();

    try {
      const collection = this.getCollectionFromIdentifier(collectionId);
      if (!collection) {
        return result;
      }

      const items = collection.getChildItems();

      for (const item of items) {
        if (!item.isRegularItem()) continue;

        const assignments = this.getAllClassAssignments(item, collectionId);

        for (const assignment of assignments) {
          if (assignment.classNumber === undefined) continue;

          const readingDate = this.getClassReadingDate(
            collectionId,
            assignment.classNumber,
          );

          // Only include classes with reading dates
          if (!readingDate) continue;

          if (!result.has(readingDate)) {
            result.set(readingDate, new Map());
          }

          const classesForDate = result.get(readingDate)!;
          if (!classesForDate.has(assignment.classNumber)) {
            classesForDate.set(assignment.classNumber, []);
          }

          classesForDate
            .get(assignment.classNumber)!
            .push({ item, assignment });
        }
      }

      // Sort items within each class
      for (const [, classesForDate] of result) {
        for (const [classNumber, itemAssignments] of classesForDate) {
          const sorted = this.sortClassItems(
            itemAssignments,
            collectionId,
            classNumber,
          );
          classesForDate.set(classNumber, sorted);
        }
      }
    } catch (e) {
      ztoolkit.log("Error getting readings by date:", e);
    }

    return result;
  }

  /**
   * Open and render the reading list tab
   */
  static openReadingListTab() {
    const win = Zotero.getMainWindow();
    if (this.readingScheduleTab) {
      this.readingScheduleTab.open(win);
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
    const { description, classes, nomenclature, priorities, locked, ...restOfImported } = imported;

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

    for (const key in restOfImported) {
      // @ts-expect-error - key is a valid key in SettingsSyllabusMetadata
      merged[key] = restOfImported[key];
    }

    return merged;
  }

  /**
   * Prepare export data for a collection
   * Returns validated export JSON object ready for stringification
   * Includes RDF data if available
   */
  static async prepareExportData(
    collectionId: number | GetByLibraryAndKeyArgs,
    collectionTitle: string,
  ): Promise<z.infer<typeof ExportSyllabusMetadataSchema>> {
    // Get current collection's metadata
    const metadata = this.getSyllabusMetadata(collectionId);

    // Get collection object for RDF export
    const collection = this.getCollectionFromIdentifier(collectionId);
    let rdfString: string | undefined;

    // Try to export RDF, but don't fail if it doesn't work
    if (collection) {
      try {
        const rdfResult = await getRDFStringForCollection(collection);
        if (typeof rdfResult === "string") {
          rdfString = rdfResult;
        }
      } catch (error) {
        ztoolkit.log("Error exporting RDF:", error);
        // Continue without RDF - export will work without it
      }
    }

    // Create export object with collection title - schema handles all transformations
    const exportData = {
      collectionTitle: collectionTitle || "",
      ...metadata,
      ...(rdfString ? { rdf: rdfString } : {}),
    };

    // Validate and transform export data using the export schema
    // Schema automatically: removes status fields, excludes locked, filters empty classes
    return ExportSyllabusMetadataSchema.parse(exportData);
  }

  /**
   * Import syllabus metadata from a JSON string (export format)
   * Validates against ExportSyllabusMetadataSchema, updates collection title if provided,
   * merges metadata with existing, and saves everything
   * If RDF data is present, imports items into the current collection
   * Throws errors for invalid JSON or schema validation failures
   */
  static async importSyllabusMetadata(
    collectionId: number | GetByLibraryAndKeyArgs,
    importedJsonString: string,
    source: "page" | "background" = "page",
  ): Promise<{
    collectionAndLibraryKey: string;
    syllabusData: SettingsSyllabusMetadata;
  }> {
    // Parse JSON
    let parsedData: unknown;
    try {
      parsedData = JSON.parse(importedJsonString);
    } catch (parseError) {
      throw new Error(
        `importSyllabusMetadata: The file is not valid JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
      );
    }

    // Validate against ExportSyllabusMetadataSchema (includes collectionTitle)
    const validationResult = ExportSyllabusMetadataSchema.safeParse(parsedData);
    if (!validationResult.success) {
      throw new Error(
        `importSyllabusMetadata: The file does not match the expected syllabus metadata format: ${validationResult.error.message}`,
      );
    }

    const exportData = validationResult.data;

    // Extract metadata (without collectionTitle and rdf) for merging
    const { collectionTitle, rdf, ...metadataData } = exportData;

    // Get target collection for RDF import and title update
    const targetCollection = this.getCollectionFromIdentifier(collectionId);
    if (!targetCollection) {
      throw new Error("importSyllabusMetadata: Target collection not found");
    }

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

          // Patch the assignment config to point to this collection.
          for (const item of importedItems) {
            const assignments = this.getItemSyllabusData(item);

            const newAssignments = ItemSyllabusDataEntity.latestSchema.parse(
              {},
            );
            if (assignments && Object.keys(assignments).length > 0) {
              const firstKey = Object.keys(assignments)[0];
              newAssignments[
                this.getCollectionReferenceString(
                  targetCollection.libraryID,
                  targetCollection.key,
                )
              ] = assignments[firstKey];

              // (Also remove read statuses)
              for (const [collectionId, assignments] of Object.entries(
                newAssignments,
              )) {
                for (const [index, assignment] of assignments.entries()) {
                  newAssignments[collectionId][index].status = null;
                }
              }

              // Save
              this.setItemData(item, newAssignments, source);
            }
          }
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
    ztoolkit.log("importSyllabusMetadata: metadata before merge:", { metadataData, existingMetadata });
    const mergedMetadata = this.deepMergeMetadata(
      existingMetadata,
      metadataValidation.data,
    );
    ztoolkit.log("importSyllabusMetadata: metadata after merge:", { mergedMetadata });

    // Save merged metadata
    await this.setCollectionMetadata(collectionId, mergedMetadata, source);

    return {
      collectionAndLibraryKey: this.getCollectionReferenceString(
        targetCollection.libraryID,
        targetCollection.key,
      ),
      syllabusData: mergedMetadata,
    }
  }
}
