// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h } from "preact";
import { useMemo } from "preact/hooks";
import { twMerge } from "tailwind-merge";
import { readItemNote } from "../utils/items";
import { truncateNoteHtmlForPreview } from "../utils/noteHtml";
import { NoteHtml } from "./NoteHtml";

/** Sticky-pad yellow from Zotero’s note item-type icon. */
export const NOTE_PAD_YELLOW = "#F5C518";
export const NOTE_PAD_YELLOW_EDGE = "#D4A017";
export const NOTE_PAD_FOLD = "#C4C4C4";
export const NOTE_PAD_OUTLINE = "#C8C8C8";

const FOLD_SIZE_PX = 10;
/** Enough text to fill a cover face; overflow is clipped visually. */
const COVER_PREVIEW_CHARS = 360;

export type NoteNotebookCoverProps = {
  item: Zotero.Item;
  className?: string;
  /** When selected on a dark/blue card, soften contrast. */
  selected?: boolean;
};

/**
 * Skeuomorphic notepad cover: yellow header bar, white page with a short
 * HTML preview of the note, and a dog-eared bottom-right corner (same
 * language as Zotero’s note item-type icon).
 */
export function NoteNotebookCover({
  item,
  className,
  selected = false,
}: NoteNotebookCoverProps) {
  const previewHtml = useMemo(
    () => truncateNoteHtmlForPreview(readItemNote(item), COVER_PREVIEW_CHARS),
    [item],
  );

  return (
    <div
      className={twMerge(
        "syllabus-note-notebook-cover relative w-full overflow-hidden bg-white",
        selected && "is-selected",
        className,
      )}
      style={{
        aspectRatio: "2 / 3",
        border: `1px solid ${NOTE_PAD_OUTLINE}`,
        clipPath: `polygon(0 0, 100% 0, 100% calc(100% - ${FOLD_SIZE_PX}px), calc(100% - ${FOLD_SIZE_PX}px) 100%, 0 100%)`,
      }}
      aria-hidden="true"
    >
      <div
        className="shrink-0 w-full"
        style={{
          height: 7,
          backgroundColor: NOTE_PAD_YELLOW,
          borderBottom: `1px solid ${NOTE_PAD_YELLOW_EDGE}`,
          boxShadow: `inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -1px 0 ${NOTE_PAD_YELLOW_EDGE}`,
        }}
      />
      <div
        className={twMerge(
          "syllabus-note-notebook-body box-border overflow-hidden px-1.5 pt-1 pb-1.5",
          selected && "is-selected",
        )}
        style={{
          height: `calc(100% - 7px)`,
        }}
      >
        {previewHtml ? (
          <NoteHtml
            html={previewHtml}
            className="syllabus-note-notebook-prose"
          />
        ) : null}
      </div>
      {/* Folded corner flap (underside of the dog-ear). */}
      <div
        className="pointer-events-none absolute"
        style={{
          right: 0,
          bottom: FOLD_SIZE_PX,
          width: FOLD_SIZE_PX,
          height: FOLD_SIZE_PX,
          background: `linear-gradient(225deg, ${NOTE_PAD_FOLD} 50%, transparent 50%)`,
          boxShadow: "-0.5px 0.5px 0 rgba(0,0,0,0.08)",
        }}
      />
      {/* Crease line on the page edge of the fold. */}
      <div
        className="pointer-events-none absolute"
        style={{
          right: FOLD_SIZE_PX,
          bottom: 0,
          width: FOLD_SIZE_PX,
          height: FOLD_SIZE_PX,
          background: `linear-gradient(135deg, transparent 49%, rgba(0,0,0,0.12) 49%, rgba(0,0,0,0.12) 51%, transparent 51%)`,
        }}
      />
    </div>
  );
}
