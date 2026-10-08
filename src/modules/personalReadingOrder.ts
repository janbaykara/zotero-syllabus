/**
 * Collection-scoped Personal Reading Order: a hidden top-level note that stores
 * the user’s preferred flat reading sequence and per-item reading done state.
 * Distinct from the Syllabus note (no personal progress there).
 *
 * Envelope: human-readable numbered list, then “Plugin data (do not edit)” + JSON.
 * Unordered items are not stored in `order` — they follow ordered keys at display
 * time. Done keys live in `done` (item keys marked read).
 */

import * as z from "zod";
import { getCachedCollectionById, getCachedItem } from "../utils/cache";
import { getItemTitle, readItemNote } from "../utils/items";
import { createReentrantSerialQueue } from "../utils/serialQueue";
import { getAllCollections } from "../utils/zotero";
import { PLUGIN_JSON_HEADING, PLUGIN_REPO_URL } from "./syllabusNoteHtml";

/** Stored identifier — do not localize. */
export const PERSONAL_READING_ORDER_NOTE_TITLE = "Personal Reading Order";
/** Stored identifier — do not localize. */
export const PERSONAL_READING_ORDER_NOTE_TAG =
  "zotero-syllabus-personal-reading-order";
/** Stored identifier — do not localize. */
export const PERSONAL_READING_ORDER_PRE_ATTR =
  "data-zotero-syllabus-personal-reading-order";

export const PERSONAL_READING_ORDER_VERSION = 1 as const;

export const PersonalReadingOrderDocumentSchema = z.object({
  version: z.literal(PERSONAL_READING_ORDER_VERSION).default(1),
  order: z.array(z.string()).default([]),
  /**
   * Item keys marked done (Gallery / flat checkbox). Implies every syllabus
   * assignment for that item is done.
   */
  done: z.array(z.string()).default([]),
  /**
   * Assignment ids marked done (Syllabus page finer-grained checkboxes).
   * Independent per assignment unless the item is also in `done`.
   */
  assignmentDone: z.array(z.string()).default([]),
});

export type PersonalReadingOrderDocument = z.infer<
  typeof PersonalReadingOrderDocumentSchema
>;

type CachedOrder = {
  collectionRef: string;
  noteId: number | null;
  noteVersion: number;
  document: PersonalReadingOrderDocument;
};

const orderCache = new Map<string, CachedOrder>();
const collectionRefByNoteId = new Map<number, string>();
const orderWrites = createReentrantSerialQueue();
const orderListeners = new Set<() => void>();
let orderGeneration = 0;
let notifierID: string | null = null;
let indexReady: Promise<void> = Promise.resolve();

function collectionRef(libraryID: number, key: string): string {
  return `${libraryID}:${key}`;
}

function collectionRefFromCollection(collection: Zotero.Collection): string {
  return collectionRef(collection.libraryID, collection.key);
}

function emptyDocument(): PersonalReadingOrderDocument {
  return {
    version: PERSONAL_READING_ORDER_VERSION,
    order: [],
    done: [],
    assignmentDone: [],
  };
}

function uniqueKeys(keys: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const key of keys) {
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(key);
  }
  return out;
}

function notifyListeners(): void {
  for (const listener of [...orderListeners]) {
    try {
      listener();
    } catch (error) {
      ztoolkit.log("Error in personal reading order listener:", error);
    }
  }
}

export function subscribePersonalReadingOrderChanges(
  listener: () => void,
): () => void {
  orderListeners.add(listener);
  return () => {
    orderListeners.delete(listener);
  };
}

export function getPersonalReadingOrderGeneration(): number {
  return orderGeneration;
}

