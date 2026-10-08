/**
 * Shared chrome-DnD sortable host — same markup/CSS as Personal Order Gallery.
 * DropIndicatorPlugin paints `is-drop-before` / `is-drop-after` on this node only.
 */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h } from "preact";
import type { ComponentChildren } from "preact";
import { twMerge } from "tailwind-merge";
import type { Type, UniqueIdentifier } from "@dnd-kit/abstract";
import { useSortable } from "../zotero-dnd";

export function SortableDndTile({
  id,
  index,
  group,
  type,
  accept,
  droppableDisabled,
  isMultiDragging,
  className,
  title,
  dataAttributes,
  children,
}: {
  id: UniqueIdentifier;
  index: number;
  group: string;
  type: Type;
  accept?: Type | Type[] | ((source: unknown) => boolean);
  droppableDisabled?: boolean;
  isMultiDragging?: boolean;
  className?: string;
  title?: string;
  dataAttributes?: Record<string, string | number | undefined>;
  children: ComponentChildren;
}) {
  const { ref, isDragSource, isDragging } = useSortable({
    id,
    index,
    group,
    type,
    accept: accept ?? type,
    droppableDisabled,
  });

  const showDragStyle = isDragSource || Boolean(isMultiDragging);

  return (
    <div
      ref={ref}
      className={twMerge(
        "syllabus-personal-order-tile cursor-grab min-w-0",
        showDragStyle && "is-dragging opacity-40 cursor-grabbing",
        (isDragging || isMultiDragging) && "z-20",
        className,
      )}
      title={title}
      {...dataAttributes}
    >
      {children}
    </div>
  );
}
