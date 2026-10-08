/**
 * Outside Reading Order sort: drag any gallery tile into a Reading order
 * dropzone (shown while dragging). On drop, commit the new order and the
 * parent switches sort to personalOrder.
 */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h, createContext, Fragment } from "preact";
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "preact/hooks";
import type { ComponentChildren } from "preact";
import { twMerge } from "tailwind-merge";
import {
  clearCoDragElements,
  DndProvider,
  moveMultipleToContainerEnd,
  resolveDragIds,
  setCoDragElements,
  useDroppable,
  useSortable,
  type DndProviderProps,
} from "../zotero-dnd";
import { getString } from "../utils/locale";
import { PERSONAL_ORDER_ITEM_TYPE } from "./personalOrderDnd";
import { splitPersonalReadingOrder } from "./personalReadingOrder";

type Zone = "ordered" | "rest";

type CaptureContextValue = {
  indexByKey: Map<string, number>;
  draggingKeys: Set<string>;
};

const PersonalOrderCaptureContext = createContext<CaptureContextValue | null>(
  null,
);

const movingKeysRef = { current: new Set<string>() };

/** Wrap a gallery tile / card so it can be dragged into Reading order. */
export function PersonalOrderCaptureItem({
  item,
  children,
}: {
  item: Zotero.Item;
  children: ComponentChildren;
}) {
  const ctx = useContext(PersonalOrderCaptureContext);
  if (!ctx) {
    return <>{children}</>;
  }
  const index = ctx.indexByKey.get(item.key) ?? 0;
  const { ref, isDragSource } = useSortable({
    id: item.key,
    index,
    group: "rest",
    type: PERSONAL_ORDER_ITEM_TYPE,
    accept: PERSONAL_ORDER_ITEM_TYPE,
    droppableDisabled: true,
  });
  const multi = ctx.draggingKeys.has(item.key);
  return (
    <div
      ref={ref}
      className={twMerge(
        "syllabus-personal-order-capture-item min-w-0",
        (isDragSource || multi) && "is-dragging opacity-40",
      )}
      data-personal-order-key={item.key}
      data-personal-order-zone="rest"
    >
      {children}
    </div>
  );
}

function CaptureOrderedLanding({ active }: { active: boolean }) {
  const { ref } = useDroppable({
    id: "ordered",
    accept: PERSONAL_ORDER_ITEM_TYPE,
    collisionPriority: 50,
  });
  return (
    <section
      className={twMerge(
        "syllabus-personal-order-landing syllabus-personal-order-capture-landing",
        active && "is-dnd-active",
      )}
      aria-label={getString("gallery-personal-order-landing-label")}
      aria-hidden={!active}
    >
      <div className="syllabus-personal-order-landing-heading text-secondary text-sm mb-2">
        {getString("gallery-sort-personal-order")}
      </div>
      <div
        ref={ref}
        className="syllabus-personal-order-landing-body is-empty"
        data-personal-order-zone="ordered"
      >
        <div
          className="syllabus-personal-order-landing-empty text-secondary text-base"
          role="status"
        >
          {getString("gallery-personal-order-landing-empty")}
        </div>
      </div>
    </section>
  );
}

/** Shown with the ordered dropzone so the rest of the gallery reads as Unordered. */
function CaptureUnorderedHeading({ active }: { active: boolean }) {
  return (
    <div
      className={twMerge(
        "syllabus-personal-order-rest-heading syllabus-personal-order-capture-rest-heading text-secondary text-sm mb-2 pt-2 border-t border-quinary",
        active && "is-dnd-active",
      )}
      role="separator"
      aria-label={getString("gallery-personal-order-unordered")}
      aria-hidden={!active}
    >
      {getString("gallery-personal-order-unordered")}
    </div>
  );
}

export function PersonalOrderCapture({
  items,
  orderKeys,
  selectedItemIds,
  modifiers,
  onCommitOrdered,
  children,
}: {
  items: Zotero.Item[];
  orderKeys: string[];
  selectedItemIds?: number[] | null;
  modifiers?: DndProviderProps["modifiers"];
  /** Called with the full next ordered key list after a successful drop. */
  onCommitOrdered: (orderedKeys: string[]) => void;
  children: ComponentChildren;
}) {
  const { ordered, unordered } = splitPersonalReadingOrder(items, orderKeys);
  const sourceContainers = useMemo(
    (): Record<Zone, string[]> => ({
      ordered: ordered.map((item) => item.key),
      rest: unordered.map((item) => item.key),
    }),
    [ordered, unordered],
  );
  const containersRef = useRef(sourceContainers);
  containersRef.current = sourceContainers;

  const selectedKeys = useMemo(() => {
    const ids = new Set(selectedItemIds ?? []);
    if (ids.size === 0) {
      return [] as string[];
    }
    return items.filter((item) => ids.has(item.id)).map((item) => item.key);
  }, [items, selectedItemIds]);
  const selectedKeysRef = useRef(selectedKeys);
  selectedKeysRef.current = selectedKeys;

  const indexByKey = useMemo(() => {
    const map = new Map<string, number>();
    sourceContainers.rest.forEach((key, index) => map.set(key, index));
    sourceContainers.ordered.forEach((key, index) => {
      if (!map.has(key)) {
        map.set(key, index);
      }
    });
    return map;
  }, [sourceContainers]);

  const [draggingKeys, setDraggingKeys] = useState<Set<string>>(
    () => new Set(),
  );
  const [dndActive, setDndActive] = useState(false);
  const dragIdsRef = useRef<string[]>([]);

  const clearDrag = useCallback((manager?: object) => {
    movingKeysRef.current = new Set();
    dragIdsRef.current = [];
    setDraggingKeys(new Set());
    setDndActive(false);
    if (manager) {
      clearCoDragElements(manager);
    }
  }, []);

  const ctx = useMemo(
    (): CaptureContextValue => ({ indexByKey, draggingKeys }),
    [indexByKey, draggingKeys],
  );

  // Keep ordered keys that are already in the personal list out of "rest"
  // collision targets — capture items are always rest-group sortables.
  useEffect(() => {
    containersRef.current = sourceContainers;
  }, [sourceContainers]);

  return (
    <DndProvider
      modifiers={modifiers}
      onDragStart={(event, manager) => {
        setDndActive(true);
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
        const root = document.querySelector(".syllabus-personal-order-capture");
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
      onDragEnd={(event, manager) => {
        const moving = dragIdsRef.current;
        clearDrag(manager);
        if (event.canceled || moving.length === 0) {
          return;
        }
        const { target } = event.operation;
        if (!target || target.id !== "ordered") {
          return;
        }
        const prev = containersRef.current;
        const next = moveMultipleToContainerEnd(
          prev,
          moving,
          "ordered",
          "after",
        );
        if (next.ordered.join("\0") === prev.ordered.join("\0")) {
          return;
        }
        onCommitOrdered(next.ordered);
      }}
    >
      <PersonalOrderCaptureContext.Provider value={ctx}>
        <div
          className={twMerge(
            "syllabus-personal-order-capture",
            dndActive && "is-dnd-active",
          )}
        >
          <CaptureOrderedLanding active={dndActive} />
          <CaptureUnorderedHeading active={dndActive} />
          {children}
        </div>
      </PersonalOrderCaptureContext.Provider>
    </DndProvider>
  );
}
