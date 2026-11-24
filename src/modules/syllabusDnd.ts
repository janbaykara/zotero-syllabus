import {
  DISPLAY_NOTE_ASSIGNMENT_PREFIX,
  isDisplayOnlyAssignmentId,
} from "./classGroups";
import { partitionClassAssignmentsBySection } from "./classSections";
import type { SettingsClassMetadata } from "../utils/schemas";

/** Shared DnD type id for syllabus item cards (classes, unnumbered, further reading). */
export const SYLLABUS_DND_ITEM_TYPE = "syllabus-item";

export type SyllabusDndZone = "further-reading";

/** Sortable / droppable list id for a class, class section, or further reading. */
export function syllabusDndGroup(
  classNumber: number | null | undefined,
  zone?: SyllabusDndZone,
  sectionId?: string,
): string {
  if (zone === "further-reading") {
    return "further-reading";
  }
  if (classNumber == null) {
    return "unnumbered";
  }
  if (sectionId) {
    return `class:${classNumber}:section:${sectionId}`;
  }
  return `class:${classNumber}`;
}

export function syllabusDndZoneId(group: string): string {
  return `zone:${group}`;
}

export function parseSyllabusDndGroup(group: string): {
  classNumber: number | null;
  zone?: SyllabusDndZone;
  sectionId?: string;
  unnumbered: boolean;
} {
  if (group === "further-reading") {
    return { classNumber: null, zone: "further-reading", unnumbered: false };
  }
  if (group === "unnumbered") {
    return { classNumber: null, unnumbered: true };
  }
  const sectionMatch = /^class:(\d+):section:(.+)$/.exec(group);
  if (sectionMatch) {
    const n = parseInt(sectionMatch[1], 10);
    return {
      classNumber: Number.isFinite(n) ? n : null,
      sectionId: sectionMatch[2],
      unnumbered: false,
    };
  }
  // `class:N:root` — empty class-root dropzone nested beside sections.
  const rootMatch = /^class:(\d+)(?::root)?$/.exec(group);
  if (rootMatch) {
    const n = parseInt(rootMatch[1], 10);
    return {
      classNumber: Number.isFinite(n) ? n : null,
      unnumbered: false,
    };
  }
  if (group.startsWith("class:")) {
    const n = parseInt(group.slice("class:".length), 10);
    return {
      classNumber: Number.isFinite(n) ? n : null,
      unnumbered: false,
    };
  }
  return { classNumber: null, unnumbered: false };
}

/** Bare assignment id (incl. `note:…`) from a sortable id, or undefined. */
export function assignmentIdFromSyllabusIdentifier(
  identifier: string,
): string | undefined {
  if (!identifier.startsWith("assignment:")) {
    return undefined;
  }
  const id = identifier.slice("assignment:".length);
  return id || undefined;
}

export function itemIdFromSyllabusIdentifier(
  identifier: string,
  syllabusItems: Array<{
    zoteroItem: Zotero.Item;
    assignments: Array<{ id?: string }>;
  }>,
): number | undefined {
  if (identifier.startsWith("item:")) {
    const id = parseInt(identifier.slice("item:".length), 10);
    return Number.isFinite(id) ? id : undefined;
  }
  if (identifier.startsWith("assignment:")) {
    const assignmentId = identifier.slice("assignment:".length);
    if (isDisplayOnlyAssignmentId(assignmentId)) {
      const noteKey = assignmentId.slice(DISPLAY_NOTE_ASSIGNMENT_PREFIX.length);
      const row = syllabusItems.find((e) => e.zoteroItem.key === noteKey);
      return row?.zoteroItem.id;
    }
    for (const row of syllabusItems) {
      if (row.assignments.some((a) => a.id === assignmentId)) {
        return row.zoteroItem.id;
      }
    }
  }
  return undefined;
}

function assignmentIdentifiers(
  rows: Array<{ assignment: { id?: string } }>,
): string[] {
  return rows
    .map(({ assignment }) =>
      assignment.id ? `assignment:${assignment.id}` : null,
    )
    .filter((id): id is string => Boolean(id));
}

/**
 * Chrome DnD container map. Numbered classes use the same root/section
 * partition as the syllabus UI so sortable order matches on-screen layout.
 */
export function buildSyllabusIdentifierContainers(
  classGroups: Array<{
    classNumber: number | null;
    syllabusMetadata?: SettingsClassMetadata | null;
    itemAssignments: Array<{
      assignment: { id?: string; sectionId?: string };
    }>;
  }>,
  furtherReadingItems: Array<{
    item: Zotero.Item;
    assignment?: { id?: string } | null;
  }>,
): Record<string, string[]> {
  const containers: Record<string, string[]> = {};
  for (const group of classGroups) {
    if (group.classNumber == null) {
      containers[syllabusDndGroup(null)] = assignmentIdentifiers(
        group.itemAssignments,
      );
      continue;
    }
    const { root, sections } = partitionClassAssignmentsBySection(
      group.itemAssignments,
      group.syllabusMetadata,
    );
    containers[syllabusDndGroup(group.classNumber)] =
      assignmentIdentifiers(root);
    for (const section of sections) {
      containers[
        syllabusDndGroup(group.classNumber, undefined, section.sectionId)
      ] = assignmentIdentifiers(section.rows);
    }
  }
  containers["further-reading"] = furtherReadingItems.map(
    ({ item, assignment }) =>
      assignment?.id ? `assignment:${assignment.id}` : `item:${item.id}`,
  );
  return containers;
}
