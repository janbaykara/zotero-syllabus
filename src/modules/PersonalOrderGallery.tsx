/**
 * Personal reading-order gallery — controlled multi-list Sortable.
 *
 * Blue-line (deferred) reorder:
 * - DropIndicatorPlugin paints `is-drop-before` / `is-drop-after` while dragging
 * - Lists stay put until dragend → multi-aware drop helpers
 * - Multi-select: dragging one selected item moves the whole selection
 *   (relative order preserved)
 * - Rest→rest blocked (unordered is drop-target only for unordering)
 * - Done items drag into prioritised or unprioritised, which clears done
 *
 * FLIP live-reorder remains available via `sortableTransition` on DndProvider
 * if another surface wants it.
 */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h } from "preact";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "preact/hooks";
import type { ComponentChildren } from "preact";
import { ChevronDown } from "lucide-preact";
import { twMerge } from "tailwind-merge";
import {
  applyMultiDropIndicatorMove,
  clearCoDragElements,
  getDropIndicator,
  isChromeSortable,
  moveMultipleToContainerEnd,
  resolveDragIds,
  setCoDragElements,
  type DropIndicatorOptions,
} from "@janbaykara/zotero-dnd";
import {
  DndProvider,
  useDroppable,
  type DndProviderProps,
} from "@janbaykara/zotero-dnd/preact";
import { getString } from "../utils/locale";
import { PERSONAL_ORDER_ITEM_TYPE } from "./personalOrderDnd";
import {
  releasePersonalReadingDone,
  setPersonalReadingOrder,
  splitPersonalReadingOrder,
} from "./personalReadingOrder";
import { SortableDndTile } from "./SortableDndTile";

type Zone = "ordered" | "rest" | "done";

type OrderContainers = Record<Zone, string[]>;

const ITEM_TYPE = PERSONAL_ORDER_ITEM_TYPE;

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

