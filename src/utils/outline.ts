/**
 * Syllabus outline tree helpers: order + nesting for sections and classes.
 */

import {
  StoredClassMetadataSchema,
  generateClassId,
  generateSectionId,
  type CollectionSyllabusDocument,
  type OutlineNode,
  type SettingsSectionMetadata,
  type StoredClassMetadata,
} from "./schemas";

export { generateSectionId };

export function flatOutlineFromClasses(
  classes: CollectionSyllabusDocument["classes"] | undefined,
): OutlineNode[] {
  return Object.entries(classes || {})
    .filter(([, meta]) => meta?.number)
    .sort(([, a], [, b]) => (a?.number || 0) - (b?.number || 0))
    .map(([classId]) => ({ type: "class" as const, classId }));
}

export function walkOutline(
  nodes: OutlineNode[] | undefined,
  visit: (node: OutlineNode, parent: OutlineNode[] | null, index: number) => void,
  parent: OutlineNode[] | null = null,
): void {
  const list = nodes || [];
  for (let i = 0; i < list.length; i++) {
    const node = list[i];
    visit(node, parent, i);
    if (node.type === "section") {
      walkOutline(node.children, visit, node.children);
    }
  }
}

export function collectClassIdsInOutlineOrder(
  nodes: OutlineNode[] | undefined,
): string[] {
  const ids: string[] = [];
  walkOutline(nodes, (node) => {
    if (node.type === "class") {
      ids.push(node.classId);
    }
  });
  return ids;
}

export function findOutlineNode(
  nodes: OutlineNode[] | undefined,
  predicate: (node: OutlineNode) => boolean,
): {
  node: OutlineNode;
  parent: OutlineNode[] | null;
  index: number;
} | null {
  let found: {
    node: OutlineNode;
    parent: OutlineNode[] | null;
    index: number;
  } | null = null;
  walkOutline(nodes, (node, parent, index) => {
    if (!found && predicate(node)) {
      found = { node, parent, index };
    }
  });
  return found;
}

export function findClassInOutline(
  nodes: OutlineNode[] | undefined,
  classId: string,
): {
  node: OutlineNode;
  parent: OutlineNode[] | null;
  index: number;
} | null {
  return findOutlineNode(
    nodes,
    (node) => node.type === "class" && node.classId === classId,
  );
}

export function findSectionInOutline(
  nodes: OutlineNode[] | undefined,
  sectionId: string,
): {
  node: OutlineNode;
  parent: OutlineNode[] | null;
  index: number;
} | null {
  return findOutlineNode(
    nodes,
    (node) => node.type === "section" && node.sectionId === sectionId,
  );
}

/** Deep-clone outline nodes (sandbox has no reliable structuredClone). */
export function cloneOutline(nodes: OutlineNode[] | undefined): OutlineNode[] {
  return JSON.parse(JSON.stringify(nodes || [])) as OutlineNode[];
}

/**
 * Remove a node matching predicate. Returns the removed node (and its subtree)
 * or null. Mutates `nodes` in place when it is the root list being searched.
 */
export function removeOutlineNode(
  nodes: OutlineNode[],
  predicate: (node: OutlineNode) => boolean,
): OutlineNode | null {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (predicate(node)) {
      nodes.splice(i, 1);
      return node;
    }
    if (node.type === "section") {
      const removed = removeOutlineNode(node.children, predicate);
      if (removed) {
        return removed;
      }
    }
  }
  return null;
}

/**
 * Insert `node` into `target` at `index` (clamped). If parentSectionId is set,
 * find that section and insert into its children; otherwise insert at root.
 */
export function insertOutlineNode(
  root: OutlineNode[],
  node: OutlineNode,
  options: {
    parentSectionId?: string | null;
    index?: number;
    after?: OutlineNode;
  } = {},
): boolean {
  let target: OutlineNode[] = root;
  if (options.parentSectionId) {
    const found = findSectionInOutline(root, options.parentSectionId);
    if (!found || found.node.type !== "section") {
      return false;
    }
    target = found.node.children;
  }

  let index = options.index;
  if (index === undefined && options.after) {
    const afterIndex = target.findIndex((n) => outlineNodesEqual(n, options.after!));
    index = afterIndex >= 0 ? afterIndex + 1 : target.length;
  }
  if (index === undefined) {
    index = target.length;
  }
  index = Math.max(0, Math.min(index, target.length));
  target.splice(index, 0, node);
  return true;
}

