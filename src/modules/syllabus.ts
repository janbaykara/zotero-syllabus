/**
 * Syllabus Manager - Core functionality for syllabus view and metadata
 */

import { getLocaleID } from "../utils/locale";
import { ExtraFieldTool } from "zotero-plugin-toolkit";
import { renderSyllabusPage } from "./SyllabusPage";
import { getSelectedCollection } from "../utils/zotero";
import { getCSSUrl } from "../utils/css";
import { set } from "lodash-es";

enum SyllabusPriority {
  COURSE_INFO = "course-info",
  ESSENTIAL = "essential",
  RECOMMENDED = "recommended",
  OPTIONAL = "optional",
}

enum SyllabusSettingsKey {
  COLLECTION_METADATA = "collectionMetadata",
  COLLECTION_VIEW_MODES = "collectionViewModes",
}

export interface ItemSyllabusData {
  [collectionId: string]: {
    priority?: SyllabusPriority;
    classInstruction?: string;
    classNumber?: number;
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
    this.registerSyllabusItemPaneSection();
  }

  static onMainWindowLoad(win: _ZoteroTypes.MainWindow) {
    ztoolkit.log("SyllabusManager.onMainWindowLoad", win);
    this.registerStyleSheet(win);
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
  static onCollectionUpdated(collection: Zotero.Collection, source: "page") {
    ztoolkit.log("SyllabusManager.onCollectionUpdated", collection);
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

  static registerStyleSheet(win: _ZoteroTypes.MainWindow) {
    const doc = win.document;
    
    // Remove any existing stylesheets from previous loads (for hot reload)
    const existingStylesheets = doc.querySelectorAll(
      'link[data-syllabus-stylesheet="true"]'
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
          // Optimize: Parse syllabus data once and extract both values
          const syllabusData = SyllabusManager.getItemSyllabusData(item);
          const collectionIdStr = String(selectedCollection.id);
          const itemData = syllabusData[collectionIdStr];

          const priority = itemData?.priority || "";
          const classNumber = itemData?.classNumber;

          // Return sortable value with priority and class number encoded
          // Format: "priorityPrefix_priorityValue_classNumber"
          // This ensures proper sort order: Priority first, then Class Number
          // Class numbers without a value get 999 to sort last
          const classNumberStr =
            classNumber !== undefined
              ? String(classNumber).padStart(4, "0") // Pad to 4 digits for proper string sorting
              : "9999"; // Items without class number sort last

          // Return sortable value with priority encoded: "0_course-info", "1_essential", etc.
          // This ensures proper sort order: Course Info < Essential < Recommended < Optional < Blank
          // The prefix determines sort order, the suffix is the actual priority for display
          if (priority === SyllabusPriority.COURSE_INFO) {
            return `0___course-info___${classNumberStr}`;
          }
          if (priority === SyllabusPriority.ESSENTIAL) {
            return `1___essential___${classNumberStr}`;
          }
          if (priority === SyllabusPriority.RECOMMENDED) {
            return `2___recommended___${classNumberStr}`;
          }
          if (priority === SyllabusPriority.OPTIONAL) {
            return `3___optional___${classNumberStr}`;
          }
          return `4___${classNumberStr}`; // empty/blank priority
        }

        // If not in a collection view, return empty
        return "4___9999";
      },
      renderCell: (index, data, column, isFirstColumn, doc) => {
        // Parse the data to extract the priority for display
        // data format: "0_essential_0001", "1_recommended_0002", "2_optional_0003", or "4__9999"
        // Format: "priorityPrefix_priorityValue_classNumber"
        const parts = String(data).split("___");
        const priority = parts.length > 1 ? parts[1] : "";

        const container = doc.createElement("span");
        container.className = `cell ${column.className}`;
        container.style.display = "flex";
        container.style.alignItems = "center";
        container.style.gap = "6px";

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
          // Optimize: Parse syllabus data once and extract instruction directly
          const syllabusData = SyllabusManager.getItemSyllabusData(item);
          const collectionIdStr = String(selectedCollection.id);
          return syllabusData[collectionIdStr]?.classInstruction || "";
        }

        // If not in a collection view, return empty
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
          // Optimize: Parse syllabus data once and extract both values
          const syllabusData = SyllabusManager.getItemSyllabusData(item);
          const collectionIdStr = String(selectedCollection.id);
          const itemData = syllabusData[collectionIdStr];

          const classNumber = itemData?.classNumber;
          const priority = itemData?.priority || "" || "";

          // Get priority sort order: 0=course-info, 1=essential, 2=recommended, 3=optional, 4=blank
          let priorityOrder = "4"; // default to blank
          if (priority === SyllabusPriority.COURSE_INFO) priorityOrder = "0";
          else if (priority === SyllabusPriority.ESSENTIAL) priorityOrder = "1";
          else if (priority === SyllabusPriority.RECOMMENDED)
            priorityOrder = "2";
          else if (priority === SyllabusPriority.OPTIONAL) priorityOrder = "3";

          const hasClassNumber = classNumber !== undefined;
          const hasPriority = priority !== "";

          // Create sorting key to match Syllabus View order:
          // 1. No-class numbered items that have a priority status (in priority status order)
          // 2. Class numbered items (in priority status order)
          // 3. Un-numbered and un-statused items

          if (!hasClassNumber && hasPriority) {
            // Group 1: No-class numbered items with priority - sort first by priority
            return `0_${priorityOrder}`;
          } else if (hasClassNumber) {
            // Group 2: Class numbered items - sort by class number, then priority
            // Also encode the class title in the return value to avoid lookup in renderCell
            const paddedClassNumber = String(classNumber).padStart(5, "0");
            const classTitle = SyllabusManager.getClassTitle(
              selectedCollection.id,
              classNumber,
              true,
            );
            // Encode title in format: "1_paddedClassNumber_priorityOrder|classTitle"
            // Use | as separator since it's unlikely to appear in class titles
            const titlePart = classTitle ? `|${classTitle}` : "";
            return `1_${paddedClassNumber}_${priorityOrder}${titlePart}`;
          } else {
            // Group 3: Un-numbered and un-statused items - sort last
            return `2_99999_4`;
          }
        }

        // If not in a collection view, return empty
        return "2_99999_4";
      },
      renderCell: (index, data, column, isFirstColumn, doc) => {
        // Parse the composite value to extract just the class number for display
        // data format: "0_priorityOrder", "1_paddedClassNumber_priorityOrder|classTitle", or "2_99999_4"
        const dataStr = String(data);
        const parts = dataStr.split("_");
        const groupIndicator = parts[0];

        // Group 0 and 2: No class number (either prioritized or un-statused)
        if (groupIndicator === "0" || groupIndicator === "2") {
          const span = doc.createElement("span");
          span.className = `cell ${column.className}`;
          span.textContent = "";
          return span;
        }

        // Group 1: Class numbered items - extract and display class number
        if (groupIndicator === "1" && parts.length >= 2) {
          const classNumberStr = parts[1];
          // Remove leading zeros and display the class number
          const classNumber = parseInt(classNumberStr, 10);
          const span = doc.createElement("span");
          span.className = `cell ${column.className}`;

          // Extract class title from encoded data (format: "1_classNumber_priority|title")
          // If title is encoded, use it; otherwise fall back to just the number
          let displayText = String(classNumber);
          const titleSeparatorIndex = dataStr.indexOf("|");
          if (titleSeparatorIndex !== -1) {
            displayText = dataStr.substring(titleSeparatorIndex + 1);
          }

          span.textContent = displayText;
          return span;
        }

        // Fallback
        const span = doc.createElement("span");
        span.className = `cell ${column.className}`;
        span.textContent = "";
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
          // Optimize: Parse syllabus data once and extract both values
          const syllabusData = SyllabusManager.getItemSyllabusData(item);
          const collectionIdStr = String(selectedCollection.id);
          const itemData = syllabusData[collectionIdStr];

          const classNumber = itemData?.classNumber;
          const priority = itemData?.priority || "";

          // Get priority sort order: 0=course-info, 1=essential, 2=recommended, 3=optional, 4=blank
          let priorityOrder = "4"; // default to blank
          if (priority === SyllabusPriority.COURSE_INFO) priorityOrder = "0";
          else if (priority === SyllabusPriority.ESSENTIAL) priorityOrder = "1";
          else if (priority === SyllabusPriority.RECOMMENDED)
            priorityOrder = "2";
          else if (priority === SyllabusPriority.OPTIONAL) priorityOrder = "3";

          const hasClassNumber = classNumber !== undefined;
          const hasPriority = priority !== "";

          // Create sorting key to match Syllabus View order:
          // 1. No-class numbered items that have a priority status (in priority status order)
          // 2. Class numbered items (in priority status order)
          // 3. Un-numbered and un-statused items

          if (!hasClassNumber && hasPriority) {
            // Group 1: No-class numbered items with priority - sort first by priority
            // Encode: "0_priorityOrder|priorityValue"
            return `0_${priorityOrder}|${priority}`;
          } else if (hasClassNumber) {
            // Group 2: Class numbered items - sort by class number, then priority
            // Encode: "1_paddedClassNumber_priorityOrder|priorityValue||classTitle"
            // Use double pipe (||) to separate priority and title, allowing empty values
            const paddedClassNumber = String(classNumber).padStart(5, "0");
            const classTitle = SyllabusManager.getClassTitle(
              selectedCollection.id,
              classNumber,
              false, // Don't include class number prefix since we'll show it separately
            );
            return `1_${paddedClassNumber}_${priorityOrder}|${priority || ""}||${classTitle || ""}`;
          } else {
            // Group 3: Un-numbered and un-statused items - sort last
            return `2_99999_4`;
          }
        }

