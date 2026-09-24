import { createContext } from "preact";
import { useContext } from "preact/hooks";

export type ScheduleStickyTops = {
  week: number;
  date: number;
  class: number;
};

/** Fallbacks if sticky bands aren't in the DOM yet. */
export const SCHEDULE_WEEK_BAND_PX = 40;
export const SCHEDULE_DATE_BAND_PX = 36;

/**
 * Stack week / date / class bands under the page header.
 * Floor the header so a fractional height cannot open a slit (ceil did).
 * Do not add clearance — extra pixels under the title let rows show through.
 */
export function measureScheduleStickyTops(heights: {
  header: number;
  week?: number | null;
  date?: number | null;
}): ScheduleStickyTops {
  const primary = Math.floor(heights.header);
  const weekH = Math.ceil(heights.week || SCHEDULE_WEEK_BAND_PX);
  const dateH = Math.ceil(heights.date || SCHEDULE_DATE_BAND_PX);
  return {
    week: primary,
    date: primary + weekH,
    class: primary + weekH + dateH,
  };
}

/** Unpainted pixels between the header bottom and the week band (`> 0` is a slit). */
export function scheduleStickyHeaderGap(
  headerHeight: number,
  weekTop: number = measureScheduleStickyTops({ header: headerHeight }).week,
): number {
  return weekTop - headerHeight;
}

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