function containersEqual(a: OrderContainers, b: OrderContainers): boolean {
  return (["ordered", "rest", "done"] as const).every(
    (zone) =>
      a[zone].length === b[zone].length &&
      a[zone].every((id, index) => id === b[zone][index]),
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
  return (
    <SortableDndTile
      id={itemKey}
      index={index}
      group={zone}
      type={ITEM_TYPE}
      accept={ITEM_TYPE}
      // Unordered and done tiles drag out only — they are not insertion points.
      droppableDisabled={zone === "rest" || zone === "done"}
      isMultiDragging={isMultiDragging}
      title={getString("explorer-configure-reorder")}
      dataAttributes={{
        "data-item-id": item.id,
        "data-personal-order-key": itemKey,
        "data-personal-order-zone": zone,
      }}
    >
      {renderItem(item, index)}
    </SortableDndTile>
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
      aria-label={getString("gallery-prioritised-items", {
        args: { count: keys.length },
      })}
    >
      <div className="syllabus-personal-order-landing-heading syllabus-personal-order-zone-heading mb-2">
        {getString("gallery-prioritised-items", {
          args: { count: keys.length },
        })}
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
  const empty = keys.length === 0;
  // Droppable on the list body only — not the whole section — so the
  // unorder highlight doesn't paint over the ordered landing above.
  // Higher priority when empty so ordered tiles don't steal the hit target.
  const { ref } = useDroppable({
    id: "rest",
    accept: (source) => {
      const group = sourceGroupOf(source as never);
      // Prioritised items unorder here. Done items land here and lose done.
      return group === "ordered" || group === "done";
    },
    collisionPriority: empty ? 50 : 1,
  });

  return (
    <section
      className="syllabus-personal-order-rest mt-4"
      aria-label={getString("gallery-unprioritised-items", {
        args: { count: keys.length },
      })}
      data-personal-order-zone="rest"
    >
      <div
        className="syllabus-personal-order-rest-heading syllabus-personal-order-zone-heading mb-2 pt-2 border-t border-quinary"
        role="separator"
      >
        {getString("gallery-unprioritised-items", {
          args: { count: keys.length },
        })}
      </div>
      <div
        ref={ref}
        className={twMerge(
          "syllabus-personal-order-rest-body",
          empty
            ? "is-empty"
            : twMerge("syllabus-personal-order-section", className),
        )}
        data-personal-order-zone="rest"
      >
        {empty ? (
          <div
            className="syllabus-personal-order-landing-empty text-secondary text-base"
            role="status"
          >
            {getString("gallery-personal-order-unordered-empty")}
          </div>
        ) : (
          keys.map((key, index) => {
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
          })
        )}
      </div>
    </section>
  );
}

function PersonalOrderDoneSection({
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
  const [open, setOpen] = useState(true);
  const label = getString("gallery-done-items", {
    args: { count: keys.length },
  });
  return (
    <section className="syllabus-personal-order-done mt-4">
      <button
        type="button"
        className="syllabus-personal-order-done-toggle syllabus-personal-order-zone-heading mb-2 pt-2 border-t border-quinary"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <ChevronDown
          className="syllabus-gallery-done-chevron"
          size={16}
          strokeWidth={2}
          aria-hidden="true"
        />
        <span>{label}</span>
      </button>
      <div
        className={twMerge(
          "syllabus-gallery-done-body",
          !open && "hidden",
          open && "syllabus-personal-order-section",
          open && className,
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
              zone="done"
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
  doneItems = [],
}: {
  items: Zotero.Item[];
  orderKeys: string[];
  collectionId: number;
  className?: string;
  renderItem: (item: Zotero.Item, index: number) => ComponentChildren;
  /** Second arg lists done keys this drop is clearing. */
  onReorder?: (keys: string[], undoingDoneKeys?: string[]) => void;
  modifiers?: DndProviderProps["modifiers"];
  /** Zotero item ids currently selected — multi-drag when the active tile is among them. */
  selectedItemIds?: number[] | null;
  /** Ticked-done items, shown under the prioritised list instead of in it. */
  doneItems?: Zotero.Item[];
}) {
  const { ordered, unordered } = splitPersonalReadingOrder(items, orderKeys);
  const itemsByKey = useMemo(() => {
    const map = new Map<string, Zotero.Item>();
    for (const item of items) {
      map.set(item.key, item);
    }
    for (const item of doneItems) {
      map.set(item.key, item);
    }
    return map;
  }, [items, doneItems]);

  const selectedKeys = useMemo(() => {
    const ids = new Set(selectedItemIds ?? []);
    if (ids.size === 0) {
      return [] as string[];
    }
    return [...items, ...doneItems]
      .filter((item) => ids.has(item.id))
      .map((item) => item.key);
  }, [items, doneItems, selectedItemIds]);
  const selectedKeysRef = useRef(selectedKeys);
  selectedKeysRef.current = selectedKeys;

  const sourceContainers = useMemo(
    (): OrderContainers => ({
      ordered: ordered.map((item) => item.key),
      rest: unordered.map((item) => item.key),
      done: doneItems.map((item) => item.key),
    }),
    [ordered, unordered, doneItems],
  );
  const sourceKey = `${sourceContainers.ordered.join("|")}::${sourceContainers.rest.join("|")}::${sourceContainers.done.join("|")}`;

  const [containers, setContainers] =
    useState<OrderContainers>(sourceContainers);
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
    (nextOrdered: string[], undoingDoneKeys: string[]) => {
      const orderUnchanged = nextOrdered.join("\0") === orderKeys.join("\0");
      if (orderUnchanged && undoingDoneKeys.length === 0) {
        return;
      }
      if (onReorder) {
        onReorder(nextOrdered, undoingDoneKeys);
        return;
      }
      if (!collectionId) {
        return;
      }
      if (undoingDoneKeys.length > 0) {
        void releasePersonalReadingDone(
          collectionId,
          undoingDoneKeys.map((itemKey) => ({ itemKey })),
          orderUnchanged ? undefined : nextOrdered,
        );
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
        let next: OrderContainers;

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
          if (
            target.sortable.group === "rest" ||
            target.sortable.group === "done"
          ) {
            // Rest and done tiles aren't insertion points. Rest sinks
            // prioritised and done items; releasing on a done tile is a no-op.
            if (target.sortable.group === "done") {
              return;
            }
            const fromOutsideRest = moving.some(
              (id) => prev.ordered.includes(id) || prev.done.includes(id),
            );
            if (!fromOutsideRest) {
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

        const undoingDone = moving.filter((id) => prev.done.includes(id));
        if (containersEqual(prev, next) && undoingDone.length === 0) {
          return;
        }
        setContainers(next);
        commitOrder(next.ordered, undoingDone);
      }}
    >
      <div
        className="syllabus-personal-order-gallery syllabus-personal-order-dnd"
        data-zotero-dnd-root
      >
        <OrderedLandingZone
          keys={containers.ordered}
          itemsByKey={itemsByKey}
          className={className}
          renderItem={renderItem}
          draggingKeys={draggingKeys}
        />
        {containers.done.length > 0 ? (
          <PersonalOrderDoneSection
            keys={containers.done}
            itemsByKey={itemsByKey}
            className={className}
            renderItem={renderItem}
            draggingKeys={draggingKeys}
          />
        ) : null}
        {/* Always show the other-items zone — empty dropzone lets you delist
            when every item is currently in the prioritised list. */}
        <RestZone
          keys={containers.rest}
          itemsByKey={itemsByKey}
          className={className}
          renderItem={renderItem}
          draggingKeys={draggingKeys}
        />
      </div>
    </DndProvider>
  );
}
