import { createContext } from "preact";
import { useContext } from "preact/hooks";

export type ScheduleStickyTops = {
  week: number;
  date: number;
  class: number;
};

export const ScheduleStickyTopsContext =
  createContext<ScheduleStickyTops | null>(null);

/** Inline `top` for Reading Schedule sticky bands (measured from the page header). */
export function useScheduleStickyTop(
  band: keyof ScheduleStickyTops,
): { top: number } | undefined {
  const tops = useContext(ScheduleStickyTopsContext);
  if (!tops || tops[band] <= 0) {
    return undefined;
  }
  return { top: tops[band] };
}
