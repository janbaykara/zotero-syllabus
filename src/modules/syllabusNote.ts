/**
 * Collection syllabus note: find/create/parse/save plus the in-memory document cache.
 * Hot-path reads never call getNote(); they only index the parsed cache.
 */

import { ExtraFieldTool } from "zotero-plugin-toolkit";
import {
  CollectionSyllabusDocumentEntity,
  CollectionSyllabusDocumentSchema,
  COLLECTION_SYLLABUS_DOCUMENT_VERSION,
  ItemSyllabusAssignmentEntity,
  ItemSyllabusDataEntity,
  SettingsSyllabusMetadataSchema,
  assignmentClassNumber,
  classesToNumberKeyed,
  hydrateAssignment,
  mergeNumberKeyedClasses,
  persistAssignment,
  type CollectionSyllabusDocument,
  type ItemSyllabusAssignment,
  type ItemSyllabusData,
  type SettingsCollectionDictionaryData,
  type SettingsSyllabusMetadata,
} from "../utils/schemas";
import {
  getCachedCollection,
  getCachedCollectionById,
  getCachedItem,
} from "../utils/cache";
import { getAllCollections } from "../utils/zotero";
import { formatReadingDate } from "../utils/dates";

type CollectionIdentifier =
  | number
  | Parameters<typeof Zotero.Collections.getByLibraryAndKey>;

export const SYLLABUS_NOTE_TAG = "zotero-syllabus";
export const SYLLABUS_NOTE_TITLE = "Syllabus";
export const SYLLABUS_EXTRA_KEY = "syllabus";
export const SYLLABUS_NOTE_PRE_ATTR = "data-zotero-syllabus";

const extraFieldTool = new ExtraFieldTool();

type CachedDocument = {
  collectionRef: string;
  noteId: number | null;
  noteVersion: number;
  document: CollectionSyllabusDocument;
  snapshot: string;
};

const documentCache = new Map<string, CachedDocument>();
const collectionRefByNoteId = new Map<number, string>();
const writeQueues = new Map<string, Promise<unknown>>();
const documentListeners = new Set<() => void>();

let indexBuilt = false;
let notifierID: string | null = null;
let documentGeneration = 0;
let indexReady: Promise<void> = Promise.resolve();

export function subscribeToSyllabusDocumentChanges(
  listener: () => void,
): () => void {
  documentListeners.add(listener);
  return () => {
    documentListeners.delete(listener);
  };
}

function notifyDocumentListeners(): void {
  for (const listener of [...documentListeners]) {
    try {
      listener();
    } catch (error) {
      ztoolkit.log("Syllabus document listener error:", error);
    }
  }
}

function collectionRef(libraryID: number, key: string): string {
  return `${libraryID}:${key}`;
}

function collectionRefFromCollection(collection: Zotero.Collection): string {
  return collectionRef(collection.libraryID, collection.key);
}

export function emptyCollectionDocument(): CollectionSyllabusDocument {
  return CollectionSyllabusDocumentSchema.parse({
    version: COLLECTION_SYLLABUS_DOCUMENT_VERSION,
    items: {},
  });
}

export function metadataFromDocument(
  document: CollectionSyllabusDocument,
): SettingsSyllabusMetadata {
  return SettingsSyllabusMetadataSchema.parse({
    ...document,
    classes: classesToNumberKeyed(document.classes),
  });
}

export function getHydratedItemAssignments(
  document: CollectionSyllabusDocument,
  itemKey: string,
): ItemSyllabusAssignment[] {
  return (document.items[itemKey] || []).map((assignment) =>
    hydrateAssignment(assignment, document.classes),
  );
}

export function buildItemIndex(
  collection: Zotero.Collection,
  document: CollectionSyllabusDocument,
): NonNullable<CollectionSyllabusDocument["itemIndex"]> {
  const index: NonNullable<CollectionSyllabusDocument["itemIndex"]> = {};
  for (const itemKey of Object.keys(document.items || {})) {
    const item = Zotero.Items.getByLibraryAndKey(collection.libraryID, itemKey);
    if (!item || !item.isRegularItem()) {
      continue;
    }
    const doi = String(item.getField("DOI") || "").trim();
    const isbn = String(item.getField("ISBN") || "").trim();
    index[itemKey] = {
      title: item.getDisplayTitle() || "",
      ...(doi ? { doi } : {}),
      ...(isbn ? { isbn } : {}),
    };
  }
  return index;
}

