/**
 * Personal reading-order gallery on zotero-dnd (@dnd-kit/abstract).
 *
 * Always-visible landing zone at the top (empty or ordered items). Every tile
 * is draggable — drop into the landing zone to order, reorder within it, or
 * drop into the rest to remove from the stored order.
 *
 * Drop gap (blue line) is derived from pointer Y against the stable on-screen
 * tile list — not from live DOM reorder — so it tracks the insertion slot.
 */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h, Fragment } from "preact";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "preact/hooks";
import type { ComponentChildren } from "preact";
import { twMerge } from "tailwind-merge";
import {
  DndProvider,
  useDroppable,
  useSortable,
} from "../zotero-dnd";
import type { DndProviderProps } from "../zotero-dnd";
import { getString } from "../utils/locale";
import {
  setPersonalReadingOrder,
  splitPersonalReadingOrder,
} from "./personalReadingOrder";

type Zone = "ordered" | "rest";

type DropGap = {
  zone: Zone;
  edge: "before" | "after";
  targetKey: string;
};

type DropProjection = {
  zone: Zone;
  index: number;
  gap: DropGap | null;
};

const ITEM_TYPE = "personal-order-item";

function containersEqual(
  a: Record<Zone, string[]>,
  b: Record<Zone, string[]>,
): boolean {
  return (
    a.ordered.length === b.ordered.length &&
    a.rest.length === b.rest.length &&
    a.ordered.every((id, i) => id === b.ordered[i]) &&
    a.rest.every((id, i) => id === b.rest[i])
  );
}

function zoneOfKey(containers: Record<Zone, string[]>, key: string): Zone | null {
  if (containers.ordered.includes(key)) {
    return "ordered";
  }
  if (containers.rest.includes(key)) {
    return "rest";
  }
  return null;
}

function resolveZone(
  containers: Record<Zone, string[]>,
  targetId: string | number | null | undefined,
): Zone | null {
  if (targetId == null) {
    return null;
  }
  const id = String(targetId);
  if (id === "ordered" || id === "rest") {
    return id;
  }
  return zoneOfKey(containers, id);
}

/**
 * Zone from pointer Y: anything from the Unordered section top downward is
 * "rest". Collision alone is unreliable — the dragged tile / feedback shape
 * can still win over the rest droppable.
 */
function resolveZoneFromPointer(clientY: number): Zone | null {
  const restEl = document.querySelector(
    ".syllabus-personal-order-dnd .syllabus-personal-order-rest",
  );
  if (restEl && typeof restEl.getBoundingClientRect === "function") {
    if (clientY >= restEl.getBoundingClientRect().top) {
      return "rest";
    }
  }
  const gallery = document.querySelector(".syllabus-personal-order-dnd");
  if (gallery && typeof gallery.getBoundingClientRect === "function") {
    const rect = gallery.getBoundingClientRect();
    if (clientY >= rect.top && clientY <= rect.bottom) {
      return "ordered";
    }
  }
  return null;
}

/** Insertion slot from pointer Y vs stable on-screen tiles (excludes dragged). */
function projectDrop(
  containers: Record<Zone, string[]>,
  zone: Zone,
  draggedId: string,
  clientY: number,
): DropProjection {
  const others = containers[zone].filter((key) => key !== draggedId);
  for (let i = 0; i < others.length; i++) {
    const key = others[i];
    const el = document.querySelector(
      `.syllabus-personal-order-dnd [data-personal-order-zone="${zone}"][data-personal-order-key="${CSS.escape(key)}"]`,
    );
    if (!el || typeof (el as Element).getBoundingClientRect !== "function") {
      continue;
    }
    const rect = (el as Element).getBoundingClientRect();
    if (clientY < rect.top + rect.height / 2) {
      return {
        zone,
        index: i,
        gap: { zone, edge: "before", targetKey: key },
      };
    }
  }
  if (others.length === 0) {
    return { zone, index: 0, gap: null };
  }
  return {
    zone,
    index: others.length,
    gap: {
      zone,
      edge: "after",
      targetKey: others[others.length - 1],
    },
  };
}

