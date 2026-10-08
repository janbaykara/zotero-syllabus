import { normalizeHighlightColor } from "./itemHighlights";
import {
  normalizeAnnotationTagFilter,
  readItemAnnotationTags,
} from "./annotationTags";
import { parseAnnotationColorHex } from "./annotationColors";
import { getCachedItem } from "./cache";

function resolveAnnotationItem(id: number): Zotero.Item | null {
  try {
    // Prefer live Items.get so tests (and post-mutation reads) aren't stuck on
    // a stale getCachedItem entry for the same id.
    const item = Zotero.Items.get(id) || getCachedItem(id);
    if (!item || item.deleted) {
      return null;
    }
    if (typeof item.isAnnotation === "function") {
      return item.isAnnotation() ? item : null;
    }
    // Fallback when isAnnotation is unavailable (tests / older builds).
    if (
      String((item as { itemType?: string }).itemType || "") !== "annotation"
    ) {
      return null;
    }
    return item;
  } catch {
    return null;
  }
}

function resolveAnnotationItems(ids: readonly number[]): Zotero.Item[] {
  const seen = new Set<number>();
  const out: Zotero.Item[] = [];
  for (const id of ids) {
    if (seen.has(id)) {
      continue;
    }
    seen.add(id);
    const item = resolveAnnotationItem(id);
    if (item) {
      out.push(item);
    }
  }
  return out;
}

async function saveAnnotationItems(items: Zotero.Item[]): Promise<number> {
  if (items.length === 0) {
    return 0;
  }
  let saved = 0;
  try {
    for (const item of items) {
      await item.saveTx({ skipSelect: true });
      saved += 1;
    }
  } catch (error) {
    try {
      ztoolkit.log("annotationBatch save failed", error);
    } catch {
      // Tests / early boot may lack ztoolkit.
    }
    throw error;
  }
  return saved;
}

/** Set highlight colour on each annotation id. Returns how many were updated. */
export async function recolorAnnotations(
  ids: readonly number[],
  color: string,
): Promise<number> {
  const hex = parseAnnotationColorHex(color) || normalizeHighlightColor(color);
  if (!hex) {
    return 0;
  }
  const items = resolveAnnotationItems(ids);
  const dirty: Zotero.Item[] = [];
  for (const item of items) {
    try {
      const current = normalizeHighlightColor(
        String(item.annotationColor || ""),
      );
      if (current === hex) {
        continue;
      }
      item.annotationColor = hex;
      dirty.push(item);
    } catch {
      // Skip items that reject colour writes.
    }
  }
  return saveAnnotationItems(dirty);
}

/** Add a tag to each annotation (no-op when already present). */
export async function tagAnnotations(
  ids: readonly number[],
  tag: string,
): Promise<number> {
  const name = String(tag || "").trim();
  if (!name) {
    return 0;
  }
  const items = resolveAnnotationItems(ids);
  const dirty: Zotero.Item[] = [];
  for (const item of items) {
    try {
      const existing = readItemAnnotationTags(item);
      if (
        existing.some((entry) => entry.toLowerCase() === name.toLowerCase())
      ) {
        continue;
      }
      item.addTag(name);
      dirty.push(item);
    } catch {
      // Skip items that reject tag writes.
    }
  }
  return saveAnnotationItems(dirty);
}

/** Remove a tag from each annotation that has it. */
export async function untagAnnotations(
  ids: readonly number[],
  tag: string,
): Promise<number> {
  const name = String(tag || "").trim();
  if (!name) {
    return 0;
  }
  const key = name.toLowerCase();
  const items = resolveAnnotationItems(ids);
  const dirty: Zotero.Item[] = [];
  for (const item of items) {
    try {
      const existing = readItemAnnotationTags(item);
      const match = existing.find((entry) => entry.toLowerCase() === key);
      if (!match) {
        continue;
      }
      item.removeTag(match);
      dirty.push(item);
    } catch {
      // Skip items that reject tag writes.
    }
  }
  return saveAnnotationItems(dirty);
}

/** Sorted union of tags present on any of the given annotations. */
export function collectTagsForAnnotations(ids: readonly number[]): string[] {
  const tags: string[] = [];
  for (const item of resolveAnnotationItems(ids)) {
    tags.push(...readItemAnnotationTags(item));
  }
  return normalizeAnnotationTagFilter(tags).sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" }),
  );
}
