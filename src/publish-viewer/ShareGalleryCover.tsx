/** GalleryCover-shaped markup for share.json items (galleryCover.css). */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h, Fragment } from "preact";
import { shareCoverShapeClass } from "../utils/shareCoverHtml";
import type { ShareCover, ShareItem } from "./types";

function PlaceholderFace({
  cover,
  insetForSpine,
}: {
  cover: Extract<ShareCover, { kind: "placeholder" }>;
  insetForSpine: boolean;
}) {
  return (
    <div
      className={
        insetForSpine
          ? "syllabus-gallery-placeholder-face syllabus-gallery-placeholder-spine"
          : "syllabus-gallery-placeholder-face"
      }
      style={{
        background: `linear-gradient(165deg, color-mix(in srgb, ${cover.color} 88%, white) 0%, ${cover.color} 55%, color-mix(in srgb, ${cover.color} 72%, black) 100%)`,
      }}
    >
      <div className="syllabus-gallery-placeholder-title">{cover.title}</div>
      {cover.creator ? (
        <div className="syllabus-gallery-placeholder-creator">
          {cover.creator}
        </div>
      ) : (
        <div />
      )}
    </div>
  );
}

/**
 * Same structure / classes as in-app GalleryCover so galleryCover.css applies.
 */
export function ShareGalleryCover({ item }: { item: ShareItem }) {
  const cover = item.cover;
  const itemType = item.itemType || "";
  const isBookLike = itemType === "book" || itemType === "bookSection";
  const showSpine = isBookLike;
  const showBinder =
    itemType === "report" || itemType === "document" || itemType === "thesis";
  const shape = shareCoverShapeClass(itemType, cover?.kind === "image");
  const useNatural = shape === "syllabus-gallery-cover-natural";

  const face = (
    <>
      {cover?.kind === "image" ? (
        <img
          src={cover.dataUrl}
          alt=""
          className={
            useNatural
              ? "syllabus-gallery-cover-img is-natural"
              : "syllabus-gallery-cover-img"
          }
          draggable={false}
        />
      ) : cover?.kind === "placeholder" ? (
        <PlaceholderFace cover={cover} insetForSpine={showSpine} />
      ) : (
        <div className="syllabus-gallery-placeholder-face" />
      )}
      {showSpine ? <div className="syllabus-gallery-book-spine" /> : null}
    </>
  );

  if (showBinder) {
    return (
      <div className="syllabus-gallery-cover-with-binder">
        <div className="syllabus-gallery-binder" aria-hidden="true">
          {Array.from({ length: 7 }, (_, i) => (
            <span key={i} className="syllabus-gallery-binder-ring" />
          ))}
        </div>
        <div className={`syllabus-gallery-cover-face ${shape}`}>{face}</div>
      </div>
    );
  }

  return <div className={shape}>{face}</div>;
}

export function ShareGalleryTile({
  item,
  href,
  priority,
  instruction,
}: {
  item: ShareItem;
  href?: string;
  priority?: string | null;
  instruction?: string | null;
}) {
  const className = "syllabus-gallery-tile group";
  const body = (
    <>
      <ShareGalleryCover item={item} />
      <div className="syllabus-gallery-meta">
        <div className="syllabus-gallery-title">{item.title}</div>
        {item.creators ? (
          <div className="syllabus-gallery-creator">{item.creators}</div>
        ) : null}
        {priority ? (
          <div className="syllabus-gallery-creator">{priority}</div>
        ) : null}
        {instruction ? <p className="sv-instruction">{instruction}</p> : null}
      </div>
    </>
  );
  if (href) {
    return (
      <a
        className={className}
        href={href}
        target="_blank"
        rel="noopener"
        title={item.title}
      >
        {body}
      </a>
    );
  }
  return (
    <div className={className} title={item.title}>
      {body}
    </div>
  );
}
