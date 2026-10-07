/** Per-item reference counting for shared file GC. */

import type { Env } from "./types";
import { PathError, assertSafeSegment, userItemPrefix } from "./paths";
import { reconcileUsage } from "./quota";

export type ItemRefs = {
  syllabi: string[];
  page: boolean;
};

export const EMPTY_REFS: ItemRefs = { syllabi: [], page: false };

export function refsJsonKey(
  userId: string,
  libraryId: string,
  itemKey: string,
): string {
  return `${userItemPrefix(userId, libraryId, itemKey)}refs.json`;
}

export function normalizeItemRefs(raw: unknown): ItemRefs {
  if (!raw || typeof raw !== "object") {
    return { ...EMPTY_REFS, syllabi: [] };
  }
  const obj = raw as { syllabi?: unknown; page?: unknown };
  const syllabi = Array.isArray(obj.syllabi)
    ? [
        ...new Set(
          obj.syllabi
            .filter((k): k is string => typeof k === "string")
            .map((k) => k.trim())
            .filter(Boolean),
        ),
      ].sort()
    : [];
  return {
    syllabi,
    page: obj.page === true,
  };
}

export function refsAreEmpty(refs: ItemRefs): boolean {
  return refs.syllabi.length === 0 && !refs.page;
}

export async function readItemRefs(
  env: Env,
  userId: string,
  libraryId: string,
  itemKey: string,
): Promise<ItemRefs> {
  const key = refsJsonKey(userId, libraryId, itemKey);
  const obj = await env.BUCKET.get(key);
  if (!obj) {
    return { syllabi: [], page: false };
  }
  try {
    return normalizeItemRefs(await obj.json());
  } catch {
    return { syllabi: [], page: false };
  }
}

export async function writeItemRefs(
  env: Env,
  userId: string,
  libraryId: string,
  itemKey: string,
  refs: ItemRefs,
): Promise<void> {
  const key = refsJsonKey(userId, libraryId, itemKey);
  const normalized = normalizeItemRefs(refs);
  await env.BUCKET.put(key, JSON.stringify(normalized), {
    httpMetadata: { contentType: "application/json; charset=utf-8" },
  });
}

/** Delete every object under an item prefix. Returns deleted count. */
export async function deleteItemPrefix(
  env: Env,
  userId: string,
  libraryId: string,
  itemKey: string,
): Promise<number> {
  const prefix = userItemPrefix(userId, libraryId, itemKey);
  let cursor: string | undefined;
  let deleted = 0;
  do {
    const listed = await env.BUCKET.list({ prefix, cursor, limit: 1000 });
    await Promise.all(listed.objects.map((obj) => env.BUCKET.delete(obj.key)));
    deleted += listed.objects.length;
    cursor = listed.truncated ? listed.cursor : undefined;
  } while (cursor);
  return deleted;
}

const PAGE_ARTIFACTS = [
  "index.html",
  "bibliography.ris",
  "bibliography.bib",
  "bibliography.rdf",
  "og-image.jpg",
];

/** Delete cover-page artifacts only (keep files/ + refs.json). */
export async function deleteItemPageArtifacts(
  env: Env,
  userId: string,
  libraryId: string,
  itemKey: string,
): Promise<number> {
  const prefix = userItemPrefix(userId, libraryId, itemKey);
  let deleted = 0;
  await Promise.all(
    PAGE_ARTIFACTS.map(async (rel) => {
      const key = `${prefix}${rel}`;
      const head = await env.BUCKET.head(key);
      if (head) {
        await env.BUCKET.delete(key);
        deleted += 1;
      }
    }),
  );
  return deleted;
}

export type ItemRefsPatch = {
  addSyllabus?: string;
  removeSyllabus?: string;
  setPage?: boolean;
};

/**
 * Apply a refs patch. If refs become empty, wipe the item prefix (GC).
 * Returns updated refs and whether the prefix was deleted.
 */
export async function applyItemRefsPatch(
  env: Env,
  userId: string,
  libraryId: string,
  itemKey: string,
  patch: ItemRefsPatch,
): Promise<{ refs: ItemRefs; gcDeleted: number }> {
  assertSafeSegment(libraryId, "libraryId");
  assertSafeSegment(itemKey, "itemKey");

  let refs = await readItemRefs(env, userId, libraryId, itemKey);
  const syllabi = new Set(refs.syllabi);

  if (patch.addSyllabus) {
    const col = assertSafeSegment(patch.addSyllabus, "collectionKey");
    syllabi.add(col);
  }
  if (patch.removeSyllabus) {
    const col = assertSafeSegment(patch.removeSyllabus, "collectionKey");
    syllabi.delete(col);
  }
  if (typeof patch.setPage === "boolean") {
    refs = { ...refs, page: patch.setPage };
  }
  refs = normalizeItemRefs({
    syllabi: [...syllabi],
    page: refs.page,
  });

  if (refsAreEmpty(refs)) {
    const gcDeleted = await deleteItemPrefix(env, userId, libraryId, itemKey);
    return { refs: { syllabi: [], page: false }, gcDeleted };
  }

  await writeItemRefs(env, userId, libraryId, itemKey, refs);
  return { refs, gcDeleted: 0 };
}

/** Parse itemKeys.json body from a syllabus prefix. */
export function parseItemKeysJson(raw: unknown): string[] {
  if (!raw || typeof raw !== "object") return [];
  const keys = (raw as { itemKeys?: unknown }).itemKeys;
  if (!Array.isArray(keys)) return [];
  const out: string[] = [];
  for (const k of keys) {
    if (typeof k !== "string") continue;
    try {
      out.push(assertSafeSegment(k, "itemKey"));
    } catch {
      // skip invalid
    }
  }
  return [...new Set(out)];
}

export async function readSyllabusItemKeys(
  env: Env,
  userId: string,
  libraryId: string,
  collectionKey: string,
  syllabusPrefix: string,
): Promise<string[]> {
  const obj = await env.BUCKET.get(`${syllabusPrefix}itemKeys.json`);
  if (!obj) return [];
  try {
    return parseItemKeysJson(await obj.json());
  } catch {
    return [];
  }
}

/**
 * Remove a syllabus collection from each item's refs and GC orphans.
 * Optionally delete page artifacts when clearing page (item unpublish).
 */
export async function removeSyllabusFromItems(
  env: Env,
  userId: string,
  libraryId: string,
  collectionKey: string,
  itemKeys: string[],
): Promise<{ gcDeleted: number; itemsTouched: number }> {
  let gcDeleted = 0;
  let itemsTouched = 0;
  for (const itemKey of itemKeys) {
    try {
      const result = await applyItemRefsPatch(env, userId, libraryId, itemKey, {
        removeSyllabus: collectionKey,
      });
      gcDeleted += result.gcDeleted;
      itemsTouched += 1;
    } catch (e) {
      if (e instanceof PathError) continue;
      throw e;
    }
  }
  return { gcDeleted, itemsTouched };
}

export async function unpublishItemPage(
  env: Env,
  userId: string,
  libraryId: string,
  itemKey: string,
): Promise<{ deleted: number; gcDeleted: number; refs: ItemRefs }> {
  const pageDeleted = await deleteItemPageArtifacts(
    env,
    userId,
    libraryId,
    itemKey,
  );
  const { refs, gcDeleted } = await applyItemRefsPatch(
    env,
    userId,
    libraryId,
    itemKey,
    { setPage: false },
  );
  return { deleted: pageDeleted + gcDeleted, gcDeleted, refs };
}

export async function reconcileAfterGc(
  env: Env,
  userId: string,
): Promise<number> {
  return reconcileUsage(env, userId);
}
