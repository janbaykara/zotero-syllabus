import {
  DISPLAY_NOTE_ASSIGNMENT_PREFIX,
  isDisplayOnlyAssignmentId,
} from "./classGroups";
import { parseSyllabusDndGroup } from "./syllabusDnd";

export type SyllabusDragPayload = {
  itemIdStr: string;
  multipleAssignmentIdsStr: string;
  sourceAssignmentIdRaw: string;
  fromFurtherReading: boolean;
  fromUnnumbered: boolean;
  sourceClassNumberStr: string;
};

export function syllabusPayloadFromDataTransfer(
  dataTransfer: DataTransfer | null | undefined,
): SyllabusDragPayload | null {
  if (!dataTransfer) {
    return null;
  }
  const itemIdStr = dataTransfer.getData("text/plain");
  if (!itemIdStr) {
    return null;
  }
  return {
    itemIdStr,
    multipleAssignmentIdsStr: dataTransfer.getData(
      "application/x-syllabus-assignment-ids",
    ),
    sourceAssignmentIdRaw: dataTransfer.getData(
      "application/x-syllabus-assignment-id",
    ),
    fromFurtherReading:
      dataTransfer.getData("application/x-syllabus-source-further-reading") ===
      "1",
    fromUnnumbered:
      dataTransfer.getData("application/x-syllabus-source-unnumbered") === "1",
    sourceClassNumberStr: dataTransfer.getData(
      "application/x-syllabus-source-class",
    ),
  };
}

export function buildSyllabusDragPayload(
  movingIdentifiers: string[],
  sourceGroup: string,
  syllabusItems: Array<{
    zoteroItem: Zotero.Item;
    assignments: Array<{ id?: string }>;
  }>,
): SyllabusDragPayload | null {
  if (movingIdentifiers.length === 0) {
    return null;
  }

  const sourceMeta = parseSyllabusDndGroup(sourceGroup);
  const assignmentIds: string[] = [];
  const itemIds: number[] = [];

  for (const identifier of movingIdentifiers) {
    if (identifier.startsWith("assignment:")) {
      const assignmentId = identifier.slice("assignment:".length);
      // Keep display-only note ids (note:…) — unnumberedOrder uses them.
      assignmentIds.push(assignmentId);
      if (isDisplayOnlyAssignmentId(assignmentId)) {
        const noteKey = assignmentId.slice(
          DISPLAY_NOTE_ASSIGNMENT_PREFIX.length,
        );
        const row = syllabusItems.find((e) => e.zoteroItem.key === noteKey);
        if (row) {
          itemIds.push(row.zoteroItem.id);
        }
        continue;
      }
      for (const row of syllabusItems) {
        if (row.assignments.some((a) => a.id === assignmentId)) {
          itemIds.push(row.zoteroItem.id);
          break;
        }
      }
    } else if (identifier.startsWith("item:")) {
      const id = parseInt(identifier.slice("item:".length), 10);
      if (Number.isFinite(id)) {
        itemIds.push(id);
      }
    }
  }

  const uniqueItemIds = [...new Set(itemIds)];
  if (uniqueItemIds.length === 0) {
    return null;
  }

  const uniqueAssignmentIds = assignmentIds.filter(
    (id, index) => assignmentIds.indexOf(id) === index,
  );

  return {
    itemIdStr: uniqueItemIds.map(String).join(","),
    multipleAssignmentIdsStr:
      uniqueAssignmentIds.length > 1 ? uniqueAssignmentIds.join(",") : "",
    sourceAssignmentIdRaw:
      movingIdentifiers.length === 1 && uniqueAssignmentIds.length === 1
        ? uniqueAssignmentIds[0]
        : "",
    fromFurtherReading: sourceMeta.zone === "further-reading",
    fromUnnumbered: sourceMeta.unnumbered,
    sourceClassNumberStr:
      sourceMeta.classNumber != null ? String(sourceMeta.classNumber) : "",
  };
}

export function filteredSourceAssignmentId(raw: string): string {
  return isDisplayOnlyAssignmentId(raw) ? "" : raw;
}
