import { useCallback } from "preact/hooks";
import { useAtomValue } from "jotai";
import * as z from "zod";
import { config } from "../../package.json";
import { getCachedPref, zoteroCache } from "@janbaykara/zotero-cache";
import { subscribePref } from "@janbaykara/zotero-jotai-state";
import { atomFromExternal } from "@janbaykara/zotero-jotai-state";
import {
  parseAnnotationColorFilter,
  serializeAnnotationColorFilter,
} from "@janbaykara/zotero-annotations";
import {
  parseAnnotationTagFilter,
  serializeAnnotationTagFilter,
} from "@janbaykara/zotero-annotations";
import {
  coerceAnnotationsQuoteOrder,
  type AnnotationsQuoteOrder,
} from "./explorerQueries";
import {
  ANNOTATION_COLOR_FILTER_FEED,
  ANNOTATION_TAG_FILTER_FEED,
  getAnnotationColorFilter,
  getAnnotationTagFilter,
  getAnnotationsQuoteOrder,
  getMyAnnotationsOrder,
  setAnnotationColorFilter,
  setAnnotationTagFilter,
  setAnnotationsQuoteOrder,
  setMyAnnotationsOrder,
  type MyAnnotationsOrder,
} from "./myAnnotationsPrefs";

const MyAnnotationsOrderSchema = z.enum(["newestLast", "newestFirst"]);
const AnnotationsQuoteOrderSchema = z.enum(["location", "dateAdded"]);

const MyAnnotationsSavedViewSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  order: MyAnnotationsOrderSchema,
  quoteOrder: AnnotationsQuoteOrderSchema,
  colorFilter: z.array(z.string()),
  tagFilter: z.array(z.string()),
});

const MyAnnotationsSavedViewsSchema = z.array(z.unknown());

export type MyAnnotationsSavedView = {
  id: string;
  name: string;
  order: MyAnnotationsOrder;
  quoteOrder: AnnotationsQuoteOrder;
  colorFilter: string[];
  tagFilter: string[];
};

function viewsPrefKey(): string {
  return `${config.prefsPrefix}.myAnnotationsViews`;
}

function newViewId(): string {
  return `view-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export function coerceMyAnnotationsSavedView(
  value: unknown,
): MyAnnotationsSavedView | null {
  const parsed = MyAnnotationsSavedViewSchema.safeParse(value);
  if (!parsed.success) {
    return null;
  }
  return {
    id: parsed.data.id,
    name: parsed.data.name.trim(),
    order: parsed.data.order,
    quoteOrder: coerceAnnotationsQuoteOrder(parsed.data.quoteOrder),
    colorFilter: parseAnnotationColorFilter(
      serializeAnnotationColorFilter(parsed.data.colorFilter),
    ),
    tagFilter: parseAnnotationTagFilter(
      serializeAnnotationTagFilter(parsed.data.tagFilter),
    ),
  };
}

export function coerceMyAnnotationsSavedViews(
  value: unknown,
): MyAnnotationsSavedView[] {
  const parsed = MyAnnotationsSavedViewsSchema.safeParse(value);
  if (!parsed.success) {
    return [];
  }
  const views: MyAnnotationsSavedView[] = [];
  const seen = new Set<string>();
  for (const row of parsed.data) {
    const view = coerceMyAnnotationsSavedView(row);
    if (!view || !view.name || seen.has(view.id)) {
      continue;
    }
    seen.add(view.id);
    views.push(view);
  }
  return views;
}

export function getMyAnnotationsSavedViews(): MyAnnotationsSavedView[] {
  const raw = getCachedPref(viewsPrefKey(), MyAnnotationsSavedViewsSchema);
  return raw == null ? [] : coerceMyAnnotationsSavedViews(raw);
}

export function setMyAnnotationsSavedViews(
  views: MyAnnotationsSavedView[],
): void {
  const key = viewsPrefKey();
  Zotero.Prefs.set(
    key,
    JSON.stringify(coerceMyAnnotationsSavedViews(views)),
    true,
  );
  zoteroCache.invalidatePref(key);
}

export function snapshotMyAnnotationsDisplayOptions(): Omit<
  MyAnnotationsSavedView,
  "id" | "name"
> {
  return {
    order: getMyAnnotationsOrder(),
    quoteOrder: getAnnotationsQuoteOrder(),
    colorFilter: getAnnotationColorFilter(ANNOTATION_COLOR_FILTER_FEED),
    tagFilter: getAnnotationTagFilter(ANNOTATION_TAG_FILTER_FEED),
  };
}

export function applyMyAnnotationsSavedView(
  view: MyAnnotationsSavedView,
): void {
  setMyAnnotationsOrder(view.order);
  setAnnotationsQuoteOrder(view.quoteOrder);
  setAnnotationColorFilter(ANNOTATION_COLOR_FILTER_FEED, view.colorFilter);
  setAnnotationTagFilter(ANNOTATION_TAG_FILTER_FEED, view.tagFilter);
}

export function myAnnotationsSavedViewMatches(
  view: MyAnnotationsSavedView,
  options: Omit<
    MyAnnotationsSavedView,
    "id" | "name"
  > = snapshotMyAnnotationsDisplayOptions(),
): boolean {
  return (
    view.order === options.order &&
    view.quoteOrder === options.quoteOrder &&
    serializeAnnotationColorFilter(view.colorFilter) ===
      serializeAnnotationColorFilter(options.colorFilter) &&
    serializeAnnotationTagFilter(view.tagFilter) ===
      serializeAnnotationTagFilter(options.tagFilter)
  );
}

export function createMyAnnotationsSavedView(
  name: string,
  options: Omit<
    MyAnnotationsSavedView,
    "id" | "name"
  > = snapshotMyAnnotationsDisplayOptions(),
): MyAnnotationsSavedView {
  return {
    id: newViewId(),
    name: name.trim(),
    order: options.order,
    quoteOrder: options.quoteOrder,
    colorFilter: [...options.colorFilter],
    tagFilter: [...options.tagFilter],
  };
}

export function withRemovedMyAnnotationsSavedView(
  views: MyAnnotationsSavedView[],
  id: string,
): MyAnnotationsSavedView[] {
  return views.filter((view) => view.id !== id);
}

const myAnnotationsSavedViewsAtom = atomFromExternal({
  getSnapshot: getMyAnnotationsSavedViews,
  subscribe: (onStoreChange) => subscribePref(viewsPrefKey(), onStoreChange),
});

export function useMyAnnotationsSavedViews(): [
  MyAnnotationsSavedView[],
  (views: MyAnnotationsSavedView[]) => void,
] {
  const views =
    useAtomValue(myAnnotationsSavedViewsAtom) ?? getMyAnnotationsSavedViews();
  const setViews = useCallback((next: MyAnnotationsSavedView[]) => {
    setMyAnnotationsSavedViews(next);
  }, []);
  return [views, setViews];
}
