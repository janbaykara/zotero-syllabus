/**
 * Publish a collection as Syllabus or Gallery (reading list) to Cloudflare R2.
 * Uploads share.json + interactive viewer; one URL per collection.
 */

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
import { getRDFStringForCollection } from "./rdf";
import { buildSyllabusExportPayload } from "../modules/syllabusNote";
import { PUBLISH_OG_IMAGE, bytesContentFingerprint } from "./publishOgImage";
import type { PublishTarget } from "./publishTarget";
import {
  collectPublishAttachments,
  PUBLISH_ITEM_KEYS_JSON,
  type PublishAttachmentPick,
} from "./publishSyllabus";
import {
  buildCollectionShareDocument,
  serializeShareDocument,
} from "./buildCollectionShare";
import { buildShareIndexHtml } from "./buildShareIndexHtml";
import { loadPublishViewerAssets } from "./loadPublishViewerAssets";
import {
  SHARE_JSON,
  SHARE_VIEWER_CSS,
  SHARE_VIEWER_JS,
  type CollectionShareOptions,
} from "./sharePayload";
import { bibliographyToHtml } from "../modules/Bibliography";
import { generateBibliographyForPrint } from "./cite";
import { isDevelopmentEnv } from "./env";

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

/** Build a simple OG collage from share item covers (first 4 image data URLs). */
async function buildOgFromShareCovers(
  items: { cover?: { kind: string; dataUrl?: string } }[],
): Promise<Uint8Array | null> {
  const dataUrls = items
    .map((i) =>
      i.cover?.kind === "image" && i.cover.dataUrl ? i.cover.dataUrl : null,
    )
    .filter((u): u is string => !!u)
    .slice(0, 4);
  if (!dataUrls.length) return null;

  try {
    const win = Zotero.getMainWindow();
    const doc = win?.document;
    if (!doc) return null;
    const size = 600;
    const canvas = doc.createElementNS(
      "http://www.w3.org/1999/xhtml",
      "canvas",
    ) as HTMLCanvasElement;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#f5f5f5";
    ctx.fillRect(0, 0, size, size);

    const n = dataUrls.length;
    const cols = n === 1 ? 1 : 2;
    const rows = n <= 2 ? 1 : 2;
    const cellW = size / cols;
    const cellH = size / rows;

    await Promise.all(
      dataUrls.map(
        (url, i) =>
          new Promise<void>((resolve) => {
            const Img = (win as unknown as Window & typeof globalThis).Image;
            const img = new Img();
            img.onload = () => {
              const col = i % cols;
              const row = Math.floor(i / cols);
              const scale = Math.max(cellW / img.width, cellH / img.height);
              const w = img.width * scale;
              const h = img.height * scale;
              const x = col * cellW + (cellW - w) / 2;
              const y = row * cellH + (cellH - h) / 2;
              ctx.drawImage(img, x, y, w, h);
              resolve();
            };
            img.onerror = () => resolve();
            img.src = url;
          }),
      ),
    );

    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    const comma = dataUrl.indexOf(",");
    const b64 = comma >= 0 ? dataUrl.slice(comma + 1) : "";
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) {
      bytes[i] = bin.charCodeAt(i);
    }
    return bytes;
  } catch (err) {
    ztoolkit.log("buildOgFromShareCovers failed:", err);
    return null;
  }
}