function bumpGeneration(): void {
  orderGeneration++;
  notifyListeners();
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function unescapeHtml(text: string): string {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&#160;/g, " ")
    .replace(/&#x0*a0;/gi, " ")
    .replace(/\u00a0/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

function resolveCollection(
  collectionId: number | Zotero.Collection,
): Zotero.Collection | null {
  if (typeof collectionId !== "number") {
    return collectionId;
  }
  return (
    getCachedCollectionById(collectionId) ||
    Zotero.Collections.get(collectionId) ||
    null
  );
}

function itemHasTag(item: Zotero.Item, tag: string): boolean {
  try {
    return item.hasTag(tag);
  } catch {
    return false;
  }
}

export function isPersonalReadingOrderNote(
  item: Zotero.Item | false | null | undefined,
): boolean {
  if (!item) {
    return false;
  }
  try {
    if (!item.isNote() || item.deleted) {
      return false;
    }
    if (itemHasTag(item, PERSONAL_READING_ORDER_NOTE_TAG)) {
      return true;
    }
    try {
      const title = item.getNoteTitle() || "";
      if (
        title === PERSONAL_READING_ORDER_NOTE_TITLE ||
        title.startsWith(PERSONAL_READING_ORDER_NOTE_TITLE)
      ) {
        return true;
      }
    } catch {
      // Fall through to HTML check.
    }
    const html = readItemNote(item);
    return html.includes(PERSONAL_READING_ORDER_PRE_ATTR);
  } catch {
    return false;
  }
}

function collectionNoteCandidates(
  collection: Zotero.Collection,
  includeDeleted = false,
): Zotero.Item[] {
  let children: Zotero.Item[];
  try {
    children = collection.getChildItems(false, includeDeleted);
  } catch {
    return [];
  }
  return children.filter((item) => {
    try {
      if (!item.isNote() || !item.isTopLevelItem()) {
        return false;
      }
      return includeDeleted || !item.deleted;
    } catch {
      return false;
    }
  });
}

function findPersonalReadingOrderNoteUncached(
  collection: Zotero.Collection,
  includeDeleted = false,
): Zotero.Item | null {
  const matches = collectionNoteCandidates(collection, includeDeleted).filter(
    (item) => isPersonalReadingOrderNote(item),
  );
  if (matches.length === 0) {
    return null;
  }
  matches.sort((a, b) => a.id - b.id);
  return matches[0];
}

export function parsePersonalReadingOrderNote(
  html: string,
): PersonalReadingOrderDocument | null {
  if (!html) {
    return null;
  }
  const tagged = html.match(
    new RegExp(
      `<pre[^>]*\\b${PERSONAL_READING_ORDER_PRE_ATTR}(?:="[^"]*")?[^>]*>([\\s\\S]*?)<\\/pre>`,
      "i",
    ),
  );
  let jsonText = tagged ? unescapeHtml(tagged[1]).trim() : "";
  if (!jsonText) {
    const genericPres = html.matchAll(/<pre[^>]*>([\s\S]*?)<\/pre>/gi);
    for (const match of genericPres) {
      const candidate = unescapeHtml(match[1]).trim();
      if (looksLikePersonalReadingOrderPayload(candidate)) {
        jsonText = candidate;
        break;
      }
    }
  }
  if (!jsonText) {
    return null;
  }
  try {
    const raw = JSON.parse(jsonText) as unknown;
    const parsed = PersonalReadingOrderDocumentSchema.safeParse(raw);
    if (parsed.success) {
      return parsed.data;
    }
    return null;
  } catch {
    return null;
  }
}

export function looksLikePersonalReadingOrderPayload(text: string): boolean {
  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return false;
    }
    if (typeof parsed.version !== "number") {
      return false;
    }
    return Array.isArray(parsed.order);
  } catch {
    return false;
  }
}

function titleForKey(
  collection: Zotero.Collection | null | undefined,
  itemKey: string,
): string {
  if (!collection) {
    return itemKey;
  }
  try {
    const item = Zotero.Items.getByLibraryAndKey(collection.libraryID, itemKey);
    if (item) {
      return getItemTitle(item) || itemKey;
    }
  } catch {
    // Missing item — show key.
  }
  return itemKey;
}

export function serializePersonalReadingOrderNote(
  document: PersonalReadingOrderDocument,
  collection?: Zotero.Collection | null,
): string {
  const order = document.order || [];
  const doneSet = new Set(document.done || []);
  const lis = order
    .map((key) => {
      const title = escapeHtml(titleForKey(collection, key));
      const mark = doneSet.has(key) ? "✅ " : "";
      // `<ol>` supplies the number — don't prefix "1. " in the text.
      return `<li><p>${mark}${title}</p></li>`;
    })
    .join("");
  const list = lis ? `<ol>${lis}</ol>` : "<p><em>(empty)</em></p>";
  const doneOnly = (document.done || []).filter((key) => !order.includes(key));
  const doneOnlyLis = doneOnly
    .map((key) => {
      const title = escapeHtml(titleForKey(collection, key));
      return `<li><p>✅ ${title}</p></li>`;
    })
    .join("");
  const doneOnlyBlock = doneOnlyLis
    ? `<h3>Done</h3><ul>${doneOnlyLis}</ul>`
    : "";
  const json = JSON.stringify(
    {
      version: PERSONAL_READING_ORDER_VERSION,
      order,
      done: document.done || [],
      assignmentDone: document.assignmentDone || [],
    },
    null,
    2,
  );
  const repoHref = escapeHtml(PLUGIN_REPO_URL);
  const body = [
    `<h1>${escapeHtml(PERSONAL_READING_ORDER_NOTE_TITLE)}</h1>`,
    list,
    doneOnlyBlock,
    `<h3>${escapeHtml(PLUGIN_JSON_HEADING)}</h3>`,
    `<p>You can stop reading here. The rest is for the <a href="${repoHref}">Zotero Syllabus</a> plugin on desktop.</p>`,
    `<pre ${PERSONAL_READING_ORDER_PRE_ATTR}="1" data-version="${PERSONAL_READING_ORDER_VERSION}">${escapeHtml(json)}</pre>`,
  ].join("");

  if (typeof Zotero !== "undefined" && Zotero.Notes?.notePrefix) {
    return `${Zotero.Notes.notePrefix}${body}${Zotero.Notes.noteSuffix || ""}`;
  }
  return `<div data-schema-version="9">${body}</div>`;
}

function setCacheEntry(
  ref: string,
  noteId: number | null,
  noteVersion: number,
  document: PersonalReadingOrderDocument,
): void {
  const prev = orderCache.get(ref);
  if (prev?.noteId && prev.noteId !== noteId) {
    collectionRefByNoteId.delete(prev.noteId);
  }
  orderCache.set(ref, {
    collectionRef: ref,
    noteId,
    noteVersion,
    document,
  });
  if (noteId) {
    collectionRefByNoteId.set(noteId, ref);
  }
}

function liveKeysInCollection(collection: Zotero.Collection): Set<string> {
  const keys = new Set<string>();
  try {
    for (const item of collection.getChildItems(false, false) || []) {
      try {
        if (item.deleted) {
          continue;
        }
        if (
          item.isRegularItem() ||
          (typeof item.isAttachment === "function" &&
            item.isAttachment() &&
            item.isTopLevelItem())
        ) {
          keys.add(item.key);
        }
      } catch {
        // Skip.
      }
    }
  } catch {
    // Empty.
  }
  return keys;
}

/** Drop keys that are no longer in the collection; preserve relative order. */
export function prunePersonalReadingOrderKeys(
  order: string[],
  liveKeys: ReadonlySet<string>,
): string[] {
  const seen = new Set<string>();
  const next: string[] = [];
  for (const key of order) {
    if (!key || seen.has(key) || !liveKeys.has(key)) {
      continue;
    }
    seen.add(key);
    next.push(key);
  }
  return next;
}

/**
 * Ordered items first (intersection with `orderKeys`), then leftovers in prior order.
 */
export function applyPersonalReadingOrder<
  T extends { key: string } | Zotero.Item,
>(items: T[], orderKeys: string[]): T[] {
  if (!orderKeys.length || items.length === 0) {
    return items;
  }
  const keyOf = (item: T): string =>
    "key" in item && typeof (item as { key: string }).key === "string"
      ? (item as { key: string }).key
      : String((item as Zotero.Item).key);
  const byKey = new Map(items.map((item) => [keyOf(item), item]));
  const ordered: T[] = [];
  const used = new Set<string>();
  for (const key of orderKeys) {
    const item = byKey.get(key);
    if (!item || used.has(key)) {
      continue;
    }
    ordered.push(item);
    used.add(key);
  }
  for (const item of items) {
    const key = keyOf(item);
    if (!used.has(key)) {
      ordered.push(item);
    }
  }
  return ordered;
}

export function splitPersonalReadingOrder<
  T extends { key: string } | Zotero.Item,
>(items: T[], orderKeys: string[]): { ordered: T[]; unordered: T[] } {
  if (!orderKeys.length) {
    return { ordered: [], unordered: [...items] };
  }
  const keyOf = (item: T): string =>
    "key" in item && typeof (item as { key: string }).key === "string"
      ? (item as { key: string }).key
      : String((item as Zotero.Item).key);
  const byKey = new Map(items.map((item) => [keyOf(item), item]));
  const ordered: T[] = [];
  const used = new Set<string>();
  for (const key of orderKeys) {
    const item = byKey.get(key);
    if (!item || used.has(key)) {
      continue;
    }
    ordered.push(item);
    used.add(key);
  }
  const unordered: T[] = [];
  for (const item of items) {
    const key = keyOf(item);
    if (!used.has(key)) {
      unordered.push(item);
    }
  }
  return { ordered, unordered };
}

function cachedDocumentFor(
  collection: Zotero.Collection,
): PersonalReadingOrderDocument {
  const ref = collectionRefFromCollection(collection);
  const cached = orderCache.get(ref);
  if (cached) {
    return cached.document;
  }
  return emptyDocument();
}

/** Hot-path read: cache only (no getNote). */
export function getPersonalReadingOrderDocument(
  collection: Zotero.Collection | number,
): PersonalReadingOrderDocument {
  const resolved = resolveCollection(collection);
  if (!resolved) {
    return emptyDocument();
  }
  return cachedDocumentFor(resolved);
}

/**
 * Ordered keys that still exist in the collection. Empty ⇒ personal order “not set”.
 */
export function getPersonalReadingOrderKeys(
  collection: Zotero.Collection | number,
): string[] {
  const resolved = resolveCollection(collection);
  if (!resolved) {
    return [];
  }
  const doc = cachedDocumentFor(resolved);
  return prunePersonalReadingOrderKeys(
    doc.order || [],
    liveKeysInCollection(resolved),
  );
}

export function hasPersonalReadingOrder(
  collection: Zotero.Collection | number,
): boolean {
  return getPersonalReadingOrderKeys(collection).length > 0;
}

export function remapPersonalReadingOrderKeys(
  document: PersonalReadingOrderDocument,
  keyMap: Record<string, string>,
): PersonalReadingOrderDocument {
  if (!Object.keys(keyMap).length) {
    return document;
  }
  const remapList = (keys: string[]): string[] => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const key of keys) {
      const next = keyMap[key] || key;
      if (!next || seen.has(next)) {
        continue;
      }
      seen.add(next);
      out.push(next);
    }
    return out;
  };
  const order = remapList(document.order || []);
  const done = remapList(document.done || []);
  // assignmentDone ids are stable across item merges.
  const assignmentDone = uniqueKeys(document.assignmentDone || []);
  if (
    order.join("\0") === (document.order || []).join("\0") &&
    done.join("\0") === (document.done || []).join("\0") &&
    assignmentDone.join("\0") === (document.assignmentDone || []).join("\0")
  ) {
    return document;
  }
  return { ...document, order, done, assignmentDone };
}

