import { getCachedItem } from "./cache";
import {
  listPublishObjects,
  putPublishObject,
  deletePublishObject,
  deletePublishSyllabus,
  getPublishSession,
  getPublishApiBaseUrl,
  patchPublishItemRefs,
} from "./publishAuth";
import { clearPublishedSyllabusUrl } from "./publishUrls";
import { clearPublishedShareOptions } from "./publishShareOptions";
import {
  buildPrintableHtml,
  serializeSyllabusForPublish,
} from "./printSyllabus";
import type { ItemDensity } from "../modules/react-zotero-sync/itemDensity";
import {
  localFileFingerprint,
  remoteMatchesLocal,
} from "./publishFileFingerprints";
import {
  exportItemsAsBibTeX,
  exportItemsAsRis,
  itemsWithSyllabusNote,
  PUBLISH_BIBLIOGRAPHY_BIB,
  PUBLISH_BIBLIOGRAPHY_RDF,
  PUBLISH_BIBLIOGRAPHY_RIS,
} from "./exportCitations";
import { getString } from "./locale";
import { isDevelopmentEnv } from "./env";
import {
  PUBLISH_OG_IMAGE,
  buildPublishOgImageJpeg,
  bytesContentFingerprint,
  extractPublishShareDescription,
} from "./publishOgImage";
import { getRDFStringForCollection } from "./rdf";
import { buildSyllabusExportPayload } from "../modules/syllabusNote";
import { absoluteItemFileHref } from "./publishTarget";
import type { PublishTarget } from "./publishTarget";

export const PUBLISH_ITEM_KEYS_JSON = "itemKeys.json";

export type PublishAttachmentPick = {
  itemId: number;
  itemKey: string;
  attachment: Zotero.Item;
  /** Relative path under the item prefix: files/{key}.{ext} */
  relPath: string;
  ext: string;
};

function linkedUrlAttachmentMode(): number {
  try {
    const mode = Zotero.Attachments?.LINK_MODE_LINKED_URL;
    if (typeof mode === "number") return mode;
  } catch {
    // fall through
  }
  return 3;
}

function extensionForAttachment(att: Zotero.Item): string {
  const path = String(
    att.attachmentPath || att.attachmentFilename || "",
  ).toLowerCase();
  const type = (att.attachmentContentType || "").toLowerCase();
  if (type.includes("pdf") || path.endsWith(".pdf")) return "pdf";
  if (type.includes("epub") || path.endsWith(".epub")) return "epub";
  if (
    type.includes("html") ||
    path.endsWith(".html") ||
    path.endsWith(".htm")
  ) {
    return "html";
  }
  if (type.includes("png") || path.endsWith(".png")) return "png";
  if (type.includes("jpeg") || type.includes("jpg") || path.endsWith(".jpg")) {
    return "jpg";
  }
  if (path.includes(".")) {
    const ext = path.split(".").pop();
    if (ext && /^[a-z0-9]{1,8}$/i.test(ext)) {
      return ext.toLowerCase();
    }
  }
  return "bin";
}

/** True when the attachment is a URL bookmark with no local file (not an HTML snapshot). */
export function isLinkedUrlAttachment(att: Zotero.Item): boolean {
  return att.attachmentLinkMode === linkedUrlAttachmentMode();
}

