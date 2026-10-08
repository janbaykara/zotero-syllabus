// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h } from "preact";
import type { ComponentChildren, JSX } from "preact";
import { twMerge } from "tailwind-merge";
import { useDroppable } from "../zotero-dnd";
import { SYLLABUS_DND_ITEM_TYPE, syllabusDndZoneId } from "./syllabusDnd";
import { useSyllabusPageDnd } from "./SyllabusPageDnd";

export function SyllabusDndZone({
  group,
  empty,
  className,
  children,
  ...rest
}: {
  group: string;
  empty?: boolean;
  className?: string;
  children: ComponentChildren;
} & JSX.HTMLAttributes<HTMLDivElement>) {
  const enabled = useSyllabusPageDnd()?.enabled ?? false;
  // Hooks must not run without <DndProvider> (locked / no chrome DnD).
  if (!enabled) {
    return (
      <div className={className} {...rest}>
        {children}
      </div>
    );
  }
  return (
    <SyllabusDndZoneActive
      group={group}
      empty={empty}
      className={className}
      {...rest}
    >
      {children}
    </SyllabusDndZoneActive>
  );
}

function SyllabusDndZoneActive({
  group,
  empty,
  className,
  children,
  ...rest
}: {
  group: string;
  empty?: boolean;
  className?: string;
  children: ComponentChildren;
} & JSX.HTMLAttributes<HTMLDivElement>) {
  // Only empty lists register as zone targets. A filled zone wrapping
  // sortables would otherwise compete for hits and break in-list reorder.
  const { ref } = useDroppable({
    id: syllabusDndZoneId(group),
    accept: SYLLABUS_DND_ITEM_TYPE,
    collisionPriority: 50,
    disabled: !empty,
  });

  return (
    <div
      ref={empty ? ref : undefined}
      className={twMerge(
        className,
        "syllabus-dnd-zone",
        empty && "is-empty-zone",
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