function outlineNodesEqual(a: OutlineNode, b: OutlineNode): boolean {
  if (a.type !== b.type) {
    return false;
  }
  if (a.type === "class" && b.type === "class") {
    return a.classId === b.classId;
  }
  if (a.type === "section" && b.type === "section") {
    return a.sectionId === b.sectionId;
  }
  return false;
}

/** True if `ancestorSectionId` contains `node` somewhere in its subtree. */
export function sectionContainsNode(
  root: OutlineNode[],
  ancestorSectionId: string,
  node: OutlineNode,
): boolean {
  const found = findSectionInOutline(root, ancestorSectionId);
  if (!found || found.node.type !== "section") {
    return false;
  }
  let contains = false;
  walkOutline(found.node.children, (child) => {
    if (outlineNodesEqual(child, node)) {
      contains = true;
    }
  });
  return contains;
}

export function renumberClassesFromOutline(
  classes: NonNullable<CollectionSyllabusDocument["classes"]>,
  outline: OutlineNode[],
): void {
  const orderedIds = collectClassIdsInOutlineOrder(outline);
  let number = 1;
  for (const classId of orderedIds) {
    if (!classes[classId]) {
      continue;
    }
    classes[classId] = {
      ...classes[classId],
      number,
    };
    number += 1;
  }
}

/**
 * Ensure outline covers all classes, drop dangling refs, dedupe classIds,
 * drop unknown sections, then renumber classes in outline order.
 */
export function normalizeDocumentOutline(
  document: CollectionSyllabusDocument,
): CollectionSyllabusDocument {
  const classes: NonNullable<CollectionSyllabusDocument["classes"]> = {
    ...(document.classes || {}),
  };
  const sections: Record<string, SettingsSectionMetadata> = {
    ...(document.sections || {}),
  };
  let outline = cloneOutline(document.outline);

  const seenClassIds = new Set<string>();
  outline = filterOutline(outline, (node) => {
    if (node.type === "class") {
      if (!classes[node.classId] || seenClassIds.has(node.classId)) {
        return false;
      }
      seenClassIds.add(node.classId);
      return true;
    }
    if (!sections[node.sectionId]) {
      return false;
    }
    return true;
  });

  // Append classes missing from the outline, sorted by current number.
  const missing = Object.entries(classes)
    .filter(([id]) => !seenClassIds.has(id))
    .sort(([, a], [, b]) => (a?.number || 0) - (b?.number || 0));
  for (const [classId] of missing) {
    outline.push({ type: "class", classId });
  }

  // Drop section records not referenced by the outline.
  const referencedSections = new Set<string>();
  walkOutline(outline, (node) => {
    if (node.type === "section") {
      referencedSections.add(node.sectionId);
    }
  });
  for (const sectionId of Object.keys(sections)) {
    if (!referencedSections.has(sectionId)) {
      delete sections[sectionId];
    }
  }

  renumberClassesFromOutline(classes, outline);

  return {
    ...document,
    classes,
    sections,
    outline,
  };
}

function filterOutline(
  nodes: OutlineNode[],
  keep: (node: OutlineNode) => boolean,
): OutlineNode[] {
  const result: OutlineNode[] = [];
  for (const node of nodes) {
    if (node.type === "class") {
      if (keep(node)) {
        result.push(node);
      }
      continue;
    }
    if (!keep(node)) {
      // Drop section but hoist surviving children.
      result.push(...filterOutline(node.children, keep));
      continue;
    }
    result.push({
      type: "section",
      sectionId: node.sectionId,
      children: filterOutline(node.children, keep),
    });
  }
  return result;
}

export function ensureClassInOutline(
  outline: OutlineNode[],
  classId: string,
  parentSectionId?: string | null,
): OutlineNode[] {
  const next = cloneOutline(outline);
  if (findClassInOutline(next, classId)) {
    return next;
  }
  insertOutlineNode(next, { type: "class", classId }, { parentSectionId });
  return next;
}

export function removeClassFromOutline(
  outline: OutlineNode[],
  classId: string,
): OutlineNode[] {
  const next = cloneOutline(outline);
  removeOutlineNode(next, (n) => n.type === "class" && n.classId === classId);
  return next;
}

