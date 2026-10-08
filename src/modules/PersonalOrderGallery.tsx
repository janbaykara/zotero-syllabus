/**
 * Personal reading-order gallery — controlled multi-list Sortable.
 *
 * Blue-line (deferred) reorder:
 * - DropIndicatorPlugin paints `is-drop-before` / `is-drop-after` while dragging
 * - Lists stay put until dragend → multi-aware drop helpers
 * - Multi-select: dragging one selected item moves the whole selection
 *   (relative order preserved)
 * - Rest→rest blocked (unordered is drop-target only for unordering)
 *
 * FLIP live-reorder remains available via `sortableTransition` on DndProvider
 * if another surface wants it.
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
  applyMultiDropIndicatorMove,
  clearCoDragElements,
  DndProvider,
  getDropIndicator,
  isChromeSortable,
  moveMultipleToContainerEnd,
  resolveDragIds,
  setCoDragElements,
  useDroppable,
  useSortable,
  type DropIndicatorOptions,
  type DndProviderProps,
} from "../zotero-dnd";
import { getString } from "../utils/locale";
import {
  setPersonalReadingOrder,
  splitPersonalReadingOrder,
} from "./personalReadingOrder";

type Zone = "ordered" | "rest";

const ITEM_TYPE = "personal-order-item";

/** Filled on dragstart — canIndicate reads this (stable options object). */
const movingKeysRef = { current: new Set<string>() };

/** Stable create-time options — do not inline on DndProvider (remounts manager). */
const GALLERY_DROP_INDICATOR: DropIndicatorOptions = {
  axis: (element) =>
    element.closest(".syllabus-gallery-grid") ? "horizontal" : "vertical",
  canIndicate: ({ source, target }) => {
    if (!isChromeSortable(source) || !isChromeSortable(target)) {
      return false;
    }
    // Unordered is a sink only — zone highlight, never per-item blue lines.
    if (target.sortable.group === "rest") {
      return false;
    }
    // Don't put the line on another item in the multi-drag set.
    if (movingKeysRef.current.has(String(target.id))) {
      return false;
    }
    return true;
  },
};

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

function sourceGroupOf(source: {
  group?: unknown;
  data?: { group?: unknown };
  sortable?: { group?: unknown };
}): string | undefined {
  if (typeof source.sortable?.group === "string") {
    return source.sortable.group;
  }
  if (typeof source.group === "string") {
    return source.group;
  }
  if (typeof source.data?.group === "string") {
    return source.data.group;
  }
  return undefined;
}

