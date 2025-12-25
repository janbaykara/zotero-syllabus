/**
 * Syllabus Manager - Core functionality for syllabus view and metadata
 */

import { generateBibliographicReference } from "../utils/cite";
import { getLocaleID } from "../utils/locale";
import { getPref } from "../utils/prefs";
import { ExtraFieldTool } from "zotero-plugin-toolkit";
import { getCurrentTab } from "../utils/window";
import { createEditableTextInput } from "../utils/ui";

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
  static classNumberMenuUpdateHandlers: Map<Window, () => void> = new Map();
  static syllabusItemPaneSection: false | string | null = null;

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
    this.registerContextMenu(win);
    this.updateClassNumberMenus();
    this.setupUI();
    this.setupSyllabusViewTabListener();
    this.setupSyllabusViewReloadListener();
  }

  static onItemUpdate(item: Zotero.Item, source: "page" | "item-pane" | "context-menu") {
    ztoolkit.log("SyllabusManager.onItemUpdate", source, item.id);
    if (source !== "page") this.setupPage();
    if (source !== "item-pane") this.reloadItemPane();
  }

  /**
   * E.g. the class title or description has been updated
   */
  static onClassUpdate(classNumber: number, source: "page" | "item-pane") {
    ztoolkit.log("SyllabusManager.onClassUpdate", classNumber, source);
    if (source !== "page") this.setupPage();
    if (source !== "item-pane") this.reloadItemPane();
    this.updateClassNumberMenus();
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
    this.unregisterClassNumberMenuUpdater(win);
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
          SyllabusManager.setupUI()
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
    let toggleButton = doc.getElementById(
      "syllabus-view-toggle",
    )
    let spacer = doc.getElementById("syllabus-view-spacer") as Element | null;

    if (!toggleButton) {
      // Create toggle button
      toggleButton = ztoolkit.UI.createElement(doc, "toolbarbutton", {
        id: "syllabus-view-toggle",
        classList: ["syllabus-view-toggle"],
        properties: {
          type: "menu"
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

    button.setAttribute("data-syllabus-current-ui-mode", SyllabusManager.getSyllabusPageVisible() ? "syllabus" : "collection");

    (button as XUL.Button).label = isEnabled
      ? "View as Collection"
      : "View as Syllabus";

    (button as XUL.Button).tooltiptext = isEnabled
      ? "Switch to Collection View"
      : "Switch to Syllabus View";
  };

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
      let customView = doc.getElementById("syllabus-custom-view");
      const itemsTree = doc.getElementById("zotero-items-tree");

      if (!shouldShowCustomView) {
        // Hide custom view and show default tree
        if (customView) {
          (customView as HTMLElement).style.display = "none";
        }
        if (itemsTree) {
          (itemsTree as HTMLElement).style.display = "";
        }
      } else {
        /**
         * If we should show custom view, create it
         */

        // Hide the default tree
        if (itemsTree) {
          (itemsTree as HTMLElement).style.display = "none";
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
        (customView as HTMLElement).style.display = "block";

        // Clear and render
        customView.innerHTML = "";

        // Add collection name as title (using reusable editable input function)
        const titleElement = createEditableTextInput(doc, {
          className: "syllabus-view-title",
          initialValue: selectedCollection.name || "",
          onSave: async (newName: string) => {
            selectedCollection.name = newName;
            await selectedCollection.saveTx();
          },
          emptyBehavior: "reset", // Collection title resets to original when cleared
        });

        // Wrap title in a sticky container to eliminate gaps
        const titleContainer = doc.createElement("div");
        titleContainer.className = "syllabus-view-title-container";
        titleContainer.appendChild(titleElement);

        customView.appendChild(titleContainer);

        // Add collection description field
        const collectionDescriptionElement = createEditableTextInput(doc, {
          className: "syllabus-collection-description",
          initialValue: SyllabusManager.getCollectionDescription(selectedCollection.id),
          onSave: async (newDescription: string) => {
            await SyllabusManager.setCollectionDescription(
              selectedCollection.id,
              newDescription,
            );
          },
          placeholder: "Add a description...",
          emptyBehavior: "delete", // Collection description deletes when cleared
        });

        customView.appendChild(collectionDescriptionElement);

        // Get all items from the collection
        const items = selectedCollection.getChildItems();

        // Separate items that have both no priority AND no class number (for "Further reading")
        const furtherReadingItems: Zotero.Item[] = [];

        // Group items by class number
        // Use null as a sentinel for "no class number" to ensure consistent grouping
        const itemsByClass: Map<number | null, Zotero.Item[]> = new Map();
        for (const item of items) {
          if (!item.isRegularItem()) continue;
          const classNumber = SyllabusManager.getSyllabusClassNumber(
            item,
            selectedCollection.id,
          );
          const priority = SyllabusManager.getSyllabusPriority(item, selectedCollection.id);

          // Check if item has both no priority AND no class number
          const hasNoPriority = priority === "";
          const hasNoClassNumber = classNumber === undefined;

          if (hasNoPriority && hasNoClassNumber) {
            // Add to "Further reading" section (rendered at bottom)
            furtherReadingItems.push(item);
            continue;
          }

          // Normalize undefined to null for consistent Map key handling
          const normalizedClassNumber =
            classNumber === undefined ? null : classNumber;
          if (!itemsByClass.has(normalizedClassNumber)) {
            itemsByClass.set(normalizedClassNumber, []);
          }
          itemsByClass.get(normalizedClassNumber)!.push(item);
        }

        // Sort class numbers (null goes FIRST, then numeric order)
        // This ensures items without class number (but with priority) appear at the top
        const sortedClassNumbers = Array.from(itemsByClass.keys()).sort(
          (a, b) => {
            // null represents "no class number"
            if (a === null && b === null) return 0;
            if (a === null) return -1; // null goes first (top)
            if (b === null) return 1;
            return a - b;
          },
        );

        // Render each class group
        for (const classNumber of sortedClassNumbers) {
          const classItems = itemsByClass.get(classNumber)!;

          // Sort items by priority: course-info, essential, recommended, optional, none
          classItems.sort((a, b) => {
            const priorityA = SyllabusManager.getSyllabusPriority(a, selectedCollection.id);
            const priorityB = SyllabusManager.getSyllabusPriority(b, selectedCollection.id);

            const getPriorityOrder = (
              priority: SyllabusPriority | "" | undefined,
            ): number => {
              if (priority === SyllabusPriority.COURSE_INFO) return 0;
              if (priority === SyllabusPriority.ESSENTIAL) return 1;
              if (priority === SyllabusPriority.RECOMMENDED) return 2;
              if (priority === SyllabusPriority.OPTIONAL) return 3;
              return 4; // none/undefined/empty string
            };

            return getPriorityOrder(priorityA) - getPriorityOrder(priorityB);
          });

          // Create class group container
          const classGroup = doc.createElement("div");
          classGroup.className = "syllabus-class-group";

          // Add class header (only for items with a class number)
          if (classNumber !== null) {
            // Create header container with class number and title on same line
            const classHeaderContainer = doc.createElement("div");
            classHeaderContainer.className =
              "syllabus-class-header-container";

            const classHeader = doc.createElement("div");
            classHeader.className = "syllabus-class-header";
            classHeader.textContent = `Class ${classNumber}`;
            classHeaderContainer.appendChild(classHeader);

            // Add class title field on same line
            const classTitleElement = createEditableTextInput(doc, {
              className: "syllabus-class-title",
              initialValue: SyllabusManager.getClassTitle(selectedCollection.id, classNumber),
              onSave: async (newTitle: string) => {
                await SyllabusManager.setClassTitle(
                  selectedCollection.id,
                  classNumber,
                  newTitle,
                );
              },
              placeholder: "Add a title...",
              emptyBehavior: "delete", // Class title deletes when cleared
            });
            classHeaderContainer.appendChild(classTitleElement);

            classGroup.appendChild(classHeaderContainer);

            // Add class description field
            const classDescriptionElement = createEditableTextInput(doc, {
              className: "syllabus-class-description",
              initialValue: SyllabusManager.getClassDescription(
                selectedCollection.id,
                classNumber,
              ),
              onSave: async (newDescription: string) => {
                await SyllabusManager.setClassDescription(
                  selectedCollection.id,
                  classNumber,
                  newDescription,
                );
              },
              placeholder: "Add a description...",
              emptyBehavior: "delete", // Class description deletes when cleared
            });
            classGroup.appendChild(classDescriptionElement);
          }

          // Add items in this class
          const itemsContainer = doc.createElement("div");
          itemsContainer.className = "syllabus-class-items";
          // Store class number in data attribute for drop handling
          if (classNumber !== null) {
            itemsContainer.setAttribute(
              "data-class-number",
              String(classNumber),
            );
          } else {
            itemsContainer.setAttribute("data-class-number", "");
          }

          // Make itemsContainer a drop zone
          itemsContainer.addEventListener("dragover", (e: DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            if (e.dataTransfer) {
              e.dataTransfer.dropEffect = "move";
            }
            itemsContainer.classList.add("syllabus-dropzone-active");
          });

          itemsContainer.addEventListener("dragleave", (e: DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            // Only remove class if we're actually leaving the container
            const rect = itemsContainer.getBoundingClientRect();
            const x = e.clientX;
            const y = e.clientY;
            if (
              x < rect.left ||
              x > rect.right ||
              y < rect.top ||
              y > rect.bottom
            ) {
              itemsContainer.classList.remove("syllabus-dropzone-active");
            }
          });

          itemsContainer.addEventListener("drop", async (e: DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            itemsContainer.classList.remove("syllabus-dropzone-active");

            const itemIdStr = e.dataTransfer?.getData("text/plain");
            if (!itemIdStr) return;

            const itemId = parseInt(itemIdStr, 10);
            if (isNaN(itemId)) return;

            try {
              const draggedItem = Zotero.Items.get(itemId);
              if (!draggedItem || !draggedItem.isRegularItem()) return;

              // Get the target class number
              const targetClassNumberStr =
                itemsContainer.getAttribute("data-class-number");
              const targetClassNumber =
                targetClassNumberStr === "" || targetClassNumberStr === null
                  ? undefined
                  : parseInt(targetClassNumberStr, 10);

              // Update the item's class number
              await SyllabusManager.setSyllabusClassNumber(
                draggedItem,
                selectedCollection.id,
                targetClassNumber,
                "page",
              );
              await draggedItem.saveTx();

              // Re-render the view to reflect the change
              SyllabusManager.setupPage();
            } catch (err) {
              ztoolkit.log("Error handling drop:", err);
            }
          });

          for (const item of classItems) {
            const priority = SyllabusManager.getSyllabusPriority(item, selectedCollection.id);
            // Use slim card for items without priority, full card for items with priority
            const itemElement = priority
              ? await SyllabusManager.createSyllabusItemCard(
                doc,
                item,
                selectedCollection.id,
                pane,
              )
              : await SyllabusManager.createSyllabusItemCardSlim(
                doc,
                item,
                selectedCollection.id,
                pane,
              );
            itemsContainer.appendChild(itemElement);
          }

          classGroup.appendChild(itemsContainer);
          customView.appendChild(classGroup);
        }

        // Render "Further reading" section at the bottom (items with no priority AND no class number)
        if (furtherReadingItems.length > 0) {
          // Sort items by title for consistent ordering
          furtherReadingItems.sort((a, b) => {
            const titleA = a.getField("title") || "";
            const titleB = b.getField("title") || "";
            return titleA.localeCompare(titleB);
          });

          // Create "Further reading" class group container
          const furtherReadingGroup = doc.createElement("div");
          furtherReadingGroup.className = "syllabus-class-group";

          // Add "Further reading" header
          const furtherReadingHeader = doc.createElement("div");
          furtherReadingHeader.className = "syllabus-class-header";
          furtherReadingHeader.textContent = "Further reading";
          furtherReadingGroup.appendChild(furtherReadingHeader);

          // Add items container
          const furtherReadingItemsContainer = doc.createElement("div");
          furtherReadingItemsContainer.className =
            "syllabus-class-items syllabus-further-reading-items";
          furtherReadingItemsContainer.setAttribute("data-class-number", "");

          // Make itemsContainer a drop zone
          furtherReadingItemsContainer.addEventListener(
            "dragover",
            (e: DragEvent) => {
              e.preventDefault();
              e.stopPropagation();
              if (e.dataTransfer) {
                e.dataTransfer.dropEffect = "move";
              }
              furtherReadingItemsContainer.classList.add(
                "syllabus-dropzone-active",
              );
            },
          );

          furtherReadingItemsContainer.addEventListener(
            "dragleave",
            (e: DragEvent) => {
              e.preventDefault();
              e.stopPropagation();
              const rect =
                furtherReadingItemsContainer.getBoundingClientRect();
              const x = e.clientX;
              const y = e.clientY;
              if (
                x < rect.left ||
                x > rect.right ||
                y < rect.top ||
                y > rect.bottom
              ) {
                furtherReadingItemsContainer.classList.remove(
                  "syllabus-dropzone-active",
                );
              }
            },
          );

          furtherReadingItemsContainer.addEventListener(
            "drop",
            async (e: DragEvent) => {
              e.preventDefault();
              e.stopPropagation();
              furtherReadingItemsContainer.classList.remove(
                "syllabus-dropzone-active",
              );

              const itemIdStr = e.dataTransfer?.getData("text/plain");
              if (!itemIdStr) return;

              const itemId = parseInt(itemIdStr, 10);
              if (isNaN(itemId)) return;

              try {
                const draggedItem = Zotero.Items.get(itemId);
                if (!draggedItem || !draggedItem.isRegularItem()) return;

                // Remove class number (set to undefined) to keep item in "Further reading"
                await SyllabusManager.setSyllabusClassNumber(
                  draggedItem,
                  selectedCollection.id,
                  undefined,
                  "page",
                );
                await draggedItem.saveTx();

                // Re-render the view to reflect the change
                SyllabusManager.setupPage();
              } catch (err) {
                ztoolkit.log("Error handling drop:", err);
              }
            },
          );

          // Add all further reading items (all should be slim cards since they have no priority)
          for (const item of furtherReadingItems) {
            const itemElement = SyllabusManager.createSyllabusItemCardSlim(
              doc,
              item,
              selectedCollection.id,
              pane,
            );
            furtherReadingItemsContainer.appendChild(itemElement);
          }

          furtherReadingGroup.appendChild(furtherReadingItemsContainer);
          customView.appendChild(furtherReadingGroup);
        }
      }
    } catch (e) {
      ztoolkit.log("Error in setupPage:", e);
    }
  }

  // Helper function to create a slim syllabus item card (for items without priority)
  static createSyllabusItemCardSlim(
    doc: Document,
    item: Zotero.Item,
    collectionId: number,
    pane: any,
  ): HTMLElement {
    const title = item.getField("title") || "Untitled";
    const itemType = item.itemType;
    const itemTypeLabel = Zotero.ItemTypes.getLocalizedString(itemType);

    // Get author (first creator)
    let author = "";
    if (item.firstCreator) {
      author = item.firstCreator;
    } else {
      const creators = item.getCreators();
      if (creators.length > 0) {
        const creatorName = item.getCreator(0);
        if (creatorName) {
          author =
            `${creatorName.firstName || ""} ${creatorName.lastName || ""}`.trim();
        }
      }
    }

    const date = item.getField("date") || "";

    const itemElement = doc.createElement("div");
    itemElement.className = "syllabus-item syllabus-item-slim";
    itemElement.setAttribute("data-item-id", String(item.id));
    itemElement.setAttribute("draggable", "true");

    // Create item content container
    const itemContent = doc.createElement("div");
    itemContent.className = "syllabus-item-content";

    // Create main content wrapper (small thumbnail + text)
    const mainContent = doc.createElement("div");
    mainContent.className = "syllabus-item-main-content";

    // Add small thumbnail image on the left
    const thumbnailContainer = doc.createElement("div");
    thumbnailContainer.className =
      "syllabus-item-thumbnail syllabus-item-thumbnail-slim";

    // Try to get item image/thumbnail
    let imageSrc: string | null = null;

    // First try getImageSrc method if available
    if ((item as any).getImageSrc) {
      imageSrc = (item as any).getImageSrc();
    }

    // If no image, try to get from attachments
    if (!imageSrc) {
      const attachments = item.getAttachments();
      for (const attId of attachments) {
        try {
          const att = Zotero.Items.get(attId);
          if (
            att &&
            att.isAttachment() &&
            att.attachmentContentType?.startsWith("image/")
          ) {
            const file = att.getFilePath();
            if (file) {
              imageSrc = `file://${file}`;
              break;
            }
          }
        } catch (e) {
          // Continue to next attachment
        }
      }
    }

    if (imageSrc) {
      const thumbnailImg = doc.createElement("img");
      thumbnailImg.className = "syllabus-item-thumbnail-img";
      thumbnailImg.src = imageSrc;
      thumbnailImg.alt = title;
      thumbnailImg.onerror = () => {
        thumbnailImg.style.display = "none";
        const placeholder = doc.createElement("div");
        placeholder.className = "syllabus-item-thumbnail-placeholder";
        placeholder.textContent = "📄";
        thumbnailContainer.appendChild(placeholder);
      };
      thumbnailContainer.appendChild(thumbnailImg);
    } else {
      const placeholder = doc.createElement("div");
      placeholder.className = "syllabus-item-thumbnail-placeholder";
      placeholder.textContent = "📄";
      thumbnailContainer.appendChild(placeholder);
    }

    mainContent.appendChild(thumbnailContainer);

    // Create text content container
    const textContent = doc.createElement("div");
    textContent.className = "syllabus-item-text";

    // Create item title row
    const itemTitleRow = doc.createElement("div");
    itemTitleRow.className = "syllabus-item-title-row";

    const itemTitle = doc.createElement("div");
    itemTitle.className = "syllabus-item-title";
    itemTitle.textContent = title;
    itemTitleRow.appendChild(itemTitle);

    textContent.appendChild(itemTitleRow);

    // Add item metadata row (type, author, date) - compact
    const metadataParts: string[] = [];
    if (itemTypeLabel) {
      metadataParts.push(itemTypeLabel);
    }
    if (author) {
      metadataParts.push(author);
    }
    if (date) {
      metadataParts.push(date);
    }

    if (metadataParts.length > 0) {
      const metadataRow = doc.createElement("div");
      metadataRow.className = "syllabus-item-metadata";
      const metadataText = doc.createElement("span");
      metadataText.textContent = metadataParts.join(" • ");
      metadataRow.appendChild(metadataText);
      textContent.appendChild(metadataRow);
    }

    mainContent.appendChild(textContent);
    itemContent.appendChild(mainContent);
    itemElement.appendChild(itemContent);

    // Track if we're dragging to prevent click after drag
    let isDragging = false;

    // Add click handler to select item
    itemElement.addEventListener("click", (e: MouseEvent) => {
      if (isDragging) {
        isDragging = false;
        return;
      }
      pane.selectItem(item.id);
    });

    // Prevent drag from triggering click
    itemElement.addEventListener("dragstart", (e: DragEvent) => {
      e.stopPropagation();
      isDragging = true;
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", String(item.id));
      }
      itemElement.classList.add("syllabus-item-dragging");
    });

    itemElement.addEventListener("dragend", () => {
      itemElement.classList.remove("syllabus-item-dragging");
      setTimeout(() => {
        isDragging = false;
      }, 100);
    });

    return itemElement;
  }

  // Helper function to create a syllabus item card
  static async createSyllabusItemCard(
    doc: Document,
    item: Zotero.Item,
    collectionId: number,
    pane: any,
  ): Promise<HTMLElement> {
    // Get item data
    const priority = SyllabusManager.getSyllabusPriority(item, collectionId);

    const itemElement = doc.createElement("div");
    itemElement.className = "syllabus-item";
    itemElement.setAttribute("data-item-id", String(item.id));
    itemElement.setAttribute("draggable", "true");

    // Add subtle background and border coloring based on priority
    if (priority && priority in SyllabusManager.PRIORITY_COLORS) {
      const priorityColor = SyllabusManager.PRIORITY_COLORS[priority as SyllabusPriority];
      // Convert hex to rgba for subtle background (5% opacity) and border (20% opacity)
      const r = parseInt(priorityColor.slice(1, 3), 16);
      const g = parseInt(priorityColor.slice(3, 5), 16);
      const b = parseInt(priorityColor.slice(5, 7), 16);
      itemElement.style.backgroundColor = `rgba(${r}, ${g}, ${b}, 0.05)`;
      itemElement.style.borderColor = `rgba(${r}, ${g}, ${b}, 0.2)`;
    }
    const classInstruction = SyllabusManager.getSyllabusClassInstruction(item, collectionId);
    const title = item.getField("title") || "Untitled";

    // Get item metadata
    const itemType = item.itemType;
    const itemTypeLabel = Zotero.ItemTypes.getLocalizedString(itemType);

    // Get author (first creator)
    let author = "";
    if (item.firstCreator) {
      author = item.firstCreator;
    } else {
      const creators = item.getCreators();
      if (creators.length > 0) {
        const creatorName = item.getCreator(0);
        if (creatorName) {
          author =
            `${creatorName.firstName || ""} ${creatorName.lastName || ""}`.trim();
        }
      }
    }

    const date = item.getField("date") || "";

    // Get publication name (for "In..." display)
    const publicationTitle = item.getField("publicationTitle") || "";
    const bookTitle = item.getField("bookTitle") || "";
    const publicationName = publicationTitle || bookTitle || "";

    // Get URL and viewable attachment (PDF, web snapshot, or EPUB)
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

          // Check for PDF
          if (contentType === "application/pdf" || path.endsWith(".pdf")) {
            viewableAttachment = att;
            attachmentType = "pdf";
            break;
          }

          // Check for web snapshot (linkMode 3 = imported snapshot)
          if (linkMode === 3) {
            viewableAttachment = att;
            attachmentType = "snapshot";
            break;
          }

          // Check for EPUB
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

    // Create item content container
    const itemContent = doc.createElement("div");
    itemContent.className = "syllabus-item-content";

    // Create main content wrapper (thumbnail + text)
    const mainContent = doc.createElement("div");
    mainContent.className = "syllabus-item-main-content";

    // Add thumbnail image on the left
    const thumbnailContainer = doc.createElement("div");
    thumbnailContainer.className = "syllabus-item-thumbnail";

    // Try to get item image/thumbnail
    let imageSrc: string | null = null;

    // First try getImageSrc method if available
    if ((item as any).getImageSrc) {
      imageSrc = (item as any).getImageSrc();
    }

    // If no image, try to get from attachments
    if (!imageSrc) {
      const attachments = item.getAttachments();
      for (const attId of attachments) {
        try {
          const att = Zotero.Items.get(attId);
          if (
            att &&
            att.isAttachment() &&
            att.attachmentContentType?.startsWith("image/")
          ) {
            // Try to get attachment file path or URL
            const file = att.getFilePath();
            if (file) {
              imageSrc = `file://${file}`;
              break;
            }
          }
        } catch (e) {
          // Continue to next attachment
        }
      }
    }

    if (imageSrc) {
      const thumbnailImg = doc.createElement("img");
      thumbnailImg.className = "syllabus-item-thumbnail-img";
      thumbnailImg.src = imageSrc;
      thumbnailImg.alt = title;
      thumbnailImg.onerror = () => {
        // If image fails to load, show placeholder
        thumbnailImg.style.display = "none";
        const placeholder = doc.createElement("div");
        placeholder.className = "syllabus-item-thumbnail-placeholder";
        placeholder.textContent = "📄";
        thumbnailContainer.appendChild(placeholder);
      };
      thumbnailContainer.appendChild(thumbnailImg);
    } else {
      // Use a placeholder
      const placeholder = doc.createElement("div");
      placeholder.className = "syllabus-item-thumbnail-placeholder";
      placeholder.textContent = "📄";
      thumbnailContainer.appendChild(placeholder);
    }

    mainContent.appendChild(thumbnailContainer);

    // Create text content container
    const textContent = doc.createElement("div");
    textContent.className = "syllabus-item-text";

    // Create item title row (just title, no priority)
    const itemTitleRow = doc.createElement("div");
    itemTitleRow.className = "syllabus-item-title-row";

    // Add title text
    const itemTitle = doc.createElement("div");
    itemTitle.className = "syllabus-item-title";
    itemTitle.textContent = title;
    itemTitleRow.appendChild(itemTitle);

    textContent.appendChild(itemTitleRow);

    // Add "In..." publication name under title
    if (publicationName) {
      const publicationRow = doc.createElement("div");
      publicationRow.className = "syllabus-item-publication";
      publicationRow.textContent = `In ${publicationName}`;
      textContent.appendChild(publicationRow);
    }

    // Add item metadata row (priority, type, author, date)
    const metadataRow = doc.createElement("div");
    metadataRow.className = "syllabus-item-metadata";

    // Add priority as first item in metadata row
    if (priority && priority in SyllabusManager.PRIORITY_LABELS) {
      const priorityContainer = doc.createElement("span");
      priorityContainer.className = "syllabus-item-priority-inline";

      const priorityIcon = doc.createElement("span");
      priorityIcon.className = "syllabus-priority-icon";
      priorityIcon.style.backgroundColor =
        SyllabusManager.PRIORITY_COLORS[priority as SyllabusPriority];
      priorityContainer.appendChild(priorityIcon);

      const priorityLabel = doc.createElement("span");
      priorityLabel.className = "syllabus-priority-label";
      priorityLabel.textContent =
        SyllabusManager.PRIORITY_LABELS[priority as SyllabusPriority];
      priorityLabel.style.color =
        SyllabusManager.PRIORITY_COLORS[priority as SyllabusPriority];
      priorityContainer.appendChild(priorityLabel);

      metadataRow.appendChild(priorityContainer);
    }

    const metadataParts: string[] = [];
    if (itemTypeLabel) {
      metadataParts.push(itemTypeLabel);
    }
    if (author) {
      metadataParts.push(author);
    }
    if (date) {
      metadataParts.push(date);
    }

    if (metadataParts.length > 0) {
      const metadataText = doc.createElement("span");
      metadataText.textContent = metadataParts.join(" • ");
      metadataRow.appendChild(metadataText);
    }

    if (metadataRow.children.length > 0) {
      textContent.appendChild(metadataRow);
    }

    // Add bibliographic reference (after metadata)
    if (getPref("showBibliography")) {
      const bibliographicReference =
        await generateBibliographicReference(item);
      if (bibliographicReference) {
        const referenceRow = doc.createElement("div");
        referenceRow.className = "syllabus-item-reference";
        referenceRow.textContent = bibliographicReference;
        textContent.appendChild(referenceRow);
      }
    }

    // Add class instruction if available
    if (classInstruction) {
      const itemDesc = doc.createElement("div");
      itemDesc.className = "syllabus-item-description";
      itemDesc.textContent = classInstruction;
      textContent.appendChild(itemDesc);
    }

    mainContent.appendChild(textContent);
    itemContent.appendChild(mainContent);

    // Create right side container (buttons)
    const rightSide = doc.createElement("div");
    rightSide.className = "syllabus-item-right-side";
    // Prevent buttons area from interfering with drag
    rightSide.setAttribute("draggable", "false");

    // Add action buttons row (URL, PDF) - on the right side
    const actionsRow = doc.createElement("div");
    actionsRow.className = "syllabus-item-actions";
    actionsRow.setAttribute("draggable", "false");

    if (url) {
      const urlButton = ztoolkit.UI.createElement(doc, "button", {
        namespace: "xul",
        classList: ["toolbarbutton-1"],
        properties: {
          label: "URL",
          tooltiptext: "Open URL",
        },
        listeners: [
          {
            type: "command",
            listener: (e: Event) => {
              e.stopPropagation(); // Prevent item selection
              Zotero.launchURL(url);
            },
          },
        ],
      });
      actionsRow.appendChild(urlButton);
    }

    if (viewableAttachment && attachmentType) {
      // Determine button label based on attachment type
      let buttonLabel = "View";
      let buttonTooltip = "Open attachment";
      if (attachmentType === "pdf") {
        buttonLabel = "PDF";
        buttonTooltip = "Open PDF";
      } else if (attachmentType === "snapshot") {
        buttonLabel = "Snapshot";
        buttonTooltip = "Open web snapshot";
      } else if (attachmentType === "epub") {
        buttonLabel = "EPUB";
        buttonTooltip = "Open EPUB";
      }

      const viewButton = ztoolkit.UI.createElement(doc, "button", {
        namespace: "xul",
        classList: ["toolbarbutton-1"],
        properties: {
          label: buttonLabel,
          tooltiptext: buttonTooltip,
        },
        listeners: [
          {
            type: "command",
            listener: async (e: Event) => {
              e.stopPropagation(); // Prevent item selection
              try {
                if (attachmentType === "pdf") {
                  // Try to view PDF in Zotero reader
                  await pane.viewPDF(viewableAttachment.id, { page: 1 });
                } else if (attachmentType === "snapshot") {
                  // Open web snapshot in Zotero reader
                  await pane.viewPDF(viewableAttachment.id, { page: 1 });
                } else if (attachmentType === "epub") {
                  // Open EPUB in Zotero reader
                  await pane.viewPDF(viewableAttachment.id, { page: 1 });
                }
              } catch (err) {
                // Fallback: try to open attachment file
                try {
                  const file = viewableAttachment.getFilePath();
                  if (file) {
                    Zotero.File.pathToFile(file).reveal();
                  } else {
                    // For snapshots, try to get the URL
                    if (attachmentType === "snapshot") {
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
            },
          },
        ],
      });
      actionsRow.appendChild(viewButton);
    }

    // Append actions row to right side
    rightSide.appendChild(actionsRow);

    // Append right side to item content
    itemContent.appendChild(rightSide);
    itemElement.appendChild(itemContent);

    // Track if we're dragging to prevent click after drag
    let isDragging = false;

    // Add click handler to select item (only if not dragging)
    itemElement.addEventListener("click", (e: MouseEvent) => {
      // Don't select if we just finished dragging or if clicking on a button
      if (isDragging) {
        isDragging = false;
        return;
      }
      // Don't select if clicking on action buttons
      const target = e.target as HTMLElement;
      if (
        target.closest(".syllabus-item-actions") ||
        target.closest("button")
      ) {
        return;
      }
      pane.selectItem(item.id);
    });

    // Prevent drag from triggering click
    itemElement.addEventListener("dragstart", (e: DragEvent) => {
      e.stopPropagation();
      isDragging = true;
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", String(item.id));
      }
      itemElement.classList.add("syllabus-item-dragging");
    });

    itemElement.addEventListener("dragend", () => {
      itemElement.classList.remove("syllabus-item-dragging");
      // Reset dragging flag after a short delay to prevent click
      setTimeout(() => {
        isDragging = false;
      }, 100);
    });

    return itemElement;
  }

  static unregisterNotifier() {
    if (this.notifierID) {
      Zotero.Notifier.unregisterObserver(this.notifierID);
      this.notifierID = null;
    }
  }

  static updateClassNumberMenus() {
    // Update the class number menu for all windows when items are updated
    for (const updateHandler of this.classNumberMenuUpdateHandlers.values()) {
      try {
        updateHandler();
      } catch (e) {
        ztoolkit.log("Error updating class number menu:", e);
      }
    }
  }

  static unregisterClassNumberMenuUpdater(win: Window) {
    // Remove the update handler when a window is unloaded
    this.classNumberMenuUpdateHandlers.delete(win);
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
          const priority = SyllabusManager.getSyllabusPriority(item, selectedCollection.id);
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

        if (priority && SyllabusManager.PRIORITY_LABELS[priority as SyllabusPriority]) {
          const priorityEnum = priority as SyllabusPriority;
          // Create colored dot
          const dot = doc.createElement("span");
          dot.style.width = "8px";
          dot.style.height = "8px";
          dot.style.borderRadius = "50%";
          dot.style.backgroundColor = SyllabusManager.PRIORITY_COLORS[priorityEnum];
          dot.style.flexShrink = "0";
          container.appendChild(dot);

          // Create text label
          const label = doc.createElement("span");
          label.textContent = SyllabusManager.PRIORITY_LABELS[priorityEnum];
          container.appendChild(label);
        }

        return container;
      }
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
          return SyllabusManager.getSyllabusClassInstruction(item, selectedCollection.id);
        }

        // If not in a collection view, return empty
        return "";
      }
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
          const priority = SyllabusManager.getSyllabusPriority(item, selectedCollection.id);

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
      }
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
        const currentPriority = SyllabusManager.getSyllabusPriority(item, collectionId);
        const currentClassInstruction = SyllabusManager.getSyllabusClassInstruction(
          item,
          collectionId,
        );
        const currentclassNumber = SyllabusManager.getSyllabusClassNumber(item, collectionId);
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
            label: SyllabusManager.PRIORITY_LABELS[SyllabusPriority.COURSE_INFO],
            color: SyllabusManager.PRIORITY_COLORS[SyllabusPriority.COURSE_INFO],
          },
          {
            value: SyllabusPriority.ESSENTIAL,
            label: SyllabusManager.PRIORITY_LABELS[SyllabusPriority.ESSENTIAL],
            color: SyllabusManager.PRIORITY_COLORS[SyllabusPriority.ESSENTIAL],
          },
          {
            value: SyllabusPriority.RECOMMENDED,
            label: SyllabusManager.PRIORITY_LABELS[SyllabusPriority.RECOMMENDED],
            color: SyllabusManager.PRIORITY_COLORS[SyllabusPriority.RECOMMENDED],
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
            await SyllabusManager.setSyllabusPriority(item, collectionId, target.value as any, "item-pane");
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
            await SyllabusManager.setSyllabusClassNumber(item, collectionId, sessionNum, "item-pane");
            await item.saveTx();

            const itemPane = zoteroPane.itemPane;
            if (itemPane) {
              itemPane.render();
            }
          });
        }

        const classNumberRow = createFieldRow("Class Number", sessionInput);
        container.appendChild(classNumberRow);

        // Class title input (only shown if item has a class number)
        if (currentclassNumber) {
          const classTitleInput = ztoolkit.UI.createElement(doc, "input", {
            namespace: "html",
            id: "syllabus-class-title-input",
            attributes: {
              type: "text",
              disabled: !editable ? "true" : undefined,
              placeholder: "Add a title...",
            },
            properties: {
              value: currentClassTitle,
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
            let saveTimeout: ReturnType<typeof setTimeout> | undefined;
            classTitleInput.addEventListener("input", async () => {
              // Debounce saves
              if (saveTimeout) {
                clearTimeout(saveTimeout);
              }
              saveTimeout = setTimeout(async () => {
                await SyllabusManager.setClassTitle(
                  collectionId,
                  currentclassNumber,
                  classTitleInput.value.trim(),
                );

                const itemPane = zoteroPane.itemPane;
                if (itemPane) {
                  itemPane.render();
                }
              }, 500);
            });
          }

          const classTitleRow = createFieldRow("Class Title", classTitleInput);
          container.appendChild(classTitleRow);
        }

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

  static registerContextMenu(win: Window) {
    // Register priority menu with submenu
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
                await SyllabusManager.setSyllabusPriority(item, collectionId, "", "context-menu");
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

    // Register class number reassignment menu (dynamic)
    // Helper function to build children array dynamically
    const buildClassNumberChildren = (): any[] => {
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
        const classTitle = SyllabusManager.getClassTitle(selectedCollection.id, classNumber, true);
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
                await SyllabusManager.setSyllabusClassNumber(item, collectionId, classNumber, "context-menu");
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
              await SyllabusManager.setSyllabusClassNumber(item, collectionId, undefined, "context-menu");
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
    };

    // Register the menu with dynamic children
    const updateMenuHandler = () => {
      // Unregister and re-register to update children
      ztoolkit.Menu.unregister("syllabus-reassign-class-number-menu");
      ztoolkit.Menu.register("item", {
        tag: "menu",
        id: "syllabus-reassign-class-number-menu",
        icon: "chrome://zotero/skin/16/universal/book.svg",
        label: "Set Class Number",
        children: buildClassNumberChildren(),
      });
    };

    // Store the update handler for this window so it can be called when items are updated
    this.classNumberMenuUpdateHandlers.set(win, updateMenuHandler);

    updateMenuHandler();
  }

  /**
   * Get syllabus data from an item's extra field
   */
  static getSyllabusData(item: Zotero.Item): SyllabusData {
    const jsonStr = this.extraFieldTool.getExtraField(item, this.SYLLABUS_DATA_KEY);

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
    await this.extraFieldTool.setExtraField(item, this.SYLLABUS_DATA_KEY, jsonStr);
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
      if (!data[collectionIdStr].priority && !data[collectionIdStr].classNumber) {
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
  ): Promise<void> {
    const prefKey = `${addon.data.config.prefsPrefix}.collectionMetadata`;
    Zotero.Prefs.set(prefKey, JSON.stringify(metadata), true);
  }

  /**
   * Get collection description for a specific collection
   */
  static getCollectionDescription(
    collectionId: number | string,
  ): string {
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

    await SyllabusManager.setCollectionMetadata(metadata);
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
    const title = metadata[collectionIdStr]?.classes?.[classNumberStr]?.title || "";
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

    await SyllabusManager.setCollectionMetadata(metadata);
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

    await SyllabusManager.setCollectionMetadata(metadata);
  }
}