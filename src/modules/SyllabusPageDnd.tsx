/**
 * Chrome-safe syllabus DnD (unlocked edit mode). Blue-line indicators +
 * pointer drag; defers persistence to the same drop handler as HTML5 DnD.
 */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h, createContext } from "preact";
import { useCallback, useContext, useMemo, useRef } from "preact/hooks";
import type { ComponentChildren } from "preact";
import {
  clearCoDragElements,
  DndProvider,
  getDropIndicator,
  isChromeSortable,
  resolveDragIds,
  RestrictToVerticalAxis,
  setCoDragElements,
  type DropIndicatorOptions,
} from "../zotero-dnd";
import type { UniqueIdentifier } from "@dnd-kit/abstract";
import {
  buildSyllabusDragPayload,
  type SyllabusDragPayload,
} from "./syllabusDragPayload";
import {
  assignmentIdFromSyllabusIdentifier,
  itemIdFromSyllabusIdentifier,
  parseSyllabusDndGroup,
  syllabusDndZoneId,
} from "./syllabusDnd";

type SyllabusPageDndContextValue = {
  enabled: boolean;
};

const SyllabusPageDndContext =
  createContext<SyllabusPageDndContextValue | null>(null);

export function useSyllabusPageDnd(): SyllabusPageDndContextValue | null {
  return useContext(SyllabusPageDndContext);
}

const movingIdsRef = { current: [] as string[] };

const SYLLABUS_DROP_INDICATOR: DropIndicatorOptions = {
  axis: "vertical",
  canIndicate: ({ source, target }) => {
    if (!isChromeSortable(source) || !isChromeSortable(target)) {
      return false;
    }
    if (movingIdsRef.current.includes(String(target.id))) {
      return false;
    }
    return true;
  },
};

export type SyllabusDropTarget = {
  targetClassNumber: number | null;
  targetItemId?: number;
  /** Bare assignment id from the blue-line host (incl. display-only `note:…`). */
  targetAssignmentId?: string;
  insertBefore?: boolean;
  zone?: "further-reading";
};