/** Done item keys still present in the collection. */
export function getPersonalReadingDoneKeys(
  collection: Zotero.Collection | number,
): string[] {
  const resolved = resolveCollection(collection);
  if (!resolved) {
    return [];
  }
  const doc = cachedDocumentFor(resolved);
  return prunePersonalReadingOrderKeys(
    doc.done || [],
    liveKeysInCollection(resolved),
  );
}

export function isItemReadingDone(
  collection: Zotero.Collection | number,
  itemKey: string,
): boolean {
  if (!itemKey) {
    return false;
  }
  const resolved = resolveCollection(collection);
  if (!resolved) {
    return false;
  }
  const doc = cachedDocumentFor(resolved);
  return (doc.done || []).includes(itemKey);
}

/**
 * Syllabus assignment checkbox: item-level done covers every assignment;
 * otherwise only the listed assignment id.
 */
export function isAssignmentReadingDone(
  collection: Zotero.Collection | number,
  itemKey: string,
  assignmentId: string | undefined | null,
): boolean {
  if (isItemReadingDone(collection, itemKey)) {
    return true;
  }
  if (!assignmentId) {
    return false;
  }
  const resolved = resolveCollection(collection);
  if (!resolved) {
    return false;
  }
  const doc = cachedDocumentFor(resolved);
  return (doc.assignmentDone || []).includes(assignmentId);
}