export async function publishCollectionToCloud(opts: {
  collectionId: number;
  items: Zotero.Item[];
  shareOptions: CollectionShareOptions;
  title?: string;
  courseCode?: string | null;
  institution?: string | null;
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
  const picks = opts.shareOptions.includeAttachments
    ? await collectPublishAttachments(opts.items)
    : [];
  const newItemKeys = [...new Set(picks.map((p) => p.itemKey))];

  const remoteListPromise = listPublishObjects({
    token: session.token,
    target: syllabusTarget,
  }).catch((err) => {
    ztoolkit.log("listPublishObjects failed; will upload all files", err);
    return null;
  });

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
      exportItemsAsRis(citationItems, citationOptions).catch(() => ""),
      exportItemsAsBibTeX(citationItems, citationOptions).catch(() => ""),
      (async () => {
        const rdf = await getRDFStringForCollection(
          collection,
          citationOptions,
        );
        return typeof rdf === "string" ? rdf : "";
      })().catch(() => ""),
    ]);
  });

  const bibliographyPromise = (async () => {
    try {
      const bibliography = await generateBibliographyForPrint(
        opts.items,
        opts.cslStyle || null,
      );
      return bibliography
        ? bibliographyToHtml(
            bibliography.content,
            opts.shareOptions.view.density,
            bibliography.isHtml,
            // Share viewer renders its own Bibliography heading.
            { includeHeading: false },
          )
        : "";
    } catch (err) {
      ztoolkit.log("bibliography failed:", err);
      return "";
    }
  })();

  const viewerAssetsPromise = loadPublishViewerAssets();

  opts.onProgress?.("html");
  const [
    [risText, bibText, rdfText],
    listed,
    bibliographyHtml,
    viewerAssets,
    itemObjectLists,
  ] = await Promise.all([
    citationsPromise,
    remoteListPromise,
    bibliographyPromise,
    viewerAssetsPromise,
    itemListPromises,
  ]);

  const hasRis = Boolean(risText.trim());
  const hasBib = Boolean(bibText.trim());
  const hasRdf = Boolean(rdfText.trim());

  let publicUrl =
    listed?.publicUrl ||
    `${getPublishApiBaseUrl()}/u/${session.userId}/${libraryId}/${collectionKey}/`;
  if (!publicUrl.endsWith("/")) {
    publicUrl = `${publicUrl}/`;
  }

  const citationDownloads = {
    risHref: hasRis ? PUBLISH_BIBLIOGRAPHY_RIS : undefined,
    bibHref: hasBib ? PUBLISH_BIBLIOGRAPHY_BIB : undefined,
    rdfHref: hasRdf ? PUBLISH_BIBLIOGRAPHY_RDF : undefined,
  };

  const shareDoc = await buildCollectionShareDocument({
    collectionId: opts.collectionId,
    items: opts.items,
    options: opts.shareOptions,
    picks,
    userId: session.userId,
    libraryId,
    bibliographyHtml: bibliographyHtml || undefined,
    citationDownloads:
      hasRis || hasBib || hasRdf ? citationDownloads : undefined,
    cslStyle: opts.cslStyle,
  });

  if (opts.title?.trim()) {
    shareDoc.title = opts.title.trim();
  }

  const ogImageBytes = await buildOgFromShareCovers(shareDoc.items);

  const itemObjectsByKey = new Map(itemObjectLists);
  const previousItemKeys = listed?.itemKeys || [];
  const remoteObjects = listed?.objects || {};

  const citationUploads = [
    ...(hasRis ? [{ relPath: PUBLISH_BIBLIOGRAPHY_RIS, text: risText }] : []),
    ...(hasBib ? [{ relPath: PUBLISH_BIBLIOGRAPHY_BIB, text: bibText }] : []),
    ...(hasRdf ? [{ relPath: PUBLISH_BIBLIOGRAPHY_RDF, text: rdfText }] : []),
  ];

  const shareJsonText = serializeShareDocument(shareDoc);
  // Progress is by library item (one tick when that item’s attachment work
  // finishes), not by individual file / page artifact.
  const progressItemKeys = [
    ...new Set(
      opts.items
        .filter((item) => item.isRegularItem?.() && !item.isNote?.())
        .map((item) => item.key),
    ),
  ];
  const itemTotal = Math.max(progressItemKeys.length, 1);
  let itemsDone = 0;
  let ogImageReady = false;
  const uploadedCitationPaths = new Set<string>();
  const picksByItemKey = new Map<string, typeof picks>();
  for (const pick of picks) {
    const list = picksByItemKey.get(pick.itemKey) || [];
    list.push(pick);
    picksByItemKey.set(pick.itemKey, list);
  }

  opts.onProgress?.("preparing");
  for (const citation of citationUploads) {
    const bytes = new TextEncoder().encode(citation.text);
    const remote = remoteObjects[citation.relPath];
    if (remote && remote.size === bytes.byteLength) {
      uploadedCitationPaths.add(citation.relPath);
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
      ztoolkit.log(`Citation upload failed for ${citation.relPath}:`, err);
    }
  }

  for (const itemKey of progressItemKeys) {
    opts.onProgress?.("upload", itemsDone + 1, itemTotal);
    for (const pick of picksByItemKey.get(itemKey) || []) {
      const path = await pick.attachment.getFilePathAsync?.();
      if (!path) continue;
      const fingerprint = await localFileFingerprint(path);
      const itemObjects = itemObjectsByKey.get(pick.itemKey) || {};
      const remote = itemObjects[pick.relPath];
      const already =
        remote &&
        remoteMatchesLocal({
          exists: true,
          remoteSize: remote.size,
          remoteFingerprint: remote.fingerprint,
          localFingerprint: fingerprint,
        });
      if (!already) {
        const bytes = await readAttachmentBytes(pick.attachment);
        if (bytes?.length) {
          await putPublishObject({
            token: session.token,
            target: { kind: "item", libraryId, itemKey: pick.itemKey },
            relPath: pick.relPath,
            bytes,
            fingerprint,
          });
        }
      }
    }
    itemsDone += 1;
  }
  if (!progressItemKeys.length) {
    opts.onProgress?.("upload", itemTotal, itemTotal);
  }

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

  opts.onProgress?.("preparing");
  await putPublishObject({
    token: session.token,
    target: syllabusTarget,
    relPath: PUBLISH_ITEM_KEYS_JSON,
    bytes: new TextEncoder().encode(JSON.stringify({ itemKeys: newItemKeys })),
  });

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
    try {
      const fingerprint = bytesContentFingerprint(ogImageBytes);
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
        const result = await putPublishObject({
          token: session.token,
          target: syllabusTarget,
          relPath: PUBLISH_OG_IMAGE,
          bytes: ogImageBytes,
          fingerprint,
        });
        publicUrl = result.publicUrl || publicUrl;
      }
      ogImageReady = true;
    } catch (err) {
      ztoolkit.log("OG image upload failed:", err);
    }
  }

  await putPublishObject({
    token: session.token,
    target: syllabusTarget,
    relPath: SHARE_JSON,
    bytes: new TextEncoder().encode(shareJsonText),
  });

  await putPublishObject({
    token: session.token,
    target: syllabusTarget,
    relPath: SHARE_VIEWER_JS,
    bytes: new TextEncoder().encode(viewerAssets.js),
  });

  await putPublishObject({
    token: session.token,
    target: syllabusTarget,
    relPath: SHARE_VIEWER_CSS,
    bytes: new TextEncoder().encode(viewerAssets.css),
  });

  const htmlContent = buildShareIndexHtml({
    title: shareDoc.title,
    description: shareDoc.description,
    canonicalUrl: publicUrl,
    ogImageUrl: ogImageReady ? `${publicUrl}${PUBLISH_OG_IMAGE}` : undefined,
    // COinS in the static shell — Connector multi-detect before viewer.js runs.
    bibliographyHtml: bibliographyHtml || shareDoc.bibliographyHtml,
  });

  const result = await putPublishObject({
    token: session.token,
    target: syllabusTarget,
    relPath: "index.html",
    bytes: new TextEncoder().encode(htmlContent),
    syllabusMeta: {
      title: shareDoc.title,
      courseCode: opts.courseCode || shareDoc.syllabus?.courseCode || "",
      institution: opts.institution || shareDoc.syllabus?.institution || "",
      annotations: opts.shareOptions.includeAnnotations ? "y" : "n",
      shareKind: opts.shareOptions.kind,
      ...(isDevelopmentEnv() ? { dev: "y" } : {}),
    },
  });
  publicUrl = result.publicUrl || publicUrl;

  if (!publicUrl) {
    throw new Error("publish_no_url");
  }
  return { publicUrl };
}

export async function unpublishCollectionFromCloud(opts: {
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

/** @deprecated Prefer publishCollectionToCloud */
export type { PublishAttachmentPick };