/**
 * Ungroup a section: hoist its children into the parent list and remove the
 * section node. Does not delete classes.
 */
export function ungroupSection(
  outline: OutlineNode[],
  sectionId: string,
): OutlineNode[] {
  const next = cloneOutline(outline);
  const found = findSectionInOutline(next, sectionId);
  if (!found || found.node.type !== "section") {
    return next;
  }
  const children = [...found.node.children];
  const parentList = found.parent || next;
  parentList.splice(found.index, 1, ...children);
  return next;
}

export function sectionPathForClass(
  outline: OutlineNode[] | undefined,
  sections: Record<string, SettingsSectionMetadata> | undefined,
  classId: string,
): string[] {
  const path: string[] = [];
  const search = (
    nodes: OutlineNode[],
    ancestors: string[],
  ): boolean => {
    for (const node of nodes) {
      if (node.type === "class" && node.classId === classId) {
        path.push(...ancestors);
        return true;
      }
      if (node.type === "section") {
        const title = (sections?.[node.sectionId]?.title || "").trim();
        const nextAncestors = title ? [...ancestors, title] : ancestors;
        if (search(node.children, nextAncestors)) {
          return true;
        }
      }
    }
    return false;
  };
  search(outline || [], []);
  return path;
}

export function createEmptySection(
  title = "",
  description?: string | null,
): {
  sectionId: string;
  meta: SettingsSectionMetadata;
  node: OutlineNode;
} {
  const sectionId = generateSectionId();
  const meta: SettingsSectionMetadata = { title };
  if (description != null && description !== "") {
    meta.description = description;
  }
  return {
    sectionId,
    meta,
    node: { type: "section", sectionId, children: [] },
  };
}

export function createClassInDocument(
  document: CollectionSyllabusDocument,
  options: {
    title?: string;
    description?: string | null;
    itemOrder?: string[];
    parentSectionId?: string | null;
    afterClassId?: string;
  } = {},
): {
  document: CollectionSyllabusDocument;
  classId: string;
  classNumber: number;
} {
  const classes: Record<string, StoredClassMetadata> = {
    ...(document.classes || {}),
  };
  const classId = generateClassId();
  const maxNumber = Object.values(classes).reduce(
    (max, meta) => Math.max(max, meta?.number || 0),
    0,
  );
  classes[classId] = StoredClassMetadataSchema.parse({
    title: options.title ?? "",
    ...(options.description != null
      ? { description: options.description }
      : {}),
    ...(options.itemOrder?.length ? { itemOrder: options.itemOrder } : {}),
    number: maxNumber + 1,
  });

  const outline = cloneOutline(document.outline);
  const classNode: OutlineNode = { type: "class", classId };
  if (options.afterClassId) {
    const after = findClassInOutline(outline, options.afterClassId);
    if (after) {
      const parentList = after.parent || outline;
      parentList.splice(after.index + 1, 0, classNode);
    } else {
      insertOutlineNode(outline, classNode, {
        parentSectionId: options.parentSectionId,
      });
    }
  } else {
    insertOutlineNode(outline, classNode, {
      parentSectionId: options.parentSectionId,
    });
  }

  const normalized = normalizeDocumentOutline({
    ...document,
    classes,
    outline,
  });
  return {
    document: normalized,
    classId,
    classNumber: normalized.classes![classId]!.number,
  };
}

/**
 * Move a class node up/down among siblings; at section boundaries, cross into
 * the adjacent section or outdent before/after the parent section.
 */
export function moveClassInOutline(
  outline: OutlineNode[],
  classId: string,
  direction: "up" | "down",
): OutlineNode[] {
  const next = cloneOutline(outline);
  const location = locateClass(next, classId, null);
  if (!location) {
    return next;
  }
  const { node, parentList, index, parentSectionId, grandparentList, sectionIndex } =
    location;

  if (direction === "up") {
    if (index > 0) {
      const prev = parentList[index - 1];
      parentList.splice(index, 1);
      if (prev.type === "section") {
        prev.children.push(node);
      } else {
        parentList.splice(index - 1, 0, node);
      }
      return next;
    }
    // At start of a section: move before that section in the grandparent.
    if (parentSectionId && grandparentList && sectionIndex != null) {
      parentList.splice(index, 1);
      grandparentList.splice(sectionIndex, 0, node);
      return next;
    }
    return next;
  }

  // down
  if (index < parentList.length - 1) {
    const following = parentList[index + 1];
    parentList.splice(index, 1);
    if (following.type === "section") {
      following.children.unshift(node);
    } else {
      // after removal, former index+1 is at `index`
      parentList.splice(index + 1, 0, node);
    }
    return next;
  }
  // At end of a section: move after that section in the grandparent.
  if (parentSectionId && grandparentList && sectionIndex != null) {
    parentList.splice(index, 1);
    grandparentList.splice(sectionIndex + 1, 0, node);
    return next;
  }
  return next;
}

