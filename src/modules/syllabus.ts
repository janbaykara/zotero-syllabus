/**
 * Syllabus Manager - Core functionality for syllabus view and metadata
 */

import { getLocaleID } from "../utils/locale";
import {
  getSyllabusPriority,
  getSyllabusClassInstruction,
  getSyllabusClassNumber,
  setSyllabusPriority,
  setSyllabusClassInstruction,
  setSyllabusClassNumber,
  SyllabusPriority,
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  SYLLABUS_CLASS_NUMBER_FIELD,
} from "../utils/syllabus";

let notifierID: string | null = null;
const classNumberMenuUpdateHandlers: Map<Window, () => void> = new Map();

export class SyllabusManager {
  static registerNotifier() {
    const callback = {
      notify: async (
        event: string,
        type: string,
        ids: number[] | string[],
        extraData: { [key: string]: any },
      ) => {
        ztoolkit.log("notifier->setupSyllabusView", event, type, ids, extraData);

        if (!addon?.data.alive) {
          SyllabusManager.unregisterNotifier();
          return;
        }
        addon.hooks.onNotify(event, type, ids, extraData);
      },
    };

    // Register the callback in Zotero as an item observer
    notifierID = Zotero.Notifier.registerObserver(callback, [
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

    Zotero.Plugins.addObserver({
      startup: () => {
        ztoolkit.log("startup->setupSyllabusView");
        SyllabusManager.setupSyllabusView();
      },
      shutdown: ({ id }) => {
        if (id === addon.data.config.addonID)
          SyllabusManager.unregisterNotifier();
      },
    });

    ztoolkit.log("registerNotifier->setupSyllabusView");
    SyllabusManager.setupSyllabusView();
  }

  static setupSyllabusView() {
    ztoolkit.log("Setting up syllabus view");

    // Prevent multiple setups by checking if already patched
    const zoteroPane = ztoolkit.getGlobal("ZoteroPane");
    if ((zoteroPane?.itemsView as any)?._syllabusHeadersSetup) {
      return; // Already set up
    }

    // Function to get/set syllabus view toggle state (per collection)
    function getSyllabusViewEnabled(): boolean {
      const pane = ztoolkit.getGlobal("ZoteroPane");
      const selectedCollection = pane?.getSelectedCollection();

      // If no collection is selected, default to false (tree view)
      if (!selectedCollection) {
        return false;
      }

      const collectionId = String(selectedCollection.id);
      const prefKey = `${addon.data.config.prefsPrefix}.collectionViewModes`;
      const _viewModes = String(Zotero.Prefs.get(prefKey, true) || "");
      const viewModes = _viewModes ? JSON.parse(_viewModes) as Record<string, boolean> : {};

      // Default to false (tree view) if not set for this collection
      return viewModes?.[collectionId] === true;
    }

    function setSyllabusViewEnabled(enabled: boolean): void {
      const pane = ztoolkit.getGlobal("ZoteroPane");
      const selectedCollection = pane?.getSelectedCollection();

      // If no collection is selected, don't save preference
      if (!selectedCollection) {
        return;
      }

      const collectionId = String(selectedCollection.id);
      const prefKey = `${addon.data.config.prefsPrefix}.collectionViewModes`;
      const _viewModes = String(Zotero.Prefs.get(prefKey, true) || "");
      const viewModes = _viewModes ? JSON.parse(_viewModes) as Record<string, boolean> : {};

      // Update the preference for this collection
      viewModes[collectionId] = enabled;
      Zotero.Prefs.set(prefKey, JSON.stringify(viewModes), true);
    }

    // Function to create/update the toggle button
    function createToggleButton() {
      const pane = ztoolkit.getGlobal("ZoteroPane");
      const w = Zotero.getMainWindow();
      const doc = w.document;

      // Find the items toolbar
      const itemsToolbar = doc.getElementById("zotero-items-toolbar");
      if (!itemsToolbar) return;

      // Find the search spinner to insert before it
      const searchSpinner = doc.getElementById("zotero-tb-search-spinner");

      // Function to update button label based on current state
      const updateButtonLabel = (button: XUL.Checkbox) => {
        const isEnabled = button.checked;
        // Label should reflect what will happen when clicked (opposite of current state)
        // Render button inner HTML with icon + label based on state
        const listIcon = `
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" style="vertical-align:middle;">
            <rect x="2" y="3" width="12" height="2" fill="currentColor"/>
            <rect x="2" y="7" width="12" height="2" fill="currentColor"/>
            <rect x="2" y="11" width="12" height="2" fill="currentColor"/>
          </svg>
        `;

        const bookIcon = `
          <image xmlns="http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul" width="16" height="16" src="chrome://zotero/skin/20/universal/book.svg"/>
        `

        const icon = isEnabled
          ? listIcon
          : bookIcon;

        const label = isEnabled
          ? `View as list`
          : `View as syllabus`;

        button.innerHTML = `${icon} <label xmlns="http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul" class="toolbarbutton-text" crop="end" flex="1">${label}</label>`;
        button.tooltipText = isEnabled
          ? "Switch to List View"
          : "Switch to Syllabus View";
      };

      // Check if toggle button already exists
      let toggleButton = doc.getElementById("syllabus-view-toggle") as XUL.Checkbox | null;
      let spacer = doc.getElementById("syllabus-view-spacer") as Element | null;

      if (!toggleButton) {
        // Create toggle button
        toggleButton = ztoolkit.UI.createElement(doc, "toolbarbutton", {
          id: "syllabus-view-toggle",
          classList: ["toolbarbutton-1"],
          properties: {
            type: "checkbox",
            checked: getSyllabusViewEnabled(),
          },
          listeners: [
            {
              type: "command",
              listener: (e: Event) => {
                const target = e.target as XUL.Checkbox;
                setSyllabusViewEnabled(target.checked);
                updateButtonLabel(target);
                renderCustomSyllabusView();
              },
            },
          ],
        }) as XUL.Checkbox;

        // Set initial label
        updateButtonLabel(toggleButton);

        // Create spacer element if it doesn't exist
        if (!spacer) {
          spacer = doc.createElementNS(
            "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul",
            "spacer"
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
        toggleButton.checked = getSyllabusViewEnabled();
        updateButtonLabel(toggleButton);
      }
    }

    // Helper function to create a syllabus item card
    function createSyllabusItemCard(
      doc: Document,
      item: Zotero.Item,
      collectionId: number,
      pane: any,
    ): HTMLElement {
      // Get item data
      const priority = getSyllabusPriority(item, collectionId);

      const itemElement = doc.createElement("div");
      itemElement.className = "syllabus-item";
      itemElement.setAttribute("data-item-id", String(item.id));
      itemElement.setAttribute("draggable", "true");

      // Add subtle background and border coloring based on priority
      if (priority && priority in PRIORITY_COLORS) {
        const priorityColor = PRIORITY_COLORS[priority as SyllabusPriority];
        // Convert hex to rgba for subtle background (5% opacity) and border (20% opacity)
        const r = parseInt(priorityColor.slice(1, 3), 16);
        const g = parseInt(priorityColor.slice(3, 5), 16);
        const b = parseInt(priorityColor.slice(5, 7), 16);
        itemElement.style.backgroundColor = `rgba(${r}, ${g}, ${b}, 0.05)`;
        itemElement.style.borderColor = `rgba(${r}, ${g}, ${b}, 0.2)`;
      }
      const classInstruction = getSyllabusClassInstruction(item, collectionId);
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
            author = `${creatorName.firstName || ""} ${creatorName.lastName || ""}`.trim();
          }
        }
      }

      const date = item.getField("date") || "";

      // Get publication name (for "In..." display)
      const publicationTitle = item.getField("publicationTitle") || "";
      const bookTitle = item.getField("bookTitle") || "";
      const publicationName = publicationTitle || bookTitle || "";

      // Get bibliographic reference (build citation manually)
      const citationParts: string[] = [];
      if (author) citationParts.push(author);
      if (date) {
        const year = date.substring(0, 4);
        if (year && year !== "0000") citationParts.push(`(${year})`);
      }
      if (title) citationParts.push(title);
      if (publicationName) citationParts.push(`In ${publicationName}`);

      // Add additional citation details
      const volume = item.getField("volume");
      const issue = item.getField("issue");
      const pages = item.getField("pages");
      const publisher = item.getField("publisher");
      const place = item.getField("place");

      if (volume) {
        citationParts.push(`Vol. ${volume}`);
        if (issue) citationParts.push(`No. ${issue}`);
      }
      if (pages) citationParts.push(`pp. ${pages}`);
      if (publisher) {
        const publisherInfo = place ? `${place}: ${publisher}` : publisher;
        citationParts.push(publisherInfo);
      }

      const bibliographicReference = citationParts.join(". ");

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
            if (contentType === "application/epub+zip" ||
              contentType === "application/epub" ||
              path.endsWith(".epub")) {
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
            if (att && att.isAttachment() && att.attachmentContentType?.startsWith("image/")) {
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
      if (priority && priority in PRIORITY_LABELS) {
        const priorityContainer = doc.createElement("span");
        priorityContainer.className = "syllabus-item-priority-inline";

        const priorityIcon = doc.createElement("span");
        priorityIcon.className = "syllabus-priority-icon";
        priorityIcon.style.backgroundColor = PRIORITY_COLORS[priority as SyllabusPriority];
        priorityContainer.appendChild(priorityIcon);

        const priorityLabel = doc.createElement("span");
        priorityLabel.className = "syllabus-priority-label";
        priorityLabel.textContent = PRIORITY_LABELS[priority as SyllabusPriority];
        priorityLabel.style.color = PRIORITY_COLORS[priority as SyllabusPriority];
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
      if (bibliographicReference) {
        const referenceRow = doc.createElement("div");
        referenceRow.className = "syllabus-item-reference";
        referenceRow.textContent = bibliographicReference;
        textContent.appendChild(referenceRow);
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

    // Function to render a completely custom syllabus view
    function renderCustomSyllabusView() {
      try {
        const pane = ztoolkit.getGlobal("ZoteroPane");
        const selectedCollection = pane.getSelectedCollection();
        const w = Zotero.getMainWindow();
        const doc = w.document;

        // Find the items tree container
        const itemsTreeContainer = doc.getElementById("zotero-items-pane-container");
        if (!itemsTreeContainer) {
          return;
        }

        // Check if we should show custom view
        // Show if: syllabus view is enabled AND we have a collection
        const syllabusViewEnabled = getSyllabusViewEnabled();
        const shouldShowCustomView = syllabusViewEnabled && selectedCollection;

        // Find or create custom syllabus view container
        let customView = doc.getElementById("syllabus-custom-view");
        const itemsTree = doc.getElementById("zotero-items-tree");

        if (shouldShowCustomView) {
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

          // Add collection name as title
          const titleElement = doc.createElement("h1");
          titleElement.className = "syllabus-view-title";
          titleElement.textContent = selectedCollection.name;
          customView.appendChild(titleElement);

          // Get all items from the collection
          const items = selectedCollection.getChildItems();

          // Group items by class number
          // Use null as a sentinel for "no class number" to ensure consistent grouping
          const itemsByClass: Map<number | null, Zotero.Item[]> = new Map();
          for (const item of items) {
            if (!item.isRegularItem()) continue;
            const classNumber = getSyllabusClassNumber(
              item,
              selectedCollection.id,
            );
            // Normalize undefined to null for consistent Map key handling
            const normalizedClassNumber = classNumber === undefined ? null : classNumber;
            if (!itemsByClass.has(normalizedClassNumber)) {
              itemsByClass.set(normalizedClassNumber, []);
            }
            itemsByClass.get(normalizedClassNumber)!.push(item);
          }

          // Sort class numbers (null goes FIRST, then numeric order)
          // This ensures "Syllabus Documents" (items without class number) appear at the top
          const sortedClassNumbers = Array.from(itemsByClass.keys()).sort((a, b) => {
            // null represents "no class number"
            if (a === null && b === null) return 0;
            if (a === null) return -1; // null goes first (top)
            if (b === null) return 1;
            return a - b;
          });

          // Render each class group
          for (const classNumber of sortedClassNumbers) {
            const classItems = itemsByClass.get(classNumber)!;

            // Sort items by priority: essential, recommended, optional, none
            classItems.sort((a, b) => {
              const priorityA = getSyllabusPriority(a, selectedCollection.id);
              const priorityB = getSyllabusPriority(b, selectedCollection.id);

              const getPriorityOrder = (priority: SyllabusPriority | "" | undefined): number => {
                if (priority === SyllabusPriority.ESSENTIAL) return 0;
                if (priority === SyllabusPriority.RECOMMENDED) return 1;
                if (priority === SyllabusPriority.OPTIONAL) return 2;
                return 3; // none/undefined/empty string
              };

              return getPriorityOrder(priorityA) - getPriorityOrder(priorityB);
            });

            // Create class group container
            const classGroup = doc.createElement("div");
            classGroup.className = "syllabus-class-group";

            // Add class header
            if (classNumber !== null) {
              const classHeader = doc.createElement("div");
              classHeader.className = "syllabus-class-header";
              classHeader.textContent = `Class ${classNumber}`;
              classGroup.appendChild(classHeader);
            } else {
              const classHeader = doc.createElement("div");
              classHeader.className = "syllabus-class-header";
              classHeader.textContent = "Syllabus Documents";
              classGroup.appendChild(classHeader);
            }

            // Add items in this class
            const itemsContainer = doc.createElement("div");
            itemsContainer.className = "syllabus-class-items";
            // Store class number in data attribute for drop handling
            if (classNumber !== null) {
              itemsContainer.setAttribute("data-class-number", String(classNumber));
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
                const targetClassNumberStr = itemsContainer.getAttribute("data-class-number");
                const targetClassNumber =
                  targetClassNumberStr === "" || targetClassNumberStr === null
                    ? undefined
                    : parseInt(targetClassNumberStr, 10);

                // Update the item's class number
                await setSyllabusClassNumber(
                  draggedItem,
                  selectedCollection.id,
                  targetClassNumber,
                );
                await draggedItem.saveTx();

                // Re-render the view to reflect the change
                renderCustomSyllabusView();
              } catch (err) {
                ztoolkit.log("Error handling drop:", err);
              }
            });

            for (const item of classItems) {
              const itemElement = createSyllabusItemCard(
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
        } else {
          // Hide custom view and show default tree
          if (customView) {
            (customView as HTMLElement).style.display = "none";
          }
          if (itemsTree) {
            (itemsTree as HTMLElement).style.display = "";
          }
        }
      } catch (e) {
        ztoolkit.log("Error in renderCustomSyllabusView:", e);
      }
    }

    // Create toggle button and update view after a short delay on startup
    Zotero.Promise.delay(0).then(() => {
      createToggleButton();
      renderCustomSyllabusView();
    });

    // Re-render custom view when collection or sort changes
    const pane = ztoolkit.getGlobal("ZoteroPane");
    if (pane) {
      pane.addReloadListener(() => {
        Zotero.Promise.delay(100).then(() => {
          createToggleButton();
          renderCustomSyllabusView();
        });
      });
    }
  }

  static unregisterNotifier() {
    if (notifierID) {
      Zotero.Notifier.unregisterObserver(notifierID);
      notifierID = null;
    }
  }

  static updateClassNumberMenus() {
    // Update the class number menu for all windows when items are updated
    for (const updateHandler of classNumberMenuUpdateHandlers.values()) {
      try {
        updateHandler();
      } catch (e) {
        ztoolkit.log("Error updating class number menu:", e);
      }
    }
  }

  static unregisterClassNumberMenu(win: Window) {
    // Remove the update handler when a window is unloaded
    classNumberMenuUpdateHandlers.delete(win);
  }

  static registerPrefs() {
    Zotero.PreferencePanes.register({
      pluginID: addon.data.config.addonID,
      src: rootURI + "content/preferences.xhtml",
      label: "Zotero Syllabus",
      image: `chrome://${addon.data.config.addonRef}/content/icons/favicon.png`,
    });
  }
}

export class SyllabusUIFactory {
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
    // @ts-expect-error - onEdit may not be in types but is supported by Zotero API
    await Zotero.ItemTreeManager.registerColumns({
      pluginID: addon.data.config.addonID,
      dataKey: field,
      label: "Priority",
      dataProvider: (item: Zotero.Item, dataKey: string) => {
        const zoteroPane = ztoolkit.getGlobal("ZoteroPane");
        const selectedCollection = zoteroPane.getSelectedCollection();

        if (selectedCollection) {
          const priority = getSyllabusPriority(item, selectedCollection.id);
          // Return sortable value with priority encoded: "0_essential", "1_recommended", etc.
          // This ensures proper sort order: Essential < Recommended < Optional < Blank
          // The prefix determines sort order, the suffix is the actual priority for display
          if (priority === SyllabusPriority.ESSENTIAL) return "0_essential";
          if (priority === SyllabusPriority.RECOMMENDED) return "1_recommended";
          if (priority === SyllabusPriority.OPTIONAL) return "2_optional";
          return "3_"; // empty/blank
        }

        // If not in a collection view, return empty
        return "3_";
      },
      renderCell: (index, data, column, isFirstColumn, doc) => {
        // Parse the data to extract the priority for display
        // data format: "0_essential", "1_recommended", "2_optional", or "3_"
        const parts = String(data).split("_");
        const priority = parts.length > 1 ? parts[1] : "";

        const container = doc.createElement("span");
        container.className = `cell ${column.className}`;
        container.style.display = "flex";
        container.style.alignItems = "center";
        container.style.gap = "6px";

        if (priority && PRIORITY_LABELS[priority as SyllabusPriority]) {
          const priorityEnum = priority as SyllabusPriority;
          // Create colored dot
          const dot = doc.createElement("span");
          dot.style.width = "8px";
          dot.style.height = "8px";
          dot.style.borderRadius = "50%";
          dot.style.backgroundColor = PRIORITY_COLORS[priorityEnum];
          dot.style.flexShrink = "0";
          container.appendChild(dot);

          // Create text label
          const label = doc.createElement("span");
          label.textContent = PRIORITY_LABELS[priorityEnum];
          container.appendChild(label);
        }

        return container;
      },
      onEdit: async (item: Zotero.Item, dataKey: string, newValue: string) => {
        const zoteroPane = ztoolkit.getGlobal("ZoteroPane");
        const selectedCollection = zoteroPane.getSelectedCollection();

        if (!selectedCollection) {
          ztoolkit.log("No collection selected, cannot update priority");
          return;
        }

        // Validate the priority value
        if (
          newValue &&
          ![SyllabusPriority.ESSENTIAL, SyllabusPriority.RECOMMENDED, SyllabusPriority.OPTIONAL].includes(newValue as SyllabusPriority)
        ) {
          ztoolkit.log(`Invalid priority value: ${newValue}`);
          return;
        }

        await setSyllabusPriority(
          item,
          selectedCollection.id,
          newValue as SyllabusPriority | "",
        );
        await item.saveTx();

        // Refresh the item tree to show the updated value
        const itemPane = zoteroPane.itemPane;
        if (itemPane) {
          itemPane.render()
        }
      },
    });
  }

  static async registerSyllabusClassInstructionColumn() {
    const field = "syllabus-class-instruction";
    // @ts-expect-error - onEdit may not be in types but is supported by Zotero API
    await Zotero.ItemTreeManager.registerColumns({
      pluginID: addon.data.config.addonID,
      dataKey: field,
      label: "Instructions",
      dataProvider: (item: Zotero.Item, dataKey: string) => {
        const zoteroPane = ztoolkit.getGlobal("ZoteroPane");
        const selectedCollection = zoteroPane.getSelectedCollection();

        if (selectedCollection) {
          return getSyllabusClassInstruction(item, selectedCollection.id);
        }

        // If not in a collection view, return empty
        return "";
      },
      onEdit: async (item: Zotero.Item, dataKey: string, newValue: string) => {
        const zoteroPane = ztoolkit.getGlobal("ZoteroPane");
        const selectedCollection = zoteroPane.getSelectedCollection();

        if (!selectedCollection) {
          ztoolkit.log("No collection selected, cannot update class instruction");
          return;
        }

        await setSyllabusClassInstruction(item, selectedCollection.id, newValue);
        await item.saveTx();

        // Refresh the item tree to show the updated value

        const itemPane = zoteroPane.itemPane;
        if (itemPane) {
          itemPane.render()
        }
      },
    });
  }

  static async registerSyllabusClassNumberColumn() {
    const field = SYLLABUS_CLASS_NUMBER_FIELD;
    // @ts-expect-error - onEdit may not be in types but is supported by Zotero API
    await Zotero.ItemTreeManager.registerColumns({
      pluginID: addon.data.config.addonID,
      dataKey: field,
      label: "Class No.",
      dataProvider: (item: Zotero.Item, dataKey: string) => {
        const zoteroPane = ztoolkit.getGlobal("ZoteroPane");
        const selectedCollection = zoteroPane.getSelectedCollection();

        if (selectedCollection) {
          const classNumber = getSyllabusClassNumber(
            item,
            selectedCollection.id,
          );
          const priority = getSyllabusPriority(item, selectedCollection.id);

          // Get priority sort order: 0=essential, 1=recommended, 2=optional, 3=blank
          let priorityOrder = "3"; // default to blank
          if (priority === SyllabusPriority.ESSENTIAL) priorityOrder = "0";
          else if (priority === SyllabusPriority.RECOMMENDED) priorityOrder = "1";
          else if (priority === SyllabusPriority.OPTIONAL) priorityOrder = "2";

          // Return composite sortable value: "classNumber_priorityOrder"
          // Pad class number to 5 digits for proper numeric sorting (supports up to 99999)
          // Items without class number get "99999" to sort last
          const paddedClassNumber =
            classNumber !== undefined
              ? String(classNumber).padStart(5, "0")
              : "99999";
          return `${paddedClassNumber}_${priorityOrder}`;
        }

        // If not in a collection view, return empty
        return "99999_3";
      },
      renderCell: (index, data, column, isFirstColumn, doc) => {
        // Parse the composite value to extract just the class number for display
        // data format: "00001_0" or "99999_3"
        const parts = String(data).split("_");
        const classNumberStr = parts[0];

        // If it's the "no class number" placeholder, display empty
        if (classNumberStr === "99999") {
          const span = doc.createElement("span");
          span.className = `cell ${column.className}`;
          span.textContent = "";
          return span;
        }

        // Remove leading zeros and display the class number
        const classNumber = parseInt(classNumberStr, 10);
        const span = doc.createElement("span");
        span.className = `cell ${column.className}`;
        span.textContent = String(classNumber);
        return span;
      },
      onEdit: async (item: Zotero.Item, dataKey: string, newValue: string) => {
        const zoteroPane = ztoolkit.getGlobal("ZoteroPane");
        const selectedCollection = zoteroPane.getSelectedCollection();

        if (!selectedCollection) {
          ztoolkit.log("No collection selected, cannot update session number");
          return;
        }

        // Parse and validate the session number
        const trimmedValue = newValue.trim();
        if (trimmedValue === "") {
          await setSyllabusClassNumber(item, selectedCollection.id, undefined);
        } else {
          const sessionNum = parseInt(trimmedValue, 10);
          if (isNaN(sessionNum) || sessionNum < 1) {
            ztoolkit.log(`Invalid session number: ${trimmedValue}`);
            return;
          }
          await setSyllabusClassNumber(item, selectedCollection.id, sessionNum);
        }

        await item.saveTx();

        // Refresh the item tree to show the updated value

        const itemPane = zoteroPane.itemPane;
        if (itemPane) {
          itemPane.render()
        }
      },
    });
  }

  static registerSyllabusItemPaneSection() {
    Zotero.ItemPaneManager.registerSection({
      paneID: "syllabus",
      pluginID: addon.data.config.addonID,
      header: {
        l10nID: getLocaleID("item-section-syllabus-head-text"),
        icon: "chrome://zotero/skin/16/universal/book.svg",
      },
      sidenav: {
        l10nID: getLocaleID("item-section-syllabus-sidenav-tooltip"),
        icon: "chrome://zotero/skin/20/universal/book.svg",
      },
      onItemChange: ({ item, setEnabled, tabType }) => {
        // Only enable in library view (not reader)
        const enabled = tabType === "library" && item?.isRegularItem();
        setEnabled(enabled);
        return true;
      },
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
        const currentPriority = getSyllabusPriority(item, collectionId);
        const currentClassInstruction = getSyllabusClassInstruction(item, collectionId);
        const currentclassNumber = getSyllabusClassNumber(
          item,
          collectionId,
        );

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
            value: SyllabusPriority.ESSENTIAL,
            label: PRIORITY_LABELS[SyllabusPriority.ESSENTIAL],
            color: PRIORITY_COLORS[SyllabusPriority.ESSENTIAL],
          },
          {
            value: SyllabusPriority.RECOMMENDED,
            label: PRIORITY_LABELS[SyllabusPriority.RECOMMENDED],
            color: PRIORITY_COLORS[SyllabusPriority.RECOMMENDED],
          },
          {
            value: SyllabusPriority.OPTIONAL,
            label: PRIORITY_LABELS[SyllabusPriority.OPTIONAL],
            color: PRIORITY_COLORS[SyllabusPriority.OPTIONAL],
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
            await setSyllabusPriority(item, collectionId, target.value as any);
            await item.saveTx();

            const itemPane = zoteroPane.itemPane;
            if (itemPane) {
              itemPane.render()
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
            margin: "0"
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
            await setSyllabusClassNumber(item, collectionId, sessionNum);
            await item.saveTx();

            const itemPane = zoteroPane.itemPane;
            if (itemPane) {
              itemPane.render()
            }
          });
        }

        const classNumberRow = createFieldRow("Class Number", sessionInput);
        container.appendChild(classNumberRow);

        // Class instruction textarea
        const classInstructionTextarea = ztoolkit.UI.createElement(doc, "textarea", {
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
        }) as HTMLTextAreaElement;

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
              await setSyllabusClassInstruction(item, collectionId, classInstructionTextarea.value);
              await item.saveTx();

              const itemPane = zoteroPane.itemPane;
              if (itemPane) {
                itemPane.render()
              }
            }, 500);
          });
        }

        const classInstructionRow = createFieldRow("Instructions", classInstructionTextarea);
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
          label: PRIORITY_LABELS[SyllabusPriority.ESSENTIAL],
          commandListener: async () => {
            const zoteroPane = ztoolkit.getGlobal("ZoteroPane");
            const selectedCollection = zoteroPane.getSelectedCollection();
            if (!selectedCollection) return;
            const items = zoteroPane.getSelectedItems();
            const collectionId = selectedCollection.id;
            for (const item of items) {
              if (item.isRegularItem()) {
                await setSyllabusPriority(item, collectionId, SyllabusPriority.ESSENTIAL);
                await item.saveTx();
              }
            }

            const itemPane = zoteroPane.itemPane;
            if (itemPane) {
              itemPane.render()
            }
          },
        },
        {
          tag: "menuitem",
          label: PRIORITY_LABELS[SyllabusPriority.RECOMMENDED],
          commandListener: async () => {
            const zoteroPane = ztoolkit.getGlobal("ZoteroPane");
            const selectedCollection = zoteroPane.getSelectedCollection();
            if (!selectedCollection) return;
            const items = zoteroPane.getSelectedItems();
            const collectionId = selectedCollection.id;
            for (const item of items) {
              if (item.isRegularItem()) {
                await setSyllabusPriority(item, collectionId, SyllabusPriority.RECOMMENDED);
                await item.saveTx();
              }
            }

            const itemPane = zoteroPane.itemPane;
            if (itemPane) {
              itemPane.render()
            }
          },
        },
        {
          tag: "menuitem",
          label: PRIORITY_LABELS[SyllabusPriority.OPTIONAL],
          commandListener: async () => {
            const zoteroPane = ztoolkit.getGlobal("ZoteroPane");
            const selectedCollection = zoteroPane.getSelectedCollection();
            if (!selectedCollection) return;
            const items = zoteroPane.getSelectedItems();
            const collectionId = selectedCollection.id;
            for (const item of items) {
              if (item.isRegularItem()) {
                await setSyllabusPriority(item, collectionId, SyllabusPriority.OPTIONAL);
                await item.saveTx();
              }
            }

            const itemPane = zoteroPane.itemPane;
            if (itemPane) {
              itemPane.render()
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
                await setSyllabusPriority(item, collectionId, "");
                await item.saveTx();
              }
            }

            const itemPane = zoteroPane.itemPane;
            if (itemPane) {
              itemPane.render()
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
          const classNumber = getSyllabusClassNumber(item, selectedCollection.id);
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
        children.push({
          tag: "menuitem",
          label: `Class ${classNumber}`,
          commandListener: async () => {
            const zoteroPane = ztoolkit.getGlobal("ZoteroPane");
            const selectedCollection = zoteroPane.getSelectedCollection();
            if (!selectedCollection) return;
            const items = zoteroPane.getSelectedItems();
            const collectionId = selectedCollection.id;
            for (const item of items) {
              if (item.isRegularItem()) {
                await setSyllabusClassNumber(item, collectionId, classNumber);
                await item.saveTx();
              }
            }

            const itemPane = zoteroPane.itemPane;
            if (itemPane) {
              itemPane.render()
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
              await setSyllabusClassNumber(item, collectionId, undefined);
              await item.saveTx();
            }
          }

          const itemPane = zoteroPane.itemPane;
          if (itemPane) {
            itemPane.render()
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
    classNumberMenuUpdateHandlers.set(win, updateMenuHandler);

    updateMenuHandler();
  }
}

