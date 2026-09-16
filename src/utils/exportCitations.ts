/** Export items as RIS / BibTeX for published syllabus downloads. */

import { appendExportIdToExtra, SYLLABUS_EXPORT_ID_KEY } from "./identifiers";
import { readItemNote } from "./items";

const RIS_TRANSLATOR_ID = "32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7";
const BIBTEX_TRANSLATOR_ID = "9cb70025-a888-4a29-a210-93ec52da40d4";

/** Stored identifiers — not UI copy (see AGENTS.md). */
const SYLLABUS_NOTE_TAG = "zotero-syllabus";
const SYLLABUS_NOTE_TITLE = "Syllabus";

/** Keep short: a hung Translate.Export used to block publish for a full minute. */
const EXPORT_TIMEOUT_MS = 12_000;

export type CitationExportOptions = {
  /** Override syllabus note HTML (export snapshot with fresh itemIndex). */
  noteHtml?: string;
  /** item.key → export-local id stamped into Extra / citation fields. */
  exportIdByItemKey?: Map<string, string> | Record<string, string>;
};

function exportIdMap(options?: CitationExportOptions): Map<string, string> {
  if (!options?.exportIdByItemKey) {
    return new Map();
  }
  if (options.exportIdByItemKey instanceof Map) {
    return options.exportIdByItemKey;
  }
  return new Map(Object.entries(options.exportIdByItemKey));
}

function exportIdForItem(item: Zotero.Item, ids: Map<string, string>): string {
  try {
    return ids.get(item.key) || "";
  } catch {
    return "";
  }
}

function regularItemsOnly(items: Zotero.Item[]): Zotero.Item[] {
  return items.filter(
    (item) =>
      item &&
      !item.deleted &&
      typeof item.isRegularItem === "function" &&
      item.isRegularItem() &&
      !item.isFeedItem,
  );
}

function field(item: Zotero.Item, name: string): string {
  try {
    return String(item.getField?.(name) || "").trim();
  } catch {
    return "";
  }
}

function creatorsLine(item: Zotero.Item, style: "ris" | "bib"): string[] {
  const creators = item.getCreators?.() || [];
  const lines: string[] = [];
  for (const c of creators) {
    const last = String(c.lastName || "").trim();
    const first = String(c.firstName || "").trim();
    if (!last && !first) continue;
    const name = first ? `${last}, ${first}` : last;
    if (style === "ris") {
      lines.push(`AU  - ${name}`);
    } else {
      lines.push(name);
    }
  }
  return lines;
}

function escapeBibTeX(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/[{}]/g, (ch) => `\\${ch}`)
    .replace(/\s+/g, " ")
    .trim();
}

function bibKey(item: Zotero.Item, index: number): string {
  const creators = item.getCreators?.() || [];
  const last = String(creators[0]?.lastName || "item")
    .replace(/[^A-Za-z0-9]/g, "")
    .slice(0, 24);
  const year = (field(item, "date").match(/\d{4}/) || ["nodate"])[0];
  return `${last || "item"}${year}${index + 1}`;
}

function noteBody(note: Zotero.Item, overrideHtml?: string): string {
  if (typeof overrideHtml === "string") {
    return overrideHtml;
  }
  return readItemNote(note);
}

/** Resolve the collection's standalone syllabus note, if present. */
export function resolveSyllabusNoteItem(
  collectionId: number,
): Zotero.Item | null {
  try {
    const collection = Zotero.Collections.get(collectionId);
    if (!collection) return null;
    const children = collection.getChildItems(false, false) || [];
    for (const item of children) {
      if (!item?.isNote?.() || item.deleted) continue;
      if (typeof item.isTopLevelItem === "function" && !item.isTopLevelItem()) {
        continue;
      }
      try {
        if (item.hasTag?.(SYLLABUS_NOTE_TAG)) return item;
      } catch {
        // ignore tag errors
      }
      try {
        const title = String(item.getField?.("title") || "").trim();
        if (
          title === SYLLABUS_NOTE_TITLE ||
          title.startsWith(SYLLABUS_NOTE_TITLE)
        ) {
          return item;
        }
      } catch {
        // ignore
      }
      const html = readItemNote(item);
      if (
        html.includes('data-zotero-syllabus="1"') ||
        html.includes("Plugin data (do not edit)")
      ) {
        return item;
      }
    }
    return null;
  } catch (err) {
    ztoolkit.log("resolveSyllabusNoteItem failed:", err);
    return null;
  }
}

/**
 * Regular bibliographic items plus the standalone syllabus note (when found).
 * Used so RIS/BibTeX downloads can round-trip a syllabus into Zotero.
 */
