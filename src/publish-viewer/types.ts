/** Mirror of sharePayload types — keep chrome-free (no Zotero imports). */

export type ShareKind = "syllabus" | "gallery";
export type ShareGalleryLayout = "card" | "cover" | "annotations" | "magazine";
export type ShareGallerySortBy =
  "title" | "date" | "dateAdded" | "personalOrder";
export type ShareGalleryGroupBy =
  "none" | "auto" | "type" | "creator" | "tags" | "subcollections";
export type ShareItemDensity = "row" | "standard" | "expanded";
export type ShareQuoteOrder = "location" | "dateAdded";

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
  /** Full CSL bibliography line for Card layout. */
  citation?: string;
  fileHref?: string;
  /** PDF / EPUB / URL indicators (Card layout). */
  openers?: ShareOpener[];
  cover?: ShareCover;
  tags: ShareTag[];
  annotations?: ShareAnnotation[];
};

export type ShareSyllabusClass = {
  id: string;
  number: number | null;
  title: string;
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
  /** Zotero item-type icon data-URIs for Card row/standard density. */
  itemTypeIcons?: Record<string, string>;
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