type ClassLocation = {
  node: OutlineNode;
  parentList: OutlineNode[];
  index: number;
  parentSectionId: string | null;
  grandparentList: OutlineNode[] | null;
  sectionIndex: number | null;
};

function locateClass(
  nodes: OutlineNode[],
  classId: string,
  parentSectionId: string | null,
  grandparentList: OutlineNode[] | null = null,
  sectionIndex: number | null = null,
): ClassLocation | null {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (node.type === "class" && node.classId === classId) {
      return {
        node,
        parentList: nodes,
        index: i,
        parentSectionId,
        grandparentList,
        sectionIndex,
      };
    }
    if (node.type === "section") {
      const found = locateClass(
        node.children,
        classId,
        node.sectionId,
        nodes,
        i,
      );
      if (found) {
        return found;
      }
    }
  }
  return null;
}

/**
 * Move a section node up/down among its siblings (no cross-parent in v1).
 */
export function moveSectionInOutline(
  outline: OutlineNode[],
  sectionId: string,
  direction: "up" | "down",
): OutlineNode[] {
  const next = cloneOutline(outline);
  const found = findSectionInOutline(next, sectionId);
  if (!found || found.node.type !== "section") {
    return next;
  }
  const parentList = found.parent || next;
  const targetIndex =
    direction === "up" ? found.index - 1 : found.index + 1;
  if (targetIndex < 0 || targetIndex >= parentList.length) {
    return next;
  }
  const [node] = parentList.splice(found.index, 1);
  parentList.splice(targetIndex, 0, node);
  return next;
}

/**
 * Indent: move into the previous sibling section if it is a section; otherwise
 * wrap the node in a new untitled section.
 * Outdent: hoist node to after its parent section in the grandparent.
 */
export function indentOutlineNodeWithSection(
  outline: OutlineNode[],
  predicate: (node: OutlineNode) => boolean,
  sections: Record<string, SettingsSectionMetadata>,
): { outline: OutlineNode[]; sections: Record<string, SettingsSectionMetadata> } {
  const next = cloneOutline(outline);
  const nextSections = { ...sections };
  const found = findOutlineNode(next, predicate);
  if (!found) {
    return { outline: next, sections: nextSections };
  }
  const parentList = found.parent || next;
  if (found.index > 0) {
    const prev = parentList[found.index - 1];
    if (prev.type === "section") {
      const [node] = parentList.splice(found.index, 1);
      prev.children.push(node);
      return { outline: next, sections: nextSections };
    }
  }
  const created = createEmptySection("");
  const [node] = parentList.splice(found.index, 1);
  if (created.node.type === "section") {
    created.node.children.push(node);
  }
  parentList.splice(found.index, 0, created.node);
  nextSections[created.sectionId] = created.meta;
  return { outline: next, sections: nextSections };
}

export function outdentOutlineNode(
  outline: OutlineNode[],
  predicate: (node: OutlineNode) => boolean,
): OutlineNode[] {
  const next = cloneOutline(outline);
  const walk = (
    nodes: OutlineNode[],
    grandparent: OutlineNode[] | null,
    sectionIndex: number | null,
  ): boolean => {
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if (predicate(node)) {
        if (grandparent == null || sectionIndex == null) {
          return true; // already at root
        }
        const [removed] = nodes.splice(i, 1);
        grandparent.splice(sectionIndex + 1, 0, removed);
        return true;
      }
      if (node.type === "section") {
        if (walk(node.children, nodes, i)) {
          return true;
        }
      }
    }
    return false;
  };
  walk(next, null, null);
  return next;
}
