// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h, Fragment } from "preact";
import type { JSX, RefObject } from "preact";
import { useLayoutEffect, useMemo, useRef, useState } from "preact/hooks";
import {
  ArrowDownAZ,
  Calendar,
  Download,
  Highlighter,
  Image,
  LayoutGrid,
  ListOrdered,
  MoreHorizontal,
  Newspaper,
  Rows3,
  Shapes,
  Tag,
  User,
} from "lucide-preact";
import {
  groupShareItems,
  personalOrderZones,
  sortShareItems,
  type ShareGroup,
} from "./sortGroup";
import type {
  CollectionShareDocument,
  ShareGalleryGroupBy,
  ShareGalleryLayout,
  ShareGallerySortBy,
  ShareItem,
  ShareItemDensity,
  ShareOpener,
  ShareQuoteOrder,
  ShareSyllabusAssignment,
  ShareStrings,
  ShareViewSettings,
} from "./types";
import { ShareGalleryCover, ShareGalleryTile } from "./ShareGalleryCover";
import { svgForPublishHrefKind } from "../utils/zoteroAttachmentIcons";

function useMenuPopover(
  open: boolean,
  setOpen: (open: boolean) => void,
  rootRef: RefObject<HTMLDivElement>,
): JSX.CSSProperties {
  const [style, setStyle] = useState<JSX.CSSProperties>({});
  const setOpenRef = useRef(setOpen);
  setOpenRef.current = setOpen;

  useLayoutEffect(() => {
    if (!open) return;
    const doc = rootRef.current?.ownerDocument || document;
    const update = () => {
      const el = rootRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const view = doc.documentElement;
      setStyle({
        top: rect.bottom + 6,
        right: view.clientWidth - rect.right,
      });
    };
    update();
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current?.contains(event.target as Node)) return;
      setOpenRef.current(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenRef.current(false);
    };
    const win = doc.defaultView;
    win?.addEventListener("resize", update);
    doc.addEventListener("pointerdown", onPointerDown, true);
    doc.addEventListener("keydown", onKeyDown);
    return () => {
      win?.removeEventListener("resize", update);
      doc.removeEventListener("pointerdown", onPointerDown, true);
      doc.removeEventListener("keydown", onKeyDown);
    };
  }, [open, rootRef]);

  return style;
}

function ItemLink({
  item,
  className,
  children,
}: {
  item: ShareItem;
  className?: string;
  children: preact.ComponentChildren;
}) {
  if (item.fileHref) {
    return (
      <a
        className={className}
        href={item.fileHref}
        target="_blank"
        rel="noopener"
      >
        {children}
      </a>
    );
  }
  return <div className={className}>{children}</div>;
}

function openerLabel(
  kind: ShareOpener["kind"],
  strings?: ShareStrings,
): string {
  if (kind === "pdf") return strings?.openPdf || "Open PDF";
  if (kind === "epub") return strings?.openEpub || "Open EPUB";
  return strings?.openUrl || "Open URL";
}

function CardOpeners({
  openers,
  strings,
}: {
  openers?: ShareOpener[];
  strings?: ShareStrings;
}) {
  if (!openers?.length) return null;
  return (
    <div className="sv-card-openers">
      {openers.map((opener) => {
        const label = openerLabel(opener.kind, strings);
        return (
          <a
            key={`${opener.kind}:${opener.href}`}
            className="sv-card-opener"
            href={opener.href}
            target="_blank"
            rel="noopener"
            title={label}
            aria-label={label}
            onClick={(e) => e.stopPropagation()}
          >
            <span
              className="sv-card-opener-icon"
              aria-hidden="true"
              dangerouslySetInnerHTML={{
                __html: svgForPublishHrefKind(opener.kind),
              }}
            />
          </a>
        );
      })}
    </div>
  );
}

function shareItemYear(date: string | undefined): string {
  const match = String(date || "").match(/\b(\d{4})\b/);
  return match ? match[1] : "";
}