function applyProjection(
  before: Record<Zone, string[]>,
  draggedId: string,
  projection: DropProjection,
): Record<Zone, string[]> {
  const wasOrdered = before.ordered.includes(draggedId);
  const ordered = before.ordered.filter((key) => key !== draggedId);
  const rest = before.rest.filter((key) => key !== draggedId);
  if (projection.zone === "ordered") {
    ordered.splice(projection.index, 0, draggedId);
  } else if (wasOrdered) {
    // Unorder only — rest list order is not user-editable.
    rest.push(draggedId);
  } else {
    // Already unordered; dropping in rest is a no-op.
    return before;
  }
  return { ordered, rest };
}

function clientYOfEvent(event: {
  /** dragmove carries the intended coords here; operation.position lags a microtask. */
  to?: { x?: number; y?: number };
  operation?: {
    position?: { current?: { y?: number } };
    activatorEvent?: Event;
  };
  nativeEvent?: Event;
}): number | null {
  if (typeof event.to?.y === "number") {
    return event.to.y;
  }
  const native = event.nativeEvent;
  if (
    native &&
    "clientY" in native &&
    typeof (native as PointerEvent).clientY === "number"
  ) {
    return (native as PointerEvent).clientY;
  }
  const fromPos = event.operation?.position?.current?.y;
  if (typeof fromPos === "number") {
    return fromPos;
  }
  return null;
}

function SortablePersonalTile({
  item,
  index,
  zone,
  dropGap,
  renderItem,
}: {
  item: Zotero.Item;
  index: number;
  zone: Zone;
  dropGap: DropGap | null;
  renderItem: (item: Zotero.Item, index: number) => ComponentChildren;
}) {
  const itemKey = item.key;
  // Rest tiles are drag sources only — no insertion targets / blue lines.
  const { ref, isDragSource, isDragging } = useSortable({
    id: itemKey,
    index,
    group: zone,
    type: ITEM_TYPE,
    accept: ITEM_TYPE,
    droppableDisabled: zone === "rest",
  });

  const showBefore =
    zone === "ordered" &&
    dropGap?.zone === zone &&
    dropGap.edge === "before" &&
    dropGap.targetKey === itemKey;
  const showAfter =
    zone === "ordered" &&
    dropGap?.zone === zone &&
    dropGap.edge === "after" &&
    dropGap.targetKey === itemKey;

  return (
    <div
      ref={ref}
      className={twMerge(
        "syllabus-personal-order-tile cursor-grab",
        isDragSource && "is-dragging opacity-40 cursor-grabbing",
        isDragging && "z-20",
        showBefore && "is-drop-before",
        showAfter && "is-drop-after",
      )}
      title={getString("explorer-configure-reorder")}
      data-item-id={item.id}
      data-personal-order-key={itemKey}
      data-personal-order-zone={zone}
    >
      {renderItem(item, index)}
    </div>
  );
}

/** Always-visible ordered landing zone (empty placeholder or ordered tiles). */
function OrderedLandingZone({
  keys,
  itemsByKey,
  dropGap,
  className,
  renderItem,
}: {
  keys: string[];
  itemsByKey: Map<string, Zotero.Item>;
  dropGap: DropGap | null;
  className?: string;
  renderItem: (item: Zotero.Item, index: number) => ComponentChildren;
}) {
  const empty = keys.length === 0;
  // Only compete for collisions when empty — otherwise tiles own insertion.
  const { ref, isDropTarget } = useDroppable({
    id: "ordered",
    accept: ITEM_TYPE,
    disabled: !empty,
    collisionPriority: 1,
  });

  return (
    <section
      className={twMerge(
        "syllabus-personal-order-landing",
        isDropTarget && "is-drop-target",
      )}
      aria-label={getString("gallery-personal-order-landing-label")}
    >
      <div className="syllabus-personal-order-landing-heading text-secondary text-sm mb-2">
        {getString("gallery-sort-personal-order")}
      </div>
      <div
        ref={ref}
        className={twMerge(
          "syllabus-personal-order-section syllabus-personal-order-landing-body",
          className,
          empty && "is-empty",
          isDropTarget && empty && "is-drop-highlight",
        )}
        data-personal-order-zone="ordered"
      >
        {empty ? (
          <div
            className={twMerge(
              "syllabus-personal-order-landing-empty text-secondary text-base",
              isDropTarget && "is-drop-highlight",
            )}
            role="status"
          >
            {getString("gallery-personal-order-landing-empty")}
          </div>
        ) : (
          keys.map((key, index) => {
            const item = itemsByKey.get(key);
            if (!item) {
              return null;
            }
            return (
              <SortablePersonalTile
                key={`ordered-${item.id}`}
                item={item}
                index={index}
                zone="ordered"
                dropGap={dropGap}
                renderItem={renderItem}
              />
            );
          })
        )}
      </div>
    </section>
  );
}

