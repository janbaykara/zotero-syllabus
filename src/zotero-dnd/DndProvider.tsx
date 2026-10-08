/**
 * Preact provider for a zotero-dnd DragDropManager.
 *
 * Mirrors DragDropProvider: pass `modifiers` globally (e.g.
 * RestrictToVerticalAxis from @dnd-kit/abstract/modifiers).
 *
 * Modifiers are synced in place — do not put a fresh modifiers array in the
 * manager factory deps (that remounts the whole manager every render and
 * makes drag intermittent).
 *
 * `dropIndicator` / `sortableTransition` are create-time options (stable
 * boolean or module-level options object).
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
import {
  createZoteroDndManager,
  type CreateZoteroDndManagerOptions,
} from "./createManager";
import type { DropIndicatorOptions } from "./dropIndicator";

type ManagerInput = DragDropManagerInput<DragDropManager<any, any>>;

export type DndProviderProps = {
  children: ComponentChildren;
  /** Existing manager, or omit to create one with chrome defaults. */
  manager?: ZoteroDndManager;
  sensors?: ManagerInput["sensors"];
  plugins?: ManagerInput["plugins"];
  /** Global modifiers — same API as DragDropProvider.modifiers. */
  modifiers?: ManagerInput["modifiers"];
  /** Opt-in blue-line indicators (create-time). */
  dropIndicator?: boolean | DropIndicatorOptions;
  /** Opt-in FLIP after controlled move() (create-time). */
  sortableTransition?: boolean;
  onDragStart?: (event: DragStartEvent, manager: ZoteroDndManager) => void;
  onDragMove?: (event: DragMoveEvent, manager: ZoteroDndManager) => void;
  onDragOver?: (event: DragOverEvent, manager: ZoteroDndManager) => void;
  onDragEnd?: (event: DragEndEvent, manager: ZoteroDndManager) => void;
};

export function DndProvider({
  children,
  manager: managerProp,
  sensors,
  plugins,
  modifiers,
  dropIndicator,
  sortableTransition,
  onDragStart,
  onDragMove,
  onDragOver,
  onDragEnd,
}: DndProviderProps) {
  // Sensors/plugins/indicator flags only — modifiers update in place below.
  const owned = useMemo(() => {
    if (managerProp) {
      return null;
    }
    const opts: CreateZoteroDndManagerOptions = {
      sensors,
      plugins,
      modifiers,
      dropIndicator,
      sortableTransition,
    };
    return createZoteroDndManager(opts);
    // Intentionally omit `modifiers`: updated via effect without remounting.
  }, [managerProp, sensors, plugins, dropIndicator, sortableTransition]);

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
        handlers.current.onDragStart?.(event, manager);
      }),
      monitor.addEventListener("dragmove", (event) => {
        handlers.current.onDragMove?.(event, manager);
      }),
      monitor.addEventListener("dragover", (event) => {
        handlers.current.onDragOver?.(event, manager);
      }),
      monitor.addEventListener("dragend", (event) => {
        handlers.current.onDragEnd?.(event, manager);
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
