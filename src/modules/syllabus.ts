/**
 * Syllabus Manager - Core functionality for syllabus view and metadata
 */

import { generateBibliographicReference } from "../utils/cite";
import { getLocaleID } from "../utils/locale";
import { getPref } from "../utils/prefs";
import { ExtraFieldTool } from "zotero-plugin-toolkit";
import { getCurrentTab } from "../utils/window";
import {
  createEditableTextInput,
  escapeHTML,
  parseHTMLTemplate,
} from "../utils/ui";

enum SyllabusPriority {
  COURSE_INFO = "course-info",
  ESSENTIAL = "essential",
  RECOMMENDED = "recommended",
  OPTIONAL = "optional",
}

interface SyllabusData {
  [collectionId: string]: {
    priority?: SyllabusPriority;
    classInstruction?: string;
    classNumber?: number;
  };
}

/**
 * Collection metadata stored in preferences
 * Structure: { [collectionId]: { description: string, classes: { [classNumber]: { title: string, description: string } } } }
 */
interface CollectionMetadata {
  [collectionId: string]: {
    description?: string;
    classes?: {
      [classNumber: string]: {
        title?: string;
        description?: string;
      };
    };
  };
}

export class SyllabusManager {
  static notifierID: string | null = null;
  static syllabusItemPaneSection: false | string | null = null;

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

  static onItemUpdate(
    item: Zotero.Item,
    source: "page" | "item-pane" | "context-menu",
  ) {
    ztoolkit.log("SyllabusManager.onItemUpdate", source, item.id);
    if (source !== "page") this.setupPage();
    if (source !== "item-pane") this.reloadItemPane();
    // Class numbers are stored in the items, so we need to update the context menu
    this.onClassListUpdate();
  }

  /**
   * E.g. the class title or description has been updated
   */
  static onClassUpdate(classNumber: number, source: "page") {
    ztoolkit.log("SyllabusManager.onClassUpdate", classNumber, source);
    if (source !== "page") this.setupPage();
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
    this.setupPage();
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
    const callback = {
      notify: async (
        event: string,
        type: string,
        ids: number[] | string[],
        extraData: { [key: string]: any },
      ) => {
        if (!addon?.data.alive) {
          SyllabusManager.unregisterNotifier();
          return;
        }
        addon.hooks.onNotify(event, type, ids, extraData);
      },
    };

    // Register the callback in Zotero as an item observer
    this.notifierID = Zotero.Notifier.registerObserver(callback, [
      "collection",
      "search",
      "share",
      "share-items",
      "item",
      "file",
      "collection-item",
      "item-tag",
      "tag",
      "setting",
      "group",
      "trash",
      "bucket",
      "relation",
      "feed",
      "feedItem",
      "sync",
      "api-key",
      "tab",
      "itemtree",
      "itempane",
    ]);
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
    const styles = ztoolkit.UI.createElement(doc, "link", {
      properties: {
        type: "text/css",
        rel: "stylesheet",
        href: `chrome://${addon.data.config.addonRef}/content/zoteroPane.css`,
      },
    });
    doc.documentElement?.appendChild(styles);
  }

  // Listen for tab changes and refresh syllabus view
  // Initial setup
  static syllabusViewTabListener: NodeJS.Timeout | null = null;

  static setupSyllabusViewTabListener() {
    const z = ztoolkit.getGlobal("Zotero");
    const mainWindow = z.getMainWindow();
    let currentTabTitle = getCurrentTab(mainWindow)?.title;
    const interval = setInterval(async () => {
      const newTab = getCurrentTab(mainWindow);
      if (newTab && newTab.title !== currentTabTitle) {
        ztoolkit.log("newTab", newTab);
        currentTabTitle = newTab.title;
        SyllabusManager.setupUI();
      }
    }, 500);
    this.syllabusViewTabListener = interval;
  }