function sourceGroupOf(source: {
  group?: unknown;
  data?: { group?: unknown };
}): string | undefined {
  if (typeof source.group === "string") {
    return source.group;
  }
  if (typeof source.data?.group === "string") {
    return source.data.group;
  }
  return undefined;
}

function RestZone({
  keys,
  itemsByKey,
  className,
  renderItem,
  dropHighlight,
}: {
  keys: string[];
  itemsByKey: Map<string, Zotero.Item>;
  className?: string;
  renderItem: (item: Zotero.Item, index: number) => ComponentChildren;
  /** Pointer-driven highlight (collision alone often misses this zone). */
  dropHighlight: boolean;
}) {
  // Whole section is the unorder target (heading + tiles). Only from ordered.
  // Droppable still needed for collision; highlight is pointer-driven only —
  // isDropTarget can lag true after dragend and leave the zone stuck active.
  const { ref } = useDroppable({
    id: "rest",
    accept: (source) => sourceGroupOf(source as never) === "ordered",
    // Beat ordered tiles (priority 10) when the pointer is actually over rest.
    collisionPriority: 20,
  });

  return (
    <section
      ref={ref}
      className={twMerge(
        "syllabus-personal-order-rest mt-4",
        dropHighlight && "is-drop-target is-drop-highlight",
      )}
      aria-label={getString("gallery-personal-order-unordered")}
      data-personal-order-zone="rest"
    >
      <div
        className="syllabus-personal-order-rest-heading text-secondary text-sm mb-2 pt-2 border-t border-quinary"
        role="separator"
      >
        {getString("gallery-personal-order-unordered")}
      </div>
      <div
        className={twMerge("syllabus-personal-order-section", className)}
      >
        {keys.map((key, index) => {
          const item = itemsByKey.get(key);
          if (!item) {
            return null;
          }
          return (
            <SortablePersonalTile
              key={`rest-${item.id}`}
              item={item}
              index={index}
              zone="rest"
              dropGap={null}
              renderItem={renderItem}
            />
          );
        })}
      </div>
    </section>
  );
}

/**
 * Flat personal-reading-order gallery on zotero-dnd. Landing zone always at
 * the top; every item is draggable.
 */
