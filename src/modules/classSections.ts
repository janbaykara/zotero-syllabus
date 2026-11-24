/**
 * One-level class sections: layout partition + assignment placement helpers.
 * Storage writes stay on SyllabusManager; this module is pure document math.
 */

import {
  orderedSectionIds,
  mergeNumberKeyedClasses,
  type ClassSectionMetadata,
  type CollectionSyllabusDocument,
  type SettingsClassMetadata,
} from "../utils/schemas";

export type ClassAssignmentRowLike = {
  assignment: { id?: string; sectionId?: string };
};

export type ClassSectionPartition<T extends ClassAssignmentRowLike> = {
  sectionId: string;
  meta: ClassSectionMetadata;
  rows: T[];
};

/**
 * Split class assignment rows into root + ordered sections.
 * Prefer section `itemOrder`, then matching `assignment.sectionId`;
 * unknown / orphan sectionIds fall back to root.
 */
export function partitionClassAssignmentsBySection<
  T extends ClassAssignmentRowLike,
>(
  rows: T[],
  classMeta: SettingsClassMetadata | null | undefined,
): { root: T[]; sections: ClassSectionPartition<T>[] } {
  const byId = new Map<string, T>();
  for (const row of rows) {
    if (row.assignment.id) {
      byId.set(row.assignment.id, row);
    }
  }
  const claimed = new Set<string>();
  const sections: ClassSectionPartition<T>[] = [];

  for (const sectionId of orderedSectionIds(classMeta)) {
    const meta = classMeta?.sections?.[sectionId];
    if (!meta) {
      continue;
    }
    const sectionRows: T[] = [];
    for (const assignmentId of meta.itemOrder || []) {
      const row = byId.get(assignmentId);
      if (!row || claimed.has(assignmentId)) {
        continue;
      }
      sectionRows.push(row);
      claimed.add(assignmentId);
    }
    for (const row of rows) {
      const id = row.assignment.id;
      if (!id || claimed.has(id) || row.assignment.sectionId !== sectionId) {
        continue;
      }
      sectionRows.push(row);
      claimed.add(id);
    }
    sections.push({ sectionId, meta, rows: sectionRows });
  }

  const knownSections = classMeta?.sections;
  const root: T[] = [];
  for (const assignmentId of classMeta?.itemOrder || []) {
    const row = byId.get(assignmentId);
    if (!row || claimed.has(assignmentId)) {
      continue;
    }
    const sid = row.assignment.sectionId;
    if (sid && knownSections?.[sid]) {
      continue;
    }
    root.push(row);
    claimed.add(assignmentId);
  }
  for (const row of rows) {
    const id = row.assignment.id;
    if (!id || claimed.has(id)) {
      continue;
    }
    root.push(row);
    claimed.add(id);
  }
  return { root, sections };
}

/** Insert assignment ids into an order list (append when no anchor). */
export function insertAssignmentIds(
  order: string[],
  ids: string[],
  options: {
    targetAssignmentId?: string;
    insertBefore?: boolean;
  } = {},
): string[] {
  const moving = ids.filter(Boolean);
  if (moving.length === 0) {
    return [...order];
  }
  const next = order.filter((id) => !moving.includes(id));
  const targetId = options.targetAssignmentId;
  const targetIndex =
    targetId && !moving.includes(targetId)
      ? next.findIndex((id) => id === targetId)
      : -1;
  if (targetIndex === -1) {
    next.push(...moving);
  } else if (options.insertBefore) {
    next.splice(targetIndex, 0, ...moving);
  } else {
    next.splice(targetIndex + 1, 0, ...moving);
  }
  return next;
}

export type ClassAssignmentPlacement = {
  rootOrder: string[];
  sections: NonNullable<SettingsClassMetadata["sections"]>;
  sectionOrder: string[];
  /** Resolved destination section, or undefined for class root. */
  targetSectionId: string | undefined;
};