        // If not in a collection view, return empty
        return "2_99999_4";
      },
      renderCell: (index, data, column, isFirstColumn, doc) => {
        // Parse the composite value to extract class number, priority, and class title for display
        // data format: "0_priorityOrder|priorityValue", "1_paddedClassNumber_priorityOrder|priorityValue|classTitle", or "2_99999_4"
        const dataStr = String(data);
        const parts = dataStr.split("_");
        const groupIndicator = parts[0];

        const container = doc.createElement("span");
        container.className = `cell ${column.className}`;
        container.style.display = "flex";
        container.style.alignItems = "center";
        container.style.gap = "6px";
        container.style.flexWrap = "nowrap";

        // Group 0: No class number but has priority
        if (groupIndicator === "0") {
          const pipeIndex = dataStr.indexOf("|");
          if (pipeIndex !== -1) {
            const priorityValue = dataStr.substring(pipeIndex + 1);
            if (
              priorityValue &&
              SyllabusManager.PRIORITY_LABELS[priorityValue as SyllabusPriority]
            ) {
              const priorityEnum = priorityValue as SyllabusPriority;
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
          }
          return container;
        }

        // Group 2: Un-numbered and un-statused items
        if (groupIndicator === "2") {
          return container; // Empty container
        }

        // Group 1: Class numbered items - extract and display class number, priority, and title
        if (groupIndicator === "1" && parts.length >= 2) {
          const classNumberStr = parts[1];
          const classNumber = parseInt(classNumberStr, 10);

          // Extract priority and title from encoded data
          // Format: "1_classNumber_priorityOrder|priorityValue||classTitle"
          // Use double pipe (||) to separate priority and title
          const firstPipeIndex = dataStr.indexOf("|");
          let priorityValue = "";
          let classTitle = "";

          if (firstPipeIndex !== -1) {
            // Extract everything after the first pipe
            const afterFirstPipe = dataStr.substring(firstPipeIndex + 1);
            // Find the double pipe separator (||)
            const doublePipeIndex = afterFirstPipe.indexOf("||");

            if (doublePipeIndex !== -1) {
              // Both fields are present (may be empty strings)
              priorityValue = afterFirstPipe.substring(0, doublePipeIndex);
              classTitle = afterFirstPipe.substring(doublePipeIndex + 2);
            } else {
              // Fallback: only priority (old format compatibility)
              priorityValue = afterFirstPipe;
            }
          }

          // Display class number
          const classNumberSpan = doc.createElement("span");
          classNumberSpan.textContent = `#${classNumber}`;
          classNumberSpan.style.fontWeight = "500";
          container.appendChild(classNumberSpan);

          // Display priority if available
          if (
            priorityValue &&
            SyllabusManager.PRIORITY_LABELS[priorityValue as SyllabusPriority]
          ) {
            const priorityEnum = priorityValue as SyllabusPriority;
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

          // Display class title if available
          if (classTitle) {
            const titleSpan = doc.createElement("span");
            titleSpan.textContent = classTitle;
            titleSpan.style.color = "var(--fill-secondary)";
            container.appendChild(titleSpan);
          }

          return container;
        }

        // Fallback
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
      Zotero.ItemPaneManager.unregisterSection(this.syllabusItemPaneSection);
      this.syllabusItemPaneSection = null;
    }
  }

  static registerSyllabusItemPaneSection() {
    ztoolkit.log("SyllabusManager.registerSyllabusItemPaneSection");
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
        const doc = body.ownerDocument || ztoolkit.getGlobal("document");

        // Clear previous content
        body.textContent = "";

        if (!selectedCollection) {
          const message = ztoolkit.UI.createElement(doc, "div", {
            namespace: "html",
            properties: {
              innerText: "Select a collection to view syllabus settings",
            },
            styles: {
              padding: "10px",
              color: "#666",
            },
          });
          body.appendChild(message);
          return;
        }

        const collectionId = selectedCollection.id;
        const currentPriority = SyllabusManager.getSyllabusPriority(
          item,
          collectionId,
        );
        const currentClassInstruction =
          SyllabusManager.getSyllabusClassInstruction(item, collectionId);
        const currentclassNumber = SyllabusManager.getSyllabusClassNumber(
          item,
          collectionId,
        );
        const currentClassTitle = currentclassNumber
          ? SyllabusManager.getClassTitle(collectionId, currentclassNumber)
          : "";

        // Create container
        const container = ztoolkit.UI.createElement(doc, "div", {
          namespace: "html",
          styles: {
            display: "grid",
            gridTemplateColumns: "max-content 1fr",
            columnGap: "18px",
            rowGap: "10px",
          },
        });

        // Helper function to create a two-column field row
        const createFieldRow = (
          labelText: string,
          inputElement: HTMLElement,
        ) => {
          const row = ztoolkit.UI.createElement(doc, "div", {
            namespace: "html",
            styles: {
              display: "grid",
              gridTemplateColumns: "subgrid",
              gridColumn: "span 2",
              alignItems: "center",
            },
          });

          const label = ztoolkit.UI.createElement(doc, "label", {
            namespace: "html",
            properties: {
              innerText: labelText,
            },
            styles: {
              fontWeight: "normal",
              textAlign: "end",
              color: "var(--fill-secondary)",
            },
          });
          row.appendChild(label);

          const inputContainer = ztoolkit.UI.createElement(doc, "div", {
            namespace: "html",
            styles: {
              flex: "1",
              minWidth: "0",
            },
          });
          inputContainer.appendChild(inputElement);
          row.appendChild(inputContainer);

          return row;
        };

        // Priority dropdown
        const prioritySelect = ztoolkit.UI.createElement(doc, "select", {
          namespace: "html",
          id: "syllabus-priority-select",
          attributes: {
            disabled: !editable ? "true" : undefined,
          },
          styles: {
            padding: "5px",
            fontSize: "13px",
            width: "100%",
            margin: "0",
          },
        });

        const options = [
          { value: "", label: "(None)" },
          {
            value: SyllabusPriority.COURSE_INFO,
            label:
              SyllabusManager.PRIORITY_LABELS[SyllabusPriority.COURSE_INFO],
            color:
              SyllabusManager.PRIORITY_COLORS[SyllabusPriority.COURSE_INFO],
          },
          {
            value: SyllabusPriority.ESSENTIAL,
            label: SyllabusManager.PRIORITY_LABELS[SyllabusPriority.ESSENTIAL],
            color: SyllabusManager.PRIORITY_COLORS[SyllabusPriority.ESSENTIAL],
          },
          {
            value: SyllabusPriority.RECOMMENDED,
            label:
              SyllabusManager.PRIORITY_LABELS[SyllabusPriority.RECOMMENDED],
            color:
              SyllabusManager.PRIORITY_COLORS[SyllabusPriority.RECOMMENDED],
          },
          {
            value: SyllabusPriority.OPTIONAL,
            label: SyllabusManager.PRIORITY_LABELS[SyllabusPriority.OPTIONAL],
            color: SyllabusManager.PRIORITY_COLORS[SyllabusPriority.OPTIONAL],
          },
        ];

        options.forEach((opt) => {
          const option = ztoolkit.UI.createElement(doc, "option", {
            namespace: "html",
            properties: {
              value: opt.value,
              innerText: opt.label,
              selected: opt.value === currentPriority,
            },
            styles: opt.color
              ? {
                color: opt.color,
                fontWeight: "500",
              }
              : undefined,
          });
          prioritySelect.appendChild(option);
        });

        if (editable) {
          prioritySelect.addEventListener("change", async (e) => {
            const target = e.target as HTMLSelectElement;
            await SyllabusManager.setSyllabusPriority(
              item,
              collectionId,
              target.value as any,
              "item-pane",
            );
            await item.saveTx();

            const itemPane = zoteroPane.itemPane;
            if (itemPane) {
              itemPane.render();
            }
          });
        }

        const priorityRow = createFieldRow("Priority", prioritySelect);
        container.appendChild(priorityRow);

        // Class number input
        const sessionInput = ztoolkit.UI.createElement(doc, "input", {
          namespace: "html",
          id: "syllabus-class-number-input",
          attributes: {
            type: "number",
            min: "1",
            step: "1",
            disabled: !editable ? "true" : undefined,
            placeholder: "e.g., 1, 2, 3...",
          },
          properties: {
            value: currentclassNumber?.toString() || "",
          },
          styles: {
            textAlign: "start",
            border: "none",
            fontSize: "13px",
            width: "100%",
            margin: "0",
          },
        }) as HTMLInputElement;

        if (editable) {
          sessionInput.addEventListener("change", async () => {
            const value = sessionInput.value.trim();
            const sessionNum = value ? parseInt(value, 10) : undefined;
            if (value && (isNaN(sessionNum!) || sessionNum! < 1)) {
              // Invalid input, reset to current value
              sessionInput.value = currentclassNumber?.toString() || "";
              return;
            }
            await SyllabusManager.setSyllabusClassNumber(
              item,
              collectionId,
              sessionNum,
              "item-pane",
            );
            await item.saveTx();

            const itemPane = zoteroPane.itemPane;
            if (itemPane) {
              itemPane.render();
            }
          });
        }

        const classNumberRow = createFieldRow("Class Number", sessionInput);
        container.appendChild(classNumberRow);

        // Class instruction textarea
        const classInstructionTextarea = ztoolkit.UI.createElement(
          doc,
          "textarea",
          {
            namespace: "html",
            id: "syllabus-class-instruction-textarea",
            attributes: {
              disabled: !editable ? "true" : undefined,
              rows: "4",
            },
            styles: {
              padding: "0",
              margin: "0",
              border: "none",
              fontSize: "13px",
              width: "100%",
              resize: "vertical",
              fontFamily: "inherit",
            },
          },
        ) as HTMLTextAreaElement;

        // Set value after creation
        classInstructionTextarea.value = currentClassInstruction;

        if (editable) {
          let saveTimeout: ReturnType<typeof setTimeout> | undefined;
          classInstructionTextarea.addEventListener("input", async () => {
            // Debounce saves
            if (saveTimeout) {
              clearTimeout(saveTimeout);
            }
            saveTimeout = setTimeout(async () => {
              await SyllabusManager.setSyllabusClassInstruction(
                item,
                collectionId,
                classInstructionTextarea.value,
                "item-pane",
              );
              await item.saveTx();

              const itemPane = zoteroPane.itemPane;
              if (itemPane) {
                itemPane.render();
              }
            }, 500);
          });
        }

        const classInstructionRow = createFieldRow(
          "Instructions",
          classInstructionTextarea,
        );
        container.appendChild(classInstructionRow);

        body.appendChild(container);
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
        const classNumber = SyllabusManager.getSyllabusClassNumber(
          item,
          selectedCollection.id,
        );
        if (classNumber !== undefined) {
          classNumbers.add(classNumber);
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
    const collectionIdStr = String(collectionId);
    const collection = Zotero.Collections.get(collectionId);
    if (collection) {
      collection.name = title;
      collection.saveTx();
    }
    this.onCollectionUpdated(collection, source);
  }

  /**
   * Get syllabus data from an item's extra field
   * Uses caching to avoid repeated JSON parsing for the same item
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
        data = JSON.parse(jsonStr) as ItemSyllabusData;
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
    const jsonStr = JSON.stringify(data);
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
   * Get syllabus priority for a specific collection
   */
  static getSyllabusPriority(
    item: Zotero.Item,
    collectionId: number | string,
  ): SyllabusPriority | "" {
    const data = this.getItemSyllabusData(item);
    const collectionIdStr = String(collectionId);
    return data[collectionIdStr]?.priority || "";
  }

  /**
   * Set syllabus priority for a specific collection
   */
  static async setSyllabusPriority(
    item: Zotero.Item,
    collectionId: number | string,
    priority: SyllabusPriority | "",
    source: "page" | "item-pane" | "context-menu",
  ): Promise<void> {
    const data = this.getItemSyllabusData(item);
    const collectionIdStr = String(collectionId);

    if (!data[collectionIdStr]) {
      data[collectionIdStr] = {};
    }

    if (priority) {
      data[collectionIdStr].priority = priority;
    } else {
      delete data[collectionIdStr].priority;
      // Remove collection entry if priority, classInstruction, and classNumber are all empty
      if (
        !data[collectionIdStr].classInstruction &&
        !data[collectionIdStr].classNumber
      ) {
        delete data[collectionIdStr];
      }
    }

    await this.setSyllabusData(item, data, source);
  }

  /**
   * Get class instruction for a specific collection
   */
  static getSyllabusClassInstruction(
    item: Zotero.Item,
    collectionId: number | string,
  ): string {
    const data = this.getItemSyllabusData(item);
    const collectionIdStr = String(collectionId);
    return data[collectionIdStr]?.classInstruction || "";
  }

  /**
   * Set class instruction for a specific collection
   */
  static async setSyllabusClassInstruction(
    item: Zotero.Item,
    collectionId: number | string,
    classInstruction: string,
    source: "page" | "item-pane" | "context-menu",
  ): Promise<void> {
    const data = this.getItemSyllabusData(item);
    const collectionIdStr = String(collectionId);

    if (!data[collectionIdStr]) {
      data[collectionIdStr] = {};
    }

    if (classInstruction && classInstruction.trim()) {
      data[collectionIdStr].classInstruction = classInstruction.trim();
    } else {
      delete data[collectionIdStr].classInstruction;
      // Remove collection entry if priority, classInstruction, and classNumber are all empty
      if (
        !data[collectionIdStr].priority &&
        !data[collectionIdStr].classNumber
      ) {
        delete data[collectionIdStr];
      }
    }

    await this.setSyllabusData(item, data, source);
  }

  /**
   * Get syllabus session number for a specific collection
   */
  static getSyllabusClassNumber(
    item: Zotero.Item,
    collectionId: number | string,
  ): number | undefined {
    const data = this.getItemSyllabusData(item);
    const collectionIdStr = String(collectionId);
    return data[collectionIdStr]?.classNumber;
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
            const classNumber = this.getSyllabusClassNumber(item, collectionId);
            if (classNumber !== undefined) {
              classNumbers.add(classNumber);
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
   * Set syllabus session number for a specific collection
   */
  static async setSyllabusClassNumber(
    item: Zotero.Item,
    collectionId: number | string,
    classNumber: number | undefined,
    source: "page" | "item-pane" | "context-menu",
  ) {
    const data = this.getItemSyllabusData(item);
    const collectionIdStr = String(collectionId);

    if (!data[collectionIdStr]) {
      data[collectionIdStr] = {};
    }

    if (classNumber !== undefined && classNumber !== null) {
      data[collectionIdStr].classNumber = classNumber;
    } else {
      delete data[collectionIdStr].classNumber;
      // Remove collection entry if priority, classInstruction, and classNumber are all empty
      if (
        !data[collectionIdStr].priority &&
        !data[collectionIdStr].classInstruction
      ) {
        delete data[collectionIdStr];
      }
    }

    await this.setSyllabusData(item, data, source);
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