export function itemsWithSyllabusNote(
  collectionId: number,
  items: Zotero.Item[],
): Zotero.Item[] {
  const regular = regularItemsOnly(items);
  const note = resolveSyllabusNoteItem(collectionId);
  if (!note) return regular;
  if (regular.some((item) => item.id === note.id)) return regular;
  return [...regular, note];
}

/** RIS record for a standalone note (Zotero imports TY - NOTE as a note item). */
export function fallbackNoteAsRis(
  note: Zotero.Item,
  overrideHtml?: string,
): string {
  const title = field(note, "title") || "Syllabus";
  const body = noteBody(note, overrideHtml).replace(/\r\n/g, "\n").trim();
  const lines = [`TY  - NOTE`, `TI  - ${title}`, `KW  - ${SYLLABUS_NOTE_TAG}`];
  if (body) {
    for (const line of body.split("\n")) {
      lines.push(`N1  - ${line}`);
    }
  }
  lines.push("ER  - ");
  return lines.join("\n");
}

/** BibTeX @misc carrying note HTML so a syllabus note survives import. */
export function fallbackNoteAsBibTeX(
  note: Zotero.Item,
  overrideHtml?: string,
): string {
  const title = field(note, "title") || "Syllabus";
  const body = noteBody(note, overrideHtml).trim();
  const fields: string[] = [
    `  title = {${escapeBibTeX(title)}}`,
    `  keywords = {${SYLLABUS_NOTE_TAG}}`,
  ];
  if (body) {
    // Preserve newlines as literal \\n so HTML structure survives a round-trip.
    const escaped = body
      .replace(/\\/g, "\\\\")
      .replace(/[{}]/g, (ch) => `\\${ch}`)
      .replace(/\r\n/g, "\n")
      .replace(/\n/g, "\\n");
    fields.push(`  note = {${escaped}}`);
  }
  return `@misc{zoteroSyllabusNote,\n${fields.join(",\n")}\n}`;
}

function appendNoteExport(text: string, noteBlock: string): string {
  const base = text.trimEnd();
  const note = noteBlock.trim();
  if (!note) return text;
  if (!base) return `${note}\n`;
  return `${base}\n\n${note}\n`;
}

/** Minimal RIS when Zotero translators are unavailable or fail. */
export function fallbackItemsAsRis(
  items: Zotero.Item[],
  options?: CitationExportOptions,
): string {
  const ids = exportIdMap(options);
  const blocks: string[] = [];
  for (const item of items) {
    if (!item || item.deleted || item.isFeedItem) continue;
    if (item.isNote?.()) {
      blocks.push(fallbackNoteAsRis(item, options?.noteHtml));
      continue;
    }
    if (!(typeof item.isRegularItem === "function" && item.isRegularItem())) {
      continue;
    }
    const type = item.itemType || "document";
    const ty =
      type === "journalArticle"
        ? "JOUR"
        : type === "book"
          ? "BOOK"
          : type === "bookSection"
            ? "CHAP"
            : type === "webpage"
              ? "ELEC"
              : type === "thesis"
                ? "THES"
                : "GEN";
    const lines = [`TY  - ${ty}`, ...creatorsLine(item, "ris")];
    const title = field(item, "title");
    if (title) lines.push(`TI  - ${title}`);
    const date = field(item, "date");
    if (date) lines.push(`PY  - ${date}`);
    const publication =
      field(item, "publicationTitle") || field(item, "publisher");
    if (publication) lines.push(`T2  - ${publication}`);
    const doi = field(item, "DOI");
    if (doi) lines.push(`DO  - ${doi}`);
    const url = field(item, "url");
    if (url) lines.push(`UR  - ${url}`);
    const exportId = exportIdForItem(item, ids);
    const extra = appendExportIdToExtra(field(item, "extra"), exportId);
    if (extra) {
      for (const line of extra.split(/\r?\n/)) {
        if (line.trim()) lines.push(`N1  - ${line}`);
      }
    }
    lines.push("ER  - ");
    blocks.push(lines.join("\n"));
  }
  return blocks.length ? `${blocks.join("\n")}\n` : "";
}