async function persistNote(
  note: Zotero.Item,
  collection: Zotero.Collection,
  html: string,
): Promise<Zotero.Item> {
  note.libraryID = collection.libraryID;
  if (!note.id) {
    await note.saveTx({ skipSelect: true });
  }
  try {
    note.setNote(html);
  } catch (error) {
    ztoolkit.log("setNote failed for personal reading order:", error);
  }
  try {
    note.addToCollection(collection.id);
  } catch {
    if (note.id) {
      try {
        await collection.addItem(note.id);
      } catch (error) {
        ztoolkit.log("addItem failed for personal reading order note:", error);
      }
    }
  }
  try {
    note.addTag(PERSONAL_READING_ORDER_NOTE_TAG);
  } catch (error) {
    ztoolkit.log("Error tagging personal reading order note:", error);
  }
  await note.saveTx({ skipSelect: true });
  return note;
}

async function mutatePersonalReadingOrderDocument(
  collection: Zotero.Collection,
  mutator: (
    document: PersonalReadingOrderDocument,
  ) => PersonalReadingOrderDocument,
): Promise<PersonalReadingOrderDocument> {
  const ref = collectionRefFromCollection(collection);
  return orderWrites.enqueue(ref, async () => {
    let document = cachedDocumentFor(collection);
    const liveKeys = liveKeysInCollection(collection);
    document = {
      ...document,
      order: prunePersonalReadingOrderKeys(document.order || [], liveKeys),
      done: prunePersonalReadingOrderKeys(document.done || [], liveKeys),
      assignmentDone: uniqueKeys(document.assignmentDone || []),
    };
    const next = mutator(document);
    const pruned: PersonalReadingOrderDocument = {
      version: PERSONAL_READING_ORDER_VERSION,
      order: prunePersonalReadingOrderKeys(next.order || [], liveKeys),
      done: prunePersonalReadingOrderKeys(next.done || [], liveKeys),
      assignmentDone: uniqueKeys(next.assignmentDone || []),
    };

    let note = findPersonalReadingOrderNoteUncached(collection);
    if (!note) {
      note = new Zotero.Item("note");
    }
    const html = serializePersonalReadingOrderNote(pruned, collection);
    const saved = await persistNote(note, collection, html);
    setCacheEntry(ref, saved.id, saved.version, pruned);
    bumpGeneration();
    return pruned;
  });
}

