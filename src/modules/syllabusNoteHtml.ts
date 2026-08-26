import {
  CollectionSyllabusDocumentEntity,
  CollectionSyllabusDocumentSchema,
  COLLECTION_SYLLABUS_DOCUMENT_VERSION,
  DEFAULT_PRIORITIES,
  assignmentClassNumber,
  type CollectionSyllabusDocument,
  type ItemSyllabusAssignment,
} from "../utils/schemas";
import { getCachedItem } from "../utils/cache";
import { formatReadingDate } from "../utils/dates";
import { generateBibliographicReference } from "../utils/cite";
import { classSubcollectionName } from "./classSubcollections";
import { SYLLABUS_NOTE_PRE_ATTR, SYLLABUS_NOTE_TITLE } from "./syllabusNote";
import { proseToHtml } from "../utils/prose";

export const PLUGIN_JSON_HEADING = "Plugin data (do not edit)";
export const PLUGIN_REPO_URL = "https://github.com/janbaykara/zotero-syllabus";

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
    parts.push(instruction.replace(/\s+/g, " ").trim());
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
        proseToHtml(classMeta.description),
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
    proseToHtml(document.description),
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

  const jsonText = extractJsonPayload(html);
  if (!jsonText) {
    return null;
  }

  try {
    const parsed = coerceDocumentJson(JSON.parse(jsonText));
    const result = CollectionSyllabusDocumentEntity.safeParse(parsed);
    if (result.type === "ok") {
      return result.value;
    }
    const fallback = CollectionSyllabusDocumentSchema.safeParse(parsed);
    if (fallback.success) {
      return fallback.data;
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
