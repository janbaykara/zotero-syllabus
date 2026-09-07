import { useMemo } from "preact/hooks";
import {
  ItemSyllabusAssignment,
  SettingsSyllabusMetadata,
  SyllabusManager,
  classByNumber,
} from "./syllabus";
import { sortItemsByTitle } from "../utils/items";

export type SyllabusClassGroup = {
  classNumber: number | null;
  syllabusMetadata: ReturnType<typeof classByNumber>;
  itemAssignments: Array<{
    item: Zotero.Item;
    assignment: ItemSyllabusAssignment;
  }>;
};

/** Collection member with optional classless assignment (e.g. done status). */
export type FurtherReadingEntry = {
  item: Zotero.Item;
  assignment?: ItemSyllabusAssignment;
};

/** No class, priority, or instruction — may still carry reading `status`. */
export function isClasslessAssignment(
  assignment: ItemSyllabusAssignment,
  collectionId: number,
): boolean {
  const resolvedClassNumber =
    SyllabusManager.getClassNumber(collectionId, assignment.classId) ??
    assignment.classNumber;
  return (
    !assignment.priority &&
    !assignment.classInstruction &&
    resolvedClassNumber === undefined
  );
}

export function pickFurtherReadingAssignment(
  assignments: ItemSyllabusAssignment[],
  collectionId: number,
): ItemSyllabusAssignment | undefined {
  const classless = assignments.filter((a) =>
    isClasslessAssignment(a, collectionId),
  );
  return classless.find((a) => a.status === "done") || classless[0];
}

function sortFurtherReadingEntries(
  entries: FurtherReadingEntry[],
): FurtherReadingEntry[] {
  const byId = new Map(entries.map((entry) => [entry.item.id, entry]));
  return sortItemsByTitle(entries.map((entry) => entry.item))
    .map((item) => byId.get(item.id))
    .filter((entry): entry is FurtherReadingEntry => entry != null);
}

/** No assigned readings and no class description. */
export function isEmptyClassGroup(group: SyllabusClassGroup): boolean {
  const description = (group.syllabusMetadata?.description || "").trim();
  return group.itemAssignments.length === 0 && !description;
}

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
    const furtherReading: FurtherReadingEntry[] = [];
    // Track items with their specific assignments to support multiple assignments per class
    const itemsByClass: Map<
      number | null,
      Array<{ item: Zotero.Item; assignment: ItemSyllabusAssignment }>
    > = new Map();

    for (const __item of syllabusItems) {
      const item = __item.zoteroItem;
      if (!item.isRegularItem()) continue;
      const assignments = __item.assignments;

      // If no assignments or all assignments are classless, add to further reading
      if (
        assignments.length === 0 ||
        assignments.every((a) => isClasslessAssignment(a, collectionId))
      ) {
        furtherReading.push({
          item,
          assignment: pickFurtherReadingAssignment(assignments, collectionId),
        });
        continue;
      }

      // Add item with each assignment to each class it's assigned to (supporting repeat inclusions)
      for (const assignment of assignments) {
        // Skip classless assignments (status-only rows stay off class lists)
        if (isClasslessAssignment(assignment, collectionId)) {
          continue;
        }

        const resolvedClassNumber =
          SyllabusManager.getClassNumber(collectionId, assignment.classId) ??
          assignment.classNumber;
        const normalizedClassNumber =
          resolvedClassNumber === undefined ? null : resolvedClassNumber;
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

    return {
      classGroups: sortedFinalClassNumbers.map(
        (classNumber): SyllabusClassGroup => ({
          classNumber,
          syllabusMetadata: classByNumber(syllabusMetadata, classNumber),
          itemAssignments: itemsByClass.get(classNumber) || [],
        }),
      ),
      furtherReadingItems: sortFurtherReadingEntries(furtherReading),
    };
  }, [syllabusItems, collectionId, syllabusMetadata, itemOrderVersion]);
}
