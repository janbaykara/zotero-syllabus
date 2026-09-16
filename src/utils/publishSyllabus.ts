import { getCachedItem } from "./cache";
import {
  listPublishObjects,
  putPublishObject,
  getPublishSession,
  getPublishApiBaseUrl,
} from "./publishAuth";
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
  PUBLISH_BIBLIOGRAPHY_BIB,
  PUBLISH_BIBLIOGRAPHY_RIS,
} from "./exportCitations";
import { getString } from "./locale";
import {
  PUBLISH_OG_IMAGE,
  buildPublishOgImageJpeg,
  bytesContentFingerprint,
  extractPublishShareDescription,
} from "./publishOgImage";

export type PublishAttachmentPick = {
  itemId: number;
  itemKey: string;
  attachment: Zotero.Item;
  relPath: string;
  ext: string;
};

function extensionForAttachment(att: Zotero.Item): string {
  const path = String(
    att.attachmentPath || att.attachmentFilename || "",
  ).toLowerCase();
  const type = (att.attachmentContentType || "").toLowerCase();
  if (type.includes("pdf") || path.endsWith(".pdf")) return "pdf";
  if (type.includes("epub") || path.endsWith(".epub")) return "epub";
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
    const linkMode = att.attachmentLinkMode;
    // 1 = linked file may still be readable; 2 = imported URL; 3 = snapshot
    // Prefer imported file (0) and PDF/EPUB.
    const type = (att.attachmentContentType || "").toLowerCase();
    const path = (att.attachmentPath || "").toLowerCase();
    let s = 0;
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
    } else if (linkMode === 3) {
      s += 5;
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

export function collectPublishAttachments(
  items: Zotero.Item[],
): PublishAttachmentPick[] {
  const picks: PublishAttachmentPick[] = [];
  const seenAtt = new Set<number>();
  for (const item of items) {
    if (item.isAttachment?.() || item.isNote?.()) continue;
    const att = pickBestPublishAttachment(item);
    if (!att || seenAtt.has(att.id)) continue;
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

/** Map parent item id → relative publish path for title links. */
export function publishLinkMap(
  picks: PublishAttachmentPick[],
): Map<number, string> {
  const map = new Map<number, string>();
  for (const pick of picks) {
    map.set(pick.itemId, pick.relPath);
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

  opts.onProgress?.("attachments");
  const picks = collectPublishAttachments(opts.items);
  const linkMap = publishLinkMap(picks);

  // Overlap remote inventory, citation export, HTML, and bibliography.
  const prepareStarted = Date.now();
  const remoteListPromise = listPublishObjects({
    token: session.token,
    libraryId,
    collectionKey,
  }).catch((err) => {
    ztoolkit.log("listPublishObjects failed; will upload all files", err);
    return null;
  });

  opts.onProgress?.("citations");
  const citationsPromise = Promise.all([
    exportItemsAsRis(opts.items).catch((err) => {
      ztoolkit.log("RIS export failed:", err);
      return "";
    }),
    exportItemsAsBibTeX(opts.items).catch((err) => {
      ztoolkit.log("BibTeX export failed:", err);
      return "";
    }),
  ]);

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

  const [[risText, bibText], innerHTML, listed, bibliographyHtml, ogImageBytes] =
    await Promise.all([
      citationsPromise,
      htmlPromise,
      remoteListPromise,
      bibliographyPromise,
      ogImagePromise,
    ]);
  ztoolkit.log(
    `publish prepare finished in ${Date.now() - prepareStarted}ms ` +
      `(attachments=${picks.length}, ris=${risText.length}, bib=${bibText.length}, ` +
      `remoteKeys=${listed ? Object.keys(listed.objects || {}).length : "n/a"}, ` +
      `ogImage=${ogImageBytes ? ogImageBytes.byteLength : 0})`,
  );

  const hasRis = Boolean(risText.trim());
  const hasBib = Boolean(bibText.trim());
  const description = extractPublishShareDescription(opts.pageElement);

  let publicUrl =
    listed?.publicUrl ||
    `${getPublishApiBaseUrl()}/u/${session.userId}/${libraryId}/${collectionKey}/`;
  if (!publicUrl.endsWith("/")) {
    publicUrl = `${publicUrl}/`;
  }

  const citationUploads = [
    ...(hasRis ? [{ relPath: PUBLISH_BIBLIOGRAPHY_RIS, text: risText }] : []),
    ...(hasBib ? [{ relPath: PUBLISH_BIBLIOGRAPHY_BIB, text: bibText }] : []),
  ];
  const total =
    picks.length + citationUploads.length + (ogImageBytes ? 1 : 0) + 1;
  let done = 0;

  const remoteObjects = listed?.objects || {};
  let ogImageReady = false;

  // Citation exports are small; skip when byte length matches remote.
  for (const citation of citationUploads) {
    opts.onProgress?.("upload", done + 1, total);
    const bytes = new TextEncoder().encode(citation.text);
    const remote = remoteObjects[citation.relPath];
    if (remote && remote.size === bytes.byteLength) {
      done += 1;
      continue;
    }
    const result = await putPublishObject({
      token: session.token,
      libraryId,
      collectionKey,
      relPath: citation.relPath,
      bytes,
    });
    publicUrl = result.publicUrl || publicUrl;
    done += 1;
  }

  for (const pick of picks) {
    opts.onProgress?.("upload", done + 1, total);
    const path = await pick.attachment.getFilePathAsync?.();
    if (!path) {
      ztoolkit.log("Skipping attachment with no path", pick.attachment.id);
      done += 1;
      continue;
    }

    const fingerprint = await localFileFingerprint(path);
    const remote = remoteObjects[pick.relPath];
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
    const result = await putPublishObject({
      token: session.token,
      libraryId,
      collectionKey,
      relPath: pick.relPath,
      bytes,
      fingerprint,
    });
    publicUrl = result.publicUrl || publicUrl;
    done += 1;
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
          libraryId,
          collectionKey,
          relPath: PUBLISH_OG_IMAGE,
          bytes: ogImageBytes,
          fingerprint,
        });
        publicUrl = result.publicUrl || publicUrl;
        ogImageReady = true;
      }
    } catch (err) {
      // Worker may not allow og-image.jpg yet, or upload failed — still publish HTML.
      ztoolkit.log("OG image upload failed (continuing without it):", err);
    }
    done += 1;
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
      hasRis || hasBib
        ? {
            risHref: hasRis ? PUBLISH_BIBLIOGRAPHY_RIS : undefined,
            bibHref: hasBib ? PUBLISH_BIBLIOGRAPHY_BIB : undefined,
            risLabel: getString("publish-html-download-ris"),
            bibLabel: getString("publish-html-download-bib"),
          }
        : undefined,
  });

  opts.onProgress?.("upload", done + 1, total);
  const htmlBytes = new TextEncoder().encode(htmlContent);
  const result = await putPublishObject({
    token: session.token,
    libraryId,
    collectionKey,
    relPath: "index.html",
    bytes: htmlBytes,
  });
  publicUrl = result.publicUrl || publicUrl;

  if (!publicUrl) {
    throw new Error("publish_no_url");
  }
  return { publicUrl };
}
