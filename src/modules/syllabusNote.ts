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
  DEFAULT_PRIORITIES,
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
import { generateBibliographicReference } from "../utils/cite";
import {
  classSubcollectionKeysChanged,
  classSubcollectionName,
  classSubcollectionNameBase,
  clearManagedSubcollections,
  clearStaleSubcollectionKey,
  enqueueClassFolderEnsure,
  enqueueClassSubcollectionItemSync,
  ensureClassSubcollections,
  isClassFolderSyncHeld,
  parentCollectionForManagedId,
  rememberManagedSubcollections,
} from "./classSubcollections";

type CollectionIdentifier =
  | number
  | Parameters<typeof Zotero.Collections.getByLibraryAndKey>;

export const SYLLABUS_NOTE_TAG = "zotero-syllabus";
export const SYLLABUS_NOTE_TITLE = "Syllabus";
export const SYLLABUS_EXTRA_KEY = "syllabus";
export const SYLLABUS_NOTE_PRE_ATTR = "data-zotero-syllabus";
const PLUGIN_JSON_HEADING = "Plugin data (do not edit)";
const PLUGIN_REPO_URL = "https://github.com/janbaykara/zotero-syllabus";

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

function paragraph(text: string | null | undefined): string {
  const trimmed = (text || "").trim();
  return trimmed ? `<p>${escapeHtml(trimmed)}</p>` : "";
}

function heading(level: 1 | 3, text: string): string {
  const trimmed = text.trim();
  return trimmed ? `<h${level}>${escapeHtml(trimmed)}</h${level}>` : "";
}

