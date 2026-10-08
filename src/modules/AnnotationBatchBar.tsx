// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h } from "preact";
import type { JSX } from "preact";
import { useMemo, useRef, useState } from "preact/hooks";
import { Check, Copy, Tag, Tags, X } from "lucide-preact";
import { twMerge } from "tailwind-merge";
import { ZOTERO_ANNOTATION_COLOR_ORDER } from "../utils/annotationColors";
import {
  collectTagsForAnnotations,
  recolorAnnotations,
  tagAnnotations,
  untagAnnotations,
} from "../utils/annotationBatch";
import { openAnnotationTagFilterPopup } from "../utils/annotationTagFilterPopup";
import { copyStringToClipboard } from "../utils/clipboard";
import { getString } from "../utils/locale";
import { useAnnotationSelection } from "./annotationSelection";
import {
  formatAnnotationIdsCopyText,
  useCopyFlash,
} from "./annotationStream";

export function AnnotationBatchBar({
  libraryID,
  className,
}: {
  libraryID: number;
  className?: string;
}) {
  const { selectedIds, selectedOrderedIds, selectionActive, clear } =
    useAnnotationSelection();
  const [busy, setBusy] = useState(false);
  const [tagTick, setTagTick] = useState(0);
  const [copiedAll, flashCopiedAll] = useCopyFlash();
  const tagButtonRef = useRef<HTMLButtonElement>(null);
  const untagButtonRef = useRef<HTMLButtonElement>(null);
  const selectedList = useMemo(() => [...selectedIds], [selectedIds]);
  const count = selectedList.length;
  const existingTags = useMemo(
    () => collectTagsForAnnotations(selectedList),
    [selectedList, tagTick],
  );
  const canUntag = existingTags.length > 0;
  const copyAllText = useMemo(
    () => formatAnnotationIdsCopyText(selectedOrderedIds),
    [selectedOrderedIds],
  );
  const canCopyAll = copyAllText.length > 0;
  const copyAllLabel = copiedAll
    ? getString("my-annotations-copied")
    : getString("my-annotations-copy-all");

  if (!selectionActive) {
    return null;
  }

  const run = async (action: () => Promise<unknown>) => {
    if (busy) {
      return;
    }
    setBusy(true);
    try {
      await action();
    } catch (error) {
      try {
        ztoolkit.log("Annotation batch action failed", error);
      } catch {
        // Ignore logging failures.
      }
    } finally {
      setBusy(false);
      setTagTick((value) => value + 1);
    }
  };

  const openNativeTagPopup = () => {
    const anchor = tagButtonRef.current;
    if (!anchor || busy) {
      return;
    }
    const ids = [...selectedList];
    openAnnotationTagFilterPopup({
      libraryID,
      selected: [],
      anchor,
      // Apply once the native tags-box closes so autocomplete / multi-add
      // finishes before we write to every selected annotation.
      live: false,
      // Bar sits at the bottom — open the tags panel above the button.
      position: "before_start",
      onChange: (tags) => {
        if (tags.length === 0) {
          return;
        }
        void run(async () => {
          for (const tag of tags) {
            await tagAnnotations(ids, tag);
          }
        });
      },
    });
  };

  const openNativeUntagPopup = () => {
    const anchor = untagButtonRef.current;
    if (!anchor || busy || !canUntag) {
      return;
    }
    const ids = [...selectedList];
    const initial = collectTagsForAnnotations(ids);
    if (initial.length === 0) {
      return;
    }
    openAnnotationTagFilterPopup({
      libraryID,
      selected: initial,
      anchor,
      live: false,
      position: "before_start",
      onChange: (tags) => {
        const remaining = new Set(
          tags.map((tag) => tag.toLowerCase()),
        );
        const removed = initial.filter(
          (tag) => !remaining.has(tag.toLowerCase()),
        );
        if (removed.length === 0) {
          return;
        }
        void run(async () => {
          for (const tag of removed) {
            await untagAnnotations(ids, tag);
          }
        });
      },
    });
  };

  const selectedLabel = getString("my-annotations-batch-selected", {
    args: { count },
  });

  return (
    <div
      className={twMerge(
        "syllabus-annotation-batch-bar",
        busy && "is-busy",
        className,
      )}
      role="toolbar"
      aria-label={getString("my-annotations-batch-aria")}
    >
      <span className="syllabus-annotation-batch-count">{selectedLabel}</span>
      <div className="syllabus-annotation-batch-actions">
        <button
          ref={tagButtonRef}
          type="button"
          className="syllabus-annotation-batch-btn"
          disabled={busy}
          aria-haspopup="dialog"
          title={getString("my-annotations-batch-tag")}
          onClick={(event) => {
            event.stopPropagation();
            openNativeTagPopup();
          }}
        >
          <Tag size={14} strokeWidth={2} aria-hidden="true" />
          <span>{getString("my-annotations-batch-tag")}</span>
        </button>

        {canUntag ? (
          <button
            ref={untagButtonRef}
            type="button"
            className="syllabus-annotation-batch-btn"
            disabled={busy}
            aria-haspopup="dialog"
            title={getString("my-annotations-batch-untag")}
            onClick={(event) => {
              event.stopPropagation();
              openNativeUntagPopup();
            }}
          >
            <Tags size={14} strokeWidth={2} aria-hidden="true" />
            <span>{getString("my-annotations-batch-untag")}</span>
          </button>
        ) : null}

        {canCopyAll ? (
          <button
            type="button"
            className={twMerge(
              "syllabus-annotation-batch-btn",
              copiedAll && "is-copied",
            )}
            disabled={busy}
            title={copyAllLabel}
            aria-label={copyAllLabel}
            onClick={(event) => {
              event.stopPropagation();
              if (copyStringToClipboard(copyAllText)) {
                flashCopiedAll();
              }
            }}
          >
            {copiedAll ? (
              <Check size={14} strokeWidth={2.5} aria-hidden="true" />
            ) : (
              <Copy size={14} strokeWidth={2} aria-hidden="true" />
            )}
            <span>{copyAllLabel}</span>
          </button>
        ) : null}

        <div
          role="group"
          aria-label={getString("my-annotations-batch-recolour")}
          className="syllabus-annotation-batch-swatches syllabus-annotation-color-filter"
        >
          {ZOTERO_ANNOTATION_COLOR_ORDER.map((hex) => {
            const label = getString("my-annotations-batch-recolour-swatch", {
              args: { color: hex },
            });
            return (
              <button
                key={hex}
                type="button"
                disabled={busy}
                aria-label={label}
                title={label}
                className="syllabus-annotation-color-filter-btn"
                style={{ "--swatch-color": hex } as JSX.CSSProperties}
                onClick={(event) => {
                  event.stopPropagation();
                  void run(() => recolorAnnotations(selectedList, hex));
                }}
              />
            );
          })}
        </div>

        <button
          type="button"
          className="syllabus-annotation-batch-btn is-clear"
          disabled={busy}
          title={getString("my-annotations-batch-clear")}
          aria-label={getString("my-annotations-batch-clear")}
          onClick={(event) => {
            event.stopPropagation();
            clear();
          }}
        >
          <X size={14} strokeWidth={2} aria-hidden="true" />
          <span>{getString("my-annotations-batch-clear")}</span>
        </button>
      </div>
    </div>
  );
}
