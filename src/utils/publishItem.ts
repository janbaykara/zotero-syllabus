/** Publish / unpublish a single library item cover page + shared attachments. */

import { getCachedItem } from "./cache";
import { generateBibliographicReference } from "./cite";
import {
  exportItemsAsBibTeX,
  exportItemsAsRis,
  PUBLISH_BIBLIOGRAPHY_BIB,
  PUBLISH_BIBLIOGRAPHY_RDF,
  PUBLISH_BIBLIOGRAPHY_RIS,
} from "./exportCitations";
import { resolveItemCover } from "./itemCover";
import {
  formatAnnotationCopyText,
  annotationHasCopyText,
} from "../modules/annotationStream";
import { annotationCommentToDisplayHtml } from "./annotationComment";
import {
  annotationsStreamForParent,
  sortAnnotationsByQuoteOrder,
} from "../modules/explorerQueries";
import {
  buildItemShareHtml,
  collectItemShareMeta,
  isEmbeddableShareContentType,
  itemShareDisplayTitle,
  type ItemShareAnnotation,
  type ItemShareFileLink,
} from "./itemShareHtml";
import { getItemAbstractSnippet, getItemCreatorLine } from "./items";
import {
  deletePublishItem,
  getPublishApiBaseUrl,
  getPublishSession,
  listPublishObjects,
  patchPublishItemRefs,
  putPublishObject,
} from "./publishAuth";
import {
  localFileFingerprint,
  remoteMatchesLocal,
} from "./publishFileFingerprints";
import {
  forgetPublishedItemUrl,
  rememberPublishedItemUrl,
} from "./publishItemUrls";
import { PUBLISH_OG_IMAGE, bytesContentFingerprint } from "./publishOgImage";
import { pickBestPublishAttachment } from "./publishSyllabus";
import type { PublishTarget } from "./publishTarget";
import { fallbackItemsAsZoteroRdf } from "./rdf";

export type ItemPublishAttachment = {
  attachment: Zotero.Item;
  relPath: string;
  ext: string;
  label: string;
  contentType: string;
  embeddable: boolean;
};

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

function attachmentLabel(att: Zotero.Item, ext: string): string {
  const name = String(
    att.attachmentFilename || att.getField?.("title") || "",
  ).trim();
  if (name) return name;
  return `file.${ext}`;
}

/** All local file attachments for an item (or the standalone attachment itself). */
export function collectAllItemShareAttachments(
  item: Zotero.Item,
): ItemPublishAttachment[] {
  const out: ItemPublishAttachment[] = [];
  const seen = new Set<number>();

  const consider = (att: Zotero.Item | false | null | undefined) => {
    if (!att || !att.isAttachment?.() || seen.has(att.id)) return;
    const linkMode = att.attachmentLinkMode;
    // Skip linked-URL-only (typically 2 without local file — checked later by path).
    if (linkMode === 2 && !att.attachmentPath) return;
    seen.add(att.id);
    const ext = extensionForAttachment(att);
    const contentType = String(att.attachmentContentType || "");
    out.push({
      attachment: att,
      relPath: `files/${att.key}.${ext}`,
      ext,
      label: attachmentLabel(att, ext),
      contentType,
      embeddable: isEmbeddableShareContentType(contentType, ext),
    });
  };

  if (item.isAttachment?.()) {
    consider(item);
    return out;
  }
  if (item.isNote?.()) {
    return out;
  }

  for (const id of item.getAttachments() || []) {
    consider(getCachedItem(id) || Zotero.Items.get(id));
  }
  return out;
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

async function coverToDataUrl(item: Zotero.Item): Promise<{
  dataUrl: string | null;
  placeholder: { color: string; title: string; creator: string } | null;
  jpegBytes: Uint8Array | null;
}> {
  try {
    const cover = await resolveItemCover(item);
    if (cover.kind === "placeholder") {
      return {
        dataUrl: null,
        placeholder: {
          color: cover.color,
          title: cover.title,
          creator: cover.creator,
        },
        jpegBytes: null,
      };
    }
    let dataUrl = cover.src;
    if (!dataUrl.startsWith("data:")) {
      try {
        const res = await fetch(dataUrl);
        if (res.ok) {
          const buf = await res.arrayBuffer();
          const contentType = res.headers.get("content-type") || "image/jpeg";
          const bytes = new Uint8Array(buf);
          let binary = "";
          const chunk = 0x8000;
          for (let i = 0; i < bytes.length; i += chunk) {
            binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
          }
          dataUrl = `data:${contentType};base64,${btoa(binary)}`;
        }
      } catch {
        // keep original src if fetch fails
      }
    }
    let jpegBytes: Uint8Array | null = null;
    if (dataUrl.startsWith("data:image/")) {
      try {
        const comma = dataUrl.indexOf(",");
        const b64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
        const bin = atob(b64);
        jpegBytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) {
          jpegBytes[i] = bin.charCodeAt(i);
        }
      } catch {
        jpegBytes = null;
      }
    }
    return { dataUrl, placeholder: null, jpegBytes };
  } catch (err) {
    ztoolkit.log("coverToDataUrl failed:", err);
    return { dataUrl: null, placeholder: null, jpegBytes: null };
  }
}

