import { getCachedCollectionById } from "./cache";

/**
 * Compare the running Zotero app version against a major.minor.patch target.
 */
export function isZoteroVersionAtLeast(minVersion: string): boolean {
  const parse = (v: string) =>
    v
      .split(".")
      .slice(0, 3)
      .map((part) => Number.parseInt(part, 10) || 0);
  const [aMaj, aMin = 0, aPatch = 0] = parse(Zotero.version);
  const [bMaj, bMin = 0, bPatch = 0] = parse(minVersion);
  if (aMaj !== bMaj) return aMaj > bMaj;
  if (aMin !== bMin) return aMin > bMin;
  return aPatch >= bPatch;
}

/** Zotero 8+ platform / UI features (also true on Zotero 9/10). */
export function isZotero8OrLater(): boolean {
  return isZoteroVersionAtLeast("8.0");
}

type ZoteroPaneSelection = {
  getSelectedCollections?: () => Zotero.Collection[] | false | null | undefined;
  getSelectedCollection?: () => Zotero.Collection | false | null | undefined;
  getSelectedLibraryID?: () => number | false | null | undefined;
  collectionsView?: { selectByID: (id: string) => unknown } | false | null;
};

/** Active collections pane, or undefined if Zotero has no main window yet. */
function getZoteroPane(): ZoteroPaneSelection | undefined {
  try {
    return (Zotero.getActiveZoteroPane() ??
      Zotero.getMainWindow()?.ZoteroPane) as ZoteroPaneSelection | undefined;
  } catch {
    return undefined;
  }
}

/**
 * Collections currently selected in the collections pane.
 * Zotero 10 removed the singular getters; use the plural API when present.
 */
export function getSelectedCollections(): Zotero.Collection[] {
  try {
    const pane = getZoteroPane();
    if (!pane) return [];

    if (typeof pane.getSelectedCollections === "function") {
      const collections = pane.getSelectedCollections();
      return Array.isArray(collections) ? collections : [];
    }

    if (typeof pane.getSelectedCollection === "function") {
      const collection = pane.getSelectedCollection();
      return collection ? [collection] : [];
    }

    return [];
  } catch {
    return [];
  }
}

/** The selected collection, or null if none or more than one is selected. */
export function getSelectedCollection(): Zotero.Collection | null {
  const collections = getSelectedCollections();
  return collections.length === 1 ? collections[0] : null;
}

export function selectZoteroCollection(collectionId: number): boolean {
  try {
    const pane = getZoteroPane();
    const collection = getCachedCollectionById(collectionId);
    if (!collection || !pane?.collectionsView) {
      return false;
    }
    pane.collectionsView.selectByID(collection.treeViewID);
    return true;
  } catch (error) {
    ztoolkit.log("Error selecting collection:", error);
    return false;
  }
}

const COLLECTION_NAME_MAX = 255;

/** Library to create a reading-list import in: selected collection, else selected library, else My Library. */
export function libraryIdForNewCollection(): number {
  const selected = getSelectedCollection();
  if (selected) {
    return selected.libraryID;
  }
  try {
    const pane = getZoteroPane();
    const libraryID = pane?.getSelectedLibraryID?.();
    if (typeof libraryID === "number" && libraryID > 0) {
      return libraryID;
    }
  } catch {
    // Fall through to the user library.
  }
  return Zotero.Libraries.userLibraryID;
}

function uniqueTopLevelCollectionName(
  libraryID: number,
  baseName: string,
): string {
  let base = baseName.trim() || "Imported reading list";
  if (base.length > COLLECTION_NAME_MAX) {
    base = base.slice(0, COLLECTION_NAME_MAX);
  }
  const existing = new Set(
    Zotero.Collections.getByLibrary(libraryID)
      .filter((collection) => !collection.parentID)
      .map((collection) => collection.name),
  );
  if (!existing.has(base)) {
    return base;
  }
  let n = 2;
  while (true) {
    const suffix = ` (${n})`;
    const candidate = `${base.slice(0, COLLECTION_NAME_MAX - suffix.length)}${suffix}`;
    if (!existing.has(candidate)) {
      return candidate;
    }
    n++;
  }
}

/** New top-level collection in `libraryID`, named from `baseName` with a numeric suffix if needed. */
export async function createUniqueTopLevelCollection(
  libraryID: number,
  baseName: string,
): Promise<Zotero.Collection> {
  const collection = new Zotero.Collection({
    name: uniqueTopLevelCollectionName(libraryID, baseName),
    libraryID,
  });
  await collection.saveTx({ skipSelect: true });
  return collection;
}

