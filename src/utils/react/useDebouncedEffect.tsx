import { useEffect } from "preact/hooks";

export function useDebouncedEffect(effect: () => void, deps: any[], delay: number) {
  useEffect(() => {
    const id = setTimeout(effect, delay);
    return () => clearTimeout(id);
  }, [...deps, delay]);
}