import { useMemo } from "preact/hooks";
import {
  ItemSyllabusAssignment,
  SettingsSyllabusMetadata,
  SyllabusManager,
} from "./syllabus";

export function useSyllabusClassGroups(
  collectionId: number,
  syllabusItems: {
    zoteroItem: Zotero.Item;
    assignments: ItemSyllabusAssignment[];
  }[],
  syllabusMetadata: SettingsSyllabusMetadata,
  itemOrderVersion: number,
) {
  return useMemo(() => {
    const furtherReading: Zotero.Item[] = [];
    // Track items with their specific assignments to support multiple assignments per class
    const itemsByClass: Map<
      number | null,
      Array<{ item: Zotero.Item; assignment: ItemSyllabusAssignment }>
    > = new Map();

    for (const __item of syllabusItems) {
      const item = __item.zoteroItem;
      if (!item.isRegularItem()) continue;
      const assignments = __item.assignments;

      // If no assignments or all assignments are empty, add to further reading
      if (
        assignments.length === 0 ||
        assignments.every(
          (a) =>
            !a.priority && !a.classInstruction && a.classNumber === undefined,
        )
      ) {
        furtherReading.push(item);
        continue;
      }

      // Add item with each assignment to each class it's assigned to (supporting repeat inclusions)
      for (const assignment of assignments) {
        // Skip empty assignments
        if (
          !assignment.priority &&
          !assignment.classInstruction &&
          assignment.classNumber === undefined
        ) {
          continue;
        }

        const normalizedClassNumber =
          assignment.classNumber === undefined ? null : assignment.classNumber;
        if (!itemsByClass.has(normalizedClassNumber)) {
          itemsByClass.set(normalizedClassNumber, []);
        }
        itemsByClass.get(normalizedClassNumber)!.push({ item, assignment });
      }
    }

    // Get full range of class numbers (same logic as contextual menu)
    const fullRangeClassNumbers =
      SyllabusManager.getFullClassNumberRange(collectionId);

    // Add classes that have items but are outside the range (for null classNumber)
    const sortedClassNumbers = Array.from(itemsByClass.keys()).sort((a, b) => {
      if (a === null && b === null) return 0;
      if (a === null) return -1;
      if (b === null) return 1;
      return a - b;
    });

    // Merge: use fullRangeClassNumbers as base, but ensure we include any classes with items (including null)
    const finalClassNumbers = new Set<number | null>();
    for (const num of fullRangeClassNumbers) {
      finalClassNumbers.add(num);
    }
    for (const num of sortedClassNumbers) {
      finalClassNumbers.add(num);
    }

    const sortedFinalClassNumbers = Array.from(finalClassNumbers).sort(
      (a, b) => {
        if (a === null && b === null) return 0;
        if (a === null) return -1;
        if (b === null) return 1;
        return a - b;
      },
    );

    // Sort items within each class by manual order or natural order
    for (const classNumber of sortedFinalClassNumbers) {
      const classItemAssignments = itemsByClass.get(classNumber) || [];
      // Use the core sorting function which respects manual order
      const sortedItems = SyllabusManager.sortClassItems(
        classItemAssignments,
        collectionId,
        classNumber,
      );
      itemsByClass.set(classNumber, sortedItems);
    }

    // Sort further reading by title
    furtherReading.sort((a, b) => {
      const titleA = a.getField("title") || "";
      const titleB = b.getField("title") || "";
      return titleA.localeCompare(titleB);
    });

    return {
      classGroups: sortedFinalClassNumbers.map((classNumber) => ({
        classNumber,
        syllabusMetadata: classNumber
          ? syllabusMetadata.classes?.[classNumber]
          : null,
        itemAssignments: itemsByClass.get(classNumber) || [],
      })),
      furtherReadingItems: furtherReading,
    };
  }, [syllabusItems, collectionId, syllabusMetadata, itemOrderVersion]);
}
