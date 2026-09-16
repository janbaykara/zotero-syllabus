import { readItemNote } from "./items";

/** Official Zotero RDF export translator (when built-ins are available). */
const RDF_EXPORT_TRANSLATOR_ID = "14763d24-8ba0-45df-8f52-b8d1108e7ac9";

/** Match citation export: hung Translate.Export used to block publish. */
const RDF_EXPORT_TIMEOUT_MS = 20_000;

const RDF_NS = {
  rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
  z: "http://www.zotero.org/namespaces/export#",
  dc: "http://purl.org/dc/elements/1.1/",
  dcterms: "http://purl.org/dc/terms/",
  bib: "http://purl.org/net/biblio#",
  foaf: "http://xmlns.com/foaf/0.1/",
  prism: "http://prismstandard.org/namespaces/1.2/basic/",
};

export function isRdfFile(contents: string): boolean {
  const trimmed = contents.trim();
  return (
    trimmed.startsWith("<?xml") ||
    trimmed.startsWith("<rdf:") ||
    trimmed.includes("xmlns:rdf=")
  );
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function field(item: Zotero.Item, name: string): string {
  try {
    return String(item.getField?.(name) || "").trim();
  } catch {
    return "";
  }
}

function bibTypeForItem(item: Zotero.Item): string {
  if (item.isNote?.()) return "Memo";
  const type = item.itemType || "document";
  if (type === "journalArticle") return "Article";
  if (type === "book") return "Book";
  if (type === "bookSection") return "BookSection";
  if (type === "thesis") return "Thesis";
  if (type === "letter" || type === "email") return "Letter";
  if (type === "interview") return "Interview";
  if (type === "film") return "MotionPicture";
  if (type === "artwork") return "Illustration";
  if (type === "report") return "Report";
  if (type === "patent") return "Patent";
  return "Document";
}

function creatorsXml(item: Zotero.Item): string {
  const creators = item.getCreators?.() || [];
  const people: string[] = [];
  for (const c of creators) {
    const last = String(c.lastName || "").trim();
    const first = String(c.firstName || "").trim();
    if (!last && !first) continue;
    const parts = [
      first ? `<foaf:givenName>${escapeXml(first)}</foaf:givenName>` : "",
      last ? `<foaf:surname>${escapeXml(last)}</foaf:surname>` : "",
    ].filter(Boolean);
    people.push(
      `<rdf:li><foaf:Person>${parts.join("")}</foaf:Person></rdf:li>`,
    );
  }
  if (!people.length) return "";
  return `<bib:authors><rdf:Seq>${people.join("")}</rdf:Seq></bib:authors>`;
}

function tagsXml(item: Zotero.Item): string {
  try {
    const tags = item.getTags?.() || [];
    return tags
      .map((t) => {
        const tag = typeof t === "string" ? t : String(t?.tag || "").trim();
        return tag ? `<dc:subject>${escapeXml(tag)}</dc:subject>` : "";
      })
      .filter(Boolean)
      .join("");
  } catch {
    return "";
  }
}

/**
 * Minimal Zotero RDF when Translate.Export / built-in translators are
 * unavailable (observed on Zotero 10 scaffold builds). Produces notes as
 * bib:Memo with rdf:value — matching Zotero RDF.js — so syllabus notes
 * round-trip through File → Import / plugin import.
 */
export function fallbackItemsAsZoteroRdf(items: Zotero.Item[]): string {
  const blocks: string[] = [];
  let index = 0;
  for (const item of items) {
    if (!item || item.deleted || item.isFeedItem) continue;
    if (item.isAttachment?.()) continue;
    index += 1;
    const about = `#item_${item.id || index}`;
    const bibType = bibTypeForItem(item);
    const zType = item.isNote?.() ? "note" : item.itemType || "document";
    const parts: string[] = [`<z:itemType>${escapeXml(zType)}</z:itemType>`];

    if (item.isNote?.()) {
      const title = field(item, "title") || "Syllabus";
      const body = readItemNote(item);
      parts.push(`<dc:title>${escapeXml(title)}</dc:title>`);
      if (body) {
        parts.push(`<rdf:value>${escapeXml(body)}</rdf:value>`);
      }
      parts.push(tagsXml(item));
    } else if (
      typeof item.isRegularItem === "function" &&
      item.isRegularItem()
    ) {
      const title = field(item, "title");
      if (title) parts.push(`<dc:title>${escapeXml(title)}</dc:title>`);
      parts.push(creatorsXml(item));
      const date = field(item, "date");
      if (date) parts.push(`<dc:date>${escapeXml(date)}</dc:date>`);
      const publication = field(item, "publicationTitle");
      if (publication) {
        parts.push(
          `<dcterms:isPartOf><bib:Journal><dc:title>${escapeXml(publication)}</dc:title></bib:Journal></dcterms:isPartOf>`,
        );
      }
      const publisher = field(item, "publisher");
      if (publisher) {
        parts.push(`<dc:publisher>${escapeXml(publisher)}</dc:publisher>`);
      }
      const doi = field(item, "DOI");
      if (doi) {
        parts.push(`<dc:identifier>DOI ${escapeXml(doi)}</dc:identifier>`);
      }
      const url = field(item, "url");
      if (url) {
        parts.push(
          `<dc:identifier><dcterms:URI><rdf:value>${escapeXml(url)}</rdf:value></dcterms:URI></dc:identifier>`,
        );
      }
      parts.push(tagsXml(item));
    } else {
      continue;
    }

    blocks.push(
      `<bib:${bibType} rdf:about="${escapeXml(about)}">${parts.filter(Boolean).join("")}</bib:${bibType}>`,
    );
  }

  if (!blocks.length) return "";

  const ns = Object.entries(RDF_NS)
    .map(([prefix, uri]) => `xmlns:${prefix}="${uri}"`)
    .join(" ");
  return `<?xml version="1.0"?>\n<rdf:RDF ${ns}>\n${blocks.join("\n")}\n</rdf:RDF>\n`;
}

async function exportRdfWithTranslator(items: Zotero.Item[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const translation = new Zotero.Translate.Export();
    translation.setItems(items);
    const translatorSet = translation.setTranslator(RDF_EXPORT_TRANSLATOR_ID);

    if (typeof translation.setDisplayOptions === "function") {
      translation.setDisplayOptions({ exportNotes: true });
    }

    if (!translatorSet) {
      reject(new Error("Failed to set RDF translator"));
      return;
    }

    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      fn();
    };

    const timeout = setTimeout(() => {
      finish(() =>
        reject(
          new Error(`RDF export timed out after ${RDF_EXPORT_TIMEOUT_MS}ms`),
        ),
      );
    }, RDF_EXPORT_TIMEOUT_MS);

    translation.setHandler(
      "error",
      (_translate: unknown, error: Error | string) => {
        finish(() =>
          reject(error instanceof Error ? error : new Error(String(error))),
        );
      },
    );

    translation.setHandler("done", (translate: unknown, success: boolean) => {
      finish(() => {
        if (!success) {
          reject(new Error("RDF export failed"));
          return;
        }
        const rdfXml = String((translate as { string?: string }).string || "");
        if (!rdfXml) {
          reject(new Error("RDF export did not return a valid string"));
          return;
        }
        resolve(rdfXml);
      });
    });

    try {
      const result = translation.translate() as unknown;
      if (result && typeof (result as Promise<unknown>).then === "function") {
        (result as Promise<unknown>).catch((err) => {
          finish(() =>
            reject(err instanceof Error ? err : new Error(String(err))),
          );
        });
      }
    } catch (error) {
      finish(() =>
        reject(error instanceof Error ? error : new Error(String(error))),
      );
    }
  });
}