export function remapDocumentItemKeys(
  document: CollectionSyllabusDocument,
  items: Zotero.Item[],
): CollectionSyllabusDocument {
  const regularItems = items.filter((item) => {
    try {
      return item.isRegularItem();
    } catch {
      return false;
    }
  });
  const byDoi = new Map<string, string>();
  const byIsbn = new Map<string, string>();
  const byTitle = new Map<string, string>();
  const existingKeys = new Set<string>();
  for (const item of regularItems) {
    existingKeys.add(item.key);
    const doi = String(item.getField("DOI") || "")
      .trim()
      .toLowerCase();
    const isbn = String(item.getField("ISBN") || "")
      .replace(/[-\s]/g, "")
      .toLowerCase();
    const title = (item.getDisplayTitle() || "").trim().toLowerCase();
    if (doi) {
      byDoi.set(doi, item.key);
    }
    if (isbn) {
      byIsbn.set(isbn, item.key);
    }
    if (title && !byTitle.has(title)) {
      byTitle.set(title, item.key);
    }
  }

  const itemIndex = document.itemIndex || {};
  const itemsOut: CollectionSyllabusDocument["items"] = {};
  for (const [oldKey, assignments] of Object.entries(document.items || {})) {
    const meta = itemIndex[oldKey];
    const doi = meta?.doi?.trim().toLowerCase();
    const isbn = meta?.isbn?.replace(/[-\s]/g, "").toLowerCase();
    const title = meta?.title?.trim().toLowerCase();
    const newKey =
      (doi && byDoi.get(doi)) ||
      (isbn && byIsbn.get(isbn)) ||
      (title && byTitle.get(title)) ||
      (existingKeys.has(oldKey) ? oldKey : undefined) ||
      oldKey;
    itemsOut[newKey] = [...(itemsOut[newKey] || []), ...assignments];
  }

  const { itemIndex: _itemIndex, ...rest } = document;
  return { ...rest, items: itemsOut };
}

function persistDocument(
  document: CollectionSyllabusDocument,
): CollectionSyllabusDocument {
  const classes = { ...(document.classes || {}) };
  const items: CollectionSyllabusDocument["items"] = {};
  for (const [itemKey, assignments] of Object.entries(document.items || {})) {
    const persisted = assignments.map((assignment) =>
      persistAssignment(assignment, classes),
    );
    if (persisted.length) {
      items[itemKey] = persisted;
    }
  }
  return {
    ...document,
    version: COLLECTION_SYLLABUS_DOCUMENT_VERSION,
    classes,
    items,
  };
}

function snapshotOf(document: CollectionSyllabusDocument): string {
  return JSON.stringify(document);
}

/** Plugin sandbox global is a plain object; `structuredClone` is often missing. */
function cloneDocument<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function logSyllabusError(message: string, error: unknown): void {
  const detail =
    error instanceof Error
      ? `${error.name}: ${error.message}\n${error.stack || ""}`
      : String(error);
  ztoolkit.log(message, detail);
  try {
    Zotero.log(`${message} ${detail}`, "error");
  } catch {
    // Error console may be unavailable during shutdown.
  }
}

