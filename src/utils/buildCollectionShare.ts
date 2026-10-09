/** Build share.json from library data for collection publish. */

import { formatDate } from "date-fns";
import { getCachedItem } from "./cache";
import { parseReadingDate } from "./dates";
import { getString } from "./locale";
import {
  getItemAbstractSnippet,
  getItemCreatorLine,
  getItemTitle,
  isClassNoteItem,
} from "./items";
import { getPersonalReadingOrderDocument } from "../modules/personalReadingOrder";
import {
  getCollectionDocument,
  collectionHasSyllabusNote,
} from "../modules/syllabusNote";
import { orderedClassIds } from "./schemas";
import { absoluteItemFileHref } from "./publishTarget";
import { collectItemShareAnnotations, coverToDataUrl } from "./publishItem";
import { itemTypeIconDataUri } from "./publishHtmlEnhance";
import { formatSharePageLabel } from "./itemShareHtml";
import { generateBibliographicReference } from "./cite";
import type { PublishAttachmentPick } from "./publishSyllabus";
import {
  SHARE_JSON,
  type CollectionShareDocument,
  type CollectionShareOptions,
  type ShareAnnotation,
  type ShareCover,
  type ShareItem,
  type ShareOpener,
  type ShareSyllabusAssignment,
  type ShareSyllabusClass,
  type ShareSyllabusPayload,
} from "./sharePayload";
import { buildPublishCreditInnerHtml } from "./publishCredit";
import { isAutomaticTag, isPluginOwnedTag } from "../modules/tagGroups";
import type { ShareTag } from "./sharePayload";
import { publishHrefIconKind } from "./zoteroAttachmentIcons";
import { proseToDisplayHtml } from "./prose";

export { SHARE_JSON };

/** Manual + automatic tags for interactive group-by; plugin tags omitted. */
function itemTags(item: Zotero.Item): ShareTag[] {
  try {
    const tags = item.getTags?.() || [];
    const out: ShareTag[] = [];
    for (const entry of tags) {
      const tag = String(entry.tag || "").trim();
      if (!tag || isPluginOwnedTag(tag)) continue;
      out.push({
        tag,
        ...(isAutomaticTag(entry) ? { automatic: true } : {}),
      });
    }
    return out;
  } catch {
    return [];
  }
}

function annotationPassesFilters(
  ann: ShareAnnotation,
  colorFilter: string[],
  tagFilter: string[],
): boolean {
  if (colorFilter.length) {
    const color = (ann.color || "").toLowerCase();
    if (!colorFilter.some((c) => c.toLowerCase() === color)) {
      return false;
    }
  }
  if (tagFilter.length) {
    const tags = new Set(ann.tags.map((t) => t.toLowerCase()));
    if (!tagFilter.some((t) => tags.has(t.toLowerCase()))) {
      return false;
    }
  }
  return true;
}