const READING_LIST_IMPORT_REUSE_MS = 90_000;

type RecentReadingListImport = {
  listKey: string;
  collectionId: number;
  createdAt: number;
};

const recentReadingListImports: RecentReadingListImport[] = [];
let readingListImportGate: Promise<unknown> = Promise.resolve();

function readingListImportKey(links: unknown, title: string): string {
  const urls = Array.isArray(links) ? links : [];
  for (const link of urls) {
    const raw = String(link || "").trim();
    if (!raw) {
      continue;
    }
    try {
      const parsed = new URL(raw);
      parsed.hash = "";
      parsed.search = "";
      return `url:${parsed.toString().replace(/\/$/, "")}`;
    } catch {
      return `url:${raw.split("#")[0].replace(/\/$/, "")}`;
    }
  }
  const trimmed = title.trim();
  return trimmed ? `title:${trimmed}` : "";
}

/**
 * One top-level collection per reading-list import. Connector translators can
 * POST metadata more than once for the same list (iframes / retries); reuse
 * the collection created for that URL in the last 90s instead of making
 * extras that only hold a duplicate syllabus note.
 */
export async function collectionForReadingListImport(options: {
  title: string;
  links?: unknown;
}): Promise<Zotero.Collection> {
  const title = options.title.trim() || "Imported reading list";
  const listKey = readingListImportKey(options.links, title);
  const work = readingListImportGate.then(async () => {
    const now = Date.now();
    if (listKey) {
      const hit = recentReadingListImports.find(
        (entry) =>
          entry.listKey === listKey &&
          now - entry.createdAt < READING_LIST_IMPORT_REUSE_MS,
      );
      if (hit) {
        const existing =
          getCachedCollectionById(hit.collectionId) ||
          Zotero.Collections.get(hit.collectionId);
        if (existing && !existing.deleted) {
          return existing;
        }
      }
    }
    const destination = await createUniqueTopLevelCollection(
      libraryIdForNewCollection(),
      title,
    );
    if (listKey) {
      recentReadingListImports.push({
        listKey,
        collectionId: destination.id,
        createdAt: now,
      });
    }
    return destination;
  });
  readingListImportGate = work.then(
    () => undefined,
    () => undefined,
  );
  return work;
}

/**
 * Internal library id for items and collections.
 * On group libraries `library.id` is the groupID; `getByLibrary` needs `libraryID`.
 */
export function zoteroLibraryID(
  library: { libraryID?: number; id?: number } | null | undefined,
): number | null {
  if (!library) {
    return null;
  }
  if (typeof library.libraryID === "number" && library.libraryID > 0) {
    return library.libraryID;
  }
  if (typeof library.id === "number" && library.id > 0) {
    return library.id;
  }
  return null;
}

/**
 * Collections are unique by libraryID + key, not by key alone.
 * A group library can reuse an 8-character key from My Library.
 */
export function dedupeCollectionsByLibraryAndKey<
  T extends { libraryID: number; key: string },
>(collections: T[]): T[] {
  const collectionMap = new Map<string, T>();
  for (const collection of collections) {
    collectionMap.set(`${collection.libraryID}:${collection.key}`, collection);
  }
  return Array.from(collectionMap.values());
}

/**
 * False for read-only group libraries. Writing item fields there throws
 * (Better BibTeX #3430, #3469).
 */
export function libraryIsEditable(
  libraryID: number | null | undefined,
): boolean {
  if (libraryID == null) {
    return false;
  }
  try {
    const library = Zotero.Libraries.get(libraryID);
    return Boolean(library && library.editable);
  } catch {
    return false;
  }
}

export function collectionLibraryIsEditable(
  collection: Zotero.Collection | null | undefined,
): boolean {
  if (!collection) {
    return false;
  }
  return libraryIsEditable(collection.libraryID);
}

export function getAllCollections(recursive = true) {
  const libraries = Array.from(Zotero.Libraries.getAll());
  const collections: Zotero.Collection[] = [];
  for (const library of libraries) {
    const libraryID = zoteroLibraryID(library);
    if (libraryID == null) {
      continue;
    }
    const libraryCollections = Zotero.Collections.getByLibrary(libraryID);
    collections.push(...libraryCollections);
  }
  if (recursive) {
    for (const collection of collections) {
      collection.getDescendents().forEach((childObject) => {
        if (childObject.type === "collection") {
          const childCollection = getCachedCollectionById(childObject.id);
          if (childCollection) {
            collections.push(childCollection);
          }
        }
      });
    }
  }
  return dedupeCollectionsByLibraryAndKey(collections);
}