function setCacheEntry(
  ref: string,
  noteId: number | null,
  noteVersion: number,
  document: CollectionSyllabusDocument,
): CachedDocument {
  const entry: CachedDocument = {
    collectionRef: ref,
    noteId,
    noteVersion,
    document,
    snapshot: snapshotOf(document),
  };
  documentCache.set(ref, entry);
  if (noteId !== null) {
    collectionRefByNoteId.set(noteId, ref);
  }
  documentGeneration++;
  notifyDocumentListeners();
  return entry;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function unescapeHtml(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

function displayValue(value: unknown): string {
  if (value === undefined || value === null || value === "") {
    return "";
  }
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  if (Array.isArray(value)) {
    return value.filter(Boolean).join(", ");
  }
  return String(value);
}

function tableCell(value: unknown): string {
  const text = displayValue(value);
  return `<td><p>${escapeHtml(text).replace(/\n/g, "<br/>")}</p></td>`;
}

function kvTable(rows: Array<[string, unknown]>): string {
  const visible = rows.filter(([, value]) => displayValue(value) !== "");
  if (visible.length === 0) {
    return "<p><i>None</i></p>";
  }
  const body = visible
    .map(
      ([key, value]) =>
        `<tr><th><p>${escapeHtml(key)}</p></th>${tableCell(value)}</tr>`,
    )
    .join("");
  return `<table><tbody>${body}</tbody></table>`;
}

function dataTable(headers: string[], rows: unknown[][]): string {
  if (rows.length === 0) {
    return "<p><i>None</i></p>";
  }
  const head = `<tr>${headers.map((header) => `<th><p>${escapeHtml(header)}</p></th>`).join("")}</tr>`;
  const body = rows
    .map((row) => `<tr>${row.map((cell) => tableCell(cell)).join("")}</tr>`)
    .join("");
  return `<table><tbody>${head}${body}</tbody></table>`;
}

function itemTitlesByKey(
  collection?: Zotero.Collection | null,
): Map<string, string> {
  const titles = new Map<string, string>();
  if (!collection) {
    return titles;
  }
  try {
    for (const item of collection.getChildItems()) {
      titles.set(item.key, item.getDisplayTitle() || "");
    }
  } catch {
    // Collection children are display-only; missing titles still show keys.
  }
  return titles;
}

function itemDisplayTitle(
  itemKey: string,
  titles: Map<string, string>,
): string {
  return titles.get(itemKey) || itemKey;
}

function assignmentTitleById(
  document: CollectionSyllabusDocument,
  titles: Map<string, string>,
): Map<string, string> {
  const byId = new Map<string, string>();
  for (const [itemKey, assignments] of Object.entries(document.items || {})) {
    const title = itemDisplayTitle(itemKey, titles);
    for (const assignment of assignments) {
      if (assignment.id) {
        byId.set(assignment.id, title);
      }
    }
  }
  return byId;
}

function formatItemOrder(
  itemOrder: string[] | undefined,
  assignmentTitles: Map<string, string>,
  titles: Map<string, string>,
): string {
  if (!itemOrder?.length) {
    return "";
  }
  return itemOrder
    .map((id) => assignmentTitles.get(id) || titles.get(id) || id)
    .join(", ");
}

function renderReadableNoteBody(
  document: CollectionSyllabusDocument,
  collection?: Zotero.Collection | null,
): string {
  const titles = itemTitlesByKey(collection);
  const assignmentTitles = assignmentTitleById(document, titles);
  const classRows = Object.entries(document.classes || {})
    .sort(([, a], [, b]) => (a?.number || 0) - (b?.number || 0))
    .map(([, classMeta]) => [
      classMeta?.number,
      classMeta?.title,
      classMeta?.readingDate ? formatReadingDate(classMeta.readingDate) : "",
      classMeta?.status,
      classMeta?.description,
      formatItemOrder(classMeta?.itemOrder, assignmentTitles, titles),
    ]);

  const priorityRows = (document.priorities || []).map((priority) => [
    priority.order,
    priority.name,
    priority.color,
  ]);

  const assignmentRows: unknown[][] = [];
  for (const [itemKey, assignments] of Object.entries(document.items || {})) {
    const title = itemDisplayTitle(itemKey, titles);
    for (const assignment of assignments) {
      assignmentRows.push([
        title,
        assignmentClassNumber(assignment, document.classes),
        assignment.priority,
        assignment.status,
        assignment.classInstruction,
      ]);
    }
  }

  const json = JSON.stringify(document, null, 2);

  return [
    `<h1>${SYLLABUS_NOTE_TITLE}</h1>`,
    "<h2>Course</h2>",
    kvTable([
      ["Institution", document.institution],
      ["Course code", document.courseCode],
      ["Description", document.description],
      ["Terminology", document.nomenclature],
      ["Citation style", document.cslStyle],
      ["Locked", document.locked],
      ["Links", document.links],
    ]),
    "<h2>Priorities</h2>",
    dataTable(["Order", "Name", "Color"], priorityRows),
    "<h2>Classes</h2>",
    dataTable(
      ["#", "Title", "Date", "Status", "Description", "Readings"],
      classRows,
    ),
    "<h2>Readings</h2>",
    dataTable(
      ["Item", "Class", "Priority", "Status", "Instructions"],
      assignmentRows,
    ),
    `<pre ${SYLLABUS_NOTE_PRE_ATTR}="1" data-version="${document.version || COLLECTION_SYLLABUS_DOCUMENT_VERSION}">${escapeHtml(json)}</pre>`,
  ].join("");
}

export function isSyllabusNoteFile(contents: string): boolean {
  return contents.includes(`${SYLLABUS_NOTE_PRE_ATTR}=`);
}

export function getSyllabusNoteFormatVersion(html: string): number | null {
  const pre = html.match(/<pre[^>]*\bdata-zotero-syllabus(?:="[^"]*")?[^>]*>/i);
  if (!pre) {
    return html.includes(`${SYLLABUS_NOTE_PRE_ATTR}=`) ? 1 : null;
  }
  const versionMatch = pre[0].match(/\bdata-version="(\d+)"/i);
  if (versionMatch) {
    return parseInt(versionMatch[1], 10);
  }
  // Original envelope used data-zotero-syllabus="1" as a marker, not a version.
  return 1;
}

function isUnsupportedFutureNote(html: string): boolean {
  const envelopeVersion = getSyllabusNoteFormatVersion(html);
  if (
    envelopeVersion != null &&
    envelopeVersion > COLLECTION_SYLLABUS_DOCUMENT_VERSION
  ) {
    return true;
  }
  const jsonText = extractJsonPayload(html);
  if (!jsonText) {
    return false;
  }
  try {
    const parsed = JSON.parse(jsonText) as { version?: unknown };
    return (
      typeof parsed.version === "number" &&
      parsed.version > COLLECTION_SYLLABUS_DOCUMENT_VERSION
    );
  } catch {
    return false;
  }
}

function noteNeedsFormatPatch(html: string): boolean {
  if (isUnsupportedFutureNote(html)) {
    return false;
  }
  const envelopeVersion = getSyllabusNoteFormatVersion(html);
  return envelopeVersion !== COLLECTION_SYLLABUS_DOCUMENT_VERSION;
}

export function serializeSyllabusNote(
  document: CollectionSyllabusDocument,
  collection?: Zotero.Collection | null,
): string {
  const body = renderReadableNoteBody(document, collection);
  if (typeof Zotero !== "undefined" && Zotero.Notes?.notePrefix) {
    return `${Zotero.Notes.notePrefix}${body}${Zotero.Notes.noteSuffix}`;
  }
  return `<div data-schema-version="9">${body}</div>`;
}

function extractJsonPayload(html: string): string | null {
  const preMatch =
    html.match(
      /<pre[^>]*\bdata-zotero-syllabus(?:="[^"]*")?[^>]*>([\s\S]*?)<\/pre>/i,
    ) || html.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
  if (preMatch) {
    return unescapeHtml(preMatch[1]).trim();
  }

  const stripped = unescapeHtml(html)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "");
  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");
  if (start === -1 || end <= start) {
    return null;
  }
  return stripped.slice(start, end + 1).trim();
}

export function parseSyllabusNote(
  html: string,
): CollectionSyllabusDocument | null {
  if (!html) {
    return null;
  }
  if (isUnsupportedFutureNote(html)) {
    ztoolkit.log(
      "Syllabus note format is newer than this plugin; leaving it unchanged",
    );
    return null;
  }

  const jsonText = extractJsonPayload(html);
  if (!jsonText) {
    return null;
  }

  try {
    const parsed = JSON.parse(jsonText);
    const result = CollectionSyllabusDocumentEntity.safeParse(parsed);
    if (result.type === "ok") {
      return result.value;
    }
    const fallback = CollectionSyllabusDocumentSchema.safeParse(parsed);
    if (fallback.success) {
      return fallback.data;
    }
    ztoolkit.log("Error validating syllabus note JSON:", result.error);
    return null;
  } catch (error) {
    ztoolkit.log("Error parsing syllabus note JSON:", error);
    return null;
  }
}

function itemHasSyllabusTag(item: Zotero.Item): boolean | null {
  try {
    return item.hasTag(SYLLABUS_NOTE_TAG);
  } catch {
    // Tags often aren't loaded on collection children.
    return null;
  }
}

function isSyllabusNote(item: Zotero.Item): boolean {
  try {
    if (!item.isNote() || !item.isTopLevelItem()) {
      return false;
    }
  } catch {
    return false;
  }
  return itemHasSyllabusTag(item) === true;
}

function isLiveSyllabusNote(
  item: Zotero.Item,
  collection: Zotero.Collection,
): boolean {
  try {
    if (item.deleted || !item.isNote() || !item.isTopLevelItem()) {
      return false;
    }
    if (!item.getCollections().includes(collection.id)) {
      return false;
    }
    const tagged = itemHasSyllabusTag(item);
    // Cached notes may not have tags loaded; don't treat that as missing.
    return tagged !== false;
  } catch {
    return false;
  }
}

function isEmptyCollectionDocument(
  document: CollectionSyllabusDocument | null | undefined,
): boolean {
  if (!document) {
    return true;
  }
  return snapshotOf(document) === snapshotOf(emptyCollectionDocument());
}

function collectionNoteCandidates(
  collection: Zotero.Collection,
  includeDeleted = false,
): Zotero.Item[] {
  let children: Zotero.Item[] = [];
  try {
    children = collection.getChildItems(false, includeDeleted);
  } catch (error) {
    ztoolkit.log("Error listing collection items for syllabus note:", error);
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

function looksLikeSyllabusNote(item: Zotero.Item): boolean {
  try {
    if (!item.isNote()) {
      return false;
    }
    const tagged = itemHasSyllabusTag(item);
    if (tagged === true) {
      return true;
    }
    try {
      const title = item.getNoteTitle() || "";
      if (
        title === SYLLABUS_NOTE_TITLE ||
        title.startsWith(SYLLABUS_NOTE_TITLE)
      ) {
        return true;
      }
    } catch {
      // Title isn't required if the tag already matched.
    }
    return false;
  } catch {
    return false;
  }
}

function findSyllabusNoteUncached(
  collection: Zotero.Collection,
  includeDeleted = false,
): Zotero.Item | null {
  const matches = collectionNoteCandidates(collection, includeDeleted).filter(
    (item) => looksLikeSyllabusNote(item),
  );
  if (matches.length === 0) {
    return null;
  }
  matches.sort((a, b) => a.id - b.id);
  return matches[0];
}

/** Re-read the collection note from Zotero; does not trust the in-memory cache. */
export function peekPersistedSyllabusDocument(
  collection: Zotero.Collection,
): CollectionSyllabusDocument | null {
  const note = findSyllabusNoteUncached(collection);
  if (!note) {
    return null;
  }
  try {
    return parseSyllabusNote(note.getNote());
  } catch (error) {
    ztoolkit.log("Error peeking persisted syllabus note:", error);
    return null;
  }
}

function serializeSyllabusNoteFallback(
  document: CollectionSyllabusDocument,
): string {
  const json = JSON.stringify(document, null, 2);
  const body = `<p>${SYLLABUS_NOTE_TITLE}</p><pre ${SYLLABUS_NOTE_PRE_ATTR}="1" data-version="${document.version || COLLECTION_SYLLABUS_DOCUMENT_VERSION}">${escapeHtml(json)}</pre>`;
  if (typeof Zotero !== "undefined" && Zotero.Notes?.notePrefix) {
    return `${Zotero.Notes.notePrefix}${body}${Zotero.Notes.noteSuffix}`;
  }
  return `<div data-schema-version="9">${body}</div>`;
}

function noteHtmlForDocument(
  document: CollectionSyllabusDocument,
  collection?: Zotero.Collection | null,
): string {
  try {
    return serializeSyllabusNote(document, collection);
  } catch (error) {
    ztoolkit.log(
      "Error serializing readable syllabus note, using JSON fallback:",
      error,
    );
    return serializeSyllabusNoteFallback(document);
  }
}

async function persistSyllabusNote(
  note: Zotero.Item,
  collection: Zotero.Collection,
  html: string,
  fallbackHtml: string,
): Promise<Zotero.Item> {
  note.libraryID = collection.libraryID;

  // Zotero 8: create the item first. setNote/addToCollection/addTag on an
  // unsaved note are ignored or throw, which is why Add Class created nothing.
  if (!note.id) {
    await note.saveTx({ skipSelect: true });
  }

  try {
    note.setNote(html);
  } catch (error) {
    ztoolkit.log("setNote(html) failed, using JSON fallback:", error);
    note.setNote(fallbackHtml);
  }

  try {
    note.addToCollection(collection.id);
  } catch (error) {
    ztoolkit.log("addToCollection failed, trying collection.addItem:", error);
    if (note.id) {
      try {
        await collection.addItem(note.id);
      } catch (error2) {
        ztoolkit.log("collection.addItem failed:", error2);
      }
    }
  }

  try {
    note.addTag(SYLLABUS_NOTE_TAG);
  } catch (error) {
    ztoolkit.log("Error tagging syllabus note:", error);
  }

  await note.saveTx({ skipSelect: true });
  return note;
}

function detachNoteFromCache(noteId: number): void {
  const ref = collectionRefByNoteId.get(noteId);
  collectionRefByNoteId.delete(noteId);
  if (!ref) {
    return;
  }
  const cached = documentCache.get(ref);
  if (!cached || cached.noteId !== noteId) {
    return;
  }
  cached.noteId = null;
  cached.noteVersion = 0;
  documentGeneration++;
  notifyDocumentListeners();
}

function resolveCollection(
  collectionId: CollectionIdentifier | Zotero.Collection,
): Zotero.Collection | null {
  try {
    if (
      collectionId &&
      typeof collectionId === "object" &&
      "id" in collectionId
    ) {
      return collectionId as Zotero.Collection;
    }
    const cached = getCachedCollection(collectionId as CollectionIdentifier);
    if (cached) {
      return cached;
    }
    if (typeof collectionId === "number") {
      return Zotero.Collections.get(collectionId) || null;
    }
    return null;
  } catch (error) {
    logSyllabusError("Error resolving collection for syllabus note:", error);
    return null;
  }
}

function parseDocumentFromNote(
  note: Zotero.Item,
  fallback?: CollectionSyllabusDocument,
): CollectionSyllabusDocument {
  try {
    return (
      parseSyllabusNote(note.getNote()) || fallback || emptyCollectionDocument()
    );
  } catch (error) {
    ztoolkit.log("Error parsing syllabus note during cache load:", error);
    return fallback || emptyCollectionDocument();
  }
}

function findLoadedSyllabusNote(
  collection: Zotero.Collection,
): Zotero.Item | null {
  const matches = collectionNoteCandidates(collection).filter((item) => {
    const tagged = itemHasSyllabusTag(item);
    if (tagged === true) {
      return true;
    }
    if (tagged === false) {
      return false;
    }
    try {
      return Boolean(parseSyllabusNote(item.getNote()));
    } catch {
      return false;
    }
  });
  if (matches.length === 0) {
    return null;
  }
  matches.sort((a, b) => a.id - b.id);
  return matches[0];
}

function loadDocumentForCollection(
  collection: Zotero.Collection,
): CachedDocument {
  const ref = collectionRefFromCollection(collection);
  const cached = documentCache.get(ref);
  if (cached?.noteId != null) {
    const note =
      getCachedItem(cached.noteId) || Zotero.Items.get(cached.noteId) || null;
    if (note && isLiveSyllabusNote(note, collection)) {
      if (note.version === cached.noteVersion) {
        return cached;
      }
      let parsed: CollectionSyllabusDocument | null = null;
      try {
        parsed = parseSyllabusNote(note.getNote());
      } catch (error) {
        ztoolkit.log("Error re-reading syllabus note:", error);
      }
      if (parsed && !isEmptyCollectionDocument(parsed)) {
        return setCacheEntry(ref, note.id, note.version, parsed);
      }
      // Keep the in-memory document if Zotero rewrote note HTML.
      cached.noteVersion = note.version;
      return cached;
    }
    detachNoteFromCache(cached.noteId);
  }

  if (cached) {
    return cached;
  }

  const note = findLoadedSyllabusNote(collection);
  if (!note) {
    return setCacheEntry(ref, null, 0, emptyCollectionDocument());
  }
  return setCacheEntry(ref, note.id, note.version, parseDocumentFromNote(note));
}

export function getCollectionDocument(
  collectionId: CollectionIdentifier | Zotero.Collection,
): CollectionSyllabusDocument {
  const collection = resolveCollection(collectionId);
  if (!collection) {
    return emptyCollectionDocument();
  }
  return loadDocumentForCollection(collection).document;
}

export function getCollectionDocumentSnapshot(
  collectionId: CollectionIdentifier | Zotero.Collection,
): string {
  const collection = resolveCollection(collectionId);
  if (!collection) {
    return snapshotOf(emptyCollectionDocument());
  }
  return loadDocumentForCollection(collection).snapshot;
}

export function getSyllabusNoteId(
  collectionId: CollectionIdentifier | Zotero.Collection,
): number | null {
  const collection = resolveCollection(collectionId);
  if (!collection) {
    return null;
  }
  return loadDocumentForCollection(collection).noteId;
}

export function getDocumentGeneration(): number {
  return documentGeneration;
}

function ensureIndex(): void {
  if (indexBuilt) {
    return;
  }
  for (const collection of getAllCollections()) {
    try {
      loadDocumentForCollection(collection);
    } catch (error) {
      ztoolkit.log("Error loading collection syllabus document:", error);
    }
  }
  indexBuilt = true;
}

async function rebuildDocumentIndex(): Promise<void> {
  const notesToPatch: Zotero.Collection[] = [];
  for (const collection of getAllCollections()) {
    try {
      const note = findSyllabusNoteUncached(collection);
      if (!note) {
        continue;
      }
      let html = "";
      try {
        html = note.getNote() || "";
      } catch {
        html = "";
      }
      let parsed: CollectionSyllabusDocument | null = null;
      try {
        parsed = parseSyllabusNote(html);
      } catch {
        parsed = null;
      }
      const ref = collectionRefFromCollection(collection);
      const cached = documentCache.get(ref);
      if (
        parsed &&
        !(
          isEmptyCollectionDocument(parsed) &&
          cached &&
          !isEmptyCollectionDocument(cached.document)
        )
      ) {
        setCacheEntry(ref, note.id, note.version, parsed);
        if (noteNeedsFormatPatch(html)) {
          notesToPatch.push(collection);
        }
      } else if (cached) {
        cached.noteId = note.id;
        cached.noteVersion = note.version;
        collectionRefByNoteId.set(note.id, ref);
      } else if (parsed) {
        setCacheEntry(ref, note.id, note.version, parsed);
        if (noteNeedsFormatPatch(html)) {
          notesToPatch.push(collection);
        }
      }
    } catch (error) {
      ztoolkit.log("Error indexing syllabus note:", error);
    }
  }
  indexBuilt = true;
  documentGeneration++;
  notifyDocumentListeners();
  for (const collection of notesToPatch) {
    try {
      await mutateCollectionDocument(collection, (document) => document);
    } catch (error) {
      ztoolkit.log("Error patching syllabus note format:", error);
    }
  }
}

export function getSyllabusCollectionDictionary(): SettingsCollectionDictionaryData {
  ensureIndex();
  const result: SettingsCollectionDictionaryData = {};
  for (const [ref, entry] of documentCache.entries()) {
    if (entry.noteId === null && isEmptyCollectionDocument(entry.document)) {
      continue;
    }
    result[ref] = metadataFromDocument(entry.document);
  }
  return result;
}

async function getOrCreateSyllabusNote(
  collection: Zotero.Collection,
): Promise<{ note: Zotero.Item; created: boolean }> {
  const live = findSyllabusNoteUncached(collection);
  if (live) {
    return { note: live, created: false };
  }

  const trashed = findSyllabusNoteUncached(collection, true);
  if (trashed) {
    try {
      trashed.deleted = false;
    } catch (error) {
      ztoolkit.log("Error restoring trashed syllabus note:", error);
    }
    return { note: trashed, created: false };
  }

  const note = new Zotero.Item("note");
  note.libraryID = collection.libraryID;
  return { note, created: true };
}

function enqueueWrite<T>(key: string, task: () => Promise<T>): Promise<T> {
  const previous = writeQueues.get(key);
  const waitForPrevious = previous
    ? Promise.race([
        previous.catch(() => undefined),
        new Promise<void>((resolve) => setTimeout(resolve, 2000)),
      ])
    : Promise.resolve();
  const next = waitForPrevious.then(task, task);
  writeQueues.set(
    key,
    next.then(
      () => undefined,
      () => undefined,
    ),
  );
  return next;
}

export async function mutateCollectionDocument(
  collectionId: CollectionIdentifier | Zotero.Collection,
  mutator: (document: CollectionSyllabusDocument) => CollectionSyllabusDocument,
): Promise<CollectionSyllabusDocument> {
  const collection = resolveCollection(collectionId);
  if (!collection) {
    ztoolkit.log("Cannot save syllabus: collection not found", collectionId);
    return emptyCollectionDocument();
  }
  const ref = collectionRefFromCollection(collection);

  return enqueueWrite(ref, async () => {
    try {
      const { note, created } = await getOrCreateSyllabusNote(collection);
      const cached = documentCache.get(ref);
      let fromNote: CollectionSyllabusDocument | null = null;
      if (!created) {
        try {
          const existingHtml = note.getNote();
          if (isUnsupportedFutureNote(existingHtml)) {
            ztoolkit.log(
              "Refusing to overwrite a newer syllabus note format",
              collection.id,
            );
            return (
              documentCache.get(ref)?.document || emptyCollectionDocument()
            );
          }
          fromNote = parseSyllabusNote(existingHtml);
        } catch (error) {
          ztoolkit.log("Error reading existing syllabus note:", error);
        }
      }
      const current =
        (cached?.document && !isEmptyCollectionDocument(cached.document)
          ? cached.document
          : null) ||
        fromNote ||
        emptyCollectionDocument();
      const mutated = persistDocument(mutator(cloneDocument(current)));
      const nextResult = CollectionSyllabusDocumentSchema.safeParse(mutated);
      if (!nextResult.success) {
        ztoolkit.log(
          "Invalid syllabus document after mutation:",
          nextResult.error,
        );
      }
      const next = nextResult.success ? nextResult.data : mutated;
      const html = noteHtmlForDocument(next, collection);
      const fallbackHtml = serializeSyllabusNoteFallback(next);
      setCacheEntry(ref, note.id || null, (note.version || 0) + 1, next);
      const saved = await persistSyllabusNote(
        note,
        collection,
        html,
        fallbackHtml,
      );
      setCacheEntry(ref, saved.id, saved.version, next);
      return next;
    } catch (error) {
      logSyllabusError("Error saving syllabus note:", error);
      return documentCache.get(ref)?.document || emptyCollectionDocument();
    }
  });
}

export async function setCollectionDocumentMetadata(
  collectionId: CollectionIdentifier | Zotero.Collection,
  metadata: SettingsSyllabusMetadata,
): Promise<CollectionSyllabusDocument> {
  return mutateCollectionDocument(collectionId, (document) => ({
    ...document,
    ...metadata,
    version: COLLECTION_SYLLABUS_DOCUMENT_VERSION,
    classes: mergeNumberKeyedClasses(document.classes, metadata.classes),
    items: document.items,
  }));
}

export async function setItemAssignmentsInDocument(
  collectionId: CollectionIdentifier | Zotero.Collection,
  itemKey: string,
  assignments: ItemSyllabusAssignment[],
): Promise<CollectionSyllabusDocument> {
  return mutateCollectionDocument(collectionId, (document) => {
    const items = { ...document.items };
    if (!assignments.length) {
      delete items[itemKey];
    } else {
      items[itemKey] = assignments;
    }
    return { ...document, items };
  });
}

export async function mergeItemAssignmentsInDocument(
  collectionId: CollectionIdentifier | Zotero.Collection,
  updates: Record<string, ItemSyllabusAssignment[]>,
): Promise<CollectionSyllabusDocument> {
  return mutateCollectionDocument(collectionId, (document) => ({
    ...document,
    items: { ...document.items, ...updates },
  }));
}

function pickAssignmentsFromExtra(
  extraData: ItemSyllabusData,
  collection: Zotero.Collection,
): ItemSyllabusAssignment[] | null {
  const ref = collectionRefFromCollection(collection);
  if (extraData[ref]?.length) {
    return extraData[ref];
  }
  const keys = Object.keys(extraData);
  if (keys.length === 0) {
    return null;
  }
  const first = extraData[keys[0]];
  return Array.isArray(first) && first.length ? first : null;
}

function readSyllabusExtra(item: Zotero.Item): ItemSyllabusData | null {
  const extraText = item.getField("extra");
  if (!extraText || !String(extraText).includes(`${SYLLABUS_EXTRA_KEY}:`)) {
    return null;
  }
  const jsonStr = extraFieldTool.getExtraField(item, SYLLABUS_EXTRA_KEY);
  if (!jsonStr) {
    return null;
  }
  try {
    const parsed = JSON.parse(jsonStr);
    const result = ItemSyllabusDataEntity.safeParse(parsed);
    if (result.type !== "ok") {
      return null;
    }
    return result.value;
  } catch {
    return null;
  }
}

async function clearSyllabusExtra(item: Zotero.Item): Promise<void> {
  const fields = extraFieldTool.getExtraFields(item);
  if (!fields.has(SYLLABUS_EXTRA_KEY)) {
    return;
  }
  fields.delete(SYLLABUS_EXTRA_KEY);
  await extraFieldTool.replaceExtraFields(item, fields);
}

function stripAssignmentStatus(
  assignments: ItemSyllabusAssignment[],
): ItemSyllabusAssignment[] {
  return assignments.map((assignment) => {
    const parsed = ItemSyllabusAssignmentEntity.safeParse({
      ...assignment,
      status: null,
    });
    return parsed.type === "ok"
      ? parsed.value
      : { ...assignment, status: null };
  });
}

export async function absorbSyllabusExtraFromItems(
  items: Zotero.Item[],
): Promise<void> {
  const byCollection = new Map<
    number,
    {
      collection: Zotero.Collection;
      updates: Record<string, ItemSyllabusAssignment[]>;
    }
  >();
  const toClear: Zotero.Item[] = [];

  for (const item of items) {
    if (!item?.isRegularItem()) {
      continue;
    }
    const extraData = readSyllabusExtra(item);
    if (!extraData) {
      continue;
    }

    const collectionIds = item.getCollections();
    let absorbed = false;
    for (const collectionId of collectionIds) {
      const collection = getCachedCollectionById(collectionId);
      if (!collection) {
        continue;
      }
      const assignments = pickAssignmentsFromExtra(extraData, collection);
      if (!assignments) {
        continue;
      }
      const bucket = byCollection.get(collection.id) || {
        collection,
        updates: {},
      };
      bucket.updates[item.key] = stripAssignmentStatus(assignments);
      byCollection.set(collection.id, bucket);
      absorbed = true;
    }

    if (absorbed) {
      toClear.push(item);
    }
  }

  for (const { collection, updates } of byCollection.values()) {
    await mergeItemAssignmentsInDocument(collection, updates);
  }
  for (const item of toClear) {
    await clearSyllabusExtra(item);
  }
}

function parseCollectionItemId(id: number | string): number | null {
  if (typeof id === "number") {
    return id;
  }
  const parts = String(id).split("-");
  const itemId = parseInt(parts[parts.length - 1], 10);
  return Number.isNaN(itemId) ? null : itemId;
}

function handleNoteChange(item: Zotero.Item, event: string): void {
  if (!item.isNote()) {
    return;
  }
  if (event === "delete" || event === "remove" || item.deleted) {
    detachNoteFromCache(item.id);
    return;
  }

  const tagged = itemHasSyllabusTag(item);
  if (tagged === false) {
    detachNoteFromCache(item.id);
    return;
  }
  if (tagged === null && !collectionRefByNoteId.has(item.id)) {
    return;
  }

  const collectionIds = item.getCollections();
  if (collectionIds.length === 0) {
    detachNoteFromCache(item.id);
    return;
  }
  let parsed: CollectionSyllabusDocument | null = null;
  try {
    parsed = parseSyllabusNote(item.getNote());
  } catch (error) {
    ztoolkit.log("Error parsing syllabus note from notifier:", error);
  }
  for (const collectionId of collectionIds) {
    const collection = getCachedCollectionById(collectionId);
    if (!collection) {
      continue;
    }
    const ref = collectionRefFromCollection(collection);
    const cached = documentCache.get(ref);
    if (
      cached &&
      cached.noteId === item.id &&
      cached.noteVersion === item.version
    ) {
      continue;
    }
    if (
      !parsed ||
      (isEmptyCollectionDocument(parsed) &&
        cached &&
        !isEmptyCollectionDocument(cached.document))
    ) {
      if (cached?.document) {
        cached.noteId = item.id;
        cached.noteVersion = item.version;
        collectionRefByNoteId.set(item.id, ref);
      }
      continue;
    }
    setCacheEntry(ref, item.id, item.version, parsed);
  }
}

export function initializeSyllabusNotes(): void {
  // Hot reload can leave a hung write promise in this map. Always drop it so
  // Add Class / Create assignment are not queued behind a dead lock.
  writeQueues.clear();
  if (notifierID) {
    return;
  }

  const observer = {
    notify(
      event: string,
      type: string,
      ids: (number | string)[],
      _extraData: { [key: string]: unknown },
    ) {
      if (type === "item") {
        const numericIds = ids.filter(
          (id): id is number => typeof id === "number",
        );
        if (event === "delete") {
          for (const id of numericIds) {
            detachNoteFromCache(id);
          }
          return;
        }

        const extrasToAbsorb: Zotero.Item[] = [];
        for (const id of numericIds) {
          const item = getCachedItem(id) || Zotero.Items.get(id);
          if (!item) {
            detachNoteFromCache(id);
            continue;
          }
          if (item.isNote()) {
            handleNoteChange(item, event);
            continue;
          }
          if (item.isRegularItem() && (event === "add" || event === "modify")) {
            extrasToAbsorb.push(item);
          }
        }
        if (extrasToAbsorb.length > 0) {
          absorbSyllabusExtraFromItems(extrasToAbsorb).catch((error) => {
            ztoolkit.log("Error absorbing syllabus Extra into note:", error);
          });
        }
      }

      if (type === "collection-item") {
        const extrasToAbsorb: Zotero.Item[] = [];
        for (const id of ids) {
          const itemId = parseCollectionItemId(id);
          if (itemId === null) {
            continue;
          }
          const item = getCachedItem(itemId) || Zotero.Items.get(itemId);
          if (!item) {
            continue;
          }
          if (item.isNote()) {
            handleNoteChange(item, event);
          } else if (item.isRegularItem()) {
            extrasToAbsorb.push(item);
          }
        }
        if (extrasToAbsorb.length > 0) {
          absorbSyllabusExtraFromItems(extrasToAbsorb).catch((error) => {
            ztoolkit.log("Error absorbing syllabus Extra into note:", error);
          });
        }
        documentGeneration++;
        notifyDocumentListeners();
      }
    },
  };

  notifierID = Zotero.Notifier.registerObserver(observer, [
    "item",
    "collection-item",
  ]);
  indexReady = rebuildDocumentIndex().catch((error) => {
    ztoolkit.log("Error rebuilding syllabus note index:", error);
  });
}

export function whenSyllabusNotesReady(): Promise<void> {
  return indexReady;
}

export function shutdownSyllabusNotes(): void {
  if (notifierID) {
    Zotero.Notifier.unregisterObserver(notifierID);
    notifierID = null;
  }
  documentCache.clear();
  collectionRefByNoteId.clear();
  writeQueues.clear();
  documentListeners.clear();
  indexBuilt = false;
  documentGeneration = 0;
  indexReady = Promise.resolve();
}

export function invalidateCollectionDocument(
  collectionId: CollectionIdentifier | Zotero.Collection,
): void {
  const collection = resolveCollection(collectionId);
  if (!collection) {
    return;
  }
  const ref = collectionRefFromCollection(collection);
  const cached = documentCache.get(ref);
  if (cached?.noteId) {
    collectionRefByNoteId.delete(cached.noteId);
  }
  documentCache.delete(ref);
  documentGeneration++;
}
