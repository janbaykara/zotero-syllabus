/**
 * Subscribe to @dnd-kit/state reactive reads and re-render Preact.
 */

import { useEffect, useRef, useState } from "preact/hooks";
import { effect } from "@dnd-kit/state";

export function useReactive<T>(compute: () => T): T {
  const computeRef = useRef(compute);
  computeRef.current = compute;
  const [value, setValue] = useState(compute);

  useEffect(() => {
    return effect(() => {
      const next = computeRef.current();
      setValue((prev) => (Object.is(prev, next) ? prev : next));
    });
  }, []);

  return value;
}
