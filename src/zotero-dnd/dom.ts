/**
 * DOM helpers that avoid bare `instanceof Document` / `HTMLElement` — those
 * constructors are often missing in Zotero chrome sandboxes.
 */

export function isElement(value: unknown): value is Element {
  return Boolean(
    value &&
    typeof value === "object" &&
    "nodeType" in value &&
    (value as Node).nodeType === 1 &&
    typeof (value as Element).closest === "function",
  );
}

/** Activator element for a draggable (handle preferred over element). */
export function activatorOf(source: {
  element?: Element;
  handle?: Element;
  data?: { element?: Element; handle?: Element };
}): Element | undefined {
  const data = source.data;
  return source.handle || data?.handle || source.element || data?.element;
}

export function ownerDocumentOf(node: Node | null | undefined): Document {
  return (node && node.ownerDocument) || document;
}

export function rectOf(element: Element): DOMRect {
  return element.getBoundingClientRect();
}

export function clientPoint(event: PointerEvent | MouseEvent | TouchEvent): {
  x: number;
  y: number;
} {
  if ("clientX" in event) {
    return { x: event.clientX, y: event.clientY };
  }
  const touch =
    (event as TouchEvent).touches?.[0] ||
    (event as TouchEvent).changedTouches?.[0];
  return { x: touch?.clientX ?? 0, y: touch?.clientY ?? 0 };
}

/** Prefer the event target's document; fall back to the element or global. */
export function eventDocument(
  event: Event,
  fallback?: Element | null,
): Document {
  const target = event.target;
  if (isElement(target) && target.ownerDocument) {
    return target.ownerDocument;
  }
  return ownerDocumentOf(fallback ?? null);
}
