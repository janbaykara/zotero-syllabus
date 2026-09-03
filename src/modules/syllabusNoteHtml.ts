import {
  CollectionSyllabusDocumentEntity,
  CollectionSyllabusDocumentSchema,
  COLLECTION_SYLLABUS_DOCUMENT_VERSION,
  DEFAULT_PRIORITIES,
  assignmentClassNumber,
  getClassNumberById,
  orderedClassIds,
  type CollectionSyllabusDocument,
  type ItemSyllabusAssignment,
} from "../utils/schemas";
import { generateBibliographicReference } from "../utils/cite";
import { getItemTitle } from "../utils/items";
import { classSubcollectionName } from "./classSubcollections";
import { SYLLABUS_NOTE_PRE_ATTR, SYLLABUS_NOTE_TITLE } from "./syllabusNote";
import { proseToHtml } from "../utils/prose";

export const PLUGIN_JSON_HEADING = "Plugin data (do not edit)";
export const PLUGIN_REPO_URL = "https://github.com/janbaykara/zotero-syllabus";
/** Human-readable envelope. Independent of document.version. */
export const READABLE_NOTE_FORMAT_VERSION = 2;
export const READABLE_NOTE_ATTR = "data-readable";
export const READING_DONE_MARK = "✅";
export const READING_TODO_MARK = "☐";

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

function htmlList(items: string[]): string {
  if (items.length === 0) {
    return "";
  }
  const lis = items.map((item) => `<li><p>${item}</p></li>`).join("");
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
      titles.set(item.key, getItemTitle(item));
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

type PriorityGroup = {
  id: string | null;
  name: string | null;
  readings: ClassReading[];
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
      const number = assignmentClassNumber(
        assignment,
        document.classes,
        document.classOrder,
      );
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
        assignmentClassNumber(
          assignment,
          document.classes,
          document.classOrder,
        ) !== undefined
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
  priorityId: string | null | undefined,
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

function groupReadingsByPriority(
  readings: ClassReading[],
  document: CollectionSyllabusDocument,
): PriorityGroup[] {
  const groups: PriorityGroup[] = [];
  for (const row of sortReadingsByPriority(readings, document)) {
    const meta = priorityMeta(document, row.assignment.priority);
    const id = meta?.id || null;
    const last = groups[groups.length - 1];
    if (last && last.id === id) {
      last.readings.push(row);
    } else {
      groups.push({
        id,
        name: meta?.name || null,
        readings: [row],
      });
    }
  }
  return groups;
}

function fallbackTitle(
  itemKey: string,
  titles: Map<string, string>,
  document: CollectionSyllabusDocument,
): string {
  return titles.get(itemKey) || document.itemIndex?.[itemKey]?.title || itemKey;
}

function doiForReading(
  item: Zotero.Item | null,
  itemKey: string,
  document: CollectionSyllabusDocument,
): string {
  let fromItem = "";
  try {
    fromItem = item ? String(item.getField("DOI") || "").trim() : "";
  } catch {
    fromItem = "";
  }
  const fromIndex = (document.itemIndex?.[itemKey]?.doi || "").trim();
  return fromItem || fromIndex;
}

function urlForReading(item: Zotero.Item | null): string {
  if (!item) {
    return "";
  }
  try {
    return String(item.getField("url") || "").trim();
  } catch {
    return "";
  }
}

function doiHref(doi: string): string {
  const trimmed = doi.trim().replace(/^doi:\s*/i, "");
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://doi.org/${trimmed}`;
}

function readingLinks(
  item: Zotero.Item | null,
  itemKey: string,
  document: CollectionSyllabusDocument,
): { href: string; label: string }[] {
  const links: { href: string; label: string }[] = [];
  const seen = new Set<string>();
  const add = (href: string, label: string) => {
    const key = href.replace(/\/+$/, "").toLowerCase();
    if (!href || seen.has(key)) {
      return;
    }
    seen.add(key);
    links.push({ href, label });
  };

  const doi = doiForReading(item, itemKey, document);
  if (doi) {
    add(doiHref(doi), "DOI");
  }
  const url = urlForReading(item);
  if (url) {
    add(url, "Link");
  }
  return links;
}

function formatReadingHtml(
  done: boolean,
  citation: string,
  instruction: string,
  links: { href: string; label: string }[],
): string {
  const mark = done ? READING_DONE_MARK : READING_TODO_MARK;
  const parts = [`${mark} ${escapeHtml(citation)}`];
  const instr = instruction.replace(/\s+/g, " ").trim();
  if (instr) {
    parts.push(escapeHtml(instr));
  }
  let html = parts.join(" — ");
  for (const link of links) {
    html += ` <a href="${escapeHtml(link.href)}">${escapeHtml(link.label)}</a>`;
  }
  return html;
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

async function readingHtmlLines(
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
        fallbackTitle(row.itemKey, titles, document),
        style,
      );
      return formatReadingHtml(
        row.assignment.status === "done",
        citation,
        (row.assignment.classInstruction || "").trim(),
        readingLinks(item, row.itemKey, document),
      );
    }),
  );
}