function itemExternalUrl(item: Zotero.Item): string | undefined {
  try {
    const url = String(item.getField?.("url") || "").trim();
    if (/^https?:\/\//i.test(url)) return url;
    const doi = String(item.getField?.("DOI") || "").trim();
    if (doi) {
      if (/^https?:\/\//i.test(doi)) return doi;
      return `https://doi.org/${doi.replace(/^doi:/i, "")}`;
    }
    // Fall back to a linked-URL attachment (bookmark / “Snapshot” with no file).
    const linkedUrl = Zotero.Attachments?.LINK_MODE_LINKED_URL ?? 3;
    for (const id of item.getAttachments?.() || []) {
      const raw = getCachedItem(id) || Zotero.Items.get(id);
      if (!raw || typeof raw === "boolean" || !raw.isAttachment?.()) continue;
      if (raw.attachmentLinkMode !== linkedUrl) continue;
      const attUrl = String(raw.getField?.("url") || "").trim();
      if (/^https?:\/\//i.test(attUrl)) return attUrl;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

/** Prefer a published attachment; otherwise the item URL / DOI for webpages. */
function itemOpenHref(
  item: Zotero.Item,
  fileHref?: string,
): string | undefined {
  return fileHref || itemExternalUrl(item);
}

/** Card accessibility indicators: uploaded file + item URL when both exist. */
function itemOpeners(item: Zotero.Item, fileHref?: string): ShareOpener[] {
  const openers: ShareOpener[] = [];
  const seen = new Set<string>();
  const push = (href: string | undefined) => {
    if (!href || seen.has(href)) return;
    const kind = publishHrefIconKind(href);
    if (!kind) return;
    seen.add(href);
    openers.push({ kind, href });
  };
  push(fileHref);
  push(itemExternalUrl(item));
  return openers;
}

async function buildShareItem(opts: {
  item: Zotero.Item;
  collectionId: number;
  collectionKey: string;
  fileHref?: string;
  includeAnnotations: boolean;
  colorFilter: string[];
  tagFilter: string[];
  cslStyle?: string | null;
}): Promise<ShareItem | null> {
  const { item } = opts;
  if (item.isAttachment?.() || item.isNote?.()) {
    // Class notes stay private; skip notes entirely.
    if (item.isNote?.()) return null;
  }
  if (isClassNoteItem(item)) return null;
  if (!item.isRegularItem?.() && !item.isNote?.()) {
    // Skip non-regular (attachments already filtered).
    if (item.isAttachment?.()) return null;
  }

  const coverResult = await coverToDataUrl(item);
  let cover: ShareCover | undefined;
  if (coverResult.dataUrl) {
    cover = { kind: "image", dataUrl: coverResult.dataUrl };
  } else if (coverResult.placeholder) {
    cover = {
      kind: "placeholder",
      color: coverResult.placeholder.color,
      title: coverResult.placeholder.title,
      creator: coverResult.placeholder.creator,
    };
  }

  let annotations: ShareAnnotation[] | undefined;
  if (opts.includeAnnotations) {
    const raw = await collectItemShareAnnotations(item);
    annotations = raw
      .filter((ann) =>
        annotationPassesFilters(ann, opts.colorFilter, opts.tagFilter),
      )
      .map((ann) => ({
        ...ann,
        // Same page wording as individual item-share pages.
        pageLabel: ann.pageLabel ? formatSharePageLabel(ann.pageLabel) : "",
      }));
  }

  const itemType = String(item.itemType || "");
  let itemTypeLabel = itemType;
  try {
    itemTypeLabel =
      Zotero.ItemTypes.getLocalizedString?.(item.itemType) || itemType;
  } catch {
    // keep raw
  }

  let citation: string | undefined;
  try {
    const ref = await generateBibliographicReference(
      item,
      true,
      opts.cslStyle || null,
    );
    const trimmed = (ref || "").trim();
    if (trimmed) citation = trimmed;
  } catch (err) {
    ztoolkit.log("share citation failed:", item.key, err);
  }

  const shareItem: ShareItem = {
    key: item.key,
    title: getItemTitle(item) || item.key,
    creators: getItemCreatorLine(item),
    date: String(item.getField?.("date") || "").trim(),
    dateAdded: String(item.dateAdded || "").trim(),
    itemType,
    itemTypeLabel,
    abstract: getItemAbstractSnippet(item) || undefined,
    citation,
    fileHref: itemOpenHref(item, opts.fileHref),
    openers: (() => {
      const list = itemOpeners(item, opts.fileHref);
      return list.length ? list : undefined;
    })(),
    cover,
    // Gallery notes, checkboxes, and done-state are personal/local — never publish.
    tags: itemTags(item),
    annotations,
  };

  return shareItem;
}

function buildSyllabusPayload(
  collectionId: number,
): ShareSyllabusPayload | undefined {
  if (!collectionHasSyllabusNote(collectionId)) {
    return undefined;
  }
  const doc = getCollectionDocument(collectionId);
  const classOrder = orderedClassIds(doc);
  const classes: ShareSyllabusClass[] = classOrder.map((id, index) => {
    const meta = doc.classes?.[id];
    const descriptionHtml = proseToDisplayHtml(meta?.description);
    const rawDate = String(meta?.readingDate || "").trim();
    let date: string | null = null;
    if (rawDate) {
      try {
        // e.g. "Thursday, 16 Oct 26"
        date = formatDate(parseReadingDate(rawDate), "EEEE, dd MMM yy");
      } catch {
        date = rawDate;
      }
    }
    return {
      id,
      number: meta?.number ?? index + 1,
      title: String(meta?.title || "").trim() || `Class ${index + 1}`,
      description: descriptionHtml || null,
      date,
    };
  });

  const assignments: ShareSyllabusAssignment[] = [];
  for (const [itemKey, rows] of Object.entries(doc.items || {})) {
    for (const row of rows || []) {
      assignments.push({
        id: row.id,
        itemKey,
        classId: row.classId,
        priority: row.priority ?? null,
        classInstruction: row.classInstruction ?? null,
      });
    }
  }

  return {
    courseCode: doc.courseCode || undefined,
    institution: doc.institution || undefined,
    description: doc.description || undefined,
    classes,
    classOrder,
    assignments,
    furtherReadingOrder: [...(doc.furtherReadingOrder || [])],
  };
}

export async function buildCollectionShareDocument(opts: {
  collectionId: number;
  items: Zotero.Item[];
  options: CollectionShareOptions;
  picks: PublishAttachmentPick[];
  userId: string;
  libraryId: string;
  bibliographyHtml?: string;
  citationDownloads?: CollectionShareDocument["citationDownloads"];
  cslStyle?: string | null;
}): Promise<CollectionShareDocument> {
  const collection = Zotero.Collections.get(opts.collectionId);
  if (!collection) {
    throw new Error("publish_collection_missing");
  }

  const fileHrefByItemId = new Map<number, string>();
  if (opts.options.includeAttachments) {
    for (const pick of opts.picks) {
      fileHrefByItemId.set(
        pick.itemId,
        absoluteItemFileHref(
          opts.userId,
          opts.libraryId,
          pick.itemKey,
          pick.relPath,
        ),
      );
    }
  }

  const personal = getPersonalReadingOrderDocument(collection);

  const shareItems: ShareItem[] = [];
  for (const item of opts.items) {
    const shareItem = await buildShareItem({
      item,
      collectionId: opts.collectionId,
      collectionKey: collection.key,
      fileHref: fileHrefByItemId.get(item.id),
      includeAnnotations: opts.options.includeAnnotations,
      colorFilter: opts.options.view.colorFilter,
      tagFilter: opts.options.view.tagFilter,
      cslStyle: opts.cslStyle,
    });
    if (shareItem) {
      shareItems.push(shareItem);
    }
  }

  const title =
    collection.name?.trim() ||
    (opts.options.kind === "syllabus" ? "Syllabus" : "Reading list");

  const syllabus =
    opts.options.kind === "syllabus"
      ? buildSyllabusPayload(opts.collectionId)
      : undefined;

  // Syllabus shares use the syllabus note blurb; gallery shares use the
  // Personal Reading Order note description (Gallery “Add a description…”).
  // Markdown → HTML so the public page keeps paragraph / soft-break structure.
  const descriptionRaw =
    opts.options.kind === "syllabus"
      ? syllabus?.description || undefined
      : personal.description || undefined;
  const description = descriptionRaw
    ? proseToDisplayHtml(descriptionRaw) || undefined
    : undefined;

  // One SVG data-URI per item type for Card row/standard density (not covers).
  const itemTypeIcons: Record<string, string> = {};
  const uniqueTypes = [
    ...new Set(shareItems.map((i) => i.itemType).filter(Boolean)),
  ];
  await Promise.all(
    uniqueTypes.map(async (itemType) => {
      const uri = await itemTypeIconDataUri(itemType, 28);
      if (uri) {
        itemTypeIcons[itemType] = uri;
      }
    }),
  );

  const publishedWhen = new Date();
  // Same wording as syllabus hosted HTML (`insertPublishTimestamp`).
  const publishedDateLabel = formatDate(publishedWhen, "dd MMM yyyy");

  return {
    version: 1,
    kind: opts.options.kind,
    // Always interactive: view chrome lives in a ⋯ menu on the public page.
    interactive: true,
    includeAnnotations: opts.options.includeAnnotations,
    includeAttachments: opts.options.includeAttachments,
    title,
    description,
    publishedAt: publishedWhen.toISOString(),
    view: { ...opts.options.view, readerMode: false },
    items: shareItems,
    itemTypeIcons:
      Object.keys(itemTypeIcons).length > 0 ? itemTypeIcons : undefined,
    personalOrder: [...(personal.order || [])],
    syllabus,
    strings: {
      copy: getString("my-annotations-copy"),
      copied: getString("my-annotations-copied"),
      copyAll: getString("my-annotations-copy-all"),
      tagsAria: getString("my-annotations-stream-tags-aria"),
      bibliography: getString("share-viewer-bibliography"),
      downloadRis: getString("publish-html-download-ris"),
      downloadBib: getString("publish-html-download-bib"),
      downloadRdf: getString("publish-html-download-rdf"),
      downloadsMenu: getString("share-viewer-downloads"),
      downloadsMenuAria: getString("share-viewer-downloads-aria"),
      optionsAria: getString("share-viewer-options-aria"),
      openPdf: getString("attachment-open", {
        args: { label: getString("attachment-pdf") },
      }),
      openEpub: getString("attachment-open", {
        args: { label: getString("attachment-epub") },
      }),
      openUrl: getString("attachment-open", {
        args: { label: getString("attachment-url") },
      }),
      publishedAt: getString("publish-html-published-at", {
        args: { date: publishedDateLabel },
      }),
      // HTML with linked product names (same as legacy publish footer).
      credit: buildPublishCreditInnerHtml(),
      empty: getString("share-viewer-empty"),
      unordered: getString("gallery-personal-order-unordered"),
      layout: getString("gallery-menu-view"),
      sort: getString("gallery-menu-sort"),
      group: getString("gallery-menu-group"),
      density: getString("settings-density"),
      quoteOrder: getString("annotations-quote-order-menu"),
      showEmpty: getString("gallery-annotations-show-empty"),
      includeAutoTags: getString("gallery-include-automatic-tags"),
      annotationsIncluded: getString("share-wizard-include-annotations"),
      layoutCover: getString("gallery-layout-cover"),
      layoutCard: getString("gallery-layout-card"),
      layoutMagazine: getString("gallery-layout-magazine"),
      layoutAnnotations: getString("gallery-layout-annotations"),
      sortAz: getString("gallery-sort-az"),
      sortPersonalOrder: getString("gallery-sort-personal-order"),
      sortDate: getString("gallery-sort-date"),
      sortDateAdded: getString("gallery-sort-date-added"),
      groupNone: getString("gallery-group-none"),
      groupType: getString("gallery-group-type"),
      groupCreator: getString("gallery-group-creator"),
      groupTags: getString("gallery-group-tags"),
      densityRow: getString("page-density-row"),
      densityStandard: getString("page-density-standard"),
      densityExpanded: getString("page-density-expanded"),
      quoteLocation: getString("annotations-quote-order-location"),
      quoteDateAdded: getString("annotations-quote-order-date-added"),
    },
    citationDownloads: opts.citationDownloads,
    bibliographyHtml: opts.bibliographyHtml || undefined,
  };
}

export function serializeShareDocument(doc: CollectionShareDocument): string {
  return JSON.stringify(doc);
}
