/**
 * Preact hook: droppable target for zotero-dnd (e.g. empty landing zones).
 *
 * Drop highlight is applied imperatively on dragover — setState mid-drag would
 * re-render list parents and undo OptimisticSortingPlugin DOM reorders.
 */

import { useEffect, useRef, useState } from "preact/hooks";
import type { RefCallback } from "preact";
import type { Type, UniqueIdentifier } from "@dnd-kit/abstract";
import { ChromeDroppable } from "./entities";
import { useDndManager } from "./useManager";

const HIGHLIGHT_CLASSES = ["is-drop-target", "is-drop-highlight"] as const;

function setHighlight(el: Element | undefined, on: boolean): void {
  if (!el) {
    return;
  }
  for (const name of HIGHLIGHT_CLASSES) {
    el.classList.toggle(name, on);
  }
}

export type UseDroppableInput = {
  id: UniqueIdentifier;
  type?: Type;
  accept?: Type | Type[] | ((source: unknown) => boolean);
  disabled?: boolean;
  collisionPriority?: number;
  element?: Element | null;
};

export type UseDroppableReturn = {
  ref: RefCallback<Element>;
  /** Snapshot only — prefer CSS classes toggled on the element mid-drag. */
  isDropTarget: boolean;
};

export function useDroppable(input: UseDroppableInput): UseDroppableReturn {
  const manager = useDndManager();
  const droppableRef = useRef<ChromeDroppable | null>(null);

  if (!droppableRef.current) {
    droppableRef.current = new ChromeDroppable(
      {
        id: input.id,
        type: input.type,
        accept: input.accept as never,
        disabled: input.disabled,
        collisionPriority: input.collisionPriority,
        element: input.element ?? undefined,
      },
      manager,
    );
  }

  const droppable = droppableRef.current;

  if (droppable.id !== input.id) {
    droppable.id = input.id;
  }
  if (input.type !== undefined && droppable.type !== input.type) {
    droppable.type = input.type;
  }
  if (input.accept !== undefined && droppable.accept !== input.accept) {
    droppable.accept = input.accept as never;
  }
  const disabled = Boolean(input.disabled);
  if (droppable.disabled !== disabled) {
    droppable.disabled = disabled;
  }
  if (
    input.collisionPriority !== undefined &&
    droppable.collisionPriority !== input.collisionPriority
  ) {
    droppable.collisionPriority = input.collisionPriority;
  }

  const [isDropTarget, setIsDropTarget] = useState(false);

  useEffect(() => {
    return () => {
      droppable.destroy();
      droppableRef.current = null;
    };
  }, [droppable]);

  useEffect(() => {
    if (input.element) {
      droppable.setElement(input.element);
    }
  }, [droppable, input.element]);

  useEffect(() => {
    const syncDom = () => {
      setHighlight(droppable.element, droppable.isDropTarget);
    };
    syncDom();
    const stops = [
      manager.monitor.addEventListener("dragstart", syncDom),
      manager.monitor.addEventListener("dragover", syncDom),
      manager.monitor.addEventListener("dragend", () => {
        setHighlight(droppable.element, false);
        setIsDropTarget(false);
      }),
    ];
    return () => {
      for (const stop of stops) {
        stop();
      }
    };
  }, [manager, droppable]);

  const refStable = useRef<RefCallback<Element>>((node) => {
    const current = droppableRef.current;
    if (!current || !node) {
      return;
    }
    current.setElement(node);
  });

  return {
    ref: refStable.current,
    isDropTarget,
  };
}