/** Compute root + section itemOrders after moving assignment ids. */
export function computeClassAssignmentPlacement(
  meta: SettingsClassMetadata,
  assignmentIds: string[],
  options: {
    sectionId?: string | null;
    targetAssignmentId?: string;
    insertBefore?: boolean;
  } = {},
): ClassAssignmentPlacement {
  const ids = assignmentIds.filter(Boolean);
  const targetSectionId =
    options.sectionId && meta.sections?.[options.sectionId]
      ? options.sectionId
      : undefined;

  const sections: NonNullable<SettingsClassMetadata["sections"]> = {
    ...(meta.sections || {}),
  };
  for (const sectionId of Object.keys(sections)) {
    const section = sections[sectionId];
    if (!section) {
      continue;
    }
    sections[sectionId] = {
      ...section,
      itemOrder: (section.itemOrder || []).filter((id) => !ids.includes(id)),
    };
  }

  let rootOrder = (meta.itemOrder || []).filter((id) => !ids.includes(id));
  if (targetSectionId && sections[targetSectionId]) {
    sections[targetSectionId] = {
      ...sections[targetSectionId],
      itemOrder: insertAssignmentIds(
        sections[targetSectionId].itemOrder || [],
        ids,
        options,
      ),
    };
  } else {
    rootOrder = insertAssignmentIds(rootOrder, ids, options);
  }

  return {
    rootOrder,
    sections,
    sectionOrder: orderedSectionIds({
      sections,
      sectionOrder: meta.sectionOrder,
    }),
    targetSectionId,
  };
}

/**
 * Set or clear `sectionId` on matching assignment rows.
 * Returns a new items map, or null when nothing changed.
 */
export function patchAssignmentSectionIds(
  items: CollectionSyllabusDocument["items"] | undefined,
  assignmentIds: Iterable<string>,
  targetSectionId: string | undefined,
): CollectionSyllabusDocument["items"] | null {
  const idSet =
    assignmentIds instanceof Set ? assignmentIds : new Set(assignmentIds);
  if (idSet.size === 0) {
    return null;
  }
  const nextItems = { ...(items || {}) };
  let touched = false;
  for (const [itemKey, rows] of Object.entries(nextItems)) {
    let changed = false;
    const nextRows = (rows || []).map((row) => {
      if (!row.id || !idSet.has(row.id)) {
        return row;
      }
      const current = row.sectionId;
      if (targetSectionId) {
        if (current === targetSectionId) {
          return row;
        }
        changed = true;
        return { ...row, sectionId: targetSectionId };
      }
      if (!current) {
        return row;
      }
      changed = true;
      const { sectionId: _removed, ...rest } = row;
      return rest;
    });
    if (changed) {
      nextItems[itemKey] = nextRows;
      touched = true;
    }
  }
  return touched ? nextItems : null;
}

/** Apply a placement to a collection document (classes + assignment sectionIds). */
export function applyClassAssignmentPlacementToDocument(
  document: CollectionSyllabusDocument,
  classNumber: number,
  placement: ClassAssignmentPlacement,
  assignmentIds: Iterable<string>,
): CollectionSyllabusDocument {
  const nextItems = patchAssignmentSectionIds(
    document.items,
    assignmentIds,
    placement.targetSectionId,
  );
  return {
    ...document,
    classes: mergeNumberKeyedClasses(
      document.classes,
      {
        [String(classNumber)]: {
          itemOrder: placement.rootOrder,
          sections: placement.sections,
          sectionOrder: placement.sectionOrder,
        },
      },
      document.classOrder,
    ),
    ...(nextItems ? { items: nextItems } : {}),
  };
}

/** Clear `sectionId` when it matches `sectionId` (section delete / dissolve). */
export function clearAssignmentSectionId(
  items: CollectionSyllabusDocument["items"] | undefined,
  sectionId: string,
): CollectionSyllabusDocument["items"] | null {
  const nextItems = { ...(items || {}) };
  let touched = false;
  for (const [itemKey, rows] of Object.entries(nextItems)) {
    let changed = false;
    const nextRows = (rows || []).map((row) => {
      if (row.sectionId !== sectionId) {
        return row;
      }
      changed = true;
      const { sectionId: _removed, ...rest } = row;
      return rest;
    });
    if (changed) {
      nextItems[itemKey] = nextRows;
      touched = true;
    }
  }
  return touched ? nextItems : null;
}
