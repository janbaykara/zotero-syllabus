/**
 * Syllabus Manager - Core functionality for syllabus view and metadata
 */

import { getLocaleID } from "../utils/locale";
import { ExtraFieldTool } from "zotero-plugin-toolkit";
import { renderSyllabusPage } from "./SyllabusPage";
import { getSelectedCollection } from "../utils/zotero";
import { set } from "lodash-es";
import { renderComponent } from "../utils/react";
import { ItemPane } from "./ItemPane";
import { h } from "preact";
import { uuidv7 } from "uuidv7";

export enum SyllabusPriority {
  COURSE_INFO = "course-info",
  ESSENTIAL = "essential",
  RECOMMENDED = "recommended",
  OPTIONAL = "optional",
}

enum SyllabusSettingsKey {
  COLLECTION_METADATA = "collectionMetadata",
  COLLECTION_VIEW_MODES = "collectionViewModes",
  COLLECTION_ITEM_ORDER = "collectionItemOrder",
}

export interface ItemSyllabusAssignment {
  id: string; // Unique ID for React rendering (auto-generated if not present)
  classNumber?: number;
  priority?: SyllabusPriority;
  classInstruction?: string;
}

export interface ItemSyllabusData {
  [collectionId: string]: ItemSyllabusAssignment[];
}

/**
 * Manual ordering of items within classes, stored in preferences
 * Array order represents display order; empty array means use natural order
 */
export interface SettingsClassItemOrder {
  [collectionId: string]: {
    [classNumber: string]: string[]; // ordered itemIds
  };
}

/**
 * Collection metadata stored in preferences
 */
export interface SettingsCollectionDictionaryData {
  [collectionId: string]: SettingsSyllabusMetadata;
}

export interface SettingsSyllabusMetadata {
  description?: string;
  classes?: {
    [classNumber: string]: SettingsClassMetadata;
  };
}

export interface SettingsClassMetadata {
  title?: string;
  description?: string;
  items?: SettingsClassItemMetadata[];
}

export interface SettingsClassItemMetadata {
  itemId: string;
  priority?: SyllabusPriority;
  classInstruction?: string;
}

export class SyllabusManager {
  static notifierID: string | null = null;
  static syllabusItemPaneSection: false | string | null = null;

  static settingsKeys = SyllabusSettingsKey;
  static priorityKeys = SyllabusPriority;
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

  /**
   * Color definitions for syllabus priorities
   */
  static PRIORITY_COLORS: Record<SyllabusPriority, string> = {
    [SyllabusPriority.COURSE_INFO]: "#F97316", // orange
    [SyllabusPriority.ESSENTIAL]: "#8B5CF6", // purple
    [SyllabusPriority.RECOMMENDED]: "#3B82F6", // blue
    [SyllabusPriority.OPTIONAL]: "#AAA", // darker grey for better readability
  };

  /**
   * Human-readable labels for syllabus priorities
   */
  static PRIORITY_LABELS: Record<SyllabusPriority, string> = {
    [SyllabusPriority.COURSE_INFO]: "Course Information",
    [SyllabusPriority.ESSENTIAL]: "Essential",
    [SyllabusPriority.RECOMMENDED]: "Recommended",
    [SyllabusPriority.OPTIONAL]: "Optional",
  };

  static SYLLABUS_DATA_KEY = "syllabus";

  static SYLLABUS_CLASS_NUMBER_FIELD = "syllabus-class-number";

  // Create an ExtraFieldTool instance for safe extra field operations
  static extraFieldTool = new ExtraFieldTool();

  static onStartup() {
    ztoolkit.log("SyllabusManager.onStartup");
    this.registerPrefs();
    this.registerNotifier();
    this.registerSyllabusPriorityColumn();
    this.registerSyllabusClassInstructionColumn();
    this.registerSyllabusClassNumberColumn();
    this.registerSyllabusInfoColumn();
    this.reloadItemPane();
  }

  static onMainWindowLoad(win: _ZoteroTypes.MainWindow) {
    ztoolkit.log("SyllabusManager.onMainWindowLoad", win);
    // const collectionId = win.getSelectedCollection()?.id;
    // if (collectionId) {
    //   this.cleanupItemMetadata(collectionId);
    // }
    this.setupContextMenuSetPriority();
    this.setupContextMenuSetClassNumber();
    this.setupUI();
    this.setupSyllabusViewTabListener();
    this.setupSyllabusViewReloadListener();
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
    source: "page" | "item-pane" | "context-menu",
  ) {
    ztoolkit.log("SyllabusManager.onItemUpdate", source, item.id);
    // No need to call setupPage() - React stores will trigger re-render automatically
    if (source !== "item-pane") this.reloadItemPane();
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
    this.setupContextMenuSetClassNumber();
  }

  /**
   * E.g. the description of the collection has been updated
   */
  static onCollectionUpdated(collection: Zotero.Collection, source: "page", reason: string) {
    ztoolkit.log("SyllabusManager.onCollectionUpdated", reason, source, collection);
    // No need to call setupPage() - React stores will trigger re-render automatically
  }

  static onMainWindowUnload(win: _ZoteroTypes.MainWindow) {
    ztoolkit.log("SyllabusManager.onMainWindowUnload", win);
    this.setupUI();
    this.cleanupSyllabusViewTabListener();
  }

  static onShutdown() {
    ztoolkit.log("SyllabusManager.onShutdown");
    this.unregisterNotifier();
  }

