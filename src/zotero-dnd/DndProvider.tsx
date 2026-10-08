/**
 * Preact provider for a zotero-dnd DragDropManager.
 *
 * Mirrors DragDropProvider: pass `modifiers` globally (e.g.
 * RestrictToVerticalAxis from @dnd-kit/abstract/modifiers).
 *
 * Modifiers are synced in place — do not put a fresh modifiers array in the
 * manager factory deps (that remounts the whole manager every render and
 * makes drag intermittent).
 */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h } from "preact";
import { useEffect, useMemo, useRef } from "preact/hooks";
import type { ComponentChildren } from "preact";
import type {
  DragDropManager,
  DragDropManagerInput,
  DragEndEvent,
  DragMoveEvent,
  DragOverEvent,
  DragStartEvent,
} from "@dnd-kit/abstract";
import { ZoteroDndContext, type ZoteroDndManager } from "./context";
import { createZoteroDndManager } from "./createManager";

type ManagerInput = DragDropManagerInput<DragDropManager<any, any>>;

export type DndProviderProps = {
  children: ComponentChildren;
  /** Existing manager, or omit to create one with chrome defaults. */
  manager?: ZoteroDndManager;
  sensors?: ManagerInput["sensors"];
  plugins?: ManagerInput["plugins"];
  /** Global modifiers — same API as DragDropProvider.modifiers. */
  modifiers?: ManagerInput["modifiers"];
  onDragStart?: (event: DragStartEvent) => void;
  onDragMove?: (event: DragMoveEvent) => void;
  onDragOver?: (event: DragOverEvent) => void;
  onDragEnd?: (event: DragEndEvent) => void;
};

export function DndProvider({
  children,
  manager: managerProp,
  sensors,
  plugins,
  modifiers,
  onDragStart,
  onDragMove,
  onDragOver,
  onDragEnd,
}: DndProviderProps) {
  // Sensors/plugins only — modifiers update in place below.
  const owned = useMemo(() => {
    if (managerProp) {
      return null;
    }
    return createZoteroDndManager({ sensors, plugins, modifiers });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- modifiers synced separately
  }, [managerProp, sensors, plugins]);

  const manager = managerProp ?? owned!;

  // Keep manager.modifiers current without tearing down sensors/entities.
  useEffect(() => {
    if (!owned) {
      return;
    }
    owned.modifiers = Array.isArray(modifiers)
      ? modifiers
      : modifiers
        ? [modifiers]
        : [];
  }, [owned, modifiers]);

  const handlers = useRef({
    onDragStart,
    onDragMove,
    onDragOver,
    onDragEnd,
  });
  handlers.current = { onDragStart, onDragMove, onDragOver, onDragEnd };

  useEffect(() => {
    const { monitor } = manager;
    const cleanups = [
      monitor.addEventListener("dragstart", (event) => {
        handlers.current.onDragStart?.(event);
      }),
      monitor.addEventListener("dragmove", (event) => {
        handlers.current.onDragMove?.(event);
      }),
      monitor.addEventListener("dragover", (event) => {
        handlers.current.onDragOver?.(event);
      }),
      monitor.addEventListener("dragend", (event) => {
        handlers.current.onDragEnd?.(event);
      }),
    ];
    return () => {
      for (const stop of cleanups) {
        stop();
      }
    };
  }, [manager]);

  useEffect(() => {
    return () => {
      owned?.destroy();
    };
  }, [owned]);

  return (
    <ZoteroDndContext.Provider value={manager}>
      {children}
    </ZoteroDndContext.Provider>
  );
}
