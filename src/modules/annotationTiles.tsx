// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h, Fragment } from "preact";
import { useMemo, useRef } from "preact/hooks";
import type { JSX } from "preact";
import { twMerge } from "tailwind-merge";
import { getItemTitle } from "../utils/items";
import { getString } from "../utils/locale";
import { formatRelativeTimestamp } from "../utils/dates";
import { GalleryTile } from "./GalleryPage";
import { GalleryCover } from "./GalleryCover";
import { useNearViewport } from "./galleryVisibility";
import type { MagazineTileClick } from "./MagazineTile";
import {
  groupAdjacentAnnotations,
  type ExplorerAnnotation,
} from "./explorerQueries";

export function AnnotationQuote({
  text,
  color,
  dateModified,
}: {
  text: string;
  color: string;
  dateModified: string;
}) {
  if (!text) {
    return null;
  }
  const stamp = formatRelativeTimestamp(dateModified);
  return (
    <div className="syllabus-explorer-annotation-entry">
      <span className="syllabus-explorer-annotation-quote">
        <mark
          className="syllabus-magazine-highlight-mark"
          style={{ "--highlight-color": color } as JSX.CSSProperties}
        >
          {text}
        </mark>
      </span>
      {stamp ? (
        <time
          className="syllabus-explorer-annotation-time"
          dateTime={stamp.iso}
          title={stamp.absolute}
        >
          {stamp.relative}
        </time>
      ) : null}
    </div>
  );
}

export function ExplorerAnnotationTile({
  rows,
  layout,
  size,
  selected,
  onClick,
  onDoubleClick,
  onContextMenu,
}: {
  rows: ExplorerAnnotation[];
  layout: "cover" | "card";
  size: "small" | "large";
  selected: boolean;
  onClick: MagazineTileClick;
  onDoubleClick: (item: Zotero.Item) => void;
  onContextMenu: MagazineTileClick;
}) {
  const tileRef = useRef<HTMLDivElement>(null);
  const visible = useNearViewport(tileRef);
  const parent = rows[0]?.parent ?? null;
  const title = parent ? getItemTitle(parent) || getString("untitled") : "";
  const quotes = rows.filter((row) => row.text);

  const activate = (e: JSX.TargetedMouseEvent<HTMLElement>) => {
    if (parent) {
      onClick(parent, e);
    }
  };

  return (
    <div
      ref={tileRef}
      role="button"
      tabIndex={0}
      data-annotation-id={rows.map((row) => row.id).join("-")}
      className={twMerge(
        "syllabus-explorer-annotation-tile group min-w-0 cursor-pointer outline-none select-none",
        layout === "cover" && "is-cover",
        size === "large" && "is-large",
        layout === "card" &&
          twMerge(
            "is-card syllabus-item-card rounded-lg flex shrink-0 flex-row items-start bg-background-sidepane text-primary relative px-4 py-3 gap-4",
            selected &&
              "not-in-[.print]:outline-2! not-in-[.print]:outline-accent-blue",
          ),
      )}
      title={title || quotes[0]?.text}
      onClick={activate}
      onDblClick={() => {
        if (parent) {
          onDoubleClick(parent);
        }
      }}
      onContextMenu={(e) => {
        if (parent) {
          onContextMenu(parent, e);
        }
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (parent) {
            onClick(
              parent,
              e as unknown as JSX.TargetedMouseEvent<HTMLElement>,
            );
          }
        }
      }}
    >
      {layout === "cover" ? (
        <>
          {parent ? (
            <GalleryTile
              item={parent}
              selected={selected}
              interactive={false}
              onClick={onClick}
              onDoubleClick={onDoubleClick}
              onContextMenu={onContextMenu}
            />
          ) : null}
          <div className="syllabus-explorer-annotation-quotes">
            {quotes.map((row) => (
              <AnnotationQuote
                key={row.id}
                text={row.text}
                color={row.color}
                dateModified={row.dateModified}
              />
            ))}
          </div>
        </>
      ) : (
        <>
          {parent ? (
            <div className="syllabus-explorer-annotation-cover">
              <GalleryCover
                item={parent}
                selected={selected}
                visible={visible}
              />
            </div>
          ) : null}
          <div className="syllabus-explorer-annotation-body min-w-0">
            {title ? (
              <div className="syllabus-explorer-annotation-parent">{title}</div>
            ) : null}
            <div className="syllabus-explorer-annotation-quotes">
              {quotes.map((row) => (
                <AnnotationQuote
                  key={row.id}
                  text={row.text}
                  color={row.color}
                  dateModified={row.dateModified}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function ExplorerAnnotationShelf({
  annotations,
  layout,
  size,
  selectedItemIds,
  onClick,
  onDoubleClick,
  onContextMenu,
}: {
  annotations: ExplorerAnnotation[];
  layout: "cover" | "card";
  size: "small" | "large";
  selectedItemIds: number[] | null;
  onClick: MagazineTileClick;
  onDoubleClick: (item: Zotero.Item) => void;
  onContextMenu: MagazineTileClick;
}) {
  const groups = useMemo(
    () => groupAdjacentAnnotations(annotations),
    [annotations],
  );
  if (annotations.length === 0) {
    return (
      <p className="text-secondary text-base">
        {getString("explorer-shelf-empty")}
      </p>
    );
  }
  return (
    <div
      className={
        layout === "cover"
          ? "syllabus-explorer-cover-rail"
          : "syllabus-explorer-annotation-cards"
      }
    >
      {groups.map((group) => (
        <ExplorerAnnotationTile
          key={group.annotations.map((row) => row.id).join("-")}
          rows={group.annotations}
          layout={layout}
          size={size}
          selected={
            !!group.parent &&
            (selectedItemIds?.includes(group.parent.id) || false)
          }
          onClick={onClick}
          onDoubleClick={onDoubleClick}
          onContextMenu={onContextMenu}
        />
      ))}
    </div>
  );
}