export async function setPersonalReadingOrder(
  collection: Zotero.Collection | number,
  orderKeys: string[],
): Promise<string[]> {
  const resolved = resolveCollection(collection);
  if (!resolved) {
    return [];
  }
  const doc = await mutatePersonalReadingOrderDocument(resolved, (current) => ({
    version: PERSONAL_READING_ORDER_VERSION,
    order: orderKeys,
    done: current.done || [],
    assignmentDone: current.assignmentDone || [],
  }));
  return doc.order;
}

/** Prepend item key (or move to front if already listed). */
export async function pinItemToPersonalReadingOrder(
  collection: Zotero.Collection | number,
  itemKey: string,
): Promise<string[]> {
  const resolved = resolveCollection(collection);
  if (!resolved || !itemKey) {
    return [];
  }
  const doc = await mutatePersonalReadingOrderDocument(resolved, (current) => {
    const rest = (current.order || []).filter((key) => key !== itemKey);
    return {
      version: PERSONAL_READING_ORDER_VERSION,
      order: [itemKey, ...rest],
      done: current.done || [],
      assignmentDone: current.assignmentDone || [],
    };
  });
  return doc.order;
}

/**
 * Gallery / item-level done. When set, every assignment for the item reads as
 * done. `siblingAssignmentIds` are cleared from assignmentDone (redundant).
 */