/** Minimal BibTeX when Zotero translators are unavailable or fail. */
export function fallbackItemsAsBibTeX(
  items: Zotero.Item[],
  options?: CitationExportOptions,
): string {
  const ids = exportIdMap(options);
  const blocks: string[] = [];
  let regularIndex = 0;
  for (const item of items) {
    if (!item || item.deleted || item.isFeedItem) continue;
    if (item.isNote?.()) {
      blocks.push(fallbackNoteAsBibTeX(item, options?.noteHtml));
      continue;
    }
    if (!(typeof item.isRegularItem === "function" && item.isRegularItem())) {
      continue;
    }
    const type = item.itemType || "document";
    const entryType =
      type === "journalArticle"
        ? "article"
        : type === "book"
          ? "book"
          : type === "bookSection"
            ? "incollection"
            : type === "thesis"
              ? "phdthesis"
              : "misc";
    const fields: string[] = [];
    const author = creatorsLine(item, "bib").join(" and ");
    if (author) fields.push(`  author = {${escapeBibTeX(author)}}`);
    const title = field(item, "title");
    if (title) fields.push(`  title = {${escapeBibTeX(title)}}`);
    const year = (field(item, "date").match(/\d{4}/) || [""])[0];
    if (year) fields.push(`  year = {${year}}`);
    const journal = field(item, "publicationTitle");
    if (journal) fields.push(`  journal = {${escapeBibTeX(journal)}}`);
    const publisher = field(item, "publisher");
    if (publisher) fields.push(`  publisher = {${escapeBibTeX(publisher)}}`);
    const doi = field(item, "DOI");
    if (doi) fields.push(`  doi = {${escapeBibTeX(doi)}}`);
    const url = field(item, "url");
    if (url) fields.push(`  url = {${escapeBibTeX(url)}}`);
    const exportId = exportIdForItem(item, ids);
    const extra = appendExportIdToExtra(field(item, "extra"), exportId);
    if (extra) {
      fields.push(`  extra = {${escapeBibTeX(extra)}}`);
    }
    blocks.push(
      `@${entryType}{${bibKey(item, regularIndex)},\n${fields.join(",\n")}\n}`,
    );
    regularIndex += 1;
  }
  return blocks.length ? `${blocks.join("\n\n")}\n` : "";
}

/**
 * Inject export-local ids into translator RIS output by record order.
 * Skips TY - NOTE records (syllabus note is appended separately).
 */
export function injectExportIdsIntoRis(
  ris: string,
  items: Zotero.Item[],
  exportIdByItemKey?: Map<string, string> | Record<string, string>,
): string {
  const ids =
    exportIdByItemKey instanceof Map
      ? exportIdByItemKey
      : new Map(Object.entries(exportIdByItemKey || {}));
  if (!ids.size || !ris.trim()) {
    return ris;
  }
  const regular = regularItemsOnly(items);
  const records = ris
    .replace(/\r\n/g, "\n")
    .trim()
    .split(/\n(?=TY {2}- )/);
  let itemIdx = 0;
  const out: string[] = [];
  for (const record of records) {
    const trimmed = record.trim();
    if (!trimmed) continue;
    let block = trimmed.replace(/\nER {2}- ?$/, "").trimEnd();
    const isNote = /^TY {2}- NOTE\b/m.test(block);
    if (!isNote && itemIdx < regular.length) {
      const exportId = exportIdForItem(regular[itemIdx], ids);
      itemIdx += 1;
      if (exportId && !block.includes(`${SYLLABUS_EXPORT_ID_KEY}:`)) {
        block += `\nN1  - ${SYLLABUS_EXPORT_ID_KEY}: ${exportId}`;
      }
    }
    out.push(`${block}\nER  - `);
  }
  return out.length ? `${out.join("\n")}\n` : ris;
}

/**
 * Inject export-local ids into translator BibTeX by entry order among
 * non-@misc{zoteroSyllabusNote} entries.
 */
export function injectExportIdsIntoBibTeX(
  bib: string,
  items: Zotero.Item[],
  exportIdByItemKey?: Map<string, string> | Record<string, string>,
): string {
  const ids =
    exportIdByItemKey instanceof Map
      ? exportIdByItemKey
      : new Map(Object.entries(exportIdByItemKey || {}));
  if (!ids.size || !bib.trim()) {
    return bib;
  }
  const regular = regularItemsOnly(items);
  let itemIdx = 0;
  return bib.replace(
    /@(\w+)\s*\{([^\s,]+)\s*,([\s\S]*?)\n\}/g,
    (full, type: string, key: string, body: string) => {
      if (
        String(type).toLowerCase() === "misc" &&
        String(key) === "zoteroSyllabusNote"
      ) {
        return full;
      }
      if (itemIdx >= regular.length) {
        return full;
      }
      const exportId = exportIdForItem(regular[itemIdx], ids);
      itemIdx += 1;
      if (!exportId || body.includes(SYLLABUS_EXPORT_ID_KEY)) {
        return full;
      }
      const line = `  extra = {${SYLLABUS_EXPORT_ID_KEY}: ${exportId}}`;
      const trimmedBody = body.trimEnd();
      const nextBody = trimmedBody ? `${trimmedBody},\n${line}` : `\n${line}`;
      return `@${type}{${key},${nextBody}\n}`;
    },
  );
}