export function SyllabusPageDnd({
  enabled,
  identifierContainers,
  selectedIdentifiers,
  syllabusItems,
  nextClassNumber,
  onDragActivity,
  onDragStartMeta,
  onDropPayload,
  children,
}: {
  enabled: boolean;
  identifierContainers: Record<string, string[]>;
  selectedIdentifiers: Set<string>;
  syllabusItems: Array<{
    zoteroItem: Zotero.Item;
    assignments: Array<{ id?: string }>;
  }>;
  nextClassNumber: number;
  onDragActivity?: (dragging: boolean) => void;
  onDragStartMeta?: (meta: {
    identifiers: Set<string>;
    sourceClass: number | "unnumbered" | null;
  }) => void;
  onDropPayload: (
    payload: SyllabusDragPayload,
    target: SyllabusDropTarget,
  ) => void | Promise<void>;
  children: ComponentChildren;
}) {
  const containersRef = useRef(identifierContainers);
  containersRef.current = identifierContainers;
  const selectedRef = useRef(selectedIdentifiers);
  selectedRef.current = selectedIdentifiers;

  const parseTarget = useCallback(
    (
      target: unknown,
      indicator: ReturnType<typeof getDropIndicator>,
    ): SyllabusDropTarget | null => {
      if (!target || typeof target !== "object") {
        return null;
      }
      const operationTargetId = String((target as { id?: unknown }).id ?? "");

      if (operationTargetId === syllabusDndZoneId(`class:${nextClassNumber}`)) {
        return { targetClassNumber: nextClassNumber };
      }

      if (operationTargetId.startsWith("zone:")) {
        const group = operationTargetId.slice("zone:".length);
        const meta = parseSyllabusDndGroup(group);
        if (meta.zone === "further-reading") {
          return { targetClassNumber: null, zone: "further-reading" };
        }
        if (meta.unnumbered) {
          return { targetClassNumber: null };
        }
        return { targetClassNumber: meta.classNumber };
      }

      if (!isChromeSortable(target)) {
        return null;
      }

      const group = String(target.sortable?.group ?? "");
      const meta = parseSyllabusDndGroup(group);
      // Gallery pattern: prefer the blue-line host id over operation.target
      // (they can diverge at dragend).
      const identifier = indicator
        ? String(indicator.targetId)
        : operationTargetId;
      const targetItemId = itemIdFromSyllabusIdentifier(
        identifier,
        syllabusItems,
      );
      const targetAssignmentId = assignmentIdFromSyllabusIdentifier(identifier);
      const insertBefore = indicator?.edge === "before";

      if (meta.zone === "further-reading") {
        return {
          targetClassNumber: null,
          zone: "further-reading",
          targetItemId,
          targetAssignmentId,
          insertBefore,
        };
      }
      if (meta.unnumbered) {
        return {
          targetClassNumber: null,
          targetItemId,
          targetAssignmentId,
          insertBefore,
        };
      }
      return {
        targetClassNumber: meta.classNumber,
        targetItemId,
        targetAssignmentId,
        insertBefore,
      };
    },
    [nextClassNumber, syllabusItems],
  );

  const handleDragEnd = useCallback(
    async (
      event: {
        canceled?: boolean;
        operation: { source?: unknown; target?: unknown };
      },
      manager: Parameters<typeof getDropIndicator>[0],
    ) => {
      // Snapshot before UI teardown — setState in onDragActivity can remount
      // children and drop the live indicator (same as PersonalOrderGallery).
      const indicator = getDropIndicator(manager);
      const { source, target } = event.operation;

      onDragActivity?.(false);
      clearCoDragElements(manager);
      movingIdsRef.current = [];

      if (event.canceled) {
        return;
      }
      if (!source || !target) {
        return;
      }

      const sourceGroup =
        isChromeSortable(source) && source.sortable?.group != null
          ? String(source.sortable.group)
          : "";
      const sourceId = (source as { id?: unknown }).id;
      if (sourceId == null || !sourceGroup) {
        return;
      }

      const moving = resolveDragIds(
        containersRef.current,
        sourceId as UniqueIdentifier,
        selectedRef.current,
      );
      const payload = buildSyllabusDragPayload(
        moving,
        sourceGroup,
        syllabusItems,
      );
      if (!payload) {
        return;
      }

      // Same-list sortable drops need a blue line (gallery behaviour).
      if (
        isChromeSortable(target) &&
        (!indicator || moving.includes(String(indicator.targetId)))
      ) {
        return;
      }

      const dropTarget = parseTarget(target, indicator);
      if (!dropTarget) {
        return;
      }

      await onDropPayload(payload, dropTarget);
    },
    [onDragActivity, onDropPayload, parseTarget, syllabusItems],
  );

  const ctx = useMemo(() => ({ enabled }), [enabled]);

  if (!enabled) {
    return (
      <SyllabusPageDndContext.Provider value={ctx}>
        {children}
      </SyllabusPageDndContext.Provider>
    );
  }

  return (
    <SyllabusPageDndContext.Provider value={ctx}>
      <DndProvider
        modifiers={[RestrictToVerticalAxis]}
        dropIndicator={SYLLABUS_DROP_INDICATOR}
        onDragStart={(event, manager) => {
          onDragActivity?.(true);
          const source = event.operation.source;
          const sourceId = source?.id;
          if (sourceId == null) {
            return;
          }
          const ids = resolveDragIds(
            containersRef.current,
            sourceId,
            selectedRef.current,
          );
          movingIdsRef.current = ids;

          const sourceGroup =
            isChromeSortable(source) && source.sortable?.group != null
              ? String(source.sortable.group)
              : "";
          const sourceMeta = parseSyllabusDndGroup(sourceGroup);
          let sourceClass: number | "unnumbered" | null = null;
          if (sourceMeta.unnumbered) {
            sourceClass = "unnumbered";
          } else if (sourceMeta.classNumber != null) {
            sourceClass = sourceMeta.classNumber;
          }
          onDragStartMeta?.({
            identifiers: new Set(ids),
            sourceClass,
          });

          const root = document.querySelector(".syllabus-page-dnd");
          if (root && ids.length > 1) {
            const els: Element[] = [];
            for (const id of ids) {
              const node = root.querySelector(
                `[data-syllabus-dnd-id="${CSS.escape(id)}"]`,
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
          void handleDragEnd(event, manager);
        }}
      >
        <div className="syllabus-page-dnd min-w-0">{children}</div>
      </DndProvider>
    </SyllabusPageDndContext.Provider>
  );
}