export async function setItemReadingDone(
  collection: Zotero.Collection | number,
  itemKey: string,
  done: boolean,
  siblingAssignmentIds: string[] = [],
): Promise<void> {
  const resolved = resolveCollection(collection);
  if (!resolved || !itemKey) {
    return;
  }
  await mutatePersonalReadingOrderDocument(resolved, (current) => {
    const doneKeys = new Set(current.done || []);
    const assignmentDone = new Set(current.assignmentDone || []);
    if (done) {
      doneKeys.add(itemKey);
      for (const id of siblingAssignmentIds) {
        assignmentDone.delete(id);
      }
    } else {
      doneKeys.delete(itemKey);
      for (const id of siblingAssignmentIds) {
        assignmentDone.delete(id);
      }
    }
    return {
      version: PERSONAL_READING_ORDER_VERSION,
      order: current.order || [],
      done: [...doneKeys],
      assignmentDone: [...assignmentDone],
    };
  });
}

/**
 * Syllabus assignment-level done. Does not force sibling assignments.
 * Unchecking while the item is item-done expands siblings into assignmentDone.
 */
export async function setAssignmentReadingDone(
  collection: Zotero.Collection | number,
  itemKey: string,
  assignmentId: string,
  done: boolean,
  siblingAssignmentIds: string[],
): Promise<void> {
  const resolved = resolveCollection(collection);
  if (!resolved || !itemKey || !assignmentId) {
    return;
  }
  const siblings = uniqueKeys(siblingAssignmentIds);
  await mutatePersonalReadingOrderDocument(resolved, (current) => {
    const doneKeys = new Set(current.done || []);
    const assignmentDone = new Set(current.assignmentDone || []);
    const itemWasDone = doneKeys.has(itemKey);

    if (done) {
      assignmentDone.add(assignmentId);
      const allDone = siblings.every(
        (id) => id === assignmentId || assignmentDone.has(id),
      );
      if (allDone && siblings.length > 0) {
        doneKeys.add(itemKey);
        for (const id of siblings) {
          assignmentDone.delete(id);
        }
      }
    } else if (itemWasDone) {
      doneKeys.delete(itemKey);
      for (const id of siblings) {
        if (id !== assignmentId) {
          assignmentDone.add(id);
        }
      }
      assignmentDone.delete(assignmentId);
    } else {
      assignmentDone.delete(assignmentId);
    }

    return {
      version: PERSONAL_READING_ORDER_VERSION,
      order: current.order || [],
      done: [...doneKeys],
      assignmentDone: [...assignmentDone],
    };
  });
}

/**
 * Merge done keys / assignment ids into the personal note (e.g. migrate from
 * syllabus assignment.status).
 */
export async function mergePersonalReadingDoneKeys(
  collection: Zotero.Collection | number,
  itemKeys: string[],
  assignmentIds: string[] = [],
): Promise<void> {
  if (!itemKeys.length && !assignmentIds.length) {
    return;
  }
  const resolved = resolveCollection(collection);
  if (!resolved) {
    return;
  }
  await mutatePersonalReadingOrderDocument(resolved, (current) => {
    const done = new Set(current.done || []);
    const assignmentDone = new Set(current.assignmentDone || []);
    for (const key of itemKeys) {
      if (key) {
        done.add(key);
      }
    }
    for (const id of assignmentIds) {
      if (id) {
        assignmentDone.add(id);
      }
    }
    return {
      version: PERSONAL_READING_ORDER_VERSION,
      order: current.order || [],
      done: [...done],
      assignmentDone: [...assignmentDone],
    };
  });
}

function collectionFromCacheRef(ref: string): Zotero.Collection | null {
  const colon = ref.indexOf(":");
  if (colon < 0) {
    return null;
  }
  const libraryID = Number.parseInt(ref.slice(0, colon), 10);
  const key = ref.slice(colon + 1);
  if (!key || Number.isNaN(libraryID)) {
    return null;
  }
  return Zotero.Collections.getByLibraryAndKey(libraryID, key) || null;
}

