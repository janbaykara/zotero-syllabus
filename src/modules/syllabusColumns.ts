import { getSelectedCollection } from "../utils/zotero";
import { getPref } from "../utils/prefs";
import { getReadingTimeSync, formatReadingTime } from "../utils/readingTime";
import { getString } from "../utils/locale";
import { SyllabusManager } from "./syllabus";

export async function registerSyllabusClassInstructionColumn() {
  const field = "syllabus-class-instruction";
  await Zotero.ItemTreeManager.registerColumns({
    pluginID: addon.data.config.addonID,
    dataKey: field,
    label: getString("column-reading-instructions"),
    dataProvider: (item: Zotero.Item, dataKey: string) => {
      const selectedCollection = getSelectedCollection();

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

export async function registerSyllabusStatusColumn() {
  const field = "syllabus-status";
  await Zotero.ItemTreeManager.registerColumns({
    pluginID: addon.data.config.addonID,
    dataKey: field,
    label: getString("column-status"),
    // iconLabel: "chrome://zotero/skin/16/universal/checkmark.svg",
    iconPath: "chrome://zotero/skin/16/universal/tick.svg",
    width: "100px",
    fixedWidth: true,
    dataProvider: (item: Zotero.Item, dataKey: string) => {
      const selectedCollection = getSelectedCollection();

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

export async function registerReadingTimeColumn() {
  const field = "reading-time";
  await Zotero.ItemTreeManager.registerColumns({
    pluginID: addon.data.config.addonID,
    dataKey: field,
    label: getString("column-reading-time"),
    // width: "100px",
    // fixedWidth: true,
    dataProvider: (item: Zotero.Item, dataKey: string) => {
      const readingTime = getReadingTimeSync(item, { roundUp: true });
      if (readingTime === null) {
        return "";
      }
      // Return minutes as number for sorting, we'll format in renderCell
      return readingTime.toString();
    },
    renderCell: (index, data, column, isFirstColumn, doc) => {
      const container = doc.createElement("span");
      container.className = `cell ${column.className}`;
      container.style.display = "flex";
      container.style.alignItems = "center";
      container.style.justifyContent = "flex-start";

      const dataStr = String(data);
      if (dataStr && dataStr !== "") {
        const minutes = parseInt(dataStr, 10);
        if (!isNaN(minutes) && minutes > 0) {
          const formatted = formatReadingTime(minutes);
          container.textContent = formatted;
          container.style.color = "var(--fill-secondary)";
          container.style.fontSize = "0.9em";
        }
      }

      return container;
    },
  });
}

export async function registerSyllabusInfoColumn() {
  const field = "syllabus-info";
  // Track previous class number and collection to detect first item in each class group
  // These persist across renderCell calls within the same column registration
  let previousClassNumber: string | null = null;
  let previousCollectionId: string | null = null;
  let previousSortKey: string | null = null;

  await Zotero.ItemTreeManager.registerColumns({
    pluginID: addon.data.config.addonID,
    dataKey: field,
    label: getString("column-syllabus-info"),
    dataProvider: (item: Zotero.Item, dataKey: string) => {
      const selectedCollection = getSelectedCollection();

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
          classNumberSpan.textContent = getString("column-class-hash", {
            args: { number: classNumber },
          });
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
          classNumberSpan.textContent = getString("column-class-hash", {
            args: { number: classNumber },
          });
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
                  SyllabusManager.getFullClassNumberRange(collectionIdNum);
                if (fullRange.length > 0) {
                  maxRange = Math.max(...fullRange);
                }
              } else if (collectionIdForRange.includes(":")) {
                // New libraryID:key format - parse it
                const [libraryIDStr, key] = collectionIdForRange.split(":");
                const libraryID = parseInt(libraryIDStr, 10);
                if (!isNaN(libraryID) && key) {
                  const fullRange = SyllabusManager.getFullClassNumberRange([
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