async function renderReadingGroups(
  readings: ClassReading[],
  document: CollectionSyllabusDocument,
  collection: Zotero.Collection | null | undefined,
  titles: Map<string, string>,
): Promise<string> {
  const groups = groupReadingsByPriority(readings, document);
  const chunks: string[] = [];
  for (const group of groups) {
    const lines = await readingHtmlLines(
      group.readings,
      document,
      collection,
      titles,
    );
    if (group.name) {
      chunks.push(`<p><strong>${escapeHtml(group.name)}</strong></p>`);
    }
    chunks.push(htmlList(lines));
  }
  return chunks.filter(Boolean).join("");
}

function pluginJsonBlock(document: CollectionSyllabusDocument): string {
  const json = JSON.stringify(document, null, 2);
  const repoHref = escapeHtml(PLUGIN_REPO_URL);
  return [
    heading(3, PLUGIN_JSON_HEADING),
    paragraph(
      "You can stop reading here. The rest is for the Zotero Syllabus plugin on desktop.",
    ),
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

function wrapNoteHtml(body: string): string {
  const attr = `${READABLE_NOTE_ATTR}="${READABLE_NOTE_FORMAT_VERSION}"`;
  if (typeof Zotero !== "undefined" && Zotero.Notes?.notePrefix) {
    const prefix = Zotero.Notes.notePrefix.replace(
      /<div\b([^>]*)>/i,
      (match, attrs: string) => {
        if (new RegExp(`\\b${READABLE_NOTE_ATTR}=`, "i").test(attrs)) {
          return match.replace(
            new RegExp(`\\b${READABLE_NOTE_ATTR}="[^"]*"`, "i"),
            attr,
          );
        }
        return `<div${attrs} ${attr}>`;
      },
    );
    return `${prefix}${body}${Zotero.Notes.noteSuffix || ""}`;
  }
  return `<div data-schema-version="9" ${attr}>${body}</div>`;
}

async function renderReadableNoteBody(
  document: CollectionSyllabusDocument,
  collection?: Zotero.Collection | null,
): Promise<string> {
  const titles = itemTitlesByKey(collection);
  const classes = orderedClassIds(document).map((classId) => {
    const classMeta = document.classes?.[classId];
    return [classId, classMeta] as const;
  });

  const classSections: string[] = [];
  for (const [classId, classMeta] of classes) {
    if (!classMeta) {
      continue;
    }
    const classNumber =
      getClassNumberById(document.classes, classId, document.classOrder) ??
      classMeta.number;
    if (!classNumber) {
      continue;
    }
    const readings = gatherClassReadings(
      classId,
      classNumber,
      classMeta.itemOrder,
      document,
    );
    classSections.push(
      [
        heading(
          3,
          classSubcollectionName(
            document.nomenclature,
            classNumber,
            classMeta.title,
            {
              done: classMeta.status === "done",
              readingDate: classMeta.readingDate,
            },
          ),
        ),
        proseToHtml(classMeta.description),
        await renderReadingGroups(readings, document, collection, titles),
      ]
        .filter(Boolean)
        .join(""),
    );
  }

  const further = gatherFurtherReadings(document);
  const furtherHtml = further.length
    ? await renderReadingGroups(further, document, collection, titles)
    : "";

  return [
    heading(1, collection?.name || SYLLABUS_NOTE_TITLE),
    paragraph(courseByline(document.courseCode, document.institution)),
    proseToHtml(document.description),
    linksBlock(document.links),
    ...classSections,
    ...(furtherHtml ? [heading(3, "Further reading"), furtherHtml] : []),
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

export function getReadableNoteFormatVersion(html: string): number | null {
  const match = html.match(/\bdata-readable="(\d+)"/i);
  if (!match) {
    return null;
  }
  return parseInt(match[1], 10);
}

export function isUnsupportedFutureNote(html: string): boolean {
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

export function noteNeedsFormatPatch(
  html: string,
  document?: CollectionSyllabusDocument,
): boolean {
  if (isUnsupportedFutureNote(html)) {
    return false;
  }
  if (getReadableNoteFormatVersion(html) !== READABLE_NOTE_FORMAT_VERSION) {
    return true;
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
  return wrapNoteHtml(body);
}

function extractJsonPayload(html: string): string | null {
  const taggedPre = html.match(
    /<pre[^>]*\bdata-zotero-syllabus(?:="[^"]*")?[^>]*>([\s\S]*?)<\/pre>/i,
  );
  if (taggedPre) {
    const tagged = unescapeHtml(taggedPre[1]).trim();
    if (tagged) {
      return tagged;
    }
  }

  const genericPres = html.matchAll(/<pre[^>]*>([\s\S]*?)<\/pre>/gi);
  for (const match of genericPres) {
    const candidate = unescapeHtml(match[1]).trim();
    if (looksLikeSyllabusDocumentPayload(candidate)) {
      return candidate;
    }
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
  const braced = stripped.slice(start, end + 1).trim();
  return looksLikeSyllabusDocumentPayload(braced) ? braced : null;
}

/** True when a JSON string is a syllabus document, not a citation or other object. */
export function looksLikeSyllabusDocumentPayload(text: string): boolean {
  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return false;
    }
    if (typeof parsed.version !== "number") {
      return false;
    }
    const hasClasses =
      parsed.classes !== undefined &&
      typeof parsed.classes === "object" &&
      parsed.classes !== null &&
      !Array.isArray(parsed.classes);
    const hasItems =
      parsed.items !== undefined &&
      typeof parsed.items === "object" &&
      parsed.items !== null &&
      !Array.isArray(parsed.items);
    return hasClasses || hasItems;
  } catch {
    return false;
  }
}

export function parseSyllabusNote(
  html: string,
): CollectionSyllabusDocument | null {
  if (!html) {
    return null;
  }

  const jsonText = extractJsonPayload(html);
  if (!jsonText) {
    return null;
  }

  try {
    const raw = JSON.parse(jsonText) as unknown;
    const parsed = coerceDocumentJson(raw);
    const result = CollectionSyllabusDocumentEntity.safeParse(parsed);
    if (result.type === "ok") {
      return restoreUnrecognizedFields(result.value, raw);
    }
    const fallback = CollectionSyllabusDocumentSchema.safeParse(parsed);
    if (fallback.success) {
      return restoreUnrecognizedFields(fallback.data, raw);
    }
    if (isUnsupportedFutureNote(html)) {
      ztoolkit.log(
        "Syllabus note format is newer than this plugin; leaving it unchanged",
      );
      return null;
    }
    ztoolkit.log("Error validating syllabus note JSON:", result.error);
    return null;
  } catch (error) {
    ztoolkit.log("Error parsing syllabus note JSON:", error);
    return null;
  }
}

/** True when the note is a future format we cannot parse, so writes would clobber it. */
export function shouldRefuseNoteOverwrite(html: string): boolean {
  return !parseSyllabusNote(html) && isUnsupportedFutureNote(html);
}

export function keepDocumentVersion(version: unknown): number {
  if (
    typeof version === "number" &&
    Number.isInteger(version) &&
    version > COLLECTION_SYLLABUS_DOCUMENT_VERSION
  ) {
    return version;
  }
  return COLLECTION_SYLLABUS_DOCUMENT_VERSION;
}

/** Top-level fields this schema version does not model (e.g. section-branch outline). */
export function unrecognizedDocumentFields(
  source: object,
): Record<string, unknown> {
  const coerced = {
    ...(source as Record<string, unknown>),
    version: COLLECTION_SYLLABUS_DOCUMENT_VERSION,
  };
  const stripped = CollectionSyllabusDocumentSchema.safeParse(coerced);
  const known = new Set(stripped.success ? Object.keys(stripped.data) : []);
  known.add("version");
  const extra: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(
    source as Record<string, unknown>,
  )) {
    if (!known.has(key)) {
      extra[key] = value;
    }
  }
  return extra;
}

export function withUnrecognizedDocumentFields(
  document: CollectionSyllabusDocument,
  source: object,
): CollectionSyllabusDocument {
  const extra = unrecognizedDocumentFields(source);
  const version = keepDocumentVersion(
    (source as { version?: unknown }).version,
  );
  if (Object.keys(extra).length === 0 && version === document.version) {
    return document;
  }
  return { ...document, ...extra, version } as CollectionSyllabusDocument;
}

function restoreUnrecognizedFields(
  document: CollectionSyllabusDocument,
  raw: unknown,
): CollectionSyllabusDocument {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return document;
  }
  return withUnrecognizedDocumentFields(document, raw);
}

/** Read notes written with a newer document.version by keeping known fields. */
function coerceDocumentJson(parsed: unknown): unknown {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return parsed;
  }
  const obj = { ...(parsed as Record<string, unknown>) };
  if (
    typeof obj.version === "number" &&
    obj.version > COLLECTION_SYLLABUS_DOCUMENT_VERSION
  ) {
    obj.version = COLLECTION_SYLLABUS_DOCUMENT_VERSION;
  }
  return obj;
}

export function serializeSyllabusNoteFallback(
  document: CollectionSyllabusDocument,
): string {
  const body = `<p>${SYLLABUS_NOTE_TITLE}</p>${pluginJsonBlock(document)}`;
  if (typeof Zotero !== "undefined" && Zotero.Notes?.notePrefix) {
    return `${Zotero.Notes.notePrefix}${body}${Zotero.Notes.noteSuffix}`;
  }
  return `<div data-schema-version="9">${body}</div>`;
}
