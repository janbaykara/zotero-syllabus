// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h, Fragment } from "preact";
import { useCallback, useRef, useState } from "preact/hooks";
import type { ComponentChildren, JSX } from "preact";
import { twMerge } from "tailwind-merge";
import { getString } from "../utils/locale";
import {
  setPersonalReadingOrder,
  splitPersonalReadingOrder,
} from "./personalReadingOrder";

const PERSONAL_ORDER_DRAG_MIME = "application/x-syllabus-personal-order";

function moveKeyInOrder(
  orderKeys: string[],
  fromKey: string,
  toIndex: number,
): string[] {
  const without = orderKeys.filter((key) => key !== fromKey);
  const clamped = Math.max(0, Math.min(toIndex, without.length));
  without.splice(clamped, 0, fromKey);
  return without;
}

/**
 * Flat personal-reading-order gallery: ordered items, Unordered gap, then the
 * rest. Drag/drop updates the collection note by default (unordered → ordered
 * on drop into the ordered region; reorder within ordered; drop into unordered
 * removes from the stored list). Pass `onReorder` to persist elsewhere (e.g.
 * pinned shelf order).
 */
export function PersonalOrderGallery({
  items,
  orderKeys,
  collectionId,
  className,
  renderItem,
  onReorder,
}: {
  items: Zotero.Item[];
  orderKeys: string[];
  collectionId: number;
  className?: string;
  renderItem: (item: Zotero.Item, index: number) => ComponentChildren;
  /** When set, called instead of writing the Personal Reading Order note. */
  onReorder?: (keys: string[]) => void;
}) {
  const { ordered, unordered } = splitPersonalReadingOrder(items, orderKeys);
  const [draggingKey, setDraggingKey] = useState<string | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [dropZone, setDropZone] = useState<"ordered" | "unordered" | null>(
    null,
  );
  const draggingKeyRef = useRef<string | null>(null);
  const dropIndexRef = useRef<number | null>(null);
  const dropZoneRef = useRef<"ordered" | "unordered" | null>(null);

  const finishDrag = useCallback(() => {
    draggingKeyRef.current = null;
    dropIndexRef.current = null;
    dropZoneRef.current = null;
    setDraggingKey(null);
    setDropIndex(null);
    setDropZone(null);
  }, []);

  const commitOrder = useCallback(
    (next: string[]) => {
      if (next.join("\0") === orderKeys.join("\0")) {
        return;
      }
      if (onReorder) {
        onReorder(next);
        return;
      }
      if (!collectionId) {
        return;
      }
      void setPersonalReadingOrder(collectionId, next);
    },
    [collectionId, onReorder, orderKeys],
  );

  const commitDrop = useCallback(
    (fromKey: string, zone: "ordered" | "unordered", toIndex: number) => {
      if (!fromKey) {
        return;
      }
      if (!onReorder && !collectionId) {
        return;
      }
      if (zone === "unordered") {
        commitOrder(orderKeys.filter((key) => key !== fromKey));
        return;
      }
      commitOrder(
        moveKeyInOrder(
          orderKeys.includes(fromKey) ? orderKeys : [...orderKeys, fromKey],
          fromKey,
          toIndex,
        ),
      );
    },
    [collectionId, commitOrder, onReorder, orderKeys],
  );

  const dropIndexForTile = (
    index: number,
    clientY: number,
    tile: HTMLElement,
  ) => {
    const rect = tile.getBoundingClientRect();
    const after = clientY > rect.top + rect.height / 2;
    return after ? index + 1 : index;
  };

  const renderDraggable = (
    item: Zotero.Item,
    index: number,
    zone: "ordered" | "unordered",
    listLength: number,
  ) => (
    <div
      key={`${zone}-${item.id}`}
      className={twMerge(
        "syllabus-personal-order-tile",
        draggingKey === item.key && "is-dragging",
        dropZone === zone && dropIndex === index && "is-drop-before",
        dropZone === zone &&
          dropIndex === listLength &&
          index === listLength - 1 &&
          "is-drop-after",
      )}
      draggable={true}
      title={getString("explorer-configure-reorder")}
      data-item-id={item.id}
      onDragStart={(event) => {
        if (!event.dataTransfer) {
          return;
        }
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData(PERSONAL_ORDER_DRAG_MIME, item.key);
        event.dataTransfer.setData("text/plain", item.key);
        draggingKeyRef.current = item.key;
        dropIndexRef.current = index;
        dropZoneRef.current = zone;
        setDraggingKey(item.key);
        setDropIndex(index);
        setDropZone(zone);
      }}
      onDragEnd={() => {
        finishDrag();
      }}
      onDragOver={(event) => {
        if (!draggingKeyRef.current) {
          return;
        }
        event.preventDefault();
        if (event.dataTransfer) {
          event.dataTransfer.dropEffect = "move";
        }
        const next = dropIndexForTile(
          index,
          event.clientY,
          event.currentTarget as HTMLElement,
        );
        dropIndexRef.current = next;
        dropZoneRef.current = zone;
        setDropIndex((current) => (current === next ? current : next));
        setDropZone((current) => (current === zone ? current : zone));
      }}
      onDrop={(event) => {
        event.preventDefault();
        event.stopPropagation();
        const fromKey =
          event.dataTransfer?.getData(PERSONAL_ORDER_DRAG_MIME) ||
          event.dataTransfer?.getData("text/plain") ||
          draggingKeyRef.current;
        if (!fromKey) {
          finishDrag();
          return;
        }
        const to = dropIndexForTile(
          index,
          event.clientY,
          event.currentTarget as HTMLElement,
        );
        commitDrop(fromKey, zone, to);
        finishDrag();
      }}
    >
      {renderItem(item, index)}
    </div>
  );

  const onZoneDragOver = (
    event: JSX.TargetedDragEvent<HTMLDivElement>,
    zone: "ordered" | "unordered",
    endIndex: number,
  ) => {
    if (!draggingKeyRef.current) {
      return;
    }
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "move";
    }
    dropZoneRef.current = zone;
    dropIndexRef.current = endIndex;
    setDropZone(zone);
    setDropIndex(endIndex);
  };

  const onZoneDrop = (
    event: JSX.TargetedDragEvent<HTMLDivElement>,
    zone: "ordered" | "unordered",
    endIndex: number,
  ) => {
    event.preventDefault();
    const fromKey =
      event.dataTransfer?.getData(PERSONAL_ORDER_DRAG_MIME) ||
      event.dataTransfer?.getData("text/plain") ||
      draggingKeyRef.current;
    if (!fromKey) {
      finishDrag();
      return;
    }
    commitDrop(fromKey, zone, endIndex);
    finishDrag();
  };

  return (
    <div className="syllabus-personal-order-gallery">
      <div
        className={twMerge("syllabus-personal-order-section", className)}
        onDragOver={(event) => onZoneDragOver(event, "ordered", ordered.length)}
        onDrop={(event) => onZoneDrop(event, "ordered", ordered.length)}
      >
        {ordered.map((item, index) =>
          renderDraggable(item, index, "ordered", ordered.length),
        )}
      </div>
      {unordered.length > 0 ? (
        <>
          <div
            className="syllabus-personal-order-gap text-secondary text-sm my-4 pt-2 border-t border-quinary"
            role="separator"
          >
            {getString("gallery-personal-order-unordered")}
          </div>
          <div
            className={twMerge("syllabus-personal-order-section", className)}
            onDragOver={(event) =>
              onZoneDragOver(event, "unordered", unordered.length)
            }
            onDrop={(event) => onZoneDrop(event, "unordered", unordered.length)}
          >
            {unordered.map((item, index) =>
              renderDraggable(item, index, "unordered", unordered.length),
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