  static registerNotifier() {
    // const callback = {
    //   notify: async (
    //     event: string,
    //     type: string,
    //     ids: number[] | string[],
    //     extraData: { [key: string]: any },
    //   ) => {
    //     if (!addon?.data.alive) {
    //       SyllabusManager.unregisterNotifier();
    //       return;
    //     }
    //     addon.hooks.onNotify(event, type, ids, extraData);
    //   },
    // };
    // // Register the callback in Zotero as an item observer
    // this.notifierID = Zotero.Notifier.registerObserver(callback, [
    //   "collection",
    //   "search",
    //   "share",
    //   "share-items",
    //   "item",
    //   "file",
    //   "collection-item",
    //   "item-tag",
    //   "tag",
    //   "setting",
    //   "group",
    //   "trash",
    //   "bucket",
    //   "relation",
    //   "feed",
    //   "feedItem",
    //   "sync",
    //   "api-key",
    //   "tab",
    //   "itemtree",
    //   "itempane",
    // ]);
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
    const interval = setInterval(async () => {
      const collection = getSelectedCollection();
      if (collection && collection.id.toString() !== selectedCollectionId) {
        ztoolkit.log("Selected collection changed", collection.id);
        selectedCollectionId = collection.id.toString();
        // setupUI() calls setupPage() which re-renders React component for new collection
        // Once mounted, React stores handle all data updates automatically
        SyllabusManager.setupUI();
      }
    }, 500);
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
              SyllabusManager.setupPage();
            },
          },
        ],
      });

      // Set initial label
      SyllabusManager.updateButtonLabel(toggleButton);

      // Create spacer element if it doesn't exist
      if (!spacer) {
        spacer = doc.createElementNS(
          "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul",
          "spacer",
        );
        spacer.id = "syllabus-view-spacer";
        spacer.setAttribute("flex", "1");
      }

      // Insert button and spacer before the search spinner, or append to toolbar if spinner not found
      if (searchSpinner && searchSpinner.parentNode) {
        searchSpinner.parentNode.insertBefore(toggleButton, searchSpinner);
        searchSpinner.parentNode.insertBefore(spacer, searchSpinner);
      } else {
        itemsToolbar.appendChild(toggleButton);
        itemsToolbar.appendChild(spacer);
      }
    } else {
      // Update button state and label
      SyllabusManager.updateButtonLabel(toggleButton);
    }
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

  static async registerSyllabusPriorityColumn() {
    const field = "syllabus-priority";
    await Zotero.ItemTreeManager.registerColumns({
      pluginID: addon.data.config.addonID,
      dataKey: field,
      label: "Priority",
      dataProvider: (item: Zotero.Item, dataKey: string) => {
        const zoteroPane = ztoolkit.getGlobal("ZoteroPane");
        const selectedCollection = zoteroPane.getSelectedCollection();

        if (selectedCollection) {
          const firstAssignment = SyllabusManager.getFirstAssignment(
            item,
            selectedCollection.id,
          );
          if (firstAssignment) {
            return SyllabusManager.getAssignmentSortKey(firstAssignment);
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

        // Parse the sort key: "classNumber___priorityOrder___priorityValue"
        const parts = String(data).split("___");
        const priority = parts.length > 2 ? parts[2] : "";

        if (
          priority &&
          SyllabusManager.PRIORITY_LABELS[priority as SyllabusPriority]
        ) {
          const priorityEnum = priority as SyllabusPriority;
          // Create colored dot
          const dot = doc.createElement("span");
          dot.style.width = "8px";
          dot.style.height = "8px";
          dot.style.borderRadius = "50%";
          dot.style.backgroundColor =
            SyllabusManager.PRIORITY_COLORS[priorityEnum];
          dot.style.flexShrink = "0";
          container.appendChild(dot);

          // Create text label
          const label = doc.createElement("span");
          label.textContent = SyllabusManager.PRIORITY_LABELS[priorityEnum];
          container.appendChild(label);
        }

        return container;
      },
    });
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

  static async registerSyllabusClassNumberColumn() {
    const field = this.SYLLABUS_CLASS_NUMBER_FIELD;
    await Zotero.ItemTreeManager.registerColumns({
      pluginID: addon.data.config.addonID,
      dataKey: field,
      label: "Class No.",
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
            const sortKey = SyllabusManager.getAssignmentSortKey(firstAssignment);
            // Encode class number and title for display
            const classNumber = firstAssignment.classNumber;
            const classTitle = classNumber !== undefined
              ? SyllabusManager.getClassTitle(selectedCollection.id, classNumber, true)
              : "";
            // Format: "sortKey|classNumber|classTitle" for renderCell
            return `${sortKey}|${classNumber ?? ""}|${classTitle}`;
          }
        }

        return "";
      },
      renderCell: (index, data, column, isFirstColumn, doc) => {
        const span = doc.createElement("span");
        span.className = `cell ${column.className}`;

        const dataStr = String(data);
        // Parse: "sortKey|classNumber|classTitle"
        const parts = dataStr.split("|");

        if (parts.length >= 3) {
          const classNumber = parts[1];
          const classTitle = parts[2];

          if (classNumber) {
            // Display class title if available, otherwise just the number
            span.textContent = classTitle || classNumber;
          }
        }

        return span;
      },
    });
  }

  static async registerSyllabusInfoColumn() {
    const field = "syllabus-info";
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
            const sortKey = SyllabusManager.getAssignmentSortKey(firstAssignment);
            // Encode data for display: "sortKey|priority|classNumber|classTitle"
            const classNumber = firstAssignment.classNumber;
            const classTitle = classNumber !== undefined
              ? SyllabusManager.getClassTitle(selectedCollection.id, classNumber, false)
              : "";
            const priority = firstAssignment.priority || "";
            return `${sortKey}|${priority}|${classNumber ?? ""}|${classTitle}`;
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

        // Parse: "sortKey|priority|classNumber|classTitle"
        const dataStr = String(data);
        const parts = dataStr.split("|");

        if (parts.length >= 4) {
          const priority = parts[1];
          const classNumber = parts[2];
          const classTitle = parts[3];

          // Display class number if available
          if (classNumber) {
            const classNumberSpan = doc.createElement("span");
            classNumberSpan.textContent = `#${classNumber}`;
            classNumberSpan.style.fontWeight = "500";
            container.appendChild(classNumberSpan);
          }

          // Display priority if available
          if (
            priority &&
            SyllabusManager.PRIORITY_LABELS[priority as SyllabusPriority]
          ) {
            const priorityEnum = priority as SyllabusPriority;
            // Create colored dot
            const dot = doc.createElement("span");
            dot.style.width = "8px";
            dot.style.height = "8px";
            dot.style.borderRadius = "50%";
            dot.style.backgroundColor =
              SyllabusManager.PRIORITY_COLORS[priorityEnum];
            dot.style.flexShrink = "0";
            container.appendChild(dot);

            // Create text label
            const label = doc.createElement("span");
            label.textContent = SyllabusManager.PRIORITY_LABELS[priorityEnum];
            container.appendChild(label);
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

        return container;
      },
    });
  }

  static reloadItemPane() {
    ztoolkit.log("SyllabusManager.reloadItemPane");
    this.destroyItemPaneSection();
    setTimeout(() => {
      this.registerSyllabusItemPaneSection();
    }, 100);
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
      // onItemUpdate: ({ item, setEnabled, tabType, editable, ...args }) => {
      //   // ztoolkit.log("SyllabusManager.registerSyllabusItemPaneSection.onItemUpdate", {
      //   //   item,
      //   //   tabType,
      //   //   editable,
      //   //   args
      //   // });
      //   // Only enable in library view (not reader)
      //   // const enabled = tabType === "library" && item?.isRegularItem();
      //   // setEnabled(enabled);
      //   // if (editable && enabled) {
      //   //   this.onItemUpdate(item, "registerSyllabusItemPaneSection.onItemUpdate");
      //   // }
      //   // return true;
      // },
      onRender: ({ body, item, editable }) => {
        const zoteroPane = ztoolkit.getGlobal("ZoteroPane");
        const selectedCollection = zoteroPane.getSelectedCollection();
        const win = Zotero.getMainWindow();

        //   if (!selectedCollection) {
        //     const doc = body.ownerDocument || ztoolkit.getGlobal("document");
        //     body.textContent = "";
        //     const message = ztoolkit.UI.createElement(doc, "div", {
        //       namespace: "html",
        //       properties: {
        //         innerText: "Select a collection to view syllabus assignments",
        //       },
        //       styles: {
        //         padding: "10px",
        //         color: "#666",
        //       },
        //     });
        //     body.appendChild(message);
        //     return;
        //   }

        //   // Clear previous content
        body.textContent = "";

        const root = body.ownerDocument?.createElement("div");
        body.appendChild(root);

        // renderComponent(
        //   win,
        //   root,
        //   h("div", {
        //     innerText: selectedCollection ? `${selectedCollection.name} is selected` : "No collection selected",
        //     className: "text-center text-gray-500 p-4",
        //   })
        // );

        //   // Render Preact component
        renderComponent(
          win,
          body,
          selectedCollection ? h(ItemPane, {
            item,
            collectionId: selectedCollection.id,
            editable,
          }) : h("div", {
            innerText: "Select a collection to view syllabus assignments",
            className: "text-center text-gray-500 p-4",
          }),
          "syllabus-item-pane"
        );
      },
    });
  }

  static setupContextMenuSetPriority() {
    ztoolkit.Menu.unregister("syllabus-set-priority-menu");
    ztoolkit.Menu.register("item", {
      tag: "menu",
      id: "syllabus-set-priority-menu",
      label: "Set Priority",
      icon: "chrome://zotero/skin/16/universal/book.svg",
      children: [
        // TODO: encapsulate item in generator function to keep things DRY
        {
          tag: "menuitem",
          label: SyllabusManager.PRIORITY_LABELS[SyllabusPriority.COURSE_INFO],
          commandListener: async () => {
            const zoteroPane = ztoolkit.getGlobal("ZoteroPane");
            const selectedCollection = zoteroPane.getSelectedCollection();
            if (!selectedCollection) return;
            const items = zoteroPane.getSelectedItems();
            const collectionId = selectedCollection.id;
            for (const item of items) {
              if (item.isRegularItem()) {
                await SyllabusManager.setSyllabusPriority(
                  item,
                  collectionId,
                  SyllabusPriority.COURSE_INFO,
                  "context-menu",
                );
                await item.saveTx();
              }
            }

            const itemPane = zoteroPane.itemPane;
            if (itemPane) {
              itemPane.render();
            }
          },
        },
        {
          tag: "menuitem",
          label: SyllabusManager.PRIORITY_LABELS[SyllabusPriority.ESSENTIAL],
          commandListener: async () => {
            const zoteroPane = ztoolkit.getGlobal("ZoteroPane");
            const selectedCollection = zoteroPane.getSelectedCollection();
            if (!selectedCollection) return;
            const items = zoteroPane.getSelectedItems();
            const collectionId = selectedCollection.id;
            for (const item of items) {
              if (item.isRegularItem()) {
                await SyllabusManager.setSyllabusPriority(
                  item,
                  collectionId,
                  SyllabusPriority.ESSENTIAL,
                  "context-menu",
                );
                await item.saveTx();
              }
            }

            const itemPane = zoteroPane.itemPane;
            if (itemPane) {
              itemPane.render();
            }
          },
        },
        {
          tag: "menuitem",
          label: SyllabusManager.PRIORITY_LABELS[SyllabusPriority.RECOMMENDED],
          commandListener: async () => {
            const zoteroPane = ztoolkit.getGlobal("ZoteroPane");
            const selectedCollection = zoteroPane.getSelectedCollection();
            if (!selectedCollection) return;
            const items = zoteroPane.getSelectedItems();
            const collectionId = selectedCollection.id;
            for (const item of items) {
              if (item.isRegularItem()) {
                await SyllabusManager.setSyllabusPriority(
                  item,
                  collectionId,
                  SyllabusPriority.RECOMMENDED,
                  "context-menu",
                );
                await item.saveTx();
              }
            }

            const itemPane = zoteroPane.itemPane;
            if (itemPane) {
              itemPane.render();
            }
          },
        },
        {
          tag: "menuitem",
          label: SyllabusManager.PRIORITY_LABELS[SyllabusPriority.OPTIONAL],
          commandListener: async () => {
            const zoteroPane = ztoolkit.getGlobal("ZoteroPane");
            const selectedCollection = zoteroPane.getSelectedCollection();
            if (!selectedCollection) return;
            const items = zoteroPane.getSelectedItems();
            const collectionId = selectedCollection.id;
            for (const item of items) {
              if (item.isRegularItem()) {
                await SyllabusManager.setSyllabusPriority(
                  item,
                  collectionId,
                  SyllabusPriority.OPTIONAL,
                  "context-menu",
                );
                await item.saveTx();
              }
            }

            const itemPane = zoteroPane.itemPane;
            if (itemPane) {
              itemPane.render();
            }
          },
        },
        {
          tag: "menuseparator",
        },
        {
          tag: "menuitem",
          label: "(None)",
          commandListener: async () => {
            const zoteroPane = ztoolkit.getGlobal("ZoteroPane");
            const selectedCollection = zoteroPane.getSelectedCollection();
            if (!selectedCollection) return;
            const items = zoteroPane.getSelectedItems();
            const collectionId = selectedCollection.id;
            for (const item of items) {
              if (item.isRegularItem()) {
                await SyllabusManager.setSyllabusPriority(
                  item,
                  collectionId,
                  "",
                  "context-menu",
                );
                await item.saveTx();
              }
            }

            const itemPane = zoteroPane.itemPane;
            if (itemPane) {
              itemPane.render();
            }
          },
        },
      ],
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
          tag: "menuitem",
          label: "(No collection selected)",
          disabled: true,
        },
      ];
    }

    // Get all items in the collection to find existing class numbers
    const collectionItems = selectedCollection.getChildItems();
    const classNumbers = new Set<number>();
    for (const item of collectionItems) {
      if (item.isRegularItem()) {
        // Get all class assignments to find all class numbers
        const assignments = SyllabusManager.getAllClassAssignments(
          item,
          selectedCollection.id,
        );
        for (const assignment of assignments) {
          if (assignment.classNumber !== undefined) {
            classNumbers.add(assignment.classNumber);
          }
        }
      }
    }

    // Sort class numbers
    const sortedClassNumbers = Array.from(classNumbers).sort((a, b) => a - b);

    const children: any[] = [];

    // Add menu items for each class number
    for (const classNumber of sortedClassNumbers) {
      const classTitle = SyllabusManager.getClassTitle(
        selectedCollection.id,
        classNumber,
        true,
      );
      children.push({
        tag: "menuitem",
        label: classTitle ? classTitle : `Class ${classNumber}`,
        commandListener: async () => {
          const zoteroPane = ztoolkit.getGlobal("ZoteroPane");
          const selectedCollection = zoteroPane.getSelectedCollection();
          if (!selectedCollection) return;
          const items = zoteroPane.getSelectedItems();
          const collectionId = selectedCollection.id;
          for (const item of items) {
            if (item.isRegularItem()) {
              await SyllabusManager.setSyllabusClassNumber(
                item,
                collectionId,
                classNumber,
                "context-menu",
              );
              await item.saveTx();
            }
          }

          const itemPane = zoteroPane.itemPane;
          if (itemPane) {
            itemPane.render();
          }
        },
      });
    }

    // Add separator if there are class numbers
    if (sortedClassNumbers.length > 0) {
      children.push({
        tag: "menuseparator",
      });
    }

    // Add "None" option
    children.push({
      tag: "menuitem",
      label: "(None)",
      commandListener: async () => {
        const zoteroPane = ztoolkit.getGlobal("ZoteroPane");
        const selectedCollection = zoteroPane.getSelectedCollection();
        if (!selectedCollection) return;
        const items = zoteroPane.getSelectedItems();
        const collectionId = selectedCollection.id;
        for (const item of items) {
          if (item.isRegularItem()) {
            await SyllabusManager.setSyllabusClassNumber(
              item,
              collectionId,
              undefined,
              "context-menu",
            );
            await item.saveTx();
          }
        }

        const itemPane = zoteroPane.itemPane;
        if (itemPane) {
          itemPane.render();
        }
      },
    });

    return children;
  }

  static setCollectionTitle(
    collectionId: number,
    title: string,
    source: "page",
  ) {
    const collection = Zotero.Collections.get(collectionId);
    if (collection) {
      collection.name = title;
      collection.saveTx();
    }
    this.onCollectionUpdated(collection, source, "setCollectionTitle");
  }

  /**
   * Get syllabus data from an item's extra field
   * Uses caching to avoid repeated JSON parsing for the same item
   * Handles migration from old format (single object) to new format (array)
   */
  static getItemSyllabusData(item: Zotero.Item): ItemSyllabusData {
    // Check cache first
    const cached = this.syllabusDataCache.get(item);
    if (cached !== undefined) {
      return cached;
    }

    const jsonStr = this.extraFieldTool.getExtraField(
      item,
      this.SYLLABUS_DATA_KEY,
    );

    let data: ItemSyllabusData = {};
    if (jsonStr) {
      try {
        const parsed = JSON.parse(jsonStr);
        // Migrate from old format (single object) to new format (array)
        data = this.migrateItemExtraFieldsToArray(parsed);
      } catch (e) {
        ztoolkit.log("Error parsing syllabus data:", e);
        data = {};
      }
    }

    // Cache the parsed data
    this.syllabusDataCache.set(item, data);
    return data;
  }

  /**
   * Generate a unique ID for an assignment entry
   */
  private static generateAssignmentId(): string {
    return `assignment-${uuidv7()}`;
  }

  /**
   * Ensure all entries have unique IDs
   */
  private static ensureAssignmentIds(
    entries: ItemSyllabusAssignment[],
  ): ItemSyllabusAssignment[] {
    return entries.map((entry, index) => {
      if (!entry.id) {
        return { ...entry, id: this.generateAssignmentId() };
      }
      return entry;
    });
  }

  /**
   * Ensure items are usable by the plugin for the current view.
   */
  private static cleanupItemMetadata(collectionId: string | number) {
    // get all items in the collection, then run them through migrateItemExtraFieldsToArray
    const items = Zotero.Collections.get(Number(collectionId)).getChildItems();
    for (const item of items) {
      this.migrateItemExtraFieldsToArray(this.getItemSyllabusData(item));
    }
  }

  /**
   * Migrate item extra field data from old format (single object) to new format (array)
   * Old format: { [collectionId]: { priority?, classInstruction?, classNumber? } }
   * New format: { [collectionId]: Array<{ id?, priority?, classInstruction?, classNumber? }> }
   */
  private static migrateItemExtraFieldsToArray(
    parsed: any,
  ): ItemSyllabusData {
    if (!parsed || typeof parsed !== "object") {
      return {};
    }

    const migrated: ItemSyllabusData = {};

    for (const [collectionId, value] of Object.entries(parsed)) {
      if (Array.isArray(value)) {
        // Already in new format, ensure IDs
        migrated[collectionId] = this.ensureAssignmentIds(
          value as ItemSyllabusAssignment[],
        );
      } else if (value && typeof value === "object") {
        // Old format: single object, convert to array
        const entry = value as ItemSyllabusAssignment;
        // Only migrate if it has actual data
        if (
          entry.priority ||
          entry.classInstruction ||
          entry.classNumber !== undefined
        ) {
          const entries = this.ensureAssignmentIds([entry]);
          migrated[collectionId] = entries;
        } else {
          migrated[collectionId] = [];
        }
      } else {
        migrated[collectionId] = [];
      }
    }

    return migrated;
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
   */
  static async setSyllabusData(
    item: Zotero.Item,
    data: ItemSyllabusData,
    source: "page" | "item-pane" | "context-menu",
  ): Promise<void> {
    // Ensure all entries have IDs before saving
    const dataWithIds: ItemSyllabusData = {};
    for (const [collectionId, entries] of Object.entries(data)) {
      dataWithIds[collectionId] = this.ensureAssignmentIds(entries);
    }

    const jsonStr = JSON.stringify(dataWithIds);
    await this.extraFieldTool.setExtraField(
      item,
      this.SYLLABUS_DATA_KEY,
      jsonStr,
    );
    // Invalidate cache when data changes
    this.invalidateSyllabusDataCache(item);
    this.onItemUpdate(item, source);
  }

  /**
   * Get syllabus priority for a specific collection and class
   * If classNumber is provided, returns priority for that class
   * Otherwise, returns priority from first entry
   */
  static getSyllabusPriority(
    item: Zotero.Item,
    collectionId: number | string,
    classNumber?: number,
  ): SyllabusPriority | "" {
    const data = this.getItemSyllabusData(item);
    const collectionIdStr = String(collectionId);
    const entries = data[collectionIdStr] || [];

    if (classNumber !== undefined) {
      const entry = entries.find((e) => e.classNumber === classNumber);
      return entry?.priority || "";
    }

    // Return first entry's priority if no classNumber specified
    return entries[0]?.priority || "";
  }

  /**
   * Set syllabus priority for a specific collection and class
   * If assignmentId is provided, updates that specific assignment (preferred)
   * If classNumber is provided, finds first matching assignment or creates one
   * Otherwise, updates the first entry or creates one if none exists
   * 
   * Note: For new code, prefer using updateClassAssignment with assignmentId
   */
  static async setSyllabusPriority(
    item: Zotero.Item,
    collectionId: number | string,
    priority: SyllabusPriority | "",
    source: "page" | "item-pane" | "context-menu",
    classNumber?: number,
    assignmentId?: string,
  ): Promise<void> {
    // If assignmentId is provided, use updateClassAssignment (preferred)
    if (assignmentId) {
      await this.updateClassAssignment(
        item,
        collectionId,
        assignmentId,
        { priority: priority || undefined },
        source,
      );
      return;
    }

    // Fallback to legacy behavior for context menus
    const data = this.getItemSyllabusData(item);
    const collectionIdStr = String(collectionId);
    let entries = data[collectionIdStr] || [];

    if (classNumber !== undefined) {
      // Find or create entry for specific class
      let entryIndex = entries.findIndex((e) => e.classNumber === classNumber);
      if (entryIndex === -1) {
        entries.push({ classNumber });
        entryIndex = entries.length - 1;
      }

      if (priority) {
        entries[entryIndex].priority = priority;
      } else {
        delete entries[entryIndex].priority;
        // Remove entry if all fields are empty
        if (
          !entries[entryIndex].classInstruction &&
          entries[entryIndex].classNumber === undefined
        ) {
          entries.splice(entryIndex, 1);
        }
      }
    } else {
      // Update first entry or create one
      if (entries.length === 0) {
        entries.push({});
      }

      if (priority) {
        entries[0].priority = priority;
      } else {
        delete entries[0].priority;
        // Remove entry if all fields are empty
        if (
          !entries[0].classInstruction &&
          entries[0].classNumber === undefined
        ) {
          entries = [];
        }
      }
    }

    if (entries.length === 0) {
      delete data[collectionIdStr];
    } else {
      data[collectionIdStr] = entries;
    }

    await this.setSyllabusData(item, data, source);
  }

  /**
   * Get class instruction for a specific collection and class
   * If classNumber is provided, returns instruction for that class
   * Otherwise, returns instruction from first entry
   */
  static getSyllabusClassInstruction(
    item: Zotero.Item,
    collectionId: number | string,
    classNumber?: number,
  ): string {
    const data = this.getItemSyllabusData(item);
    const collectionIdStr = String(collectionId);
    const entries = data[collectionIdStr] || [];

    if (classNumber !== undefined) {
      const entry = entries.find((e) => e.classNumber === classNumber);
      return entry?.classInstruction || "";
    }

    // Return first entry's instruction if no classNumber specified
    return entries[0]?.classInstruction || "";
  }

  /**
   * Get syllabus class number for a specific collection
   * Returns the first class number found, or undefined if none
   * For multiple class assignments, use getAllClassAssignments()
   */
  static getSyllabusClassNumber(
    item: Zotero.Item,
    collectionId: number | string,
  ): number | undefined {
    const data = this.getItemSyllabusData(item);
    const collectionIdStr = String(collectionId);
    const entries = data[collectionIdStr] || [];
    return entries[0]?.classNumber;
  }

  /**
   * Get the min and max class number range for a collection
   * Considers both items with class numbers and classes defined in metadata
   */
  static getClassNumberRange(
    collectionId: number | string,
    syllabusMetadata?: SettingsSyllabusMetadata,
  ): { min: number | null; max: number | null } {
    const classNumbers = new Set<number>();

    // Get class numbers from items in the collection
    try {
      const collection = Zotero.Collections.get(
        typeof collectionId === "string"
          ? parseInt(collectionId, 10)
          : collectionId,
      );
      if (collection) {
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
      }
    } catch (e) {
      ztoolkit.log("Error getting class numbers from items:", e);
    }

    // Get class numbers from metadata
    const metadata = syllabusMetadata || this.getSyllabusMetadata(collectionId);
    if (metadata.classes) {
      for (const classNumStr of Object.keys(metadata.classes)) {
        const classNum = parseInt(classNumStr, 10);
        if (!isNaN(classNum)) {
          classNumbers.add(classNum);
        }
      }
    }

    if (classNumbers.size === 0) {
      return { min: null, max: null };
    }

    const sortedNumbers = Array.from(classNumbers).sort((a, b) => a - b);
    return {
      min: sortedNumbers[0],
      max: sortedNumbers[sortedNumbers.length - 1],
    };
  }

  /**
   * Set syllabus class number for a specific collection
   * If the item already has an entry for this classNumber, updates it
   * Otherwise, creates a new entry or updates the first entry if no classNumber specified
   */
  static async setSyllabusClassNumber(
    item: Zotero.Item,
    collectionId: number | string,
    classNumber: number | undefined,
    source: "page" | "item-pane" | "context-menu",
  ) {
    const data = this.getItemSyllabusData(item);
    const collectionIdStr = String(collectionId);
    let assignments = data[collectionIdStr] || [];

    if (classNumber) {
      // Find or create assignment for this class number
      const assignment = assignments.find((e) => e.classNumber === classNumber);
      if (!assignment) {
        // Create new assignment
        await this.addClassAssignment(item, collectionId, classNumber, {}, source);
        // Re-fetch data after adding
        const updatedData = this.getItemSyllabusData(item);
        assignments = updatedData[collectionIdStr] || [];
      } else {
        // Update existing assignment
        await this.updateClassAssignment(item, collectionId, assignment.id, { classNumber }, source);
        // Re-fetch data after updating
        const updatedData = this.getItemSyllabusData(item);
        assignments = updatedData[collectionIdStr] || [];
      }
    } else {
      // Remove classNumber from first assignment, or remove assignment if empty
      if (assignments.length > 0) {
        delete assignments[0].classNumber;
        // Remove assignment if all fields are empty
        if (!assignments[0].priority && !assignments[0].classInstruction) {
          assignments = assignments.slice(1);
        }
      }
    }

    if (assignments.length === 0) {
      delete data[collectionIdStr];
    } else {
      data[collectionIdStr] = assignments;
    }

    await this.setSyllabusData(item, data, source);
  }

  /**
   * Get all class assignments for an item in a collection
   */
  static getAllClassAssignments(
    item: Zotero.Item,
    collectionId: number | string,
  ): ItemSyllabusAssignment[] {
    const data = this.getItemSyllabusData(item);
    const collectionIdStr = String(collectionId);
    const entries = data[collectionIdStr] || [];
    // Ensure all assignments have IDs for React keying
    return this.ensureAssignmentIds(entries);
  }

  /**
   * Get the first assignment for an item in a collection (sorted by compareAssignments).
   * This is used to drive column rendering and sorting consistently.
   */
  static getFirstAssignment(
    item: Zotero.Item,
    collectionId: number | string,
  ): ItemSyllabusAssignment | undefined {
    const assignments = this.getAllClassAssignments(item, collectionId)
    if (assignments.length === 0) {
      return undefined;
    }
    // Sort and return the first one
    const sorted = [...assignments].sort(this.compareAssignments);
    return sorted[0];
  }

  /**
   * Get priority order number for sorting (lower = higher priority)
   */
  static getPriorityOrder(
    priority: SyllabusPriority | "" | undefined,
  ): number {
    try {
      if (priority === SyllabusPriority.COURSE_INFO) return 2;
      if (priority === SyllabusPriority.ESSENTIAL) return 4;
      if (priority === SyllabusPriority.RECOMMENDED) return 6;
      if (priority === SyllabusPriority.OPTIONAL) return 8;
      return 9; // blank/undefined
    } catch (e) {
      ztoolkit.log("Error getting priority order:", e);
      return 9;
    }
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
    return SyllabusManager.getAssignmentSortKey(a).localeCompare(SyllabusManager.getAssignmentSortKey(b));
  }

  /**
   * Generate a sort key for an assignment (for column renderer compatibility).
   * Here's the rule:
   * 1. Unassigned priority'd items go first.
   * 2. Then assigned items.
   * 3. Then everything else.
   * 
   * Within each group, sort by class number, then priority, then assignmentID.
   */
  static getAssignmentSortKey(assignment: ItemSyllabusAssignment): string {
    const isCourseInfo = assignment.priority === SyllabusPriority.COURSE_INFO && assignment.classNumber === undefined;
    const isClassAssignment = assignment.classNumber !== undefined;

    return [
      // Group
      isCourseInfo ? "AAAA" : isClassAssignment ? "BBBB" : "CCCC",
      assignment.classNumber !== undefined ? String(assignment.classNumber).padStart(4, "0") : "9999",
      // Group priority
      String(SyllabusManager.getPriorityOrder(assignment.priority)).padStart(4, "0"),
      assignment.priority || "",
      // Group class instruction
      assignment.classInstruction?.slice(0, 4).replace(/[^a-zA-Z0-9]/g, "_") || "",
      // Group assignment ID
      assignment.id || "",
    ].join("___");
  }

  /**
   * Add a new class assignment for an item
   */
  static async addClassAssignment(
    item: Zotero.Item,
    collectionId: number | string,
    classNumber: number | undefined,
    metadata: Partial<ItemSyllabusAssignment>,
    source: "page" | "item-pane" | "context-menu",
  ): Promise<void> {
    const data = this.getItemSyllabusData(item);
    const collectionIdStr = String(collectionId);
    const assignments = data[collectionIdStr] || [];

    // Add new entry with ID
    const newEntry: ItemSyllabusAssignment = {
      classNumber,
      ...metadata,
      id: this.generateAssignmentId(),
    };
    assignments.push(newEntry);

    // Ensure all entries have IDs before saving
    data[collectionIdStr] = this.ensureAssignmentIds(assignments);
    await this.setSyllabusData(item, data, source);
  }

  /**
   * Remove a specific class assignment from an item by classNumber
   * Note: For more precise removal, use removeAssignmentById
   */
  static async removeClassAssignment(
    item: Zotero.Item,
    collectionId: number | string,
    classNumber: number,
    source: "page" | "item-pane" | "context-menu",
  ): Promise<void> {
    const data = this.getItemSyllabusData(item);
    const collectionIdStr = String(collectionId);
    let entries = data[collectionIdStr] || [];

    entries = entries.filter((e) => e.classNumber !== classNumber);

    if (entries.length === 0) {
      delete data[collectionIdStr];
    } else {
      data[collectionIdStr] = entries;
    }

    await this.setSyllabusData(item, data, source);
  }

  /**
   * Remove a specific assignment from an item by its ID
   */
  static async removeAssignmentById(
    item: Zotero.Item,
    collectionId: number | string,
    assignmentId: string,
    source: "page" | "item-pane" | "context-menu",
  ): Promise<void> {
    const data = this.getItemSyllabusData(item);
    const collectionIdStr = String(collectionId);
    let entries = data[collectionIdStr] || [];

    entries = entries.filter((e) => e.id !== assignmentId);

    if (entries.length === 0) {
      delete data[collectionIdStr];
    } else {
      data[collectionIdStr] = entries;
    }

    await this.setSyllabusData(item, data, source);
  }

  /**
   * Remove all assignments for an item in a collection
   */
  static async removeAllAssignments(
    item: Zotero.Item,
    collectionId: number | string,
    source: "page" | "item-pane" | "context-menu",
  ): Promise<void> {
    const data = this.getItemSyllabusData(item);
    const collectionIdStr = String(collectionId);
    delete data[collectionIdStr];
    await this.setSyllabusData(item, data, source);
  }

  /**
   * Update an existing class assignment by its ID
   * Uses the assignment ID to find the exact assignment to update
   */
  static async updateClassAssignment(
    item: Zotero.Item,
    collectionId: number | string,
    assignmentId: string,
    metadata: Partial<ItemSyllabusAssignment>,
    source: "page" | "item-pane" | "context-menu",
  ): Promise<void> {
    const data = this.getItemSyllabusData(item);
    const collectionIdStr = String(collectionId);
    const entries = data[collectionIdStr] || [];

    // Find the entry by ID
    const entryIndex = entries.findIndex((e) => e.id === assignmentId);

    if (entryIndex >= 0) {
      // Update existing entry
      entries[entryIndex] = { ...entries[entryIndex], ...metadata };

      // If classNumber is being changed to undefined/null, handle it
      if (metadata.classNumber === undefined && entries[entryIndex].classNumber === undefined) {
        // Remove entry if all fields are empty
        if (
          !entries[entryIndex].priority &&
          !entries[entryIndex].classInstruction
        ) {
          entries.splice(entryIndex, 1);
        }
      }
    } else {
      // Assignment not found by ID - this shouldn't happen, but log it
      ztoolkit.log("Warning: Assignment not found by ID:", assignmentId);
    }

    // Ensure all entries have IDs
    const entriesWithIds = this.ensureAssignmentIds(entries);

    if (entriesWithIds.length === 0) {
      delete data[collectionIdStr];
    } else {
      data[collectionIdStr] = entriesWithIds;
    }

    await this.setSyllabusData(item, data, source);
  }

  /**
   * Get manual ordering of items for a specific class
   * Returns array of itemIds in display order, or empty array if no manual order
   */
  static getClassItemOrder(
    collectionId: number | string,
    classNumber: number | null,
  ): string[] {
    const prefKey = this.getPreferenceKey(
      SyllabusSettingsKey.COLLECTION_ITEM_ORDER,
    );
    const orderStr = String(Zotero.Prefs.get(prefKey, true) || "");
    if (!orderStr) {
      return [];
    }
    try {
      const orderData = JSON.parse(orderStr) as SettingsClassItemOrder;
      const collectionIdStr = String(collectionId);
      const classKey = classNumber === null ? "null" : String(classNumber);
      return orderData[collectionIdStr]?.[classKey] || [];
    } catch (e) {
      ztoolkit.log("Error parsing item order:", e);
      return [];
    }
  }

  /**
   * Set manual ordering of items for a specific class
   */
  static async setClassItemOrder(
    collectionId: number | string,
    classNumber: number | null,
    itemIds: string[],
  ): Promise<void> {
    const prefKey = this.getPreferenceKey(
      SyllabusSettingsKey.COLLECTION_ITEM_ORDER,
    );
    const orderStr = String(Zotero.Prefs.get(prefKey, true) || "");
    let orderData: SettingsClassItemOrder = {};
    if (orderStr) {
      try {
        orderData = JSON.parse(orderStr) as SettingsClassItemOrder;
      } catch (e) {
        ztoolkit.log("Error parsing item order:", e);
        orderData = {};
      }
    }

    const collectionIdStr = String(collectionId);
    const classKey = classNumber === null ? "null" : String(classNumber);

    if (!orderData[collectionIdStr]) {
      orderData[collectionIdStr] = {};
    }

    if (itemIds.length === 0) {
      // Remove ordering if empty
      delete orderData[collectionIdStr][classKey];
      // Clean up empty collection entry
      if (Object.keys(orderData[collectionIdStr]).length === 0) {
        delete orderData[collectionIdStr];
      }
    } else {
      orderData[collectionIdStr][classKey] = itemIds;
    }

    Zotero.Prefs.set(prefKey, JSON.stringify(orderData), true);
  }

  /**
   * Reorder items within a class
   */
  static async reorderClassItems(
    collectionId: number | string,
    classNumber: number | null,
    itemIds: string[],
  ): Promise<void> {
    await this.setClassItemOrder(collectionId, classNumber, itemIds);
  }

  /**
   * Validate ordering preferences and clean up orphaned itemIds
   */
  static async validateOrderingPrefs(
    collectionId: number | string,
  ): Promise<void> {
    const prefKey = this.getPreferenceKey(
      SyllabusSettingsKey.COLLECTION_ITEM_ORDER,
    );
    const orderStr = String(Zotero.Prefs.get(prefKey, true) || "");
    if (!orderStr) {
      return;
    }

    let orderData: SettingsClassItemOrder = {};
    try {
      orderData = JSON.parse(orderStr) as SettingsClassItemOrder;
    } catch (e) {
      ztoolkit.log("Error parsing item order:", e);
      return;
    }

    const collectionIdStr = String(collectionId);
    const classOrder = orderData[collectionIdStr];
    if (!classOrder) {
      return;
    }

    // Get all valid itemIds in the collection
    try {
      const collection = Zotero.Collections.get(
        typeof collectionId === "string"
          ? parseInt(collectionId, 10)
          : collectionId,
      );
      if (!collection) {
        return;
      }

      const items = collection.getChildItems();
      const validItemIds = new Set(
        items
          .filter((item) => item.isRegularItem())
          .map((item) => String(item.id)),
      );

      // Clean up orphaned itemIds
      let hasChanges = false;
      for (const [classKey, itemIds] of Object.entries(classOrder)) {
        const filtered = itemIds.filter((id) => validItemIds.has(id));
        if (filtered.length !== itemIds.length) {
          classOrder[classKey] = filtered;
          hasChanges = true;
        }
        // Remove empty arrays
        if (filtered.length === 0) {
          delete classOrder[classKey];
          hasChanges = true;
        }
      }

      // Clean up empty collection entry
      if (Object.keys(classOrder).length === 0) {
        delete orderData[collectionIdStr];
        hasChanges = true;
      }

      if (hasChanges) {
        Zotero.Prefs.set(prefKey, JSON.stringify(orderData), true);
      }
    } catch (e) {
      ztoolkit.log("Error validating ordering prefs:", e);
    }
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
      return JSON.parse(metadataStr) as SettingsCollectionDictionaryData;
    } catch (e) {
      ztoolkit.log("Error parsing collection metadata:", e);
      return {};
    }
  }

  /**
   * Get collection metadata from preferences
   */
  static getSyllabusMetadata(
    collectionId: number | string,
  ): SettingsSyllabusMetadata {
    const data = this.getSettingsCollectionDictionaryData();
    const collectionIdStr = String(collectionId);
    return data[collectionIdStr] || {};
  }

  /**
   * Set collection metadata in preferences
   * Note: This method is called with the full dictionary (SettingsCollectionDictionaryData)
   * even though it's typed as SettingsSyllabusMetadata for backward compatibility
   */
  static async setCollectionMetadata(
    metadata: SettingsSyllabusMetadata | SettingsCollectionDictionaryData,
    source: "page" | "item-pane",
  ): Promise<void> {
    ztoolkit.log("Setting collection metadata:", metadata);

    const prefKey = SyllabusManager.getPreferenceKey(
      SyllabusSettingsKey.COLLECTION_METADATA,
    );
    // All callers pass the full dictionary, so we can safely cast
    const dataToSave = metadata as SettingsCollectionDictionaryData;
    Zotero.Prefs.set(prefKey, JSON.stringify(dataToSave), true);
    // Invalidate class title cache when metadata changes
    // Note: We need to get the collectionId from context, but since this is called
    // from methods that have collectionId, we'll invalidate all to be safe
    this.invalidateClassTitleCache();
    // Emit event for store listeners (preference changes aren't notifiable in Zotero)
    this.emitCollectionMetadataChange();
    // No need to call setupPage() - React stores will trigger re-render automatically
    if (source !== "item-pane") this.reloadItemPane();
    this.onClassListUpdate();
  }

  /**
   * Get collection description for a specific collection
   */
  static getCollectionDescription(collectionId: number | string): string {
    const metadata = SyllabusManager.getSyllabusMetadata(collectionId);
    return metadata.description || "";
  }

  /**
   * Set collection description for a specific collection
   */
  static async setCollectionDescription(
    collectionId: number | string,
    description: string,
    source: "page",
  ): Promise<void> {
    const allData = SyllabusManager.getSettingsCollectionDictionaryData();
    set(allData, `${collectionId}.description`, description.trim());
    await SyllabusManager.setCollectionMetadata(allData, source);
  }

  static getClassMetadata(collectionId: number | string, classNumber: number) {
    const metadata = SyllabusManager.getSyllabusMetadata(collectionId);
    return metadata.classes?.[classNumber] || {};
  }

  /**
   * Get class title for a specific collection and class number
   * Uses caching to avoid repeated preference reads
   */
  static getClassTitle(
    collectionId: number | string,
    classNumber: number,
    includeClassNumber: boolean = false,
  ): string {
    const collectionIdStr = String(collectionId);

    // Check if we need to rebuild the cache
    if (
      this.classTitleCacheCollectionId !== collectionIdStr ||
      !this.classTitleCache.has(collectionIdStr)
    ) {
      // Rebuild cache for this collection
      const metadata = this.getSyllabusMetadata(collectionId);
      const classMap = new Map<number, string>();

      if (metadata.classes) {
        for (const [classNumStr, classData] of Object.entries(
          metadata.classes,
        )) {
          const classNum = parseInt(classNumStr, 10);
          if (!isNaN(classNum) && classData.title) {
            classMap.set(classNum, classData.title);
          }
        }
      }

      this.classTitleCache.set(collectionIdStr, classMap);
      this.classTitleCacheCollectionId = collectionIdStr;
    }

    const classMap = this.classTitleCache.get(collectionIdStr)!;
    const title = classMap.get(classNumber) || "";

    if (includeClassNumber) {
      return `#${classNumber}: ${title}`;
    }
    return title;
  }

  /**
   * Invalidate class title cache
   * Call this when collection metadata is updated
   */
  static invalidateClassTitleCache(collectionId?: number | string) {
    if (collectionId !== undefined) {
      const collectionIdStr = String(collectionId);
      this.classTitleCache.delete(collectionIdStr);
      if (this.classTitleCacheCollectionId === collectionIdStr) {
        this.classTitleCacheCollectionId = null;
      }
    } else {
      // Invalidate all
      this.classTitleCache.clear();
      this.classTitleCacheCollectionId = null;
    }
  }

  /**
   * Set class title for a specific collection and class number
   */
  static async setClassTitle(
    collectionId: number | string,
    classNumber: number,
    title: string,
    source: "page" | "item-pane",
  ): Promise<void> {
    const allData = SyllabusManager.getSettingsCollectionDictionaryData();
    set(allData, `${collectionId}.classes.${classNumber}.title`, title);
    await SyllabusManager.setCollectionMetadata(allData, source);
  }

  /**
   * Get class description for a specific collection and class number
   */
  static getClassDescription(
    collectionId: number | string,
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
    collectionId: number | string,
    classNumber: number,
    description: string,
    source: "page",
  ): Promise<void> {
    const allData = SyllabusManager.getSettingsCollectionDictionaryData();
    set(
      allData,
      `${collectionId}.classes.${classNumber}.description`,
      description,
    );
    await SyllabusManager.setCollectionMetadata(allData, source);
  }

  /**
   * Create an additional class (even if empty) to extend the range
   * This ensures the class appears in the rendered range
   */
  static async createAdditionalClass(
    collectionId: number | string,
    classNumber: number,
    source: "page",
  ): Promise<void> {
    const allData = SyllabusManager.getSettingsCollectionDictionaryData();
    const collectionIdStr = String(collectionId);

    // Ensure the classes object exists
    if (!allData[collectionIdStr]) {
      allData[collectionIdStr] = {};
    }
    if (!allData[collectionIdStr].classes) {
      allData[collectionIdStr].classes = {};
    }

    // Create the class entry if it doesn't exist
    if (!allData[collectionIdStr].classes![classNumber]) {
      allData[collectionIdStr].classes![classNumber] = {};
    }

    ztoolkit.log("Creating additional class:", allData);

    // Save using setCollectionMetadata to ensure proper store updates
    // Following the same pattern as setClassTitle - pass the full dictionary
    await SyllabusManager.setCollectionMetadata(allData as any, source);
  }

  /**
   * Delete a class from metadata
   */
  static async deleteClass(
    collectionId: number | string,
    classNumber: number,
    source: "page",
  ): Promise<void> {
    const allData = SyllabusManager.getSettingsCollectionDictionaryData();
    const collectionIdStr = String(collectionId);

    if (allData[collectionIdStr]?.classes?.[classNumber]) {
      delete allData[collectionIdStr].classes![classNumber];
      // Clean up empty classes object if needed
      if (Object.keys(allData[collectionIdStr].classes || {}).length === 0) {
        delete allData[collectionIdStr].classes;
      }
      await SyllabusManager.setCollectionMetadata(allData as any, source);
    }
  }
}
