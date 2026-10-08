/**
 * Preact hook: sortable item (draggable + droppable) for zotero-dnd.
 */

import { useEffect, useRef, useState } from "preact/hooks";
import type { RefCallback } from "preact";
import type { Type, UniqueIdentifier } from "@dnd-kit/abstract";
import { ChromeSortable } from "./entities";
import { useDndManager } from "./useManager";

export type UseSortableInput = {
  id: UniqueIdentifier;
  index: number;
  group?: UniqueIdentifier;
  type?: Type;
  accept?: Type | Type[] | ((source: unknown) => boolean);
  disabled?: boolean;
  /** Disable drop target only (still draggable). */
  droppableDisabled?: boolean;
  /** Optional explicit element; otherwise use the returned `ref`. */
  element?: Element | null;
  handle?: Element | null;
};

export type UseSortableReturn = {
  ref: RefCallback<Element>;
  isDragging: boolean;
  isDragSource: boolean;
  isDropTarget: boolean;
};

export function useSortable(input: UseSortableInput): UseSortableReturn {
  const manager = useDndManager();
  const sortableRef = useRef<ChromeSortable | null>(null);
  const handleOptRef = useRef(input.handle);
  handleOptRef.current = input.handle;

  if (!sortableRef.current) {
    sortableRef.current = new ChromeSortable(
      {
        id: input.id,
        index: input.index,
        group: input.group,
        type: input.type,
        accept: input.accept as never,
        disabled: input.disabled,
        element: input.element ?? undefined,
        handle: input.handle ?? undefined,
      },
      manager,
    );
  }

  const sortable = sortableRef.current;

  // Keep index / group / id in sync without recreating entities.
  sortable.index = input.index;
  if (sortable.group !== input.group) {
    sortable.group = input.group;
    const nextData = {
      ...(sortable.draggable.data as object),
      group: input.group,
    };
    sortable.draggable.data = nextData;
    sortable.droppable.data = nextData;
  }
  if (sortable.id !== input.id) {
    sortable.draggable.id = input.id;
    sortable.droppable.id = input.id;
  }
  if (input.type !== undefined && sortable.draggable.type !== input.type) {
    sortable.draggable.type = input.type;
    sortable.droppable.type = input.type;
  }
  if (
    input.accept !== undefined &&
    sortable.droppable.accept !== input.accept
  ) {
    sortable.droppable.accept = input.accept as never;
  }
  const disabled = Boolean(input.disabled);
  if (sortable.draggable.disabled !== disabled) {
    sortable.draggable.disabled = disabled;
  }
  const droppableDisabled = Boolean(input.disabled || input.droppableDisabled);
  if (sortable.droppable.disabled !== droppableDisabled) {
    sortable.droppable.disabled = droppableDisabled;
  }

  const [isDragging, setIsDragging] = useState(false);
  const [isDragSource, setIsDragSource] = useState(false);
  const [isDropTarget, setIsDropTarget] = useState(false);

  useEffect(() => {
    return () => {
      sortable.destroy();
      sortableRef.current = null;
    };
  }, [sortable]);

  useEffect(() => {
    if (input.element) {
      sortable.setElement(input.element);
    }
  }, [sortable, input.element]);

  useEffect(() => {
    if (input.handle) {
      sortable.setHandle(input.handle);
    }
  }, [sortable, input.handle]);

  // Drive flags from the manager monitor — avoid @dnd-kit/state `effect`
  // → Preact setState loops that blank the Gallery.
  useEffect(() => {
    const sync = () => {
      setIsDragging(sortable.isDragging);
      setIsDragSource(sortable.isDragSource);
      setIsDropTarget(sortable.isDropTarget);
    };
    sync();
    const stops = [
      manager.monitor.addEventListener("dragstart", sync),
      manager.monitor.addEventListener("dragmove", sync),
      manager.monitor.addEventListener("dragover", sync),
      manager.monitor.addEventListener("dragend", sync),
    ];
    return () => {
      for (const stop of stops) {
        stop();
      }
    };
  }, [manager, sortable]);

  // Stable callback — a new ref each render re-attaches and can loop.
  const refStable = useRef<RefCallback<Element>>((node) => {
    const current = sortableRef.current;
    if (!current || !node) {
      return;
    }
    current.setElement(node);
    if (!handleOptRef.current) {
      current.setHandle(node);
    }
  });

  return {
    ref: refStable.current,
    isDragging,
    isDragSource,
    isDropTarget,
  };
}
