/**
 * Chrome-free share.json schema for the public collection viewer.
 * Types are duplicated lightly in the viewer so it never imports Zotero modules.
 */

export const SHARE_JSON = "share.json";
export const SHARE_VIEWER_JS = "viewer.js";
export const SHARE_VIEWER_CSS = "viewer.css";

export type ShareKind = "syllabus" | "gallery";

export type ShareGalleryLayout = "card" | "cover" | "annotations" | "magazine";
export type ShareGallerySortBy =
  "title" | "date" | "dateAdded" | "personalOrder";
export type ShareGalleryGroupBy =
  "none" | "auto" | "type" | "creator" | "tags" | "subcollections";
export type ShareItemDensity = "row" | "standard" | "expanded";
export type ShareQuoteOrder = "location" | "dateAdded";

/** View chrome snapshot baked into the published page. */
export type ShareViewSettings = {
  layout: ShareGalleryLayout;
  sortBy: ShareGallerySortBy;
  groupBy: ShareGalleryGroupBy;
  density: ShareItemDensity;
  quoteOrder: ShareQuoteOrder;
  colorFilter: string[];
  tagFilter: string[];
  showItemsWithoutAnnotations: boolean;
  includeAutomaticTags: boolean;
  readerMode: boolean;
  /** Syllabus-only: include bibliography block when available. */
  showBibliography: boolean;
};

export type ShareAnnotation = {
  quote: string;
  commentHtml: string;
  color: string;
  pageLabel: string;
  tags: string[];
  copyText: string;
};

export type ShareCover =
  | { kind: "image"; dataUrl: string }
  | { kind: "placeholder"; color: string; title: string; creator: string };

/** Item tag on the public page (plugin-owned tags are omitted at publish). */
export type ShareTag = {
  tag: string;
  /** Zotero automatic tag (type 1: keywords / subject headings). */
  automatic?: boolean;
};

/** Openable file / URL indicator on Card layout (plugin attachment icons). */
export type ShareOpener = {
  kind: "pdf" | "epub" | "link";
  href: string;
};

export type ShareItem = {
  key: string;
  title: string;
  creators: string;
  date: string;
  dateAdded: string;
  itemType: string;
  itemTypeLabel: string;
  abstract?: string;
  /**
   * Full CSL bibliography line for Card layout (replaces creators · date).
   * Cover / Preview keep title + creators.
   */
  citation?: string;
  /** Absolute public path to best attachment, if any. */
  fileHref?: string;
  /** PDF / EPUB / URL indicators (Card layout, floating right). */
  openers?: ShareOpener[];
  cover?: ShareCover;
  /** Personal/local-only fields (gallery notes, done/checkboxes) are never set. */
  tags: ShareTag[];
  annotations?: ShareAnnotation[];
};

export type ShareSyllabusClass = {
  id: string;
  number: number | null;
  title: string;
  /** Class blurb under the heading (Markdown → HTML at publish). */
  description?: string | null;
  date?: string | null;
};

export type ShareSyllabusAssignment = {
  id: string;
  itemKey: string;
  classId?: string;
  priority?: string | null;
  classInstruction?: string | null;
};

export type ShareSyllabusPayload = {
  courseCode?: string;
  institution?: string;
  description?: string;
  classes: ShareSyllabusClass[];
  classOrder: string[];
  assignments: ShareSyllabusAssignment[];
  furtherReadingOrder: string[];
};

export type ShareStrings = {
  copy: string;
  copied: string;
  copyAll: string;
  /** Aria label for annotation tag lists (item-share parity). */
  tagsAria?: string;
  bibliography: string;
  downloadRis: string;
  downloadBib: string;
  downloadRdf: string;
  /** Citation downloads menu button. */
  downloadsMenu?: string;
  downloadsMenuAria?: string;
  /** View/sort options (…) button. */
  optionsAria?: string;
  /** Card opener icon labels (“Open PDF”, …). */
  openPdf?: string;
  openEpub?: string;
  openUrl?: string;
  publishedAt: string;
  /** Credit sentence HTML (linked product names). */
  credit: string;
  empty: string;
  unordered: string;
  layout: string;
  sort: string;
  group: string;
  density: string;
  quoteOrder: string;
  showEmpty: string;
  includeAutoTags: string;
  annotationsIncluded: string;
  /** Segmented-control option labels (baked at publish). */
  layoutCover?: string;
  layoutCard?: string;
  layoutMagazine?: string;
  layoutAnnotations?: string;
  sortAz?: string;
  sortPersonalOrder?: string;
  sortDate?: string;
  sortDateAdded?: string;
  groupNone?: string;
  groupType?: string;
  groupCreator?: string;
  groupTags?: string;
  densityRow?: string;
  densityStandard?: string;
  densityExpanded?: string;
  quoteLocation?: string;
  quoteDateAdded?: string;
};

/** Top-level document uploaded as share.json */
export type CollectionShareDocument = {
  version: 1;
  kind: ShareKind;
  interactive: boolean;
  includeAnnotations: boolean;
  includeAttachments: boolean;
  title: string;
  description?: string;
  publishedAt: string;
  view: ShareViewSettings;
  items: ShareItem[];
  /**
   * Zotero item-type icon data-URIs (keyed by itemType) for Card row/standard
   * density on the public page. Expanded density uses cover art instead.
   */
  itemTypeIcons?: Record<string, string>;
  /** Item keys in personal reading order (gallery). */
  personalOrder: string[];
  syllabus?: ShareSyllabusPayload;
  strings: ShareStrings;
  citationDownloads?: {
    risHref?: string;
    bibHref?: string;
    rdfHref?: string;
  };
  bibliographyHtml?: string;
};

/** Wizard / prefs snapshot (no item payload). */
export type CollectionShareOptions = {
  kind: ShareKind;
  includeAnnotations: boolean;
  /** Upload best-file attachments and link titles (default true). */
  includeAttachments: boolean;
  view: ShareViewSettings;
};

export function defaultShareViewSettings(kind: ShareKind): ShareViewSettings {
  return {
    layout: kind === "gallery" ? "cover" : "card",
    sortBy: "title",
    groupBy: "none",
    density: "expanded",
    quoteOrder: "location",
    colorFilter: [],
    tagFilter: [],
    showItemsWithoutAnnotations: true,
    includeAutomaticTags: false,
    readerMode: false,
    showBibliography: true,
  };
}

export function defaultShareOptions(kind: ShareKind): CollectionShareOptions {
  return {
    kind,
    includeAnnotations: false,
    includeAttachments: true,
    view: defaultShareViewSettings(kind),
  };
}