async function applyKeyRemapToCachedOrders(
  keyMap: Record<string, string>,
  libraryID: number,
): Promise<void> {
  const remaps = Object.entries(keyMap).filter(
    ([oldKey, newKey]) => oldKey && newKey && oldKey !== newKey,
  );
  if (!remaps.length) {
    return;
  }
  for (const [ref, entry] of [...orderCache.entries()]) {
    if (!ref.startsWith(`${libraryID}:`)) {
      continue;
    }
    const keys = new Set(entry.document.order || []);
    const involved = remaps.some(
      ([oldKey, newKey]) => keys.has(oldKey) || keys.has(newKey),
    );
    if (!involved) {
      continue;
    }
    const collection =
      Zotero.Collections.getByLibraryAndKey(
        libraryID,
        ref.slice(ref.indexOf(":") + 1),
      ) || null;
    if (!collection) {
      const remapped = remapPersonalReadingOrderKeys(entry.document, keyMap);
      entry.document = remapped;
      continue;
    }
    try {
      await mutatePersonalReadingOrderDocument(collection, (document) =>
        remapPersonalReadingOrderKeys(document, keyMap),
      );
    } catch (error) {
      ztoolkit.log(
        "Error remapping personal reading order after merge:",
        error,
      );
    }
  }
}

const REPLACED_ITEM_PREDICATE = "dc:replaces";

