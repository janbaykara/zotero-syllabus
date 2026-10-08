/**
 * Factory for a Zotero-chrome DragDropManager on @dnd-kit/abstract.
 */

import {
  DragDropManager,
  type DragDropManagerInput,
  type Renderer,
} from "@dnd-kit/abstract";
import { ChromeDragAbortPlugin } from "./dragAbortPlugin";
import { ChromeFeedbackPlugin } from "./feedbackPlugin";
import { ChromePointerSensor } from "./pointerSensor";
import type { DropIndicatorOptions } from "./dropIndicator";
import { DropIndicatorPlugin } from "./dropIndicatorPlugin";
import { SortableTransitionPlugin } from "./sortableTransitionPlugin";

type AnyManager = DragDropManager<any, any>;
type ManagerInput = DragDropManagerInput<AnyManager>;

/** Resolves immediately — Preact has no React startTransition gate to wait on. */
const immediateRenderer: Renderer = {
  get rendering() {
    return Promise.resolve();
  },
};

export type CreateZoteroDndManagerOptions = ManagerInput & {
  /** Extra plugins after chrome defaults. */
  plugins?: ManagerInput["plugins"];
  /**
   * Opt-in FLIP sibling animation after controlled `move()` list updates.
   * Off by default — prefer `dropIndicator` for gallery-style UIs.
   */
  sortableTransition?: boolean;
  /**
   * Opt-in blue-line drop indicators (`is-drop-before` / `is-drop-after`).
   * Pass `true` or options; pair with deferred reorder on dragend.
   */
  dropIndicator?: boolean | DropIndicatorOptions;
};

/**
 * Create a manager wired for Zotero chrome:
 * - ChromePointerSensor (no Document/body assumptions)
 * - ChromeFeedbackPlugin (inline transform feedback; honors modifiers)
 * - Immediate renderer (skip React transition flush)
 * - Optional `dropIndicator` (blue lines) / `sortableTransition` (FLIP)
 *
 * Controlled lists should update via `@dnd-kit/helpers` `move()` or
 * `applyDropIndicatorMove` on dragend (blue-line) / dragover (live+FLIP).
 *
 * Pass `modifiers` (e.g. `RestrictToVerticalAxis`) like DragDropProvider.
 */
export function createZoteroDndManager(
  options: CreateZoteroDndManagerOptions = {},
): DragDropManager<any, any> {
  const {
    plugins: extraPlugins = [],
    sensors,
    sortableTransition,
    dropIndicator,
    ...rest
  } = options;

  const plugins: NonNullable<ManagerInput["plugins"]> = [
    ChromeFeedbackPlugin,
    ChromeDragAbortPlugin,
  ];

  if (sortableTransition) {
    plugins.push(SortableTransitionPlugin);
  }
  if (dropIndicator) {
    plugins.push(
      dropIndicator === true
        ? DropIndicatorPlugin
        : DropIndicatorPlugin.configure(dropIndicator),
    );
  }
  if (Array.isArray(extraPlugins)) {
    plugins.push(...extraPlugins);
  }

  return new DragDropManager({
    ...rest,
    renderer: immediateRenderer,
    sensors: sensors ?? [ChromePointerSensor],
    plugins,
  });
}
