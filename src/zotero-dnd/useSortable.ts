/**
 * Preact hook: sortable item for zotero-dnd.
 *
 * Patterns from @dnd-kit/react useSortable:
 * - Stable instance via registry (like useInstance)
 * - Ref must not clear `element` mid-drag while the node is still connected
 * - Index/group sync from props for controlled `move()` lists
 */

import { useEffect, useRef, useState } from "preact/hooks";
import type { RefCallback } from "preact";
import type { Type, UniqueIdentifier } from "@dnd-kit/abstract";
import type { ChromeSortable } from "./entities";
import { acquireSortable, releaseSortable } from "./sortableRegistry";
import { useDndManager } from "./useManager";

export type UseSortableInput = {
  id: UniqueIdentifier;
  index: number;
  group?: UniqueIdentifier;
  type?: Type;
  accept?: Type | Type[] | ((source: unknown) => boolean);
  disabled?: boolean;
  droppableDisabled?: boolean;
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
    sortableRef.current = acquireSortable(manager, {
      id: input.id,
      index: input.index,
      group: input.group,
      type: input.type,
      accept: input.accept as never,
      disabled: input.disabled,
      element: input.element ?? undefined,
      handle: input.handle ?? undefined,
    });
  }

  if (sortableRef.current.id !== input.id) {
    releaseSortable(manager, sortableRef.current);
    sortableRef.current = acquireSortable(manager, {
      id: input.id,
      index: input.index,
      group: input.group,
      type: input.type,
      accept: input.accept as never,
      disabled: input.disabled,
      element: input.element ?? undefined,
      handle: input.handle ?? undefined,
    });
  }

  const current = sortableRef.current;

  current.index = input.index;
  if (current.group !== input.group) {
    current.group = input.group;
    const nextData = {
      ...(current.draggable.data as object),
      group: input.group,
    };
    current.draggable.data = nextData;
    current.droppable.data = nextData;
  }
  if (input.type !== undefined && current.draggable.type !== input.type) {
    current.draggable.type = input.type;
    current.droppable.type = input.type;
  }
  if (input.accept !== undefined && current.droppable.accept !== input.accept) {
    current.droppable.accept = input.accept as never;
  }
  const disabled = Boolean(input.disabled);
  if (current.draggable.disabled !== disabled) {
    current.draggable.disabled = disabled;
  }
  const droppableDisabled = Boolean(input.disabled || input.droppableDisabled);
  if (current.droppable.disabled !== droppableDisabled) {
    current.droppable.disabled = droppableDisabled;
  }

  const [isDragSource, setIsDragSource] = useState(false);

  useEffect(() => {
    const acquired = current;
    return () => {
      releaseSortable(manager, acquired);
      if (sortableRef.current === acquired) {
        sortableRef.current = null;
      }
    };
  }, [manager, current]);

  useEffect(() => {
    if (input.element) {
      current.setElement(input.element);
    }
  }, [current, input.element]);

  useEffect(() => {
    if (input.handle) {
      current.setHandle(input.handle);
    }
  }, [current, input.handle]);

  useEffect(() => {
    const sync = () => {
      setIsDragSource(current.isDragSource);
    };
    sync();
    const stops = [
      manager.monitor.addEventListener("dragstart", sync),
      manager.monitor.addEventListener("dragend", () => {
        setIsDragSource(false);
      }),
    ];
    return () => {
      for (const stop of stops) {
        stop();
      }
    };
  }, [manager, current]);

  // Mirror @dnd-kit/react: refuse to clear element mid-drag if still connected.
  const refStable = useRef<RefCallback<Element>>((node) => {
    const instance = sortableRef.current;
    if (!instance) {
      return;
    }
    if (
      !node &&
      instance.element?.isConnected &&
      !manager.dragOperation.status.idle
    ) {
      return;
    }
    instance.setElement(node ?? undefined);
    if (node && !handleOptRef.current) {
      instance.setHandle(node);
    }
  });

  return {
    ref: refStable.current,
    isDragging: isDragSource,
    isDragSource,
    isDropTarget: false,
  };
}
