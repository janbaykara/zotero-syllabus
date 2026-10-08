import { Rectangle } from "@dnd-kit/geometry";
import { rectOf } from "./dom";

/** Build a geometry Rectangle from an element's layout box. */
export function rectangleFromElement(element: Element): Rectangle {
  const rect = rectOf(element);
  return new Rectangle(rect.left, rect.top, rect.width, rect.height);
}