function bulletList(items: string[]): string {
  if (items.length === 0) {
    return "";
  }
  const lis = items
    .map((item) => `<li><p>${escapeHtml(item)}</p></li>`)
    .join("");
  return `<ul>${lis}</ul>`;
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

function getCollectionItem(
  collection: Zotero.Collection | null | undefined,
  itemKey: string,
): Zotero.Item | null {
  if (!collection) {
    return null;
  }
  try {
    const item = Zotero.Items.getByLibraryAndKey(collection.libraryID, itemKey);
    if (item && item.isRegularItem()) {
      return item;
    }
  } catch {
    // Item may have been deleted.
  }
  return null;
}

type ClassReading = {
  itemKey: string;
  assignment: ItemSyllabusAssignment;
};

function gatherClassReadings(
  classId: string,
  classNumber: number | undefined,
  itemOrder: string[] | undefined,
  document: CollectionSyllabusDocument,
): ClassReading[] {
  const assigned: ClassReading[] = [];
  for (const [itemKey, assignments] of Object.entries(document.items || {})) {
    for (const assignment of assignments) {
      const number = assignmentClassNumber(assignment, document.classes);
      if (
        assignment.classId === classId ||
        (classNumber !== undefined && number === classNumber)
      ) {
        assigned.push({ itemKey, assignment });
      }
    }
  }

  const byId = new Map<string, ClassReading>();
  for (const row of assigned) {
    if (row.assignment.id) {
      byId.set(row.assignment.id, row);
    }
    byId.set(row.itemKey, row);
  }

  const used = new Set<string>();
  const result: ClassReading[] = [];
  const add = (row: ClassReading) => {
    const key = row.assignment.id || row.itemKey;
    if (used.has(key)) {
      return;
    }
    used.add(key);
    result.push(row);
  };

  for (const id of itemOrder || []) {
    const match = byId.get(id);
    if (match) {
      add(match);
    }
  }
  for (const row of assigned) {
    add(row);
  }
  return result;
}

function gatherFurtherReadings(
  document: CollectionSyllabusDocument,
): ClassReading[] {
  const result: ClassReading[] = [];
  for (const [itemKey, assignments] of Object.entries(document.items || {})) {
    for (const assignment of assignments) {
      if (
        assignment.classId ||
        assignmentClassNumber(assignment, document.classes) !== undefined
      ) {
        continue;
      }
      result.push({ itemKey, assignment });
    }
  }
  return result;
}

function priorityMeta(
  document: CollectionSyllabusDocument,
  priorityId: string | undefined,
) {
  if (!priorityId) {
    return undefined;
  }
  const list =
    document.priorities && document.priorities.length > 0
      ? document.priorities
      : DEFAULT_PRIORITIES;
  return list.find((priority) => priority.id === priorityId);
}

function sortReadingsByPriority(
  readings: ClassReading[],
  document: CollectionSyllabusDocument,
): ClassReading[] {
  return [...readings].sort((a, b) => {
    const orderA = priorityMeta(document, a.assignment.priority)?.order ?? 999;
    const orderB = priorityMeta(document, b.assignment.priority)?.order ?? 999;
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    return 0;
  });
}

function formatReadingLine(
  priorityName: string,
  citation: string,
  instruction: string,
): string {
  const parts: string[] = [];
  if (priorityName) {
    parts.push(`[${priorityName}]`);
  }
  parts.push(citation);
  if (instruction) {
    parts.push(instruction);
  }
  return parts.join(" - ");
}

async function citationForItem(
  item: Zotero.Item | null,
  fallbackTitle: string,
  styleUrl: string | null | undefined,
): Promise<string> {
  if (!item) {
    return fallbackTitle;
  }
  try {
    const ref = await generateBibliographicReference(item, true, styleUrl);
    const cleaned = (ref || "").replace(/\s+/g, " ").trim();
    return cleaned || fallbackTitle;
  } catch {
    return fallbackTitle;
  }
}

async function readingLines(
  readings: ClassReading[],
  document: CollectionSyllabusDocument,
  collection: Zotero.Collection | null | undefined,
  titles: Map<string, string>,
): Promise<string[]> {
  const style = document.cslStyle || null;
  return Promise.all(
    readings.map(async (row) => {
      const item = getCollectionItem(collection, row.itemKey);
      const citation = await citationForItem(
        item,
        titles.get(row.itemKey) || row.itemKey,
        style,
      );
      const priorityName =
        priorityMeta(document, row.assignment.priority)?.name || "";
      return formatReadingLine(
        priorityName,
        citation,
        (row.assignment.classInstruction || "").trim(),
      );
    }),
  );
}

function classHeading(
  nomenclature: string | undefined,
  number: number,
  title: string | null | undefined,
): string {
  return classSubcollectionName(nomenclature, number, title);
}

function pluginJsonBlock(document: CollectionSyllabusDocument): string {
  const json = JSON.stringify(document, null, 2);
  const repoHref = escapeHtml(PLUGIN_REPO_URL);
  return [
    heading(3, PLUGIN_JSON_HEADING),
    `<p>This JSON is the machine-readable syllabus used by the <a href="${repoHref}">Zotero Syllabus</a> plugin. Do not edit it: the plugin treats it as the source of truth and will overwrite the readable text above.</p>`,
    `<pre ${SYLLABUS_NOTE_PRE_ATTR}="1" data-version="${document.version || COLLECTION_SYLLABUS_DOCUMENT_VERSION}">${escapeHtml(json)}</pre>`,
  ].join("");
}

function courseByline(
  courseCode: string | null | undefined,
  institution: string | null | undefined,
): string {
  return [courseCode?.trim(), institution?.trim()].filter(Boolean).join(" - ");
}

function linksBlock(links: string[] | undefined): string {
  const urls = (links || []).map((link) => link.trim()).filter(Boolean);
  if (urls.length === 0) {
    return "";
  }
  const items = urls
    .map((url) => {
      const href = escapeHtml(url);
      return `<li><p><a href="${href}">${href}</a></p></li>`;
    })
    .join("");
  return `<ul>${items}</ul>`;
}

async function renderReadableNoteBody(
  document: CollectionSyllabusDocument,
  collection?: Zotero.Collection | null,
): Promise<string> {
  const titles = itemTitlesByKey(collection);
  const classes = Object.entries(document.classes || {}).sort(
    ([, a], [, b]) => (a?.number || 0) - (b?.number || 0),
  );

  const classSections: string[] = [];
  for (const [classId, classMeta] of classes) {
    if (!classMeta?.number) {
      continue;
    }
    const readings = sortReadingsByPriority(
      gatherClassReadings(
        classId,
        classMeta.number,
        classMeta.itemOrder,
        document,
      ),
      document,
    );
    const date = classMeta.readingDate
      ? formatReadingDate(classMeta.readingDate)
      : "";
    const status = (classMeta.status || "").trim();
    const metaLine = [date, status].filter(Boolean).join(" - ");
    const lines = await readingLines(readings, document, collection, titles);
    classSections.push(
      [
        heading(
          3,
          classHeading(
            document.nomenclature,
            classMeta.number,
            classMeta.title,
          ),
        ),
        paragraph(metaLine),
        paragraph(classMeta.description),
        bulletList(lines),
      ]
        .filter(Boolean)
        .join(""),
    );
  }

  const further = sortReadingsByPriority(
    gatherFurtherReadings(document),
    document,
  );
  const furtherLines = await readingLines(
    further,
    document,
    collection,
    titles,
  );

  return [
    heading(1, collection?.name || SYLLABUS_NOTE_TITLE),
    paragraph(courseByline(document.courseCode, document.institution)),
    paragraph(document.description),
    linksBlock(document.links),
    ...classSections,
    ...(furtherLines.length
      ? [heading(3, "Further reading"), bulletList(furtherLines)]
      : []),
    pluginJsonBlock(document),
  ]
    .filter(Boolean)
    .join("");
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

function noteNeedsFormatPatch(
  html: string,
  document?: CollectionSyllabusDocument,
): boolean {
  if (isUnsupportedFutureNote(html)) {
    return false;
  }
  const envelopeVersion = getSyllabusNoteFormatVersion(html);
  if (envelopeVersion !== COLLECTION_SYLLABUS_DOCUMENT_VERSION) {
    return true;
  }
  if (!html.includes(PLUGIN_JSON_HEADING) || !html.includes(PLUGIN_REPO_URL)) {
    return true;
  }
  if (
    /<table[\s>]/i.test(html) ||
    /<h2>Classes<\/h2>/i.test(html) ||
    /<h2>Course<\/h2>/i.test(html) ||
    /<h2>Priorities<\/h2>/i.test(html) ||
    /<h2>Readings<\/h2>/i.test(html)
  ) {
    return true;
  }
  const links = (document?.links || [])
    .map((link) => link.trim())
    .filter(Boolean);
  if (links.length === 0) {
    return false;
  }
  const readable = html.split(/<pre\b/i)[0] || "";
  return links.some((link) => {
    const href = escapeHtml(link);
    return !readable.includes(`href="${href}"`) && !readable.includes(link);
  });
}

export async function serializeSyllabusNote(
  document: CollectionSyllabusDocument,
  collection?: Zotero.Collection | null,
): Promise<string> {
  const body = await renderReadableNoteBody(document, collection);
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

/** Prefer the note when it parses; keep in-flight cache fields the note lacks. */
function documentForWrite(
  fromNote: CollectionSyllabusDocument | null,
  cached: CollectionSyllabusDocument | undefined,
): CollectionSyllabusDocument {
  const cachedDoc =
    cached && !isEmptyCollectionDocument(cached) ? cached : null;
  if (fromNote && cachedDoc) {
    return {
      ...fromNote,
      ...cachedDoc,
      classes: { ...(fromNote.classes || {}), ...(cachedDoc.classes || {}) },
      items: { ...(fromNote.items || {}), ...(cachedDoc.items || {}) },
    };
  }
  return fromNote || cachedDoc || emptyCollectionDocument();
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
  const body = `<p>${SYLLABUS_NOTE_TITLE}</p>${pluginJsonBlock(document)}`;
  if (typeof Zotero !== "undefined" && Zotero.Notes?.notePrefix) {
    return `${Zotero.Notes.notePrefix}${body}${Zotero.Notes.noteSuffix}`;
  }
  return `<div data-schema-version="9">${body}</div>`;
}

async function noteHtmlForDocument(
  document: CollectionSyllabusDocument,
  collection?: Zotero.Collection | null,
): Promise<string> {
  try {
    return await serializeSyllabusNote(document, collection);
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

/** Class folders are not syllabi; reads and writes go to the parent note. */
function resolveSyllabusRoot(collection: Zotero.Collection): Zotero.Collection {
  const managedParent = parentCollectionForManagedId(collection.id);
  if (managedParent) {
    return managedParent;
  }
  if (!collection.parentID) {
    return collection;
  }
  const parent =
    getCachedCollectionById(collection.parentID) ||
    Zotero.Collections.get(collection.parentID);
  if (!parent) {
    return collection;
  }
  const parentEntry = documentCache.get(collectionRefFromCollection(parent));
  if (parentEntry?.noteId) {
    return parent;
  }
  const isManagedChild = Object.values(
    parentEntry?.document.classes || {},
  ).some((meta) => meta?.subcollectionKey === collection.key);
  return isManagedChild ? parent : collection;
}

function resolveSyllabusCollection(
  collectionId: CollectionIdentifier | Zotero.Collection,
): Zotero.Collection | null {
  const collection = resolveCollection(collectionId);
  return collection ? resolveSyllabusRoot(collection) : null;
}

export type ClassSubcollectionContext = {
  parent: Zotero.Collection;
  classId: string | null;
  classNumber: number | null;
};

/** If this collection is a folder under a syllabus, return the parent (and class when known). */
export function getClassSubcollectionContext(
  collectionId: CollectionIdentifier | Zotero.Collection,
): ClassSubcollectionContext | null {
  const collection = resolveCollection(collectionId);
  if (!collection) {
    return null;
  }
  const parent = resolveSyllabusRoot(collection);
  if (parent.id === collection.id) {
    return null;
  }
  const document = loadDocumentForCollection(parent).document;
  const classes = document.classes || {};
  for (const [classId, meta] of Object.entries(classes)) {
    if (!meta?.number) {
      continue;
    }
    if (meta.subcollectionKey === collection.key) {
      return { parent, classId, classNumber: meta.number };
    }
  }
  for (const [classId, meta] of Object.entries(classes)) {
    if (!meta?.number) {
      continue;
    }
    if (
      classSubcollectionName(document.nomenclature, meta.number, meta.title) ===
      classSubcollectionNameBase(collection.name)
    ) {
      return { parent, classId, classNumber: meta.number };
    }
  }
  return { parent, classId: null, classNumber: null };
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
  const collection = resolveSyllabusCollection(collectionId);
  if (!collection) {
    return emptyCollectionDocument();
  }
  return loadDocumentForCollection(collection).document;
}

export function getCollectionDocumentSnapshot(
  collectionId: CollectionIdentifier | Zotero.Collection,
): string {
  const collection = resolveSyllabusCollection(collectionId);
  if (!collection) {
    return snapshotOf(emptyCollectionDocument());
  }
  return loadDocumentForCollection(collection).snapshot;
}

export function getSyllabusNoteId(
  collectionId: CollectionIdentifier | Zotero.Collection,
): number | null {
  const collection = resolveSyllabusCollection(collectionId);
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
        if (noteNeedsFormatPatch(html, parsed)) {
          notesToPatch.push(collection);
        }
      } else if (cached) {
        cached.noteId = note.id;
        cached.noteVersion = note.version;
        collectionRefByNoteId.set(note.id, ref);
      } else if (parsed) {
        setCacheEntry(ref, note.id, note.version, parsed);
        if (noteNeedsFormatPatch(html, parsed)) {
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
  const patchedIds = new Set(notesToPatch.map((collection) => collection.id));
  for (const collection of notesToPatch) {
    try {
      await mutateCollectionDocument(collection, (document) => document);
    } catch (error) {
      ztoolkit.log("Error patching syllabus note format:", error);
    }
  }
  for (const collection of getAllCollections()) {
    const entry = documentCache.get(collectionRefFromCollection(collection));
    if (
      !entry?.noteId ||
      !Object.keys(entry.document.classes || {}).length ||
      patchedIds.has(collection.id)
    ) {
      continue;
    }
    try {
      rememberManagedSubcollections(collection, entry.document);
      const ensured = await enqueueClassFolderEnsure(collection, () =>
        ensureClassSubcollections(collection, entry.document, entry.document),
      );
      if (!ensured) {
        continue;
      }
      if (classSubcollectionKeysChanged(entry.document, ensured)) {
        await mutateCollectionDocument(collection, () => ensured);
      } else {
        await enqueueClassSubcollectionItemSync(collection, ensured);
      }
    } catch (error) {
      ztoolkit.log("Error syncing class subcollections:", error);
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
  const collection = resolveSyllabusCollection(collectionId);
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
      const current = documentForWrite(fromNote, cached?.document);
      const mutated = persistDocument(mutator(cloneDocument(current)));
      const nextResult = CollectionSyllabusDocumentSchema.safeParse(mutated);
      if (!nextResult.success) {
        ztoolkit.log(
          "Invalid syllabus document after mutation:",
          nextResult.error,
        );
      }
      let next = nextResult.success ? nextResult.data : mutated;
      setCacheEntry(ref, note.id || null, (note.version || 0) + 1, next);
      try {
        const ensured = await enqueueClassFolderEnsure(collection, () =>
          ensureClassSubcollections(collection, next, current),
        );
        if (ensured) {
          next = ensured;
        }
        setCacheEntry(ref, note.id || null, (note.version || 0) + 1, next);
      } catch (error) {
        ztoolkit.log("Error ensuring class subcollections:", error);
      }
      const html = await noteHtmlForDocument(next, collection);
      const fallbackHtml = serializeSyllabusNoteFallback(next);
      setCacheEntry(ref, note.id || null, (note.version || 0) + 1, next);
      const saved = await persistSyllabusNote(
        note,
        collection,
        html,
        fallbackHtml,
      );
      setCacheEntry(ref, saved.id, saved.version, next);
      try {
        await enqueueClassSubcollectionItemSync(collection, next);
      } catch (error) {
        ztoolkit.log("Error syncing class subcollection items:", error);
      }
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
      if (resolveSyllabusRoot(collection).id !== collection.id) {
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

function parseCollectionItemCollectionId(id: number | string): number | null {
  if (typeof id === "number") {
    return null;
  }
  const dash = String(id).indexOf("-");
  if (dash <= 0) {
    return null;
  }
  const collectionId = parseInt(String(id).slice(0, dash), 10);
  return Number.isNaN(collectionId) ? null : collectionId;
}

function restoreManagedSubcollectionItems(collectionId: number): void {
  const parent = parentCollectionForManagedId(collectionId);
  if (!parent) {
    return;
  }
  const document = documentCache.get(
    collectionRefFromCollection(parent),
  )?.document;
  if (!document) {
    return;
  }
  enqueueClassSubcollectionItemSync(parent, document);
}

function handleManagedCollectionChange(
  event: string,
  ids: (number | string)[],
): void {
  for (const id of ids) {
    const collectionId = typeof id === "number" ? id : parseInt(String(id), 10);
    if (Number.isNaN(collectionId)) {
      continue;
    }
    if (event === "delete" || event === "trash") {
      const parent = parentCollectionForManagedId(collectionId);
      if (!parent) {
        continue;
      }
      mutateCollectionDocument(parent, (document) =>
        clearStaleSubcollectionKey(document, collectionId),
      ).catch((error) => {
        ztoolkit.log("Error recreating class subcollection:", error);
      });
      continue;
    }
    if (event !== "modify") {
      continue;
    }
    const parent = parentCollectionForManagedId(collectionId);
    if (!parent) {
      continue;
    }
    if (isClassFolderSyncHeld(parent.id)) {
      continue;
    }
    const parentRef = collectionRefFromCollection(parent);
    enqueueClassFolderEnsure(parent, async () => {
      const cached = documentCache.get(parentRef)?.document;
      if (!cached) {
        return;
      }
      return ensureClassSubcollections(parent, cached, cached);
    }).catch((error) => {
      ztoolkit.log("Error restoring class subcollection name:", error);
    });
  }
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
    indexReady = rebuildDocumentIndex().catch((error) => {
      ztoolkit.log("Error rebuilding syllabus note index:", error);
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
        for (const id of ids) {
          const collectionId = parseCollectionItemCollectionId(id);
          if (collectionId == null) {
            continue;
          }
          restoreManagedSubcollectionItems(collectionId);
        }
      }

      if (type === "collection") {
        handleManagedCollectionChange(event, ids);
      }
    },
  };

  notifierID = Zotero.Notifier.registerObserver(observer, [
    "item",
    "collection-item",
    "collection",
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
  clearManagedSubcollections();
  indexBuilt = false;
  documentGeneration = 0;
  indexReady = Promise.resolve();
}

export function invalidateCollectionDocument(
  collectionId: CollectionIdentifier | Zotero.Collection,
): void {
  const collection = resolveSyllabusCollection(collectionId);
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