export function PersonalOrderGallery({
  items,
  orderKeys,
  collectionId,
  className,
  renderItem,
  onReorder,
  modifiers,
}: {
  items: Zotero.Item[];
  orderKeys: string[];
  collectionId: number;
  className?: string;
  renderItem: (item: Zotero.Item, index: number) => ComponentChildren;
  /** When set, called instead of writing the Personal Reading Order note. */
  onReorder?: (keys: string[]) => void;
  /**
   * Global drag modifiers (DragDropProvider-style). Card layout typically
   * passes `[RestrictToVerticalAxis]`.
   */
  modifiers?: DndProviderProps["modifiers"];
}) {
  const { ordered, unordered } = splitPersonalReadingOrder(items, orderKeys);
  const itemsByKey = useMemo(() => {
    const map = new Map<string, Zotero.Item>();
    for (const item of items) {
      map.set(item.key, item);
    }
    return map;
  }, [items]);

  const sourceContainers = useMemo(
    (): Record<Zone, string[]> => ({
      ordered: ordered.map((item) => item.key),
      rest: unordered.map((item) => item.key),
    }),
    [ordered, unordered],
  );
  const sourceKey = `${sourceContainers.ordered.join("|")}::${sourceContainers.rest.join("|")}`;

  const [containers, setContainers] =
    useState<Record<Zone, string[]>>(sourceContainers);
  const beforeDrag = useRef(containers);
  const projectionRef = useRef<DropProjection | null>(null);
  const [dropGap, setDropGap] = useState<DropGap | null>(null);
  const [hoverZone, setHoverZone] = useState<Zone | null>(null);

  useEffect(() => {
    setContainers(sourceContainers);
  }, [sourceKey]);

  const commitOrder = useCallback(
    (nextOrdered: string[]) => {
      if (nextOrdered.join("\0") === orderKeys.join("\0")) {
        return;
      }
      if (onReorder) {
        onReorder(nextOrdered);
        return;
      }
      if (!collectionId) {
        return;
      }
      void setPersonalReadingOrder(collectionId, nextOrdered);
    },
    [collectionId, onReorder, orderKeys],
  );

  const updateProjection = useCallback(
    (event: {
      operation?: {
        source?: { id?: string | number } | null;
        target?: { id?: string | number } | null;
        position?: { current?: { y?: number } };
        activatorEvent?: Event;
      };
      nativeEvent?: Event;
      to?: { x?: number; y?: number };
    }) => {
      const sourceId = event.operation?.source?.id;
      if (sourceId == null) {
        projectionRef.current = null;
        setDropGap(null);
        setHoverZone(null);
        return;
      }
      const draggedId = String(sourceId);
      const clientY = clientYOfEvent(event);
      if (clientY == null) {
        return;
      }
      // Prefer geometry over collision target — see resolveZoneFromPointer.
      const zone =
        resolveZoneFromPointer(clientY) ??
        resolveZone(beforeDrag.current, event.operation?.target?.id);
      if (!zone) {
        projectionRef.current = null;
        setDropGap(null);
        setHoverZone(null);
        return;
      }
      // Rest is not a reorder target — only accept "unorder" from ordered.
      if (zone === "rest") {
        const wasOrdered = beforeDrag.current.ordered.includes(draggedId);
        if (!wasOrdered) {
          projectionRef.current = null;
          setDropGap(null);
          setHoverZone(null);
          return;
        }
        const projection: DropProjection = {
          zone: "rest",
          index: 0,
          gap: null,
        };
        projectionRef.current = projection;
        setDropGap(null);
        setHoverZone("rest");
        return;
      }

      const projection = projectDrop(
        beforeDrag.current,
        zone,
        draggedId,
        clientY,
      );
      projectionRef.current = projection;
      setHoverZone("ordered");
      setDropGap((prev) => {
        const next = projection.gap;
        if (
          prev?.zone === next?.zone &&
          prev?.edge === next?.edge &&
          prev?.targetKey === next?.targetKey
        ) {
          return prev;
        }
        return next;
      });
    },
    [],
  );

  return (
    <DndProvider
      modifiers={modifiers}
      onDragStart={() => {
        beforeDrag.current = {
          ordered: [...containers.ordered],
          rest: [...containers.rest],
        };
        projectionRef.current = null;
        setDropGap(null);
        setHoverZone(null);
      }}
      onDragMove={updateProjection}
      onDragOver={updateProjection}
      onDragEnd={(event) => {
        const before = beforeDrag.current;
        let projection = projectionRef.current;
        projectionRef.current = null;
        setDropGap(null);
        setHoverZone(null);
        if (event.canceled) {
          return;
        }
        const sourceId = event.operation?.source?.id;
        if (sourceId == null) {
          return;
        }
        const draggedId = String(sourceId);
        const clientY = clientYOfEvent(event);
        const zone =
          (clientY != null ? resolveZoneFromPointer(clientY) : null) ??
          resolveZone(before, event.operation?.target?.id);
        if (zone === "rest") {
          if (before.ordered.includes(draggedId)) {
            projection = { zone: "rest", index: 0, gap: null };
          } else {
            return;
          }
        } else if (zone === "ordered" && clientY != null) {
          projection = projectDrop(before, "ordered", draggedId, clientY);
        }
        if (!projection) {
          return;
        }
        const next = applyProjection(before, draggedId, projection);
        if (!containersEqual(before, next)) {
          setContainers(next);
          commitOrder(next.ordered);
        }
      }}
    >
      <div className="syllabus-personal-order-gallery syllabus-personal-order-dnd">
        <OrderedLandingZone
          keys={containers.ordered}
          itemsByKey={itemsByKey}
          dropGap={dropGap}
          className={className}
          renderItem={renderItem}
        />
        {containers.rest.length > 0 ? (
          <RestZone
            keys={containers.rest}
            itemsByKey={itemsByKey}
            className={className}
            renderItem={renderItem}
            dropHighlight={hoverZone === "rest"}
          />
        ) : null}
      </div>
    </DndProvider>
  );
}
