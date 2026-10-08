/**
 * Factory for a Zotero-chrome DragDropManager on @dnd-kit/abstract.
 */

import {
  DragDropManager,
  type DragDropManagerInput,
  type Renderer,
} from "@dnd-kit/abstract";
import { ChromeFeedbackPlugin } from "./feedbackPlugin";
import { ChromePointerSensor } from "./pointerSensor";

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
};

/**
 * Create a manager wired for Zotero chrome:
 * - ChromePointerSensor (no Document/body assumptions)
 * - ChromeFeedbackPlugin (inline transform feedback; honors modifiers)
 * - Immediate renderer (skip React transition flush)
 *
 * Pass `modifiers` (e.g. `RestrictToVerticalAxis`) like DragDropProvider.
 */
export function createZoteroDndManager(
  options: CreateZoteroDndManagerOptions = {},
): DragDropManager<any, any> {
  const { plugins = [], sensors, ...rest } = options;
  return new DragDropManager({
    ...rest,
    renderer: immediateRenderer,
    sensors: sensors ?? [ChromePointerSensor],
    plugins: [ChromeFeedbackPlugin, ...(Array.isArray(plugins) ? plugins : [])],
  });
}
