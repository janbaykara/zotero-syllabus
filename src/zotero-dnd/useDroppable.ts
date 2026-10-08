/**
 * Preact hook: droppable target for zotero-dnd (e.g. empty landing zones).
 */

import { useEffect, useRef, useState } from "preact/hooks";
import type { RefCallback } from "preact";
import type { Type, UniqueIdentifier } from "@dnd-kit/abstract";
import { ChromeDroppable } from "./entities";
import { useDndManager } from "./useManager";

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
    const sync = () => {
      setIsDropTarget(droppable.isDropTarget);
    };
    sync();
    const stops = [
      manager.monitor.addEventListener("dragstart", sync),
      manager.monitor.addEventListener("dragover", sync),
      // Force clear — target can still match this id when dragend fires.
      manager.monitor.addEventListener("dragend", () => {
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
