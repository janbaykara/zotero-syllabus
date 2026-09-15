// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h } from "preact";
import type { JSX } from "preact";
import { twMerge } from "tailwind-merge";
import { getString } from "../utils/locale";
import type { ItemSyllabusAssignment } from "../utils/schemas";
import { SyllabusManager } from "./syllabus";

export type ReadingTileChrome = {
  collectionId: number;
  assignment?: ItemSyllabusAssignment;
  readerMode?: boolean;
  /** When set, checkbox runs this instead of toggling assignment done status. */
  onReaderCheck?: () => void | Promise<void>;
  /** Class / syllabus name shown above the title in cover & magazine. */
  contextLabel?: string;
  /** When false, hide priority badge (e.g. Reading Schedule / Pinned). */
  showPriority?: boolean;
};

export function ReadingDoneCheckbox({
  item,
  collectionId,
  assignment,
  onReaderCheck,
  className,
}: {
  item: Zotero.Item;
  collectionId: number;
  assignment?: ItemSyllabusAssignment;
  onReaderCheck?: () => void | Promise<void>;
  className?: string;
}) {
  const done = !onReaderCheck && assignment?.status === "done";

  const handleChange = async (e: JSX.TargetedEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (onReaderCheck) {
      try {
        await onReaderCheck();
      } catch (err) {
        ztoolkit.log("Error handling reading checkbox:", err);
      }
      // Stay unchecked if the item remains (user cancelled unpin).
      e.currentTarget.checked = false;
      return;
    }
    try {
      await SyllabusManager.setReadingStatus(
        item,
        collectionId,
        assignment?.id,
        done ? null : "done",
        "page",
      );
      await item.saveTx();
    } catch (err) {
      ztoolkit.log("Error toggling assignment status:", err);
    }
  };

  return (
    <input
      type="checkbox"
      checked={done}
      onChange={handleChange}
      className={twMerge("w-4 h-4 cursor-pointer shrink-0", className)}
      title={
        onReaderCheck
          ? getString("pinned-done-unpin-title")
          : done
            ? getString("mark-not-done")
            : getString("mark-done")
      }
      aria-label={
        onReaderCheck
          ? getString("pinned-done-unpin-title")
          : done
            ? getString("mark-not-done")
            : getString("mark-done")
      }
      onClick={(e) => e.stopPropagation()}
    />
  );
}

export function ReadingPriorityBadge({
  collectionId,
  priorityId,
  className,
}: {
  collectionId: number;
  priorityId: string | undefined | null;
  className?: string;
}) {
  if (!priorityId) return null;
  const { color, label } = SyllabusManager.getPriorityDisplay(
    collectionId,
    priorityId,
  );
  if (!label) return null;

  return (
    <span
      className={twMerge(
        "uppercase font-semibold tracking-wide flex flex-row gap-1.5 items-baseline text-[11px]",
        className,
      )}
    >
      <span
        className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
      <span
        className="rounded-md px-1 py-0.25 whitespace-nowrap"
        style={{
          backgroundColor: color + "15",
          color,
        }}
      >
        {label}
      </span>
    </span>
  );
}

export function readingChromeEqual(
  a: ReadingTileChrome | undefined | null,
  b: ReadingTileChrome | undefined | null,
): boolean {
  if (a === b) return true;
  if (!a || !b) return !a && !b;
  return (
    a.collectionId === b.collectionId &&
    a.readerMode === b.readerMode &&
    a.onReaderCheck === b.onReaderCheck &&
    a.contextLabel === b.contextLabel &&
    a.showPriority === b.showPriority &&
    a.assignment?.id === b.assignment?.id &&
    a.assignment?.status === b.assignment?.status &&
    a.assignment?.priority === b.assignment?.priority &&
    a.assignment?.classInstruction === b.assignment?.classInstruction
  );
}