function SortablePersonalTile({
  item,
  index,
  zone,
  renderItem,
  isMultiDragging,
}: {
  item: Zotero.Item;
  index: number;
  zone: Zone;
  renderItem: (item: Zotero.Item, index: number) => ComponentChildren;
  /** True when this key is part of the active multi-drag set. */
  isMultiDragging?: boolean;
}) {
  const itemKey = item.key;
  const { ref, isDragSource, isDragging } = useSortable({
    id: itemKey,
    index,
    group: zone,
    type: ITEM_TYPE,
    accept: ITEM_TYPE,
    // Unordered tiles drag out only — the rest zone is the sole drop target.
    droppableDisabled: zone === "rest",
  });

  const showDragStyle = isDragSource || isMultiDragging;

  return (
    <div
      ref={ref}
      className={twMerge(
        "syllabus-personal-order-tile cursor-grab",
        showDragStyle && "is-dragging opacity-40 cursor-grabbing",
        (isDragging || isMultiDragging) && "z-20",
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

function OrderedLandingZone({
  keys,
  itemsByKey,
  className,
  renderItem,
  draggingKeys,
}: {
  keys: string[];
  itemsByKey: Map<string, Zotero.Item>;
  className?: string;
  renderItem: (item: Zotero.Item, index: number) => ComponentChildren;
  draggingKeys: Set<string>;
}) {
  const empty = keys.length === 0;
  // Always register the container droppable (dnd-kit multi-list pattern).
  // Higher priority when empty so rest tiles don't steal the hit target.
  const { ref } = useDroppable({
    id: "ordered",
    accept: ITEM_TYPE,
    collisionPriority: empty ? 50 : 1,
  });

  return (
    <section
      className="syllabus-personal-order-landing"
      aria-label={getString("gallery-personal-order-landing-label")}
    >
      <div className="syllabus-personal-order-landing-heading text-secondary text-sm mb-2">
        {getString("gallery-sort-personal-order")}
      </div>
      <div
        ref={ref}
        className={twMerge(
          "syllabus-personal-order-landing-body",
          empty && "is-empty",
        )}
        data-personal-order-zone="ordered"
      >
        {empty ? (
          <div
            className="syllabus-personal-order-landing-empty text-secondary text-base"
            role="status"
          >
            {getString("gallery-personal-order-landing-empty")}
          </div>
        ) : (
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
                  key={item.key}
                  item={item}
                  index={index}
                  zone="ordered"
                  renderItem={renderItem}
                  isMultiDragging={draggingKeys.has(item.key)}
                />
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

function RestZone({
  keys,
  itemsByKey,
  className,
  renderItem,
  draggingKeys,
}: {
  keys: string[];
  itemsByKey: Map<string, Zotero.Item>;
  className?: string;
  renderItem: (item: Zotero.Item, index: number) => ComponentChildren;
  draggingKeys: Set<string>;
}) {
  // Droppable on the list body only — not the whole section — so the
  // unorder highlight doesn't paint over the ordered landing above.
  const { ref } = useDroppable({
    id: "rest",
    accept: (source) => sourceGroupOf(source as never) === "ordered",
    collisionPriority: 1,
  });

  return (
    <section
      className="syllabus-personal-order-rest mt-4"
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
        ref={ref}
        className={twMerge(
          "syllabus-personal-order-section syllabus-personal-order-rest-body",
          className,
        )}
      >
        {keys.map((key, index) => {
          const item = itemsByKey.get(key);
          if (!item) {
            return null;
          }
          return (
            <SortablePersonalTile
              key={item.key}
              item={item}
              index={index}
              zone="rest"
              renderItem={renderItem}
              isMultiDragging={draggingKeys.has(item.key)}
            />
          );
        })}
      </div>
    </section>
  );
}

export function PersonalOrderGallery({
  items,
  orderKeys,
  collectionId,
  className,
  renderItem,
  onReorder,
  modifiers,
  selectedItemIds,
}: {
  items: Zotero.Item[];
  orderKeys: string[];
  collectionId: number;
  className?: string;
  renderItem: (item: Zotero.Item, index: number) => ComponentChildren;
  onReorder?: (keys: string[]) => void;
  modifiers?: DndProviderProps["modifiers"];
  /** Zotero item ids currently selected — multi-drag when the active tile is among them. */
  selectedItemIds?: number[] | null;
}) {
  const { ordered, unordered } = splitPersonalReadingOrder(items, orderKeys);
  const itemsByKey = useMemo(() => {
    const map = new Map<string, Zotero.Item>();
    for (const item of items) {
      map.set(item.key, item);
    }
    return map;
  }, [items]);

  const selectedKeys = useMemo(() => {
    const ids = new Set(selectedItemIds ?? []);
    if (ids.size === 0) {
      return [] as string[];
    }
    return items.filter((item) => ids.has(item.id)).map((item) => item.key);
  }, [items, selectedItemIds]);
  const selectedKeysRef = useRef(selectedKeys);
  selectedKeysRef.current = selectedKeys;

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
  const containersRef = useRef(containers);
  containersRef.current = containers;
  const previousContainers = useRef(containers);
  const [draggingKeys, setDraggingKeys] = useState<Set<string>>(
    () => new Set(),
  );
  const dragIdsRef = useRef<string[]>([]);

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

  const clearMultiDrag = (manager?: { dragOperation?: unknown }) => {
    movingKeysRef.current = new Set();
    dragIdsRef.current = [];
    setDraggingKeys(new Set());
    if (manager) {
      clearCoDragElements(manager);
    }
  };

  return (
    <DndProvider
      modifiers={modifiers}
      dropIndicator={GALLERY_DROP_INDICATOR}
      onDragStart={(event, manager) => {
        previousContainers.current = {
          ordered: [...containersRef.current.ordered],
          rest: [...containersRef.current.rest],
        };
        const sourceId = event.operation.source?.id;
        const ids = sourceId
          ? resolveDragIds(
              containersRef.current,
              sourceId,
              selectedKeysRef.current,
            )
          : [];
        dragIdsRef.current = ids;
        movingKeysRef.current = new Set(ids);
        setDraggingKeys(new Set(ids));

        // Register co-dragged tiles so feedback translates the whole selection.
        const root = document.querySelector(".syllabus-personal-order-dnd");
        if (root && ids.length > 1) {
          const els: Element[] = [];
          for (const key of ids) {
            const node = root.querySelector(
              `[data-personal-order-key="${CSS.escape(key)}"]`,
            );
            if (node) {
              els.push(node);
            }
          }
          setCoDragElements(manager, els);
        } else {
          clearCoDragElements(manager);
        }
      }}
      onDragOver={(event) => {
        const { source, target } = event.operation;
        if (!source || !target) {
          return;
        }
        // No live move() — blue line only. Block rest→rest collisions.
        if (isChromeSortable(source) && isChromeSortable(target)) {
          if (
            source.sortable.group === "rest" &&
            target.sortable.group === "rest"
          ) {
            event.preventDefault();
          }
        }
      }}
      onDragEnd={(event, manager) => {
        const moving = dragIdsRef.current;
        clearMultiDrag(manager);

        if (event.canceled) {
          setContainers(previousContainers.current);
          return;
        }
        const { source, target } = event.operation;
        if (!source || !target || moving.length === 0) {
          return;
        }

        const prev = previousContainers.current;
        let next: Record<Zone, string[]> = prev;

        if (target.id === "ordered" || target.id === "rest") {
          // Zone container: only for cross-group drops. If every moving id is
          // already in that zone, treat as no-op (click / same-zone release).
          const allAlreadyThere = moving.every((id) =>
            prev[target.id as Zone]?.includes(id),
          );
          if (allAlreadyThere) {
            return;
          }
          next = moveMultipleToContainerEnd(
            prev,
            moving,
            String(target.id),
            "after",
          );
        } else if (isChromeSortable(target)) {
          if (target.sortable.group === "rest") {
            // Rest tiles aren't insertion points — sink the block into rest.
            const anyFromOrdered = moving.some((id) =>
              prev.ordered.includes(id),
            );
            if (!anyFromOrdered) {
              return;
            }
            next = moveMultipleToContainerEnd(prev, moving, "rest", "after");
          } else {
            const indicator = getDropIndicator(manager);
            if (!indicator || moving.includes(String(indicator.targetId))) {
              return;
            }
            next = applyMultiDropIndicatorMove(
              prev,
              moving,
              indicator.targetId,
              indicator.edge,
            );
          }
        } else {
          return;
        }

        if (containersEqual(prev, next)) {
          return;
        }
        setContainers(next);
        commitOrder(next.ordered);
      }}
    >
      <div className="syllabus-personal-order-gallery syllabus-personal-order-dnd">
        <OrderedLandingZone
          keys={containers.ordered}
          itemsByKey={itemsByKey}
          className={className}
          renderItem={renderItem}
          draggingKeys={draggingKeys}
        />
        {containers.rest.length > 0 ? (
          <RestZone
            keys={containers.rest}
            itemsByKey={itemsByKey}
            className={className}
            renderItem={renderItem}
            draggingKeys={draggingKeys}
          />
        ) : null}
      </div>
    </DndProvider>
  );
}