function CardBodyText({
  item,
  instruction,
  priority,
  density,
}: {
  item: ShareItem;
  instruction?: string | null;
  priority?: string | null;
  density?: ShareItemDensity;
}) {
  const year = shareItemYear(item.date);
  // All card densities: title + author · year on one line (plugin row/standard shape).
  const meta = [item.creators, year].filter(Boolean).join(" · ");
  const isRow = density === "row";
  return (
    <>
      <div className="sv-card-row-line">
        <div className="sv-card-title">{item.title}</div>
        {meta ? <div className="sv-card-meta">{meta}</div> : null}
        {priority ? (
          <div className="sv-card-meta sv-card-priority">{priority}</div>
        ) : null}
      </div>
      {instruction ? <p className="sv-instruction">{instruction}</p> : null}
      {!isRow && item.citation ? (
        <div className="sv-card-citation">{item.citation}</div>
      ) : null}
    </>
  );
}

/** Syllabus / class / gallery blurbs: baked HTML, or plain text with newlines. */
function ShareProse({ html, className }: { html: string; className?: string }) {
  const trimmed = html.trim();
  if (!trimmed) return null;
  const looksHtml = /<[a-z][\s\S]*>/i.test(trimmed);
  if (looksHtml) {
    return (
      <div
        className={className ? `sv-prose ${className}` : "sv-prose"}
        dangerouslySetInnerHTML={{ __html: trimmed }}
      />
    );
  }
  return (
    <div
      className={className ? `sv-prose ${className}` : "sv-prose"}
      style={{ whiteSpace: "pre-wrap" }}
    >
      {trimmed}
    </div>
  );
}

/** Class due dates: "Thursday, 16 Oct 26". Accepts ISO or already-formatted. */
function formatShareClassDate(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
  if (!match) return trimmed;
  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
  );
  if (Number.isNaN(date.getTime())) return trimmed;
  try {
    return new Intl.DateTimeFormat("en-GB", {
      weekday: "long",
      day: "2-digit",
      month: "short",
      year: "2-digit",
    }).format(date);
  } catch {
    return trimmed;
  }
}

function CoverLayout({ items }: { items: ShareItem[] }) {
  return (
    <div className="syllabus-gallery-grid">
      {items.map((item) => (
        <ShareGalleryTile key={item.key} item={item} href={item.fileHref} />
      ))}
    </div>
  );
}

function ItemTypeIcon({
  itemType,
  icons,
  size,
}: {
  itemType: string;
  icons?: Record<string, string>;
  size: 16 | 24;
}) {
  const src = icons?.[itemType] || icons?.document;
  if (!src) return null;
  return (
    <img
      className="sv-type-icon"
      src={src}
      alt=""
      width={size}
      height={size}
      aria-hidden="true"
    />
  );
}

function CardThumb({
  item,
  density,
  itemTypeIcons,
}: {
  item: ShareItem;
  density: ShareItemDensity;
  itemTypeIcons?: Record<string, string>;
}) {
  if (density === "expanded") {
    return (
      <div className="sv-card-thumb is-cover">
        <ShareGalleryCover item={item} />
      </div>
    );
  }
  // Row / Standard: Zotero item-type icons (matches SyllabusItemCard).
  return (
    <div
      className={`sv-card-thumb is-type${density === "row" ? " is-row" : ""}`}
    >
      <ItemTypeIcon
        itemType={item.itemType}
        icons={itemTypeIcons}
        size={density === "row" ? 16 : 24}
      />
    </div>
  );
}

function CardLayout({
  items,
  density,
  itemTypeIcons,
  strings,
}: {
  items: ShareItem[];
  density: ShareItemDensity;
  itemTypeIcons?: Record<string, string>;
  strings?: ShareStrings;
}) {
  return (
    <div className="sv-card-list" data-density={density}>
      {items.map((item) => (
        <div key={item.key} className="sv-card">
          <ItemLink item={item} className="sv-card-main">
            <CardThumb
              item={item}
              density={density}
              itemTypeIcons={itemTypeIcons}
            />
            <div className="sv-card-body">
              <CardBodyText item={item} density={density} />
            </div>
          </ItemLink>
          <CardOpeners openers={item.openers} strings={strings} />
        </div>
      ))}
    </div>
  );
}