/** Parent regular item for a child attachment; otherwise the item itself. */
export function resolveShareItem(item: Zotero.Item): Zotero.Item {
  if (item.isAttachment?.()) {
    try {
      const parentId = item.parentItemID;
      if (parentId) {
        const parent = getCachedItem(parentId) || Zotero.Items.get(parentId);
        if (parent && typeof parent !== "boolean" && parent.isRegularItem?.()) {
          return parent;
        }
      }
    } catch {
      // standalone attachment
    }
  }
  return item;
}

async function collectItemShareAnnotations(
  item: Zotero.Item,
): Promise<ItemShareAnnotation[]> {
  const stream = await annotationsStreamForParent(item);
  const ordered = sortAnnotationsByQuoteOrder(stream, "location");
  return ordered
    .map((entry) => ({
      quote: entry.quote || "",
      commentHtml: entry.comment
        ? annotationCommentToDisplayHtml(entry.comment)
        : "",
      color: entry.color || "#ffd400",
      pageLabel: entry.pageLabel || "",
      tags: entry.tags || [],
      copyText: annotationHasCopyText(entry)
        ? formatAnnotationCopyText(entry)
        : "",
    }))
    .filter((row) => row.quote || row.commentHtml);
}

export async function publishItemToCloud(opts: {
  item: Zotero.Item;
  includeAnnotations?: boolean;
  onProgress?: (phase: string, current?: number, total?: number) => void;
}): Promise<{ publicUrl: string }> {
  const session = getPublishSession();
  if (!session) {
    throw new Error("publish_not_signed_in");
  }

  const item = resolveShareItem(opts.item);
  if (item.isNote?.()) {
    throw new Error("publish_item_invalid");
  }

  const libraryId = String(item.libraryID);
  const itemKey = item.key;
  const target: PublishTarget = { kind: "item", libraryId, itemKey };

  opts.onProgress?.("attachments");
  const picks = collectAllItemShareAttachments(item);
  // Prefer best attachment first for embedding
  const best = item.isAttachment?.() ? item : pickBestPublishAttachment(item);
  if (best) {
    picks.sort((a, b) => {
      if (a.attachment.id === best.id) return -1;
      if (b.attachment.id === best.id) return 1;
      return 0;
    });
  }

  const listed = await listPublishObjects({
    token: session.token,
    target,
  }).catch((err) => {
    ztoolkit.log("listPublishObjects (item) failed:", err);
    return null;
  });

  const remoteObjects = listed?.objects || {};
  let publicUrl =
    listed?.publicUrl ||
    `${getPublishApiBaseUrl()}/u/${session.userId}/${libraryId}/item/${itemKey}/`;
  if (!publicUrl.endsWith("/")) {
    publicUrl = `${publicUrl}/`;
  }

  opts.onProgress?.("citations");
  const citationItems = item.isAttachment?.() ? [] : [item];
  const [risText, bibText, rdfText, citationHtml, cover] = await Promise.all([
    citationItems.length
      ? exportItemsAsRis(citationItems).catch(() => "")
      : Promise.resolve(""),
    citationItems.length
      ? exportItemsAsBibTeX(citationItems).catch(() => "")
      : Promise.resolve(""),
    citationItems.length
      ? Promise.resolve(fallbackItemsAsZoteroRdf(citationItems)).catch(() => "")
      : Promise.resolve(""),
    citationItems.length
      ? generateBibliographicReference(item).catch(() => null)
      : Promise.resolve(null),
    coverToDataUrl(item),
  ]);

  const hasRis = Boolean(risText.trim());
  const hasBib = Boolean(bibText.trim());
  const hasRdf = Boolean(rdfText.trim());

  const citationUploads = [
    ...(hasRis ? [{ relPath: PUBLISH_BIBLIOGRAPHY_RIS, text: risText }] : []),
    ...(hasBib ? [{ relPath: PUBLISH_BIBLIOGRAPHY_BIB, text: bibText }] : []),
    ...(hasRdf ? [{ relPath: PUBLISH_BIBLIOGRAPHY_RDF, text: rdfText }] : []),
  ];

  const total =
    picks.length + citationUploads.length + (cover.jpegBytes ? 1 : 0) + 1;
  let done = 0;
  const uploadedFiles: ItemShareFileLink[] = [];

  for (const pick of picks) {
    opts.onProgress?.("upload", done + 1, total);
    const path = await pick.attachment.getFilePathAsync?.();
    if (!path) {
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
      uploadedFiles.push({
        relPath: pick.relPath,
        label: pick.label,
        contentType: pick.contentType,
        embeddable: pick.embeddable,
      });
      done += 1;
      continue;
    }
    const bytes = await readAttachmentBytes(pick.attachment);
    if (!bytes?.length) {
      done += 1;
      continue;
    }
    await putPublishObject({
      token: session.token,
      target,
      relPath: pick.relPath,
      bytes,
      fingerprint,
    });
    uploadedFiles.push({
      relPath: pick.relPath,
      label: pick.label,
      contentType: pick.contentType,
      embeddable: pick.embeddable,
    });
    done += 1;
  }

  for (const citation of citationUploads) {
    opts.onProgress?.("upload", done + 1, total);
    const bytes = new TextEncoder().encode(citation.text);
    const remote = remoteObjects[citation.relPath];
    if (remote && remote.size === bytes.byteLength) {
      done += 1;
      continue;
    }
    try {
      await putPublishObject({
        token: session.token,
        target,
        relPath: citation.relPath,
        bytes,
      });
    } catch (err) {
      ztoolkit.log("item citation upload failed", citation.relPath, err);
    }
    done += 1;
  }

  let ogImageReady = false;
  if (cover.jpegBytes?.byteLength) {
    opts.onProgress?.("upload", done + 1, total);
    try {
      const fingerprint = bytesContentFingerprint(cover.jpegBytes);
      const remote = remoteObjects[PUBLISH_OG_IMAGE];
      if (!(
        remote &&
        remoteMatchesLocal({
          exists: true,
          remoteSize: remote.size,
          remoteFingerprint: remote.fingerprint,
          localFingerprint: fingerprint,
        })
      )) {
        await putPublishObject({
          token: session.token,
          target,
          relPath: PUBLISH_OG_IMAGE,
          bytes: cover.jpegBytes,
          fingerprint,
        });
      }
      ogImageReady = true;
    } catch (err) {
      ztoolkit.log("item og-image upload failed:", err);
    }
    done += 1;
  }

  await patchPublishItemRefs({
    token: session.token,
    libraryId,
    itemKey,
    setPage: true,
  });

  const embed =
    uploadedFiles.find((f) => f.embeddable) ||
    uploadedFiles.find((f) => f.relPath.toLowerCase().endsWith(".pdf"));

  let itemTypeLabel = String(item.itemType || "");
  try {
    itemTypeLabel = String(
      Zotero.ItemTypes.getLocalizedString?.(item.itemTypeID) || itemTypeLabel,
    );
  } catch {
    // keep fallback
  }

  let annotations: ItemShareAnnotation[] | undefined;
  if (opts.includeAnnotations) {
    opts.onProgress?.("annotations");
    try {
      annotations = await collectItemShareAnnotations(item);
    } catch (err) {
      ztoolkit.log("item share annotations collect failed:", err);
      annotations = [];
    }
  }

  const title = itemShareDisplayTitle(item);
  const html = buildItemShareHtml({
    title,
    creators: getItemCreatorLine(item),
    itemTypeLabel,
    description: getItemAbstractSnippet(item).slice(0, 300),
    canonicalUrl: publicUrl,
    coverDataUrl: cover.dataUrl,
    coverPlaceholder: cover.placeholder,
    ogImageUrl: ogImageReady ? `${publicUrl}${PUBLISH_OG_IMAGE}` : undefined,
    metaRows: collectItemShareMeta(item),
    citationHtml: citationHtml
      ? citationHtml.replace(/</g, "&lt;").replace(/>/g, "&gt;")
      : undefined,
    files: uploadedFiles,
    embedRelPath: embed?.relPath || null,
    citationDownloads: {
      risHref: hasRis ? PUBLISH_BIBLIOGRAPHY_RIS : undefined,
      bibHref: hasBib ? PUBLISH_BIBLIOGRAPHY_BIB : undefined,
      rdfHref: hasRdf ? PUBLISH_BIBLIOGRAPHY_RDF : undefined,
    },
    annotations,
  });

  opts.onProgress?.("upload", done + 1, total);
  const result = await putPublishObject({
    token: session.token,
    target,
    relPath: "index.html",
    bytes: new TextEncoder().encode(html),
    syllabusMeta: { title },
  });
  publicUrl = result.publicUrl || publicUrl;
  if (!publicUrl.endsWith("/")) {
    publicUrl = `${publicUrl}/`;
  }

  await rememberPublishedItemUrl(item, publicUrl);
  return { publicUrl };
}

export async function unpublishItemFromCloud(opts: {
  item: Zotero.Item;
}): Promise<{ deleted: number }> {
  const session = getPublishSession();
  if (!session) {
    throw new Error("publish_not_signed_in");
  }
  const item = resolveShareItem(opts.item);
  const libraryId = String(item.libraryID);
  const itemKey = item.key;
  const result = await deletePublishItem({
    token: session.token,
    libraryId,
    itemKey,
  });
  await forgetPublishedItemUrl(item);
  return { deleted: result.deleted };
}
