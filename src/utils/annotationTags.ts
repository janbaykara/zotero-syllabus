/** Empty list = no filter (show every annotation). */
export function parseAnnotationTagFilter(value: unknown): string[] {
  if (typeof value !== "string" || !value.trim()) {
    return [];
  }
  const raw = value.trim();
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return normalizeAnnotationTagFilter(
        parsed.map((entry) => String(entry ?? "")),
      );
    }
  } catch {
    // Fall through to newline / legacy comma split.
  }
  const parts = raw.includes("\n") ? raw.split(/\r\n?|\n/) : raw.split(",");
  return normalizeAnnotationTagFilter(parts);
}

export function serializeAnnotationTagFilter(tags: readonly string[]): string {
  const normalized = normalizeAnnotationTagFilter(tags);
  return normalized.length === 0 ? "" : JSON.stringify(normalized);
}

export function normalizeAnnotationTagFilter(
  tags: readonly string[],
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of tags) {
    const tag = String(raw ?? "").trim();
    if (!tag) {
      continue;
    }
    const key = tag.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(tag);
  }
  return out;
}

/** Annotation matches when it has any selected tag (OR), like the colour filter. */
export function annotationMatchesTagFilter(
  tags: readonly string[] | undefined,
  selected: readonly string[],
): boolean {
  if (selected.length === 0) {
    return true;
  }
  if (!tags || tags.length === 0) {
    return false;
  }
  const have = new Set(tags.map((tag) => tag.toLowerCase()));
  return selected.some((tag) => have.has(tag.toLowerCase()));
}

export function readItemAnnotationTags(item: {
  getTags?: () => Array<{ tag?: string } | string>;
}): string[] {
  try {
    const raw = item.getTags?.() || [];
    return normalizeAnnotationTagFilter(
      raw.map((entry) =>
        typeof entry === "string" ? entry : String(entry?.tag ?? ""),
      ),
    );
  } catch {
    return [];
  }
}