export async function getRDFStringForCollection(
  collection: Zotero.Collection,
): Promise<string> {
  const items = (collection.getChildItems() || []).filter(
    (item): item is Zotero.Item =>
      !!item && !item.deleted && !item.isFeedItem && !item.isAttachment?.(),
  );
  ztoolkit.log("getRDFStringForCollection: items count:", items.length);

  try {
    const text = await exportRdfWithTranslator(items);
    if (text.trim()) return text;
  } catch (err) {
    ztoolkit.log(
      "RDF translator export failed; using Zotero RDF fallback:",
      err,
    );
  }

  const fallback = fallbackItemsAsZoteroRdf(items);
  if (!fallback.trim()) {
    throw new Error("RDF export produced no content");
  }
  return fallback;
}

/**
 * Import RDF items into the library
 * @param rdfString - The RDF XML string to import
 * @returns Promise that resolves with the imported Zotero.Item objects
 */
export function importRDF(rdfString: string): Promise<Zotero.Item[]> {
  return new Promise((resolve, reject) => {
    try {
      const translation = new Zotero.Translate.Import();
      translation.setString(rdfString);

      translation.setHandler("done", (obj: any, success: boolean) => {
        if (success) {
          const translationObj = obj as any;
          const newItems = translationObj.newItems || [];

          if (newItems.length > 0) {
            const validItems = newItems.filter(
              (item: Zotero.Item) => item && item.id,
            );

            if (validItems.length > 0) {
              ztoolkit.log(
                `Imported ${validItems.length} items from RDF into library`,
              );
              resolve(validItems);
            } else {
              ztoolkit.log("No valid items found in imported RDF");
              resolve([]);
            }
          } else {
            ztoolkit.log("No items were imported from RDF");
            resolve([]);
          }
        } else {
          reject(new Error("RDF import failed"));
        }
      });

      translation.setHandler("error", (obj: any, error: Error) => {
        ztoolkit.log("RDF import error:", error);
        reject(error);
      });

      translation.translate();
    } catch (error) {
      ztoolkit.log("Error importing RDF:", error);
      reject(error);
    }
  });
}
