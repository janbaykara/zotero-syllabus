// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h, Fragment } from "preact";
import type { ComponentChildren } from "preact";
import { SYLLABUS_DND_ITEM_TYPE } from "./syllabusDnd";
import { useSyllabusPageDnd } from "./SyllabusPageDnd";
import { SortableDndTile } from "./SortableDndTile";

/** Syllabus page host — reuses Gallery’s `SortableDndTile` + tile CSS. */
export function SyllabusDndSortable({
  identifier,
  index,
  group,
  draggingIdentifiers,
  children,
}: {
  identifier: string;
  index: number;
  group: string;
  draggingIdentifiers?: Set<string>;
  children: ComponentChildren;
}) {
  const enabled = useSyllabusPageDnd()?.enabled ?? false;
  if (!enabled) {
    return <Fragment>{children}</Fragment>;
  }
  return (
    <SortableDndTile
      id={identifier}
      index={index}
      group={group}
      type={SYLLABUS_DND_ITEM_TYPE}
      accept={SYLLABUS_DND_ITEM_TYPE}
      isMultiDragging={Boolean(
        draggingIdentifiers &&
        draggingIdentifiers.size > 1 &&
        draggingIdentifiers.has(identifier),
      )}
      dataAttributes={{ "data-syllabus-dnd-id": identifier }}
    >
      {children}
    </SortableDndTile>
  );
}