async function resolveTranslator(
  translatorID: string,
): Promise<string | { translatorID: string }> {
  try {
    const translators = Zotero.Translators as {
      get?: (id: string) => Promise<unknown> | unknown;
    };
    if (typeof translators.get === "function") {
      const got = await Promise.resolve(translators.get(translatorID));
      if (got && typeof got === "object") {
        return got as { translatorID: string };
      }
    }
  } catch (err) {
    ztoolkit.log("resolveTranslator failed:", translatorID, err);
  }
  return translatorID;
}

export async function exportItemsWithTranslator(
  items: Zotero.Item[],
  translatorID: string,
): Promise<string> {
  const exportItems = regularItemsOnly(items);
  if (!exportItems.length) {
    return "";
  }

  const translation = new Zotero.Translate.Export();
  translation.setItems(exportItems);
  if (typeof translation.setDisplayOptions === "function") {
    translation.setDisplayOptions({ exportNotes: true });
  }
  const translator = await resolveTranslator(translatorID);
  const ok = translation.setTranslator(translator as never);
  if (!ok) {
    throw new Error(`export_translator_missing:${translatorID}`);
  }

  return await new Promise<string>((resolve, reject) => {
    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      fn();
    };
    const timeout = setTimeout(() => {
      finish(() => reject(new Error(`export_timeout:${translatorID}`)));
    }, EXPORT_TIMEOUT_MS);

    translation.setHandler("error", (_t: unknown, error: Error | string) => {
      finish(() =>
        reject(error instanceof Error ? error : new Error(String(error))),
      );
    });

    translation.setHandler("done", (translate: unknown, success: boolean) => {
      finish(() => {
        if (!success) {
          reject(new Error(`export_failed:${translatorID}`));
          return;
        }
        resolve(String((translate as { string?: string }).string || ""));
      });
    });

    try {
      const result = translation.translate() as unknown;
      // Zotero 7+ returns a promise; prepare/load failures reject it without
      // always firing the "error" handler — without this we hung until timeout.
      if (result && typeof (result as Promise<unknown>).then === "function") {
        (result as Promise<unknown>).catch((err) => {
          finish(() =>
            reject(err instanceof Error ? err : new Error(String(err))),
          );
        });
      }
    } catch (err) {
      finish(() => reject(err instanceof Error ? err : new Error(String(err))));
    }
  });
}

/**
 * Export regular items via translator, then append the standalone syllabus note
 * so citation downloads can be loaded back into Zotero with syllabus structure.
 */
async function exportWithSyllabusNote(
  items: Zotero.Item[],
  translatorID: string,
  fallback: (items: Zotero.Item[], options?: CitationExportOptions) => string,
  noteAsFallback: (note: Zotero.Item, overrideHtml?: string) => string,
  injectIds: (
    text: string,
    items: Zotero.Item[],
    ids?: Map<string, string> | Record<string, string>,
  ) => string,
  options?: CitationExportOptions,
): Promise<string> {
  const notes = items.filter((item) => item?.isNote?.());
  const regular = regularItemsOnly(items);
  const ids = exportIdMap(options);
  let text = "";
  try {
    if (regular.length) {
      text = await exportItemsWithTranslator(regular, translatorID);
      if (text.trim() && ids.size) {
        text = injectIds(text, regular, ids);
      }
    }
    if (!text.trim()) {
      text = fallback([...regular, ...notes], options);
      return text;
    }
  } catch (err) {
    ztoolkit.log("Citation translator export failed; using fallback:", err);
    return fallback([...regular, ...notes], options);
  }
  // Translators typically skip standalone notes — append explicitly.
  for (const note of notes) {
    text = appendNoteExport(text, noteAsFallback(note, options?.noteHtml));
  }
  return text.endsWith("\n") ? text : `${text}\n`;
}

export async function exportItemsAsRis(
  items: Zotero.Item[],
  options?: CitationExportOptions,
): Promise<string> {
  return exportWithSyllabusNote(
    items,
    RIS_TRANSLATOR_ID,
    fallbackItemsAsRis,
    fallbackNoteAsRis,
    injectExportIdsIntoRis,
    options,
  );
}

export async function exportItemsAsBibTeX(
  items: Zotero.Item[],
  options?: CitationExportOptions,
): Promise<string> {
  return exportWithSyllabusNote(
    items,
    BIBTEX_TRANSLATOR_ID,
    fallbackItemsAsBibTeX,
    fallbackNoteAsBibTeX,
    injectExportIdsIntoBibTeX,
    options,
  );
}

export const PUBLISH_BIBLIOGRAPHY_RIS = "bibliography.ris";
export const PUBLISH_BIBLIOGRAPHY_BIB = "bibliography.bib";
export const PUBLISH_BIBLIOGRAPHY_RDF = "bibliography.rdf";