/** Local readable file suitable for upload (not a linked URL or directory). */
export async function attachmentHasLocalPublishFile(
  att: Zotero.Item,
): Promise<boolean> {
  if (isLinkedUrlAttachment(att)) return false;
  try {
    const path = await att.getFilePathAsync?.();
    if (!path || typeof path !== "string") return false;
    if (
      typeof IOUtils !== "undefined" &&
      typeof IOUtils.exists === "function"
    ) {
      if (!(await IOUtils.exists(path))) return false;
      if (typeof IOUtils.stat === "function") {
        const st = (await IOUtils.stat(path)) as {
          type?: string;
          size?: number;
        };
        if (st?.type === "directory") return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Prefer PDF, then EPUB, then other imported file attachments (not linked URL-only).
 */
export function pickBestPublishAttachment(
  item: Zotero.Item,
): Zotero.Item | null {
  const ids = item.getAttachments();
  const attachments = ids
    .map((id) => getCachedItem(id) || Zotero.Items.get(id))
    .filter((att): att is Zotero.Item => !!att && att.isAttachment());

  const score = (att: Zotero.Item): number => {
    if (isLinkedUrlAttachment(att)) return -1;
    const linkMode = att.attachmentLinkMode;
    const type = (att.attachmentContentType || "").toLowerCase();
    const path = (att.attachmentPath || "").toLowerCase();
    let s = 0;
    // LINK_MODE_IMPORTED_FILE
    if (linkMode === 0 || linkMode === undefined) s += 10;
    if (
      att.isPDFAttachment?.() ||
      type.includes("pdf") ||
      path.endsWith(".pdf")
    ) {
      s += 50;
    } else if (
      att.isEPUBAttachment?.() ||
      type.includes("epub") ||
      path.endsWith(".epub")
    ) {
      s += 40;
    } else if (
      // LINK_MODE_IMPORTED_URL — real HTML snapshots with local files
      linkMode === 1 ||
      type.includes("html") ||
      path.endsWith(".html") ||
      path.endsWith(".htm")
    ) {
      s += 20;
    } else {
      s += 15;
    }
    return s;
  };

  const ranked = [...attachments].sort((a, b) => score(b) - score(a));
  for (const att of ranked) {
    if (score(att) <= 0) continue;
    return att;
  }
  return null;
}

/** Attachments that can actually be uploaded (local file present). */
export async function collectPublishAttachments(
  items: Zotero.Item[],
): Promise<PublishAttachmentPick[]> {
  const picks: PublishAttachmentPick[] = [];
  const seenAtt = new Set<number>();
  for (const item of items) {
    if (item.isAttachment?.() || item.isNote?.()) continue;
    const att = pickBestPublishAttachment(item);
    if (!att || seenAtt.has(att.id)) continue;
    if (!(await attachmentHasLocalPublishFile(att))) continue;
    seenAtt.add(att.id);
    const ext = extensionForAttachment(att);
    picks.push({
      itemId: item.id,
      itemKey: item.key,
      attachment: att,
      relPath: `files/${att.key}.${ext}`,
      ext,
    });
  }
  return picks;
}

/** Map parent item id → absolute public path for title links. */
export function publishLinkMap(
  picks: PublishAttachmentPick[],
  userId: string,
  libraryId: string,
): Map<number, string> {
  const map = new Map<number, string>();
  for (const pick of picks) {
    map.set(
      pick.itemId,
      absoluteItemFileHref(userId, libraryId, pick.itemKey, pick.relPath),
    );
  }
  return map;
}

async function readAttachmentBytes(
  att: Zotero.Item,
): Promise<Uint8Array | null> {
  try {
    const path = await att.getFilePathAsync();
    if (!path) return null;
    if (typeof IOUtils !== "undefined" && typeof IOUtils.read === "function") {
      const exists = await IOUtils.exists(path);
      if (!exists) return null;
      return await IOUtils.read(path);
    }
    return null;
  } catch (err) {
    ztoolkit.log("readAttachmentBytes failed:", err);
    return null;
  }
}

export async function publishSyllabusToCloud(opts: {
  collectionId: number;
  items: Zotero.Item[];
  pageElement: HTMLElement;
  density: ItemDensity;
  title: string;
  courseCode?: string | null;
  institution?: string | null;
  bibliographyHtml: string;
  /** Optional: start bibliography work in parallel with other prepare steps. */
  bibliographyHtmlPromise?: Promise<string>;
  cslStyle?: string | null;
  onProgress?: (phase: string, current?: number, total?: number) => void;
}): Promise<{ publicUrl: string }> {
  const session = getPublishSession();
  if (!session) {
    throw new Error("publish_not_signed_in");
  }

  const collection = Zotero.Collections.get(opts.collectionId);
  if (!collection) {
    throw new Error("publish_collection_missing");
  }
  const libraryId = String(collection.libraryID);
  const collectionKey = collection.key;
  const syllabusTarget: PublishTarget = {
    kind: "syllabus",
    libraryId,
    collectionKey,
  };

  opts.onProgress?.("attachments");
  const picks = await collectPublishAttachments(opts.items);
  const linkMap = publishLinkMap(picks, session.userId, libraryId);
  const newItemKeys = [...new Set(picks.map((p) => p.itemKey))];

  const prepareStarted = Date.now();
  const remoteListPromise = listPublishObjects({
    token: session.token,
    target: syllabusTarget,
  }).catch((err) => {
    ztoolkit.log("listPublishObjects failed; will upload all files", err);
    return null;
  });

  // Per-item inventories for fingerprint skip (shared file store).
  const itemListPromises = Promise.all(
    newItemKeys.map(async (itemKey) => {
      try {
        const listed = await listPublishObjects({
          token: session.token,
          target: { kind: "item", libraryId, itemKey },
        });
        return [itemKey, listed.objects] as const;
      } catch (err) {
        ztoolkit.log("list item objects failed", itemKey, err);
        return [itemKey, {}] as const;
      }
    }),
  );

  opts.onProgress?.("citations");
  const citationItems = itemsWithSyllabusNote(opts.collectionId, opts.items);
  const exportPayloadPromise = buildSyllabusExportPayload(collection).catch(
    (err) => {
      ztoolkit.log("buildSyllabusExportPayload failed:", err);
      return null;
    },
  );
  const citationsPromise = exportPayloadPromise.then((payload) => {
    const citationOptions = payload
      ? {
          noteHtml: payload.noteHtml,
          exportIdByItemKey: payload.exportIdByItemKey,
        }
      : undefined;
    return Promise.all([
      exportItemsAsRis(citationItems, citationOptions).catch((err) => {
        ztoolkit.log("RIS export failed:", err);
        return "";
      }),
      exportItemsAsBibTeX(citationItems, citationOptions).catch((err) => {
        ztoolkit.log("BibTeX export failed:", err);
        return "";
      }),
      (async () => {
        const rdf = await getRDFStringForCollection(
          collection,
          citationOptions,
        );
        return typeof rdf === "string" ? rdf : "";
      })().catch((err) => {
        ztoolkit.log("RDF export failed:", err);
        return "";
      }),
    ]);
  });

  opts.onProgress?.("html");
  const htmlPromise = serializeSyllabusForPublish(
    opts.pageElement,
    opts.density,
    {
      publishLinkByItemId: linkMap,
      cslStyle: opts.cslStyle,
    },
  );
  const ogImagePromise = buildPublishOgImageJpeg(opts.pageElement).catch(
    (err) => {
      ztoolkit.log("OG image collage failed:", err);
      return null;
    },
  );
  const bibliographyPromise =
    opts.bibliographyHtmlPromise ?? Promise.resolve(opts.bibliographyHtml);

  const [
    [risText, bibText, rdfText],
    innerHTML,
    listed,
    bibliographyHtml,
    ogImageBytes,
    itemObjectLists,
  ] = await Promise.all([
    citationsPromise,
    htmlPromise,
    remoteListPromise,
    bibliographyPromise,
    ogImagePromise,
    itemListPromises,
  ]);

  const itemObjectsByKey = new Map(itemObjectLists);

  ztoolkit.log(
    `publish prepare finished in ${Date.now() - prepareStarted}ms ` +
      `(attachments=${picks.length}, ris=${risText.length}, bib=${bibText.length}, ` +
      `rdf=${rdfText.length}, ` +
      `remoteKeys=${listed ? Object.keys(listed.objects || {}).length : "n/a"}, ` +
      `ogImage=${ogImageBytes ? ogImageBytes.byteLength : 0})`,
  );

  const hasRis = Boolean(risText.trim());
  const hasBib = Boolean(bibText.trim());
  const hasRdf = Boolean(rdfText.trim());
  const description = extractPublishShareDescription(opts.pageElement);

  let publicUrl =
    listed?.publicUrl ||
    `${getPublishApiBaseUrl()}/u/${session.userId}/${libraryId}/${collectionKey}/`;
  if (!publicUrl.endsWith("/")) {
    publicUrl = `${publicUrl}/`;
  }

  const previousItemKeys = listed?.itemKeys || [];

  const citationUploads = [
    ...(hasRis ? [{ relPath: PUBLISH_BIBLIOGRAPHY_RIS, text: risText }] : []),
    ...(hasBib ? [{ relPath: PUBLISH_BIBLIOGRAPHY_BIB, text: bibText }] : []),
    ...(hasRdf ? [{ relPath: PUBLISH_BIBLIOGRAPHY_RDF, text: rdfText }] : []),
  ];
  const itemKeysJson = JSON.stringify({ itemKeys: newItemKeys });
  const total =
    picks.length +
    citationUploads.length +
    (ogImageBytes ? 1 : 0) +
    1 + // itemKeys.json
    1; // index.html
  let done = 0;

  const remoteObjects = listed?.objects || {};
  let ogImageReady = false;
  const uploadedCitationPaths = new Set<string>();

  for (const citation of citationUploads) {
    opts.onProgress?.("upload", done + 1, total);
    const bytes = new TextEncoder().encode(citation.text);
    const remote = remoteObjects[citation.relPath];
    if (remote && remote.size === bytes.byteLength) {
      uploadedCitationPaths.add(citation.relPath);
      done += 1;
      continue;
    }
    try {
      const result = await putPublishObject({
        token: session.token,
        target: syllabusTarget,
        relPath: citation.relPath,
        bytes,
      });
      publicUrl = result.publicUrl || publicUrl;
      uploadedCitationPaths.add(citation.relPath);
    } catch (err) {
      ztoolkit.log(
        `Citation upload failed for ${citation.relPath} (continuing):`,
        err,
      );
    }
    done += 1;
  }

  // Shared item file store
  for (const pick of picks) {
    opts.onProgress?.("upload", done + 1, total);
    const path = await pick.attachment.getFilePathAsync?.();
    if (!path) {
      ztoolkit.log("Skipping attachment with no path", pick.attachment.id);
      done += 1;
      continue;
    }

    const fingerprint = await localFileFingerprint(path);
    const itemObjects = itemObjectsByKey.get(pick.itemKey) || {};
    const remote = itemObjects[pick.relPath];
    if (
      remote &&
      remoteMatchesLocal({
        exists: true,
        remoteSize: remote.size,
        remoteFingerprint: remote.fingerprint,
        localFingerprint: fingerprint,
      })
    ) {
      done += 1;
      continue;
    }

    const bytes = await readAttachmentBytes(pick.attachment);
    if (!bytes || !bytes.length) {
      ztoolkit.log("Skipping unreadable attachment", pick.attachment.id);
      done += 1;
      continue;
    }
    await putPublishObject({
      token: session.token,
      target: { kind: "item", libraryId, itemKey: pick.itemKey },
      relPath: pick.relPath,
      bytes,
      fingerprint,
    });
    done += 1;
  }

  // Register syllabus refs on each linked item; remove dropped items.
  const previousSet = new Set(previousItemKeys);
  const newSet = new Set(newItemKeys);
  for (const itemKey of newItemKeys) {
    try {
      await patchPublishItemRefs({
        token: session.token,
        libraryId,
        itemKey,
        addSyllabus: collectionKey,
      });
    } catch (err) {
      ztoolkit.log("addSyllabus ref failed", itemKey, err);
    }
  }
  for (const itemKey of previousSet) {
    if (newSet.has(itemKey)) continue;
    try {
      await patchPublishItemRefs({
        token: session.token,
        libraryId,
        itemKey,
        removeSyllabus: collectionKey,
      });
    } catch (err) {
      ztoolkit.log("removeSyllabus ref failed", itemKey, err);
    }
  }

  // itemKeys.json for unpublish GC
  opts.onProgress?.("upload", done + 1, total);
  {
    const bytes = new TextEncoder().encode(itemKeysJson);
    await putPublishObject({
      token: session.token,
      target: syllabusTarget,
      relPath: PUBLISH_ITEM_KEYS_JSON,
      bytes,
    });
  }
  done += 1;

  // Delete legacy syllabus-scoped files/* (migrated to item store).
  for (const relPath of Object.keys(remoteObjects)) {
    if (!relPath.startsWith("files/")) continue;
    try {
      await deletePublishObject({
        token: session.token,
        target: syllabusTarget,
        relPath,
      });
    } catch (err) {
      ztoolkit.log("legacy file delete failed", relPath, err);
    }
  }

  if (ogImageBytes && ogImageBytes.byteLength) {
    opts.onProgress?.("upload", done + 1, total);
    try {
      const fingerprint = bytesContentFingerprint(ogImageBytes);
      const remote = remoteObjects[PUBLISH_OG_IMAGE];
      if (
        remote &&
        remoteMatchesLocal({
          exists: true,
          remoteSize: remote.size,
          remoteFingerprint: remote.fingerprint,
          localFingerprint: fingerprint,
        })
      ) {
        ogImageReady = true;
      } else {
        const result = await putPublishObject({
          token: session.token,
          target: syllabusTarget,
          relPath: PUBLISH_OG_IMAGE,
          bytes: ogImageBytes,
          fingerprint,
        });
        publicUrl = result.publicUrl || publicUrl;
        ogImageReady = true;
      }
    } catch (err) {
      ztoolkit.log("OG image upload failed (continuing without it):", err);
    }
    done += 1;
  }

  const showRis = uploadedCitationPaths.has(PUBLISH_BIBLIOGRAPHY_RIS);
  const showBib = uploadedCitationPaths.has(PUBLISH_BIBLIOGRAPHY_BIB);
  const showRdf = uploadedCitationPaths.has(PUBLISH_BIBLIOGRAPHY_RDF);
  if (hasRdf && !showRdf) {
    ztoolkit.log(
      "RDF was generated but not uploaded; omitting Zotero RDF download link",
    );
  }

  const htmlContent = await buildPrintableHtml({
    title: opts.title || "Syllabus",
    innerHTML,
    bibliographyHtml,
    density: opts.density,
    layout: "publish",
    description: description || undefined,
    canonicalUrl: publicUrl,
    ogImageUrl: ogImageReady ? `${publicUrl}${PUBLISH_OG_IMAGE}` : undefined,
    citationDownloads:
      showRis || showBib || showRdf
        ? {
            risHref: showRis ? PUBLISH_BIBLIOGRAPHY_RIS : undefined,
            bibHref: showBib ? PUBLISH_BIBLIOGRAPHY_BIB : undefined,
            rdfHref: showRdf ? PUBLISH_BIBLIOGRAPHY_RDF : undefined,
            risLabel: getString("publish-html-download-ris"),
            bibLabel: getString("publish-html-download-bib"),
            rdfLabel: getString("publish-html-download-rdf"),
          }
        : undefined,
  });

  opts.onProgress?.("upload", done + 1, total);
  const htmlBytes = new TextEncoder().encode(htmlContent);
  const result = await putPublishObject({
    token: session.token,
    target: syllabusTarget,
    relPath: "index.html",
    bytes: htmlBytes,
    syllabusMeta: {
      title: opts.title || "Syllabus",
      courseCode: opts.courseCode || "",
      institution: opts.institution || "",
      ...(isDevelopmentEnv() ? { dev: "y" } : {}),
    },
  });
  publicUrl = result.publicUrl || publicUrl;

  if (!publicUrl) {
    throw new Error("publish_no_url");
  }
  return { publicUrl };
}

/** Wipe the published R2 prefix and clear the local public URL for this collection. */
export async function unpublishSyllabusFromCloud(opts: {
  collectionId: number;
}): Promise<{ deleted: number }> {
  const session = getPublishSession();
  if (!session) {
    throw new Error("publish_not_signed_in");
  }

  const collection = Zotero.Collections.get(opts.collectionId);
  if (!collection) {
    throw new Error("publish_collection_missing");
  }
  const libraryId = String(collection.libraryID);
  const collectionKey = collection.key;

  const result = await deletePublishSyllabus({
    token: session.token,
    libraryId,
    collectionKey,
  });
  clearPublishedSyllabusUrl(opts.collectionId);
  clearPublishedShareOptions(opts.collectionId);
  return { deleted: result.deleted };
}