  static setupSyllabusViewReloadListener() {
    // Re-render custom view when collection or sort changes
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
    const prefKey = `${addon.data.config.prefsPrefix}.collectionViewModes`;
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
    const prefKey = `${addon.data.config.prefsPrefix}.collectionViewModes`;
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
    let toggleButton = doc.getElementById("syllabus-view-toggle");
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
      }) as XUL.Checkbox;

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

        // Build master template
        const masterTemplate =
          await SyllabusManager.renderSyllabusPageHTML(selectedCollection);

        // Insert the master template
        if (customView) {
          customView.innerHTML = masterTemplate;

          // Attach all event listeners
          SyllabusManager.attachPageEventListeners(
            doc,
            customView,
            selectedCollection,
            pane,
          );
        }
      }
    } catch (e) {
      ztoolkit.log("Error in setupPage:", e);
    }
  }

  static async renderSyllabusPageHTML(selectedCollection: Zotero.Collection) {
    const items = selectedCollection.getChildItems();
    const furtherReadingItems: Zotero.Item[] = [];
    const itemsByClass: Map<number | null, Zotero.Item[]> = new Map();
    for (const item of items) {
      if (!item.isRegularItem()) continue;
      const classNumber = SyllabusManager.getSyllabusClassNumber(
        item,
        selectedCollection.id,
      );
      const priority = SyllabusManager.getSyllabusPriority(
        item,
        selectedCollection.id,
      );
      if (priority === "" && classNumber === undefined) {
        furtherReadingItems.push(item);
        continue;
      }
      const normalizedClassNumber =
        classNumber === undefined ? null : classNumber;
      if (!itemsByClass.has(normalizedClassNumber)) {
        itemsByClass.set(normalizedClassNumber, []);
      }
      itemsByClass.get(normalizedClassNumber)!.push(item);
    }
    const sortedClassNumbers = Array.from(itemsByClass.keys()).sort((a, b) => {
      if (a === null && b === null) return 0;
      if (a === null) return -1;
      if (b === null) return 1;
      return a - b;
    });
    for (const classNumber of sortedClassNumbers) {
      const classItems = itemsByClass.get(classNumber)!;
      classItems.sort((a, b) => {
        const priorityA = SyllabusManager.getSyllabusPriority(
          a,
          selectedCollection.id,
        );
        const priorityB = SyllabusManager.getSyllabusPriority(
          b,
          selectedCollection.id,
        );
        const getPriorityOrder = (
          priority: SyllabusPriority | "" | undefined,
        ): number => {
          if (priority === SyllabusPriority.COURSE_INFO) return 0;
          if (priority === SyllabusPriority.ESSENTIAL) return 1;
          if (priority === SyllabusPriority.RECOMMENDED) return 2;
          if (priority === SyllabusPriority.OPTIONAL) return 3;
          return 4;
        };
        return getPriorityOrder(priorityA) - getPriorityOrder(priorityB);
      });
    }
    furtherReadingItems.sort((a, b) => {
      const titleA = a.getField("title") || "";
      const titleB = b.getField("title") || "";
      return titleA.localeCompare(titleB);
    });

    return `
      <div class="syllabus-view-title-container">
        <div
          class="syllabus-editable-placeholder"
          data-type="collection-title"
          data-collection-id="${selectedCollection.id}"
          data-initial-value="${escapeHTML(selectedCollection.name || "")}"
          data-empty-behavior="reset"
        ></div>
      </div>
      <div
        class="syllabus-editable-placeholder"
        data-type="collection-description"
        data-collection-id="${selectedCollection.id}"
        data-initial-value="${escapeHTML(SyllabusManager.getCollectionDescription(selectedCollection.id))}"
        data-placeholder="Add a description..."
        data-empty-behavior="delete"
      ></div>
      ${(
        await Promise.all(
          sortedClassNumbers.map((classNumber) =>
            SyllabusManager.renderClassGroupHTML(
              classNumber,
              itemsByClass.get(classNumber)!,
              selectedCollection.id,
            ),
          ),
        )
      ).join("")}
      ${furtherReadingItems.length > 0
        ? `
          <div class="syllabus-class-group">
            <div class="syllabus-class-header">Further reading</div>
            <div
              class="syllabus-class-items syllabus-further-reading-items"
              data-class-number=""
            >
              ${furtherReadingItems
          .map((item) =>
            SyllabusManager.renderSyllabusItemCardSlimHTML(
              item,
              selectedCollection.id,
            ),
          )
          .join("")}
            </div>
          </div>
        `
        : ""
      }
    `;
  }

  static async renderClassGroupHTML(
    classNumber: number | null,
    classItems: Zotero.Item[],
    collectionId: number,
  ): Promise<string> {
    return `
      <div class="syllabus-class-group">
        ${classNumber !== null
        ? `
            <div class="syllabus-class-header-container">
              <div class="syllabus-class-header">Class ${classNumber}</div>
              <div
                class="syllabus-editable-placeholder"
                data-type="class-title"
                data-collection-id="${collectionId}"
                data-class-number="${classNumber}"
                data-initial-value="${escapeHTML(SyllabusManager.getClassTitle(collectionId, classNumber))}"
                data-placeholder="Add a title..."
                data-empty-behavior="delete"
              ></div>
            </div>
            <div
              class="syllabus-editable-placeholder"
              data-type="class-description"
              data-collection-id="${collectionId}"
              data-class-number="${classNumber}"
              data-initial-value="${escapeHTML(SyllabusManager.getClassDescription(collectionId, classNumber))}"
              data-placeholder="Add a description..."
              data-empty-behavior="delete"
            ></div>
          `
        : ""
      }
        <div
          class="syllabus-class-items"
          data-class-number="${classNumber !== null ? String(classNumber) : ""}"
        >
          ${(
        await Promise.all(
          classItems.map(async (item) =>
            SyllabusManager.getSyllabusPriority(item, collectionId)
              ? await SyllabusManager.renderSyllabusItemCardHTML(
                item,
                collectionId,
              )
              : SyllabusManager.renderSyllabusItemCardSlimHTML(
                item,
                collectionId,
              ),
          ),
        )
      ).join("")}
        </div>
      </div>
    `;
  }

  /**
   * Render HTML string for a syllabus item card (for items with priority)
   */
  static async renderSyllabusItemCardHTML(
    item: Zotero.Item,
    collectionId: number,
  ): Promise<string> {
    return await (async () => {
      const priority = SyllabusManager.getSyllabusPriority(item, collectionId);
      const priorityStyle =
        priority && priority in SyllabusManager.PRIORITY_COLORS
          ? (() => {
            const priorityColor =
              SyllabusManager.PRIORITY_COLORS[priority as SyllabusPriority];
            const r = parseInt(priorityColor.slice(1, 3), 16);
            const g = parseInt(priorityColor.slice(3, 5), 16);
            const b = parseInt(priorityColor.slice(5, 7), 16);
            return `background-color: rgba(${r}, ${g}, ${b}, 0.05); border-color: rgba(${r}, ${g}, ${b}, 0.2);`;
          })()
          : "";
      const classInstruction = SyllabusManager.getSyllabusClassInstruction(
        item,
        collectionId,
      );
      const title = item.getField("title") || "Untitled";
      const itemTypeLabel = Zotero.ItemTypes.getLocalizedString(item.itemType);
      const creator = item.getCreators().length > 0 ? item.getCreator(0) : null;
      const author =
        item.firstCreator ||
        (creator && typeof creator !== "boolean"
          ? `${creator.firstName || ""} ${creator.lastName || ""}`.trim()
          : "");
      const date = item.getField("date") || "";
      const publicationName =
        item.getField("publicationTitle") ||
        "" ||
        item.getField("bookTitle") ||
        "" ||
        "";
      const url = item.getField("url") || "";
      const attachments = item.getAttachments();
      let viewableAttachment: Zotero.Item | null = null;
      let attachmentType: "pdf" | "snapshot" | "epub" | null = null;
      for (const attId of attachments) {
        try {
          const att = Zotero.Items.get(attId);
          if (att && att.isAttachment()) {
            const contentType = att.attachmentContentType || "";
            const linkMode = att.attachmentLinkMode;
            const path = att.attachmentPath?.toLowerCase() || "";
            if (contentType === "application/pdf" || path.endsWith(".pdf")) {
              viewableAttachment = att;
              attachmentType = "pdf";
              break;
            }
            if (linkMode === 3) {
              viewableAttachment = att;
              attachmentType = "snapshot";
              break;
            }
            if (
              contentType === "application/epub+zip" ||
              contentType === "application/epub" ||
              path.endsWith(".epub")
            ) {
              viewableAttachment = att;
              attachmentType = "epub";
              break;
            }
          }
        } catch (e) {
          // Continue
        }
      }
      const metadataParts = [itemTypeLabel, author, date].filter(Boolean);
      const bibliographicReference = getPref("showBibliography")
        ? (await generateBibliographicReference(item)) || ""
        : "";
      return `
        <div
          class="syllabus-item"
          data-item-id="${item.id}"
          draggable="true"
          ${priorityStyle ? `style="${priorityStyle}"` : ""}
        >
          <div class="syllabus-item-content">
            <div class="syllabus-item-main-content">
              <div class="syllabus-item-thumbnail">
                <span
                  class="icon icon-css icon-item-type cell-icon"
                  data-item-type="${item.itemType}"
                  style="
                    width: 100%;
                    height: 100%;
                    background-origin: padding-box, padding-box, padding-box, padding-box;
                    background-position-x: 50%, 50%, 50%, 50%;
                    background-position-y: 50%, 50%, 50%, 50%;
                    background-repeat: no-repeat, repeat, repeat, repeat;
                    background-size: contain, 0px, 0px, 0px;
                  "
                ></span>
              </div>
              <div class="syllabus-item-text">
                <div class="syllabus-item-title-row">
                  <div class="syllabus-item-title">${escapeHTML(title)}</div>
                </div>
                ${publicationName
          ? `<div class="syllabus-item-publication">In ${escapeHTML(publicationName)}</div>`
          : ""}
          ${(priority && priority in SyllabusManager.PRIORITY_LABELS) ||
          metadataParts.length > 0
          ? `<div class="syllabus-item-metadata">
            ${priority && priority in SyllabusManager.PRIORITY_LABELS
            ? `
              <span class="syllabus-item-priority-inline">
                <span
                  class="syllabus-priority-icon"
                  style="background-color: ${SyllabusManager.PRIORITY_COLORS[priority as SyllabusPriority]}"
                ></span>
                <span
                  class="syllabus-priority-label"
                  style="color: ${SyllabusManager.PRIORITY_COLORS[priority as SyllabusPriority]}"
                >${SyllabusManager.PRIORITY_LABELS[priority as SyllabusPriority]}</span>
              </span>
            `
            : ""
          }
            ${SyllabusManager.renderSyllabusItemMetadataHTML(item)}
          }</div>`
          : ""
        }
         ${bibliographicReference
          ? `<div class="syllabus-item-reference">${escapeHTML(bibliographicReference)}</div>`
          : ""
        }
         ${classInstruction
          ? `<div class="syllabus-item-description">${escapeHTML(classInstruction)}</div>`
          : ""
        }</div>
      </div>
      <div class="syllabus-item-right-side" draggable="false">
        <div class="syllabus-item-actions" draggable="false">
          ${url ? `
            <button
              class="toolbarbutton-1 syllabus-action-button"
              data-action="url"
              data-url="${escapeHTML(url)}"
              label="URL"
              tooltiptext="Open URL"
            />`
          : ""
        }
        ${viewableAttachment && attachmentType ? `
          <button
            class="toolbarbutton-1 syllabus-action-button"
            data-action="attachment"
            data-attachment-id="${viewableAttachment.id}"
            data-attachment-type="${attachmentType}"
            label="${escapeHTML(
          attachmentType === "pdf"
            ? "PDF"
            : attachmentType === "snapshot"
              ? "Snapshot"
              : attachmentType === "epub"
                ? "EPUB"
                : "View",
        )}"
            tooltiptext="${escapeHTML(
          attachmentType === "pdf"
            ? "Open PDF"
            : attachmentType === "snapshot"
              ? "Open web snapshot"
              : attachmentType === "epub"
                ? "Open EPUB"
                : "Open attachment",
        )}" />`
          : ""
        }
              </div>
            </div>
          </div>
        </div>
      `;
    })();
  }

  /**
   * Render HTML string for a slim syllabus item card (for items without priority)
   */
  static renderSyllabusItemCardSlimHTML(
    item: Zotero.Item,
    collectionId: number,
  ): string {
    return `
      <div
        class="syllabus-item syllabus-item-slim"
        data-item-id="${item.id}"
        draggable="true"
      >
        <div class="syllabus-item-content">
          <div class="syllabus-item-main-content">
            <div class="syllabus-item-thumbnail">
              <span
                class="icon icon-css icon-item-type cell-icon"
                data-item-type="${item.itemType}"
                style="
                  width: 100%;
                  height: 100%;
                  background-origin: padding-box, padding-box, padding-box, padding-box;
                  background-position-x: 50%, 50%, 50%, 50%;
                  background-position-y: 50%, 50%, 50%, 50%;
                  background-repeat: no-repeat, repeat, repeat, repeat;
                  background-size: contain, 0px, 0px, 0px;
                "
              ></span>
            </div>
            <div class="syllabus-item-text">
              <div class="syllabus-item-title-row">
                <div class="syllabus-item-title">
                  ${escapeHTML(item.getField("title") || "Untitled")}
                </div>
              </div>
              ${SyllabusManager.renderSyllabusItemMetadataHTML(item)}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  static renderSyllabusItemMetadataHTML(item: Zotero.Item): string {
    const itemTypeLabel = Zotero.ItemTypes.getLocalizedString(
      item.itemType,
    );
    const creator =
      item.getCreators().length > 0 ? item.getCreator(0) : null;
    const author =
      item.firstCreator ||
      (creator && typeof creator !== "boolean"
        ? `${creator.firstName || ""} ${creator.lastName || ""}`.trim()
        : "");
    const date = item.getField("date") || "";
    const metadataParts = [itemTypeLabel, author, date].filter(
      Boolean,
    );
    return metadataParts.length > 0
      ? `<div class="syllabus-item-metadata"><span>${metadataParts.join(" • ")}</span></div>`
      : "";
  }

  /**
   * Attach event listeners to a rendered page element
   */
  static attachPageEventListeners(
    doc: Document,
    customView: HTMLElement,
    selectedCollection: Zotero.Collection,
    pane: any,
  ) {
    // Replace editable placeholders with actual editable inputs
    const editablePlaceholders = customView.querySelectorAll(
      ".syllabus-editable-placeholder",
    );

    for (const placeholder of editablePlaceholders) {
      const type = placeholder.getAttribute("data-type");
      const collectionId = parseInt(
        placeholder.getAttribute("data-collection-id") || "0",
        10,
      );
      const classNumber = placeholder.getAttribute("data-class-number");
      const initialValue = placeholder.getAttribute("data-initial-value") || "";
      const placeholderText =
        placeholder.getAttribute("data-placeholder") || "";
      const emptyBehavior = (placeholder.getAttribute("data-empty-behavior") ||
        "reset") as "reset" | "delete";

      let inputElement: HTMLElement;

      if (type === "collection-title") {
        inputElement = createEditableTextInput(doc, {
          className: "syllabus-view-title",
          initialValue: selectedCollection.name || "",
          onSave: async (newName: string) => {
            selectedCollection.name = newName;
            await selectedCollection.saveTx();
          },
          emptyBehavior: "reset",
          element: "input",
        });
        const titleContainer = doc.createElement("div");
        titleContainer.appendChild(inputElement);
        placeholder.replaceWith(titleContainer);
      } else if (type === "collection-description") {
        inputElement = createEditableTextInput(doc, {
          className: "syllabus-collection-description",
          initialValue: initialValue,
          onSave: async (newDescription: string) => {
            await SyllabusManager.setCollectionDescription(
              collectionId,
              newDescription,
              "page",
            );
          },
          placeholder: placeholderText,
          emptyBehavior: "delete",
        });
        placeholder.replaceWith(inputElement);
      } else if (type === "class-title" && classNumber) {
        const classNum = parseInt(classNumber, 10);
        inputElement = createEditableTextInput(doc, {
          className: "syllabus-class-title",
          initialValue: initialValue,
          onSave: async (newTitle: string) => {
            await SyllabusManager.setClassTitle(
              collectionId,
              classNum,
              newTitle,
              "page",
            );
          },
          placeholder: placeholderText,
          emptyBehavior: "delete",
        });
        placeholder.replaceWith(inputElement);
      } else if (type === "class-description" && classNumber) {
        const classNum = parseInt(classNumber, 10);
        inputElement = createEditableTextInput(doc, {
          className: "syllabus-class-description",
          initialValue: initialValue,
          onSave: async (newDescription: string) => {
            await SyllabusManager.setClassDescription(
              collectionId,
              classNum,
              newDescription,
              "page",
            );
          },
          placeholder: placeholderText,
          emptyBehavior: "delete",
        });
        placeholder.replaceWith(inputElement);
      }
    }

    // Attach drag and drop listeners to items containers
    const itemsContainers = customView.querySelectorAll(
      ".syllabus-class-items",
    );

    for (const itemsContainer of itemsContainers) {
      const container = itemsContainer as HTMLElement;

      container.addEventListener("dragover", (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer) {
          e.dataTransfer.dropEffect = "move";
        }
        container.classList.add("syllabus-dropzone-active");
      });

      container.addEventListener("dragleave", (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const rect = container.getBoundingClientRect();
        const x = e.clientX;
        const y = e.clientY;
        if (
          x < rect.left ||
          x > rect.right ||
          y < rect.top ||
          y > rect.bottom
        ) {
          container.classList.remove("syllabus-dropzone-active");
        }
      });

      container.addEventListener("drop", async (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        container.classList.remove("syllabus-dropzone-active");

        const itemIdStr = e.dataTransfer?.getData("text/plain");
        if (!itemIdStr) return;

        const itemId = parseInt(itemIdStr, 10);
        if (isNaN(itemId)) return;

        try {
          const draggedItem = Zotero.Items.get(itemId);
          if (!draggedItem || !draggedItem.isRegularItem()) return;

          const targetClassNumberStr =
            container.getAttribute("data-class-number");
          const targetClassNumber =
            targetClassNumberStr === "" || targetClassNumberStr === null
              ? undefined
              : parseInt(targetClassNumberStr, 10);

          await SyllabusManager.setSyllabusClassNumber(
            draggedItem,
            selectedCollection.id,
            targetClassNumber,
            "page",
          );
          await draggedItem.saveTx();

          SyllabusManager.setupPage();
        } catch (err) {
          ztoolkit.log("Error handling drop:", err);
        }
      });
    }

    // Attach event listeners to item cards
    const itemCards = customView.querySelectorAll(".syllabus-item");

    for (const itemCard of itemCards) {
      const card = itemCard as HTMLElement;
      const itemId = parseInt(card.getAttribute("data-item-id") || "0", 10);
      if (!itemId) continue;

      let isDragging = false;

      card.addEventListener("click", (e: MouseEvent) => {
        if (isDragging) {
          isDragging = false;
          return;
        }
        const target = e.target as HTMLElement;
        if (
          target.closest(".syllabus-item-actions") ||
          target.closest("button")
        ) {
          return;
        }
        pane.selectItem(itemId);
      });

      card.addEventListener("dragstart", (e: DragEvent) => {
        e.stopPropagation();
        isDragging = true;
        if (e.dataTransfer) {
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", String(itemId));
        }
        card.classList.add("syllabus-item-dragging");
      });

      card.addEventListener("dragend", () => {
        card.classList.remove("syllabus-item-dragging");
        setTimeout(() => {
          isDragging = false;
        }, 100);
      });

      // Attach button listeners
      const actionButtons = card.querySelectorAll(".syllabus-action-button");
      for (const button of actionButtons) {
        const action = button.getAttribute("data-action");
        const attType = button.getAttribute("data-attachment-type");
        const attachmentId = button.getAttribute("data-attachment-id");
        const url = button.getAttribute("data-url");

        const label = button.getAttribute("label");
        if (label) {
          button.textContent = label;
        }
        const tooltip = button.getAttribute("tooltiptext");
        if (tooltip) {
          button.setAttribute("title", tooltip);
        }

        if (action === "url" && url) {
          button.addEventListener("click", (e: Event) => {
            e.stopPropagation();
            Zotero.launchURL(url);
          });
        } else if (action === "attachment" && attachmentId && attType) {
          button.addEventListener("click", async (e: Event) => {
            e.stopPropagation();
            try {
              const viewableAttachment = Zotero.Items.get(
                parseInt(attachmentId, 10),
              );
              if (!viewableAttachment) return;
              if (
                attType === "pdf" ||
                attType === "snapshot" ||
                attType === "epub"
              ) {
                await pane.viewPDF(viewableAttachment.id, { page: 1 });
              }
            } catch (err) {
              try {
                const viewableAttachment = Zotero.Items.get(
                  parseInt(attachmentId, 10),
                );
                if (!viewableAttachment) return;
                const file = viewableAttachment.getFilePath();
                if (file) {
                  Zotero.File.pathToFile(file).reveal();
                } else {
                  if (attType === "snapshot") {
                    const snapshotUrl = viewableAttachment.getField("url");
                    if (snapshotUrl) {
                      Zotero.launchURL(snapshotUrl);
                    }
                  }
                }
              } catch (fileErr) {
                ztoolkit.log("Error opening attachment:", fileErr);
              }
            }
          });
        }
      }
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
          const priority = SyllabusManager.getSyllabusPriority(
            item,
            selectedCollection.id,
          );
          const classNumber = SyllabusManager.getSyllabusClassNumber(
            item,
            selectedCollection.id,
          );

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
            return `0_course-info_${classNumberStr}`;
          }
          if (priority === SyllabusPriority.ESSENTIAL) {
            return `1_essential_${classNumberStr}`;
          }
          if (priority === SyllabusPriority.RECOMMENDED) {
            return `2_recommended_${classNumberStr}`;
          }
          if (priority === SyllabusPriority.OPTIONAL) {
            return `3_optional_${classNumberStr}`;
          }
          return `4__${classNumberStr}`; // empty/blank priority
        }

        // If not in a collection view, return empty
        return "4__9999";
      },
      renderCell: (index, data, column, isFirstColumn, doc) => {
        // Parse the data to extract the priority for display
        // data format: "0_essential_0001", "1_recommended_0002", "2_optional_0003", or "4__9999"
        // Format: "priorityPrefix_priorityValue_classNumber"
        const parts = String(data).split("_");
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
      label: "Instructions",
      dataProvider: (item: Zotero.Item, dataKey: string) => {
        const zoteroPane = ztoolkit.getGlobal("ZoteroPane");
        const selectedCollection = zoteroPane.getSelectedCollection();

        if (selectedCollection) {
          return SyllabusManager.getSyllabusClassInstruction(
            item,
            selectedCollection.id,
          );
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
          const classNumber = SyllabusManager.getSyllabusClassNumber(
            item,
            selectedCollection.id,
          );
          const priority = SyllabusManager.getSyllabusPriority(
            item,
            selectedCollection.id,
          );

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
            const paddedClassNumber = String(classNumber).padStart(5, "0");
            return `1_${paddedClassNumber}_${priorityOrder}`;
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
        // data format: "0_priorityOrder", "1_paddedClassNumber_priorityOrder", or "2_99999_4"
        const parts = String(data).split("_");
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

          // Get the custom class name/title if it exists
          const zoteroPane = ztoolkit.getGlobal("ZoteroPane");
          const selectedCollection = zoteroPane.getSelectedCollection();
          let displayText = String(classNumber);

          if (selectedCollection) {
            const classTitle = SyllabusManager.getClassTitle(
              selectedCollection.id,
              classNumber,
              true,
            );
            if (classTitle) {
              displayText = classTitle;
            }
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

  /**
   * Get syllabus data from an item's extra field
   */
  static getSyllabusData(item: Zotero.Item): SyllabusData {
    const jsonStr = this.extraFieldTool.getExtraField(
      item,
      this.SYLLABUS_DATA_KEY,
    );

    if (!jsonStr) {
      return {};
    }

    try {
      return JSON.parse(jsonStr) as SyllabusData;
    } catch (e) {
      ztoolkit.log("Error parsing syllabus data:", e);
      return {};
    }
  }

  /**
   * Set syllabus data in an item's extra field
   */
  static async setSyllabusData(
    item: Zotero.Item,
    data: SyllabusData,
    source: "page" | "item-pane" | "context-menu",
  ): Promise<void> {
    const jsonStr = JSON.stringify(data);
    await this.extraFieldTool.setExtraField(
      item,
      this.SYLLABUS_DATA_KEY,
      jsonStr,
    );
    this.onItemUpdate(item, source);
  }

  /**
   * Get syllabus priority for a specific collection
   */
  static getSyllabusPriority(
    item: Zotero.Item,
    collectionId: number | string,
  ): SyllabusPriority | "" {
    const data = this.getSyllabusData(item);
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
    const data = this.getSyllabusData(item);
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
    const data = this.getSyllabusData(item);
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
    const data = this.getSyllabusData(item);
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
    const data = this.getSyllabusData(item);
    const collectionIdStr = String(collectionId);
    return data[collectionIdStr]?.classNumber;
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
    const data = this.getSyllabusData(item);
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

  /**
   * Get collection metadata from preferences
   */
  static getCollectionMetadata(): CollectionMetadata {
    const prefKey = `${addon.data.config.prefsPrefix}.collectionMetadata`;
    const metadataStr = String(Zotero.Prefs.get(prefKey, true) || "");
    if (!metadataStr) {
      return {};
    }
    try {
      return JSON.parse(metadataStr) as CollectionMetadata;
    } catch (e) {
      ztoolkit.log("Error parsing collection metadata:", e);
      return {};
    }
  }

  /**
   * Set collection metadata in preferences
   */
  static async setCollectionMetadata(
    metadata: CollectionMetadata,
    source: "page" | "item-pane",
  ): Promise<void> {
    const prefKey = `${addon.data.config.prefsPrefix}.collectionMetadata`;
    Zotero.Prefs.set(prefKey, JSON.stringify(metadata), true);
    if (source !== "page") this.setupPage();
    if (source !== "item-pane") this.reloadItemPane();
    this.onClassListUpdate();
  }

  /**
   * Get collection description for a specific collection
   */
  static getCollectionDescription(collectionId: number | string): string {
    const metadata = SyllabusManager.getCollectionMetadata();
    const collectionIdStr = String(collectionId);
    return metadata[collectionIdStr]?.description || "";
  }

  /**
   * Set collection description for a specific collection
   */
  static async setCollectionDescription(
    collectionId: number | string,
    description: string,
    source: "page",
  ): Promise<void> {
    const metadata = SyllabusManager.getCollectionMetadata();
    const collectionIdStr = String(collectionId);

    if (!metadata[collectionIdStr]) {
      metadata[collectionIdStr] = {};
    }

    if (description && description.trim()) {
      metadata[collectionIdStr].description = description.trim();
    } else {
      delete metadata[collectionIdStr].description;
      // Remove collection entry if it's empty
      if (
        !metadata[collectionIdStr].classes ||
        Object.keys(metadata[collectionIdStr].classes || {}).length === 0
      ) {
        delete metadata[collectionIdStr];
      }
    }

    await SyllabusManager.setCollectionMetadata(metadata, source);
  }

  /**
   * Get class title for a specific collection and class number
   */
  static getClassTitle(
    collectionId: number | string,
    classNumber: number,
    includeClassNumber: boolean = false,
  ): string {
    const metadata = SyllabusManager.getCollectionMetadata();
    const collectionIdStr = String(collectionId);
    const classNumberStr = String(classNumber);
    const title =
      metadata[collectionIdStr]?.classes?.[classNumberStr]?.title || "";
    if (includeClassNumber) {
      return `#${classNumber}: ${title}`;
    }
    return title;
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
    const metadata = SyllabusManager.getCollectionMetadata();
    const collectionIdStr = String(collectionId);
    const classNumberStr = String(classNumber);

    if (!metadata[collectionIdStr]) {
      metadata[collectionIdStr] = {};
    }
    if (!metadata[collectionIdStr].classes) {
      metadata[collectionIdStr].classes = {};
    }
    if (!metadata[collectionIdStr].classes[classNumberStr]) {
      metadata[collectionIdStr].classes[classNumberStr] = {};
    }

    if (title && title.trim()) {
      metadata[collectionIdStr].classes[classNumberStr].title = title.trim();
    } else {
      delete metadata[collectionIdStr].classes[classNumberStr].title;
      // Remove class entry if it's empty
      if (!metadata[collectionIdStr].classes[classNumberStr].description) {
        delete metadata[collectionIdStr].classes[classNumberStr];
      }
      // Remove classes object if empty
      if (Object.keys(metadata[collectionIdStr].classes || {}).length === 0) {
        delete metadata[collectionIdStr].classes;
      }
      // Remove collection entry if it's empty
      if (
        !metadata[collectionIdStr].description &&
        !metadata[collectionIdStr].classes
      ) {
        delete metadata[collectionIdStr];
      }
    }

    await SyllabusManager.setCollectionMetadata(metadata, source);
  }

  /**
   * Get class description for a specific collection and class number
   */
  static getClassDescription(
    collectionId: number | string,
    classNumber: number,
  ): string {
    const metadata = SyllabusManager.getCollectionMetadata();
    const collectionIdStr = String(collectionId);
    const classNumberStr = String(classNumber);
    return (
      metadata[collectionIdStr]?.classes?.[classNumberStr]?.description || ""
    );
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
    const metadata = SyllabusManager.getCollectionMetadata();
    const collectionIdStr = String(collectionId);
    const classNumberStr = String(classNumber);

    if (!metadata[collectionIdStr]) {
      metadata[collectionIdStr] = {};
    }
    if (!metadata[collectionIdStr].classes) {
      metadata[collectionIdStr].classes = {};
    }
    if (!metadata[collectionIdStr].classes[classNumberStr]) {
      metadata[collectionIdStr].classes[classNumberStr] = {};
    }

    if (description && description.trim()) {
      metadata[collectionIdStr].classes[classNumberStr].description =
        description.trim();
    } else {
      delete metadata[collectionIdStr].classes[classNumberStr].description;
      // Remove class entry if it's empty
      if (!metadata[collectionIdStr].classes[classNumberStr].title) {
        delete metadata[collectionIdStr].classes[classNumberStr];
      }
      // Remove classes object if empty
      if (Object.keys(metadata[collectionIdStr].classes || {}).length === 0) {
        delete metadata[collectionIdStr].classes;
      }
      // Remove collection entry if it's empty
      if (
        !metadata[collectionIdStr].description &&
        !metadata[collectionIdStr].classes
      ) {
        delete metadata[collectionIdStr];
      }
    }

    await SyllabusManager.setCollectionMetadata(metadata, source);
  }
}
