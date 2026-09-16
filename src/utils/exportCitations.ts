/** Export regular items as RIS / BibTeX for published syllabus downloads. */

const RIS_TRANSLATOR_ID = "32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7";
const BIBTEX_TRANSLATOR_ID = "9cb70025-a888-4a29-a210-93ec52da40d4";

/** Keep short: a hung Translate.Export used to block publish for a full minute. */
const EXPORT_TIMEOUT_MS = 12_000;

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

/** Minimal RIS when Zotero translators are unavailable or fail. */
export function fallbackItemsAsRis(items: Zotero.Item[]): string {
  const blocks: string[] = [];
  for (const item of regularItemsOnly(items)) {
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
    lines.push("ER  - ");
    blocks.push(lines.join("\n"));
  }
  return blocks.length ? `${blocks.join("\n")}\n` : "";
}

/** Minimal BibTeX when Zotero translators are unavailable or fail. */
export function fallbackItemsAsBibTeX(items: Zotero.Item[]): string {
  const blocks: string[] = [];
  const exportItems = regularItemsOnly(items);
  exportItems.forEach((item, index) => {
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
    blocks.push(
      `@${entryType}{${bibKey(item, index)},\n${fields.join(",\n")}\n}`,
    );
  });
  return blocks.length ? `${blocks.join("\n\n")}\n` : "";
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
    translation.setDisplayOptions({});
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

export async function exportItemsAsRis(items: Zotero.Item[]): Promise<string> {
  try {
    const text = await exportItemsWithTranslator(items, RIS_TRANSLATOR_ID);
    if (text.trim()) return text;
  } catch (err) {
    ztoolkit.log("RIS translator export failed; using fallback:", err);
  }
  return fallbackItemsAsRis(items);
}

export async function exportItemsAsBibTeX(
  items: Zotero.Item[],
): Promise<string> {
  try {
    const text = await exportItemsWithTranslator(items, BIBTEX_TRANSLATOR_ID);
    if (text.trim()) return text;
  } catch (err) {
    ztoolkit.log("BibTeX translator export failed; using fallback:", err);
  }
  return fallbackItemsAsBibTeX(items);
}

export const PUBLISH_BIBLIOGRAPHY_RIS = "bibliography.ris";
export const PUBLISH_BIBLIOGRAPHY_BIB = "bibliography.bib";