function MagazineLayout({ items }: { items: ShareItem[] }) {
  // Same shape as Annotations: vertical cover+sidecar rows for items with a
  // blurb; items without preview text drop into a cover grid (like empty anns).
  const withPreview: ShareItem[] = [];
  const noPreview: ShareItem[] = [];
  for (const item of items) {
    if ((item.abstract || "").trim()) {
      withPreview.push(item);
    } else {
      noPreview.push(item);
    }
  }

  return (
    <div
      className="sv-magazine sv-ann-section"
      style={
        noPreview.length
          ? ({
              ["--sv-ann-empty-cols-cap" as string]: String(noPreview.length),
            } as Record<string, string>)
          : undefined
      }
    >
      {withPreview.length ? (
        <div className="sv-ann-list">
          {withPreview.map((item) => (
            <article className="sv-ann-row" key={item.key}>
              <div className="sv-ann-avatar">
                {/* Cover only — title/creators live in the sidecar (unlike Annotations). */}
                {item.fileHref ? (
                  <a
                    className="syllabus-gallery-tile group"
                    href={item.fileHref}
                    target="_blank"
                    rel="noopener"
                    title={item.title}
                  >
                    <ShareGalleryCover item={item} />
                  </a>
                ) : (
                  <div
                    className="syllabus-gallery-tile group"
                    title={item.title}
                  >
                    <ShareGalleryCover item={item} />
                  </div>
                )}
              </div>
              <ItemLink item={item} className="sv-magazine-stack">
                <div className="sv-card-title">{item.title}</div>
                {item.creators ? (
                  <div className="sv-card-meta">{item.creators}</div>
                ) : null}
                <div className="sv-magazine-blurb">{item.abstract}</div>
              </ItemLink>
            </article>
          ))}
        </div>
      ) : null}
      {noPreview.length ? (
        <div className="syllabus-gallery-grid sv-ann-empty-grid">
          {noPreview.map((item) => (
            <ShareGalleryTile key={item.key} item={item} href={item.fileHref} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function AnnotationsLayout({
  items,
  quoteOrder,
  showEmpty,
  strings,
}: {
  items: ShareItem[];
  quoteOrder: ShareQuoteOrder;
  showEmpty: boolean;
  strings: CollectionShareDocument["strings"];
}) {
  const withAnn = items.filter((i) => (i.annotations || []).length > 0);
  const empty = showEmpty
    ? items.filter((i) => !(i.annotations || []).length)
    : [];

  const flashCopy = (btn: HTMLButtonElement) => {
    const prev = btn.textContent;
    btn.classList.add("is-copied");
    btn.setAttribute("aria-label", strings.copied);
    btn.setAttribute("title", strings.copied);
    btn.textContent = strings.copied;
    window.setTimeout(() => {
      btn.classList.remove("is-copied");
      btn.setAttribute("aria-label", prev || strings.copy);
      btn.setAttribute("title", prev || strings.copy);
      btn.textContent = prev;
    }, 900);
  };

  const copy = async (text: string, btn: HTMLButtonElement) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      flashCopy(btn);
    } catch {
      // ignore
    }
  };

  // quoteOrder is baked into share.json at publish time.
  void quoteOrder;

  return (
    <div
      className="sv-ann-section annotations"
      style={
        empty.length
          ? ({
              ["--sv-ann-empty-cols-cap" as string]: String(empty.length),
            } as Record<string, string>)
          : undefined
      }
    >
      {withAnn.length ? (
        <div className="sv-ann-list">
          {withAnn.map((item) => {
            const anns = [...(item.annotations || [])];
            const allCopy = anns
              .map((a) => a.copyText)
              .filter(Boolean)
              .join("\n\n");
            return (
              <article className="sv-ann-row" key={item.key}>
                <div className="sv-ann-avatar">
                  <ShareGalleryTile item={item} href={item.fileHref} />
                  {allCopy ? (
                    <div className="ann-copy-all-wrap">
                      <button
                        type="button"
                        className="ann-copy-all"
                        title={strings.copyAll}
                        aria-label={strings.copyAll}
                        onClick={(e) =>
                          copy(allCopy, e.currentTarget as HTMLButtonElement)
                        }
                      >
                        {strings.copyAll}
                      </button>
                    </div>
                  ) : null}
                </div>
                <div className="sv-ann-stack ann-stream">
                  {anns.map((ann, idx) => {
                    const pageText = ann.pageLabel || "";
                    const tags = ann.tags || [];
                    const hasCopy = !!ann.copyText;
                    const showMeta = !!(pageText || tags.length > 0 || hasCopy);
                    return (
                      <article className="ann-entry" key={idx}>
                        <div className="ann-body">
                          {ann.quote ? (
                            <div className="ann-quote">
                              <mark
                                className="ann-mark"
                                style={
                                  {
                                    ["--highlight-color" as string]:
                                      ann.color || "#ffd400",
                                  } as Record<string, string>
                                }
                              >
                                {ann.quote}
                              </mark>
                            </div>
                          ) : null}
                          {showMeta ? (
                            <div className="ann-meta">
                              {pageText ? (
                                <span className="ann-location">{pageText}</span>
                              ) : null}
                              {pageText && tags.length > 0 ? (
                                <span
                                  className="ann-meta-sep"
                                  aria-hidden="true"
                                >
                                  ·
                                </span>
                              ) : null}
                              {tags.length > 0 ? (
                                <span
                                  className="ann-tags"
                                  role="list"
                                  aria-label={strings.tagsAria || undefined}
                                >
                                  {tags.map((tag) => (
                                    <span
                                      role="listitem"
                                      className="ann-tag"
                                      title={tag}
                                      key={tag}
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                </span>
                              ) : null}
                              {(pageText || tags.length > 0) && hasCopy ? (
                                <span
                                  className="ann-meta-sep ann-copy-sep"
                                  aria-hidden="true"
                                >
                                  ·
                                </span>
                              ) : null}
                              {hasCopy ? (
                                <button
                                  type="button"
                                  className="ann-copy"
                                  title={strings.copy}
                                  aria-label={strings.copy}
                                  onClick={(e) =>
                                    copy(
                                      ann.copyText,
                                      e.currentTarget as HTMLButtonElement,
                                    )
                                  }
                                >
                                  {strings.copy}
                                </button>
                              ) : null}
                            </div>
                          ) : null}
                          {ann.commentHtml ? (
                            <div
                              className="ann-comment"
                              dangerouslySetInnerHTML={{
                                __html: ann.commentHtml,
                              }}
                            />
                          ) : null}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </div>
      ) : null}
      {empty.length ? (
        <div className="syllabus-gallery-grid sv-ann-empty-grid">
          {empty.map((item) => (
            <ShareGalleryTile key={item.key} item={item} href={item.fileHref} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Segments<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="sv-chrome-group">
      <span className="sv-chrome-label">{label}</span>
      <div className="sv-segments" role="group" aria-label={label}>
        {options.map((opt) => (
          <button
            type="button"
            key={opt.value}
            className={`sv-seg${opt.value === value ? " is-active" : ""}`}
            aria-pressed={opt.value === value}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function DownloadsMenu({
  downloads,
  strings,
}: {
  downloads: NonNullable<CollectionShareDocument["citationDownloads"]>;
  strings: ShareStrings;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const popoverStyle = useMenuPopover(open, setOpen, rootRef);
  const label = strings.downloadsMenuAria || strings.downloadsMenu || "";
  const links: { href: string; text: string }[] = [];
  if (downloads.rdfHref) {
    links.push({ href: downloads.rdfHref, text: strings.downloadRdf });
  }
  if (downloads.risHref) {
    links.push({ href: downloads.risHref, text: strings.downloadRis });
  }
  if (downloads.bibHref) {
    links.push({ href: downloads.bibHref, text: strings.downloadBib });
  }
  if (!links.length) return null;

  return (
    <div className="sv-menu" ref={rootRef}>
      <button
        type="button"
        className="sv-menu-btn"
        title={label}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Download size={18} strokeWidth={2} aria-hidden="true" />
      </button>
      {open ? (
        <div
          className="sv-popover sv-downloads-popover"
          role="menu"
          aria-label={label}
          style={popoverStyle}
        >
          <ul className="sv-popover-list">
            {links.map((link) => (
              <li key={link.href}>
                <a
                  role="menuitem"
                  className="sv-popover-item"
                  href={link.href}
                  download
                  onClick={() => setOpen(false)}
                >
                  {link.text}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function ViewOptionsMenu({
  kind,
  includeAnnotations,
  view,
  strings,
  layoutOptions,
  sortOptions,
  groupOptions,
  densityOptions,
  quoteOptions,
  onPatch,
}: {
  kind: CollectionShareDocument["kind"];
  includeAnnotations: boolean;
  view: ShareViewSettings;
  strings: ShareStrings;
  layoutOptions: { value: ShareGalleryLayout; label: string }[];
  sortOptions: { value: ShareGallerySortBy; label: string }[];
  groupOptions: { value: ShareGalleryGroupBy; label: string }[];
  densityOptions: { value: ShareItemDensity; label: string }[];
  quoteOptions: { value: ShareQuoteOrder; label: string }[];
  onPatch: (partial: Partial<ShareViewSettings>) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const popoverStyle = useMenuPopover(open, setOpen, rootRef);
  const aria = strings.optionsAria || strings.layout;

  const layoutIcon =
    view.layout === "card"
      ? LayoutGrid
      : view.layout === "magazine"
        ? Newspaper
        : view.layout === "annotations"
          ? Highlighter
          : Image;
  const sortIcon =
    view.sortBy === "date"
      ? Calendar
      : view.sortBy === "personalOrder"
        ? ListOrdered
        : view.sortBy === "dateAdded"
          ? Calendar
          : ArrowDownAZ;
  const groupIcon =
    view.groupBy === "creator"
      ? User
      : view.groupBy === "tags"
        ? Tag
        : view.groupBy === "type"
          ? Shapes
          : Rows3;
  const LayoutIcon = layoutIcon;
  const SortIcon = sortIcon;
  const GroupIcon = groupIcon;

  return (
    <div className="sv-menu" ref={rootRef}>
      <button
        type="button"
        className="sv-menu-btn sv-options-btn"
        title={aria}
        aria-label={aria}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {kind === "gallery" ? (
          <span className="sv-prefs" dir="ltr" aria-hidden="true">
            <span className="sv-prefs-paren">(</span>
            <LayoutIcon size={14} strokeWidth={2} />
            <span className="sv-prefs-sep">/</span>
            <SortIcon size={14} strokeWidth={2} />
            <span className="sv-prefs-sep">/</span>
            <GroupIcon size={14} strokeWidth={2} />
            <span className="sv-prefs-paren">)</span>
          </span>
        ) : null}
        <MoreHorizontal size={18} strokeWidth={2} aria-hidden="true" />
      </button>
      {open ? (
        <div
          className="sv-popover sv-options-popover"
          role="menu"
          aria-label={aria}
          style={popoverStyle}
        >
          <div className="sv-chrome">
            <Segments
              label={strings.layout}
              value={view.layout}
              options={layoutOptions}
              onChange={(layout) => onPatch({ layout })}
            />
            {kind === "gallery" ? (
              <>
                <Segments
                  label={strings.sort}
                  value={view.sortBy}
                  options={sortOptions}
                  onChange={(sortBy) => onPatch({ sortBy })}
                />
                {view.sortBy !== "personalOrder" ? (
                  <Segments
                    label={strings.group}
                    value={view.groupBy}
                    options={groupOptions}
                    onChange={(groupBy) =>
                      onPatch({
                        groupBy,
                        // Machine/automatic tags stay off until explicitly enabled.
                        includeAutomaticTags: false,
                      })
                    }
                  />
                ) : null}
                {view.groupBy === "tags" ? (
                  <label className="sv-check">
                    <input
                      type="checkbox"
                      checked={!!view.includeAutomaticTags}
                      onChange={(e) =>
                        onPatch({
                          includeAutomaticTags: e.currentTarget.checked,
                        })
                      }
                    />
                    {strings.includeAutoTags}
                  </label>
                ) : null}
              </>
            ) : null}
            {view.layout === "card" ? (
              <Segments
                label={strings.density}
                value={view.density}
                options={densityOptions}
                onChange={(density) => onPatch({ density })}
              />
            ) : null}
            {includeAnnotations && view.layout === "annotations" ? (
              <>
                <Segments
                  label={strings.quoteOrder}
                  value={view.quoteOrder}
                  options={quoteOptions}
                  onChange={(quoteOrder) => onPatch({ quoteOrder })}
                />
                <label className="sv-check">
                  <input
                    type="checkbox"
                    checked={view.showItemsWithoutAnnotations}
                    onChange={(e) =>
                      onPatch({
                        showItemsWithoutAnnotations: e.currentTarget.checked,
                      })
                    }
                  />
                  {strings.showEmpty}
                </label>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SyllabusAssignmentCards({
  assignments,
  byKey,
  density,
  itemTypeIcons,
  strings,
}: {
  assignments: ShareSyllabusAssignment[];
  byKey: Map<string, ShareItem>;
  density: ShareItemDensity;
  itemTypeIcons?: Record<string, string>;
  strings?: ShareStrings;
}) {
  return (
    <div className="sv-card-list" data-density={density}>
      {assignments.map((a) => {
        const item = byKey.get(a.itemKey);
        if (!item) return null;
        return (
          <div key={a.id} className="sv-card">
            <ItemLink item={item} className="sv-card-main">
              <CardThumb
                item={item}
                density={density}
                itemTypeIcons={itemTypeIcons}
              />
              <div className="sv-card-body">
                <CardBodyText
                  item={item}
                  instruction={a.classInstruction}
                  priority={a.priority}
                  density={density}
                />
              </div>
            </ItemLink>
            <CardOpeners openers={item.openers} strings={strings} />
          </div>
        );
      })}
    </div>
  );
}

function SyllabusAssignmentCovers({
  assignments,
  byKey,
}: {
  assignments: ShareSyllabusAssignment[];
  byKey: Map<string, ShareItem>;
}) {
  return (
    <div className="syllabus-gallery-grid">
      {assignments.map((a) => {
        const item = byKey.get(a.itemKey);
        if (!item) return null;
        return (
          <ShareGalleryTile
            key={a.id}
            item={item}
            href={item.fileHref}
            priority={a.priority}
            instruction={a.classInstruction}
          />
        );
      })}
    </div>
  );
}

function SyllabusView({
  doc,
  view,
}: {
  doc: CollectionShareDocument;
  view: ShareViewSettings;
}) {
  const syllabus = doc.syllabus;
  const byKey = useMemo(
    () => new Map(doc.items.map((i) => [i.key, i])),
    [doc.items],
  );

  if (!syllabus) {
    return <GalleryBody doc={doc} view={view} />;
  }

  const classes = syllabus.classOrder
    .map((id) => syllabus.classes.find((c) => c.id === id))
    .filter(Boolean);

  const renderAssignments = (assignments: typeof syllabus.assignments) => {
    const items = assignments
      .map((a) => byKey.get(a.itemKey))
      .filter((i): i is ShareItem => !!i);

    if (view.layout === "cover") {
      return (
        <SyllabusAssignmentCovers assignments={assignments} byKey={byKey} />
      );
    }
    if (view.layout === "magazine") {
      return (
        <>
          {assignments.map((a) =>
            a.classInstruction ? (
              <p key={`${a.id}-ins`} className="sv-instruction">
                {a.classInstruction}
              </p>
            ) : null,
          )}
          <MagazineLayout items={items} />
        </>
      );
    }
    if (view.layout === "annotations") {
      return (
        <>
          {assignments.map((a) =>
            a.classInstruction ? (
              <p key={`${a.id}-ins`} className="sv-instruction">
                {a.classInstruction}
              </p>
            ) : null,
          )}
          <AnnotationsLayout
            items={items}
            quoteOrder={view.quoteOrder}
            showEmpty={view.showItemsWithoutAnnotations}
            strings={doc.strings}
          />
        </>
      );
    }
    return (
      <SyllabusAssignmentCards
        assignments={assignments}
        byKey={byKey}
        density={view.density}
        itemTypeIcons={doc.itemTypeIcons}
        strings={doc.strings}
      />
    );
  };

  return (
    <div>
      {classes.map((cls) => {
        if (!cls) return null;
        const assignments = syllabus.assignments.filter(
          (a) => a.classId === cls.id,
        );
        return (
          <section className="sv-class" key={cls.id}>
            <h2 className="sv-class-head">
              <span className="sv-class-title">
                {cls.number != null ? `${cls.number}. ` : ""}
                {cls.title}
              </span>
              {cls.date ? (
                <span className="sv-class-date">
                  {formatShareClassDate(cls.date)}
                </span>
              ) : null}
            </h2>
            {cls.description ? (
              <ShareProse html={cls.description} className="sv-class-desc" />
            ) : null}
            {renderAssignments(assignments)}
          </section>
        );
      })}
      {syllabus.furtherReadingOrder?.length ? (
        <section className="sv-class">
          <h2 className="sv-class-head">Further reading</h2>
          {view.layout === "cover" ? (
            <CoverLayout
              items={syllabus.furtherReadingOrder
                .map((k) => byKey.get(k))
                .filter((i): i is ShareItem => !!i)}
            />
          ) : view.layout === "magazine" ? (
            <MagazineLayout
              items={syllabus.furtherReadingOrder
                .map((k) => byKey.get(k))
                .filter((i): i is ShareItem => !!i)}
            />
          ) : view.layout === "annotations" ? (
            <AnnotationsLayout
              items={syllabus.furtherReadingOrder
                .map((k) => byKey.get(k))
                .filter((i): i is ShareItem => !!i)}
              quoteOrder={view.quoteOrder}
              showEmpty={view.showItemsWithoutAnnotations}
              strings={doc.strings}
            />
          ) : (
            <CardLayout
              items={syllabus.furtherReadingOrder
                .map((k) => byKey.get(k))
                .filter((i): i is ShareItem => !!i)}
              density={view.density}
              itemTypeIcons={doc.itemTypeIcons}
              strings={doc.strings}
            />
          )}
        </section>
      ) : null}
    </div>
  );
}

function GalleryBody({
  doc,
  view,
}: {
  doc: CollectionShareDocument;
  view: ShareViewSettings;
}) {
  const sorted = useMemo(
    () => sortShareItems(doc.items, view.sortBy, doc.personalOrder),
    [doc.items, doc.personalOrder, view.sortBy],
  );

  let groups: ShareGroup[];
  if (view.sortBy === "personalOrder") {
    groups = personalOrderZones(
      sorted,
      doc.personalOrder,
      doc.strings.unordered,
    );
  } else {
    groups = groupShareItems(sorted, view.groupBy, {
      includeAutomaticTags: view.includeAutomaticTags,
    });
  }

  const renderItems = (items: ShareItem[]) => {
    if (view.layout === "cover") return <CoverLayout items={items} />;
    if (view.layout === "magazine") return <MagazineLayout items={items} />;
    if (view.layout === "annotations") {
      return (
        <AnnotationsLayout
          items={items}
          quoteOrder={view.quoteOrder}
          showEmpty={view.showItemsWithoutAnnotations}
          strings={doc.strings}
        />
      );
    }
    return (
      <CardLayout
        items={items}
        density={view.density}
        itemTypeIcons={doc.itemTypeIcons}
        strings={doc.strings}
      />
    );
  };

  if (!doc.items.length) {
    return <p className="sv-empty">{doc.strings.empty}</p>;
  }

  return (
    <div>
      {groups.map((g) => {
        const typeIcon =
          g.itemType && doc.itemTypeIcons
            ? doc.itemTypeIcons[g.itemType] || doc.itemTypeIcons.document
            : undefined;
        return (
          <section className="sv-group" key={g.id}>
            {g.label ? (
              <h2 className="sv-group-title">
                {typeIcon ? (
                  <img
                    className="sv-group-type-icon"
                    src={typeIcon}
                    alt=""
                    width={18}
                    height={18}
                    aria-hidden="true"
                  />
                ) : null}
                <span>{g.label}</span>
              </h2>
            ) : null}
            {renderItems(g.items)}
          </section>
        );
      })}
    </div>
  );
}

export function App({ doc }: { doc: CollectionShareDocument }) {
  const [view, setView] = useState<ShareViewSettings>({ ...doc.view });

  const s = doc.strings;
  const layoutOptions: { value: ShareGalleryLayout; label: string }[] = [
    { value: "cover", label: s.layoutCover || "Cover" },
    { value: "card", label: s.layoutCard || "Card" },
    { value: "magazine", label: s.layoutMagazine || "Preview" },
  ];
  if (doc.includeAnnotations) {
    layoutOptions.push({
      value: "annotations",
      label: s.layoutAnnotations || "Annotations",
    });
  }

  const sortOptions: { value: ShareGallerySortBy; label: string }[] = [
    { value: "title", label: s.sortAz || "A–Z" },
    {
      value: "personalOrder",
      label: s.sortPersonalOrder || "Reading order",
    },
    { value: "date", label: s.sortDate || "Date" },
    { value: "dateAdded", label: s.sortDateAdded || "Date added" },
  ];

  const groupOptions: { value: ShareGalleryGroupBy; label: string }[] = [
    { value: "none", label: s.groupNone || "None" },
    { value: "type", label: s.groupType || "Type" },
    { value: "creator", label: s.groupCreator || "Creator" },
    { value: "tags", label: s.groupTags || "Tags" },
  ];

  const densityOptions: { value: ShareItemDensity; label: string }[] = [
    { value: "row", label: s.densityRow || "Row" },
    { value: "standard", label: s.densityStandard || "Standard" },
    { value: "expanded", label: s.densityExpanded || "Expanded" },
  ];

  const quoteOptions: { value: ShareQuoteOrder; label: string }[] = [
    { value: "location", label: s.quoteLocation || "Location" },
    { value: "dateAdded", label: s.quoteDateAdded || "Date added" },
  ];

  const patch = (partial: Partial<ShareViewSettings>) => {
    setView((prev) => {
      const next = { ...prev, ...partial };
      if (next.sortBy === "personalOrder") {
        next.groupBy = "none";
      }
      if (!doc.includeAnnotations && next.layout === "annotations") {
        next.layout = "cover";
      }
      return next;
    });
  };

  const downloads = doc.citationDownloads;
  const hasDownloads = !!(
    downloads &&
    (downloads.risHref || downloads.bibHref || downloads.rdfHref)
  );
  const showOptions = doc.interactive;
  // Prefer the baked Fluent line (“Published 09 Oct 2026”). Older share.json
  // baked an empty $date — fall back to the ISO timestamp in that case.
  const publishedLabel = (() => {
    const baked = (doc.strings.publishedAt || "").trim();
    let label: string;
    if (baked && /\d/.test(baked) && !baked.includes("{")) {
      label = baked;
    } else {
      const isoDay = (doc.publishedAt || "").slice(0, 10);
      if (baked && !baked.includes("{") && isoDay) {
        label = `${baked.replace(/\s+$/, "")} ${isoDay}`.trim();
      } else {
        label = isoDay || baked;
      }
    }
    // Older publishes used lowercase “published …”.
    return label.replace(/^published\b/i, "Published");
  })();

  const metaParts = [
    doc.syllabus?.courseCode,
    doc.syllabus?.institution,
    publishedLabel || null,
  ].filter(Boolean);

  return (
    <div className="sv-page">
      <header className="sv-masthead">
        <div className="sv-header-bar">
          <h1>{doc.title}</h1>
          {hasDownloads || showOptions ? (
            <div className="sv-header-actions">
              {hasDownloads && downloads ? (
                <DownloadsMenu downloads={downloads} strings={doc.strings} />
              ) : null}
              {showOptions ? (
                <ViewOptionsMenu
                  kind={doc.kind}
                  includeAnnotations={doc.includeAnnotations}
                  view={view}
                  strings={doc.strings}
                  layoutOptions={layoutOptions}
                  sortOptions={sortOptions}
                  groupOptions={groupOptions}
                  densityOptions={densityOptions}
                  quoteOptions={quoteOptions}
                  onPatch={patch}
                />
              ) : null}
            </div>
          ) : null}
        </div>
        {metaParts.length > 0 ? (
          <p className="sv-meta">{metaParts.join(" · ")}</p>
        ) : null}
        {doc.description ? (
          <ShareProse html={doc.description} className="sv-desc" />
        ) : null}
      </header>

      {doc.kind === "syllabus" ? (
        <SyllabusView doc={doc} view={view} />
      ) : (
        <GalleryBody doc={doc} view={view} />
      )}

      {doc.bibliographyHtml ? (
        <section className="sv-bib">
          <h2>{doc.strings.bibliography}</h2>
          <div dangerouslySetInnerHTML={{ __html: doc.bibliographyHtml }} />
        </section>
      ) : null}

      <footer className="sv-footer">
        <div
          className="sv-credit"
          dangerouslySetInnerHTML={{ __html: doc.strings.credit }}
        />
      </footer>
    </div>
  );
}
