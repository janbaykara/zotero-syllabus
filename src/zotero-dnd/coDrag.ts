/**
 * Register extra elements that should follow the pointer with the active
 * drag source (multi-select). ChromeFeedbackPlugin reads this each paint.
 *
 * Call `setCoDragElements` on dragstart (include or exclude the source —
 * the primary feedback path still owns the source). Clear on dragend.
 */

import { rectOf } from "./dom";

export type CoDragEntry = {
  el: HTMLElement;
  base: DOMRect;
};

const registry = new WeakMap<object, CoDragEntry[]>();

function asHTMLElement(el: Element): HTMLElement | null {
  if (!el || el.nodeType !== 1) {
    return null;
  }
  return el as HTMLElement;
}

export function setCoDragElements(manager: object, elements: Element[]): void {
  const entries: CoDragEntry[] = [];
  for (const raw of elements) {
    const el = asHTMLElement(raw);
    if (!el?.isConnected) {
      continue;
    }
    entries.push({ el, base: rectOf(el) });
  }
  registry.set(manager, entries);
}

export function getCoDragElements(manager: object): CoDragEntry[] {
  return registry.get(manager) ?? [];
}

export function clearCoDragElements(manager: object): void {
  registry.delete(manager);
}