function itemKeyFromUri(uri: string): string | null {
  const match = String(uri).match(/\/items\/([^/?#]+)/i);
  const key = match?.[1]?.trim();
  return key || null;
}

function replacedItemKeysFromItem(item: Zotero.Item): string[] {
  const keys: string[] = [];
  try {
    let uris: string[] = [];
    if (typeof item.getRelationsByPredicate === "function") {
      uris =
        item.getRelationsByPredicate(
          REPLACED_ITEM_PREDICATE as _ZoteroTypes.RelationsPredicate,
        ) || [];
    } else {
      const relations = item.getRelations?.() || {};
      const value = (relations as Record<string, string | string[]>)[
        REPLACED_ITEM_PREDICATE
      ];
      if (value) {
        uris = Array.isArray(value) ? value : [value];
      }
    }
    for (const uri of uris) {
      const key = itemKeyFromUri(uri);
      if (key && key !== item.key) {
        keys.push(key);
      }
    }
  } catch {
    return [];
  }
  return keys;
}

function anyCachedOrderHasKey(itemKey: string, libraryID: number): boolean {
  for (const [ref, entry] of orderCache.entries()) {
    if (!ref.startsWith(`${libraryID}:`)) {
      continue;
    }
    if ((entry.document.order || []).includes(itemKey)) {
      return true;
    }
  }
  return false;
}

async function remapFromModifyIds(ids: number[]): Promise<void> {
  const byLibrary = new Map<number, Record<string, string>>();
  for (const id of ids) {
    const item = getCachedItem(id) || Zotero.Items.get(id) || null;
    if (!item) {
      continue;
    }
    try {
      if (item.deleted || item.isNote() || !item.isRegularItem()) {
        continue;
      }
    } catch {
      continue;
    }
    for (const oldKey of replacedItemKeysFromItem(item)) {
      if (!oldKey || oldKey === item.key) {
        continue;
      }
      if (!anyCachedOrderHasKey(oldKey, item.libraryID)) {
        continue;
      }
      const map = byLibrary.get(item.libraryID) || {};
      map[oldKey] = item.key;
      byLibrary.set(item.libraryID, map);
    }
  }
  for (const [libraryID, keyMap] of byLibrary) {
    await applyKeyRemapToCachedOrders(keyMap, libraryID);
  }
}

function handleNoteChange(item: Zotero.Item): void {
  if (!isPersonalReadingOrderNote(item)) {
    const ref = collectionRefByNoteId.get(item.id);
    if (ref && item.deleted) {
      orderCache.set(ref, {
        collectionRef: ref,
        noteId: null,
        noteVersion: 0,
        document: emptyDocument(),
      });
      collectionRefByNoteId.delete(item.id);
      bumpGeneration();
    }
    return;
  }
  let collection: Zotero.Collection | null = null;
  try {
    const ids = item.getCollections?.() || [];
    for (const id of ids) {
      const candidate =
        getCachedCollectionById(id) || Zotero.Collections.get(id) || null;
      if (candidate) {
        collection = candidate;
        break;
      }
    }
  } catch {
    // Ignore.
  }
  if (!collection) {
    const ref = collectionRefByNoteId.get(item.id);
    if (ref) {
      collection = collectionFromCacheRef(ref);
    }
  }
  if (!collection) {
    return;
  }
  const ref = collectionRefFromCollection(collection);
  if (item.deleted) {
    orderCache.set(ref, {
      collectionRef: ref,
      noteId: null,
      noteVersion: 0,
      document: emptyDocument(),
    });
    collectionRefByNoteId.delete(item.id);
    bumpGeneration();
    return;
  }
  const parsed = parsePersonalReadingOrderNote(readItemNote(item));
  if (parsed) {
    setCacheEntry(ref, item.id, item.version, parsed);
    bumpGeneration();
  }
}

async function rebuildOrderIndex(): Promise<void> {
  const libraries = Zotero.Libraries.getAll();
  await Promise.all(
    libraries.map(async (library) => {
      try {
        if (typeof library.waitForDataLoad === "function") {
          await library.waitForDataLoad("item");
        }
      } catch {
        // Continue.
      }
    }),
  );
  orderCache.clear();
  collectionRefByNoteId.clear();
  for (const collection of getAllCollections()) {
    try {
      const note = findPersonalReadingOrderNoteUncached(collection);
      if (!note) {
        continue;
      }
      const parsed = parsePersonalReadingOrderNote(readItemNote(note));
      if (!parsed) {
        continue;
      }
      const ref = collectionRefFromCollection(collection);
      setCacheEntry(ref, note.id, note.version, parsed);
    } catch (error) {
      ztoolkit.log("Error indexing personal reading order note:", error);
    }
  }
  bumpGeneration();
}

export function initializePersonalReadingOrder(): void {
  orderWrites.clear();
  if (notifierID) {
    indexReady = rebuildOrderIndex().catch((error) => {
      ztoolkit.log("Error rebuilding personal reading order index:", error);
    });
    return;
  }

  const observer = {
    notify(
      event: string,
      type: string,
      ids: (number | string)[],
      _extraData: { [key: string]: unknown },
    ) {
      if (type !== "item") {
        return;
      }
      const numericIds = ids
        .map((id) => (typeof id === "number" ? id : parseInt(String(id), 10)))
        .filter((id) => !Number.isNaN(id));
      if (event === "modify") {
        void remapFromModifyIds(numericIds).catch((error) => {
          ztoolkit.log(
            "Error remapping personal reading order on modify:",
            error,
          );
        });
      }
      for (const id of numericIds) {
        const item = getCachedItem(id) || Zotero.Items.get(id) || null;
        if (!item) {
          const ref = collectionRefByNoteId.get(id);
          if (ref) {
            orderCache.set(ref, {
              collectionRef: ref,
              noteId: null,
              noteVersion: 0,
              document: emptyDocument(),
            });
            collectionRefByNoteId.delete(id);
            bumpGeneration();
          }
          continue;
        }
        try {
          if (item.isNote()) {
            handleNoteChange(item);
          }
        } catch {
          // Ignore.
        }
      }
    },
  };

  notifierID = Zotero.Notifier.registerObserver(
    observer,
    ["item"],
    "syllabus-personal-reading-order",
  );
  indexReady = rebuildOrderIndex().catch((error) => {
    ztoolkit.log("Error rebuilding personal reading order index:", error);
  });
}

export function whenPersonalReadingOrderReady(): Promise<void> {
  return indexReady;
}

export function shutdownPersonalReadingOrder(): void {
  if (notifierID) {
    try {
      Zotero.Notifier.unregisterObserver(notifierID);
    } catch {
      // Ignore.
    }
    notifierID = null;
  }
  orderCache.clear();
  collectionRefByNoteId.clear();
  orderWrites.clear();
  orderListeners.clear();
  orderGeneration = 0;
  indexReady = Promise.resolve();
}
