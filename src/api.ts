/**
 * Public JS API for other Zotero plugins and scripts (`Zotero.Syllabus.api`).
 * Documented on the docs site under Reference → API.
 */
import { version as packageVersion } from "../package.json";
import {
  addItemsToClass,
  addItemsToFurtherReading,
  addItemsToUnnumbered,
} from "./modules/addItemsToClass";
import {
  openCollectionSyllabusAtClass,
  openCollectionSyllabusPage,
  openMyAnnotationsTab,
  openReadingScheduleTab,
  openSyllabusAssignmentInCollection,
} from "./modules/ClassReadingBlock";
import {
  getPersonalReadingOrderKeys,
  isAssignmentReadingDone as isPersonalAssignmentReadingDone,
  isItemReadingDone as isPersonalItemReadingDone,
  pinItemToPersonalReadingOrder,
  removeItemFromPersonalReadingOrder,
  setAssignmentReadingDone as setPersonalAssignmentReadingDone,
  setItemReadingDone as setPersonalItemReadingDone,
  setPersonalReadingOrder,
  whenPersonalReadingOrderReady,
} from "./modules/personalReadingOrder";
import {
  isPinnedItem,
  isPinnedSyllabus,
  listPinnedItems,
  listPinnedSyllabi,
  setPinnedItem,
  setPinnedSyllabus,
} from "./modules/pinned";
import { SyllabusManager } from "./modules/syllabus";
import type {
  CollectionViewMode,
  GetByLibraryAndKeyArgs,
} from "./modules/syllabus";
import {
  collectionHasSyllabusNote,
  ensureSyllabusNoteForUser,
  getCollectionDocument,
  getCollectionDocumentSnapshot,
  getSyllabusCollectionDictionary,
  whenSyllabusNotesReady,
} from "./modules/syllabusNote";
import type {
  CollectionSyllabusDocument,
  ItemSyllabusAssignment,
  ItemSyllabusData,
  Priority,
  SettingsClassMetadata,
  SettingsCollectionDictionaryData,
  SettingsSyllabusMetadata,
  StoredClassMetadata,
} from "./utils/schemas";

/**
 * How to identify a collection in API calls: a numeric Zotero collection id,
 * or `{ libraryID, key }` lookup args (same shape Zotero uses elsewhere).
 */
export type CollectionId = number | GetByLibraryAndKeyArgs;

/**
 * Thin `interface extends` wrappers so TypeDoc links by name instead of
 * inlining Zod-inferred shapes (see AGENTS.md).
 */
/* eslint-disable @typescript-eslint/no-empty-object-type -- TypeDoc named aliases */
/** Syllabus-level settings (priorities, nomenclature, lock, CSL, links, …). */
export interface SyllabusMetadata extends SettingsSyllabusMetadata {}

/** Full in-memory syllabus document (classes, items, orders, item index). */
export interface SyllabusDocument extends CollectionSyllabusDocument {}

/**
 * Map of collection key → lightweight syllabus metadata for every syllabus
 * in the library.
 */
export interface SyllabusDictionary extends SettingsCollectionDictionaryData {}

/** Per-class settings (title, description, reading date, status, …). */
export interface ClassMetadata extends SettingsClassMetadata {}

/**
 * Class record as stored on the syllabus document (includes number /
 * subcollection key when present).
 */
export interface StoredClass extends StoredClassMetadata {}

/** One item ↔ class assignment (class, priority, instruction, done status). */
export interface Assignment extends ItemSyllabusAssignment {}

/** All syllabus assignments on an item, keyed by collection id / key. */
export interface ItemAssignments extends ItemSyllabusData {}

/** A priority definition (Essential / Recommended / …). */
export interface SyllabusPriority extends Priority {}
/* eslint-enable @typescript-eslint/no-empty-object-type */

const API_SOURCE = "background" as const;
const API_UI_SOURCE = "context-menu" as const;
const API_ITEM_PANE_SOURCE = "item-pane" as const;
const API_PAGE_SOURCE = "page" as const;

/**
 * Whether the Syllabus addon has finished initializing.
 * Prefer {@link whenReady} for callers that need caches loaded.
 */
function isReady(): boolean {
  try {
    return Boolean(addon?.data?.initialized);
  } catch {
    return false;
  }
}

/**
 * Resolve when Zotero’s UI is ready **and** Syllabus has loaded its note /
 * personal-order caches. Call this before any other API method.
 */
async function whenReady(): Promise<void> {
  await Promise.all([
    Zotero.initializationPromise,
    Zotero.unlockPromise,
    Zotero.uiReadyPromise,
  ]);
  while (!isReady()) {
    await Zotero.Promise.delay(50);
  }
  await whenSyllabusNotesReady();
  await whenPersonalReadingOrderReady();
}

/**
 * Syllabus **document** for a collection: metadata, lock, priorities, CSL,
 * external links, and the full JSON document / snapshot.
 *
 * A collection “is a syllabus” when it has a Syllabus note
 * ({@link syllabus.has} / {@link syllabus.ensure}).
 */
const syllabus = {
  /** True if the collection already has a Syllabus note (is a syllabus). */
  has: (collectionId: CollectionId | Zotero.Collection): boolean =>
    collectionHasSyllabusNote(collectionId),
  /**
   * Create a Syllabus note for the collection if missing (same as
   * “Turn into Syllabus” in the UI). Returns whether a note exists afterward.
   */
  ensure: (collectionId: CollectionId | Zotero.Collection): Promise<boolean> =>
    ensureSyllabusNoteForUser(collectionId),
  /** Read syllabus-level settings (priorities, nomenclature, lock, …). */
  getMetadata: (collectionId: CollectionId): SyllabusMetadata =>
    SyllabusManager.getSyllabusMetadata(collectionId),
  /** Replace syllabus-level settings wholesale. */
  setMetadata: (
    collectionId: CollectionId,
    metadata: SyllabusMetadata,
  ): Promise<void> =>
    SyllabusManager.setCollectionMetadata(collectionId, metadata, API_SOURCE),
  /** Merge a partial patch into syllabus-level settings. */
  patchMetadata: (
    collectionId: CollectionId,
    patch: Partial<SyllabusMetadata>,
  ): Promise<void> =>
    SyllabusManager.patchCollectionMetadata(collectionId, patch, API_SOURCE),
  /**
   * Full in-memory syllabus document (classes, items, orders). Prefer this for
   * reads; use {@link syllabus.getDocumentSnapshot} when you need a stable string.
   */
  getDocument: (
    collectionId: CollectionId | Zotero.Collection,
  ): SyllabusDocument => getCollectionDocument(collectionId),
  /** Serialized snapshot of the syllabus document (for export / debugging). */
  getDocumentSnapshot: (
    collectionId: CollectionId | Zotero.Collection,
  ): string => getCollectionDocumentSnapshot(collectionId),
  /**
   * Map of collection key → lightweight syllabus metadata for every syllabus
   * in the library (for pickers / cross-collection search).
   */
  getDictionary: (): SyllabusDictionary => getSyllabusCollectionDictionary(),
  /** Whether the syllabus is locked (read-only study mode). */
  getLocked: (collectionId: CollectionId): boolean =>
    SyllabusManager.getLocked(collectionId),
  /** Lock or unlock the syllabus (UI becomes read-only when locked). */
  setLocked: (collectionId: CollectionId, locked: boolean): Promise<void> =>
    SyllabusManager.setLocked(collectionId, locked, API_PAGE_SOURCE),
  /** Syllabus / course description text. */
  getDescription: (collectionId: CollectionId): string =>
    SyllabusManager.getCollectionDescription(collectionId),
  /** Set the syllabus / course description text. */
  setDescription: (
    collectionId: CollectionId,
    description: string,
  ): Promise<void> =>
    SyllabusManager.setCollectionDescription(
      collectionId,
      description,
      API_SOURCE,
    ),
  /** Institution name shown on the syllabus header / exports. */
  getInstitution: (collectionId: CollectionId): string =>
    SyllabusManager.getInstitution(collectionId),
  /** Set the institution name. */
  setInstitution: (
    collectionId: CollectionId,
    institution: string,
  ): Promise<void> =>
    SyllabusManager.setInstitution(collectionId, institution, API_SOURCE),
  /** Course code shown on the syllabus header / exports. */
  getCourseCode: (collectionId: CollectionId): string =>
    SyllabusManager.getCourseCode(collectionId),
  /** Set the course code. */
  setCourseCode: (
    collectionId: CollectionId,
    courseCode: string,
  ): Promise<void> =>
    SyllabusManager.setCourseCode(collectionId, courseCode, API_SOURCE),
  /**
   * Word used for a class unit (`class`, `week`, `session`, …) — drives UI copy.
   */
  getNomenclature: (collectionId: CollectionId): string =>
    SyllabusManager.getNomenclature(collectionId),
  /** Set the class-unit nomenclature word. */
  setNomenclature: (
    collectionId: CollectionId,
    nomenclature: string,
  ): Promise<void> =>
    SyllabusManager.setNomenclature(
      collectionId,
      nomenclature,
      API_PAGE_SOURCE,
    ),
  /** Priority list for this syllabus (Essential / Recommended / …). */
  getPriorities: (collectionId: CollectionId): SyllabusPriority[] =>
    SyllabusManager.getPrioritiesForCollection(collectionId),
  /** Replace the priority list for this syllabus. */
  setPriorities: (
    collectionId: CollectionId,
    priorities: SyllabusPriority[],
  ): Promise<void> =>
    SyllabusManager.setPriorities(collectionId, priorities, API_SOURCE),
  /** Citation style id for bibliography on print / publish, or `null` for default. */
  getCslStyle: (collectionId: CollectionId): string | null =>
    SyllabusManager.getCslStyle(collectionId),
  /** Set the citation style id, or `null` for default. */
  setCslStyle: (
    collectionId: CollectionId,
    cslStyle: string | null,
  ): Promise<void> =>
    SyllabusManager.setCslStyle(collectionId, cslStyle, API_PAGE_SOURCE),
  /**
   * Whether auto-managed class subcollections are enabled. Leave off unless you
   * need folder mirrors — do not edit those folders by hand.
   */
  getCreateSubcollections: (collectionId: CollectionId): boolean =>
    SyllabusManager.getCreateSubcollections(collectionId),
  /** Enable or disable auto-managed class subcollections. */
  setCreateSubcollections: (
    collectionId: CollectionId,
    createSubcollections: boolean,
  ): Promise<void> =>
    SyllabusManager.setCreateSubcollections(
      collectionId,
      createSubcollections,
      API_PAGE_SOURCE,
    ),
  /** Extra URLs shown on the syllabus (handbook, VLE, …). */
  getLinks: (collectionId: CollectionId): string[] =>
    SyllabusManager.getCollectionLinks(collectionId),
  /** Replace the list of extra URLs on the syllabus. */
  setLinks: (collectionId: CollectionId, links: string[]): Promise<void> =>
    SyllabusManager.setCollectionLinks(collectionId, links, API_PAGE_SOURCE),
};

/**
 * Classes (weeks / sessions) on a syllabus: create, title, reading date, status.
 *
 * Exposed at runtime as `Zotero.Syllabus.api.class` (`class` is a reserved word —
 * use bracket access only if your tooling requires it).
 */
const klass = {
  /** Ensure a class with this number exists; create if missing. Returns the class id. */
  ensure: (collectionId: CollectionId, classNumber: number): Promise<string> =>
    SyllabusManager.ensureClass(collectionId, classNumber),
  /** Add a new class with the given number. */
  add: (collectionId: CollectionId, classNumber: number): Promise<void> =>
    SyllabusManager.addClass(collectionId, classNumber, API_PAGE_SOURCE),
  /** Delete a class and clear assignments that pointed at it. */
  delete: (collectionId: CollectionId, classNumber: number): Promise<void> =>
    SyllabusManager.deleteClass(collectionId, classNumber, API_PAGE_SOURCE),
  /** Class metadata for a class number, if present. */
  getByNumber: (
    collectionId: CollectionId,
    classNumber: number,
  ): StoredClass | undefined =>
    SyllabusManager.getClassByNumber(collectionId, classNumber),
  /** Stable class id string for a class number. */
  getIdByNumber: (
    collectionId: CollectionId,
    classNumber: number,
  ): string | undefined =>
    SyllabusManager.getClassIdByNumber(collectionId, classNumber),
  /** Class number for a class id, if known. */
  getNumber: (
    collectionId: CollectionId,
    classId: string | undefined,
  ): number | undefined =>
    SyllabusManager.getClassNumber(collectionId, classId),
  /** Read class metadata (title, description, reading date, status, …). */
  getMetadata: (
    collectionId: CollectionId,
    classNumber: number,
  ): ClassMetadata =>
    SyllabusManager.getClassMetadata(collectionId, classNumber),
  /** Patch class metadata (title, description, reading date, status, …). */
  setMetadata: (
    collectionId: CollectionId,
    classNumber: number,
    metadata: Partial<ClassMetadata>,
  ): Promise<void> =>
    SyllabusManager.setClassMetadata(
      collectionId,
      classNumber,
      metadata,
      API_ITEM_PANE_SOURCE,
    ),
  /**
   * Display title for a class. When `includeClassNumber` is true, prefixes with
   * the syllabus nomenclature (e.g. “Class 3 …”).
   */
  getTitle: (
    collectionId: CollectionId,
    classNumber: number,
    includeClassNumber = false,
  ): string =>
    SyllabusManager.getClassTitle(
      collectionId,
      classNumber,
      includeClassNumber,
    ),
  /** Set the class title (pass `null` / `undefined` to clear). */
  setTitle: (
    collectionId: CollectionId,
    classNumber: number,
    title: string | null | undefined,
  ): Promise<void> =>
    SyllabusManager.setClassTitle(
      collectionId,
      classNumber,
      title,
      API_ITEM_PANE_SOURCE,
    ),
  /** Class description text. */
  getDescription: (collectionId: CollectionId, classNumber: number): string =>
    SyllabusManager.getClassDescription(collectionId, classNumber),
  /** Set the class description (pass `null` / `undefined` to clear). */
  setDescription: (
    collectionId: CollectionId,
    classNumber: number,
    description: string | null | undefined,
  ): Promise<void> =>
    SyllabusManager.setClassDescription(
      collectionId,
      classNumber,
      description,
      API_PAGE_SOURCE,
    ),
  /** ISO date string when readings for this class are due, or empty. */
  getReadingDate: (
    collectionId: CollectionId,
    classNumber: number,
  ): string | null | undefined =>
    SyllabusManager.getClassReadingDate(collectionId, classNumber),
  /** Set the class reading date (ISO string), or clear it. */
  setReadingDate: (
    collectionId: CollectionId,
    classNumber: number,
    readingDate: string | null | undefined,
  ): Promise<void> =>
    SyllabusManager.setClassReadingDate(
      collectionId,
      classNumber,
      readingDate,
      API_ITEM_PANE_SOURCE,
    ),
  /** Class-level done status (`"done"` or unset). */
  getStatus: (
    collectionId: CollectionId,
    classNumber: number,
  ): ClassMetadata["status"] =>
    SyllabusManager.getClassStatus(collectionId, classNumber),
  /** Mark the class done (`"done"`) or clear done (`null` / `undefined`). */
  setStatus: (
    collectionId: CollectionId,
    classNumber: number,
    status: ClassMetadata["status"],
  ): Promise<void> =>
    SyllabusManager.setClassStatus(
      collectionId,
      classNumber,
      status ?? null,
      API_ITEM_PANE_SOURCE,
    ),
  /** Inclusive range of class numbers that currently exist on the syllabus. */
  getFullNumberRange: (collectionId: CollectionId): number[] =>
    SyllabusManager.getFullClassNumberRange(collectionId),
};

/**
 * Item ↔ class **assignments**: which class an item sits in, priority,
 * instruction text, reading done flags, and bulk add helpers.
 */
const assignment = {
  /** All syllabus assignment data stored on an item (every collection). */
  getForItem: (item: Zotero.Item): ItemAssignments | undefined =>
    SyllabusManager.getItemSyllabusData(item),
  /** Assignments for this item within one collection / syllabus. */
  getForItemInCollection: (
    item: Zotero.Item,
    collectionId: CollectionId,
  ): Assignment[] =>
    SyllabusManager.getItemSyllabusDataForCollection(item, collectionId),
  /** Replace the assignment list for an item in a collection. */
  set: (
    item: Zotero.Item,
    collectionId: CollectionId,
    assignments: Assignment[],
  ): Promise<void> =>
    SyllabusManager.setItemAssignments(
      item,
      collectionId,
      assignments,
      API_SOURCE,
    ),
  /**
   * Add (or update) an assignment on a class. Pass `null` / `undefined`
   * `classNumber` for unnumbered / further-reading style placement as supported
   * by the manager. Returns the assignment id when created/updated.
   */
  add: (
    item: Zotero.Item,
    collectionId: CollectionId,
    classNumber: number | null | undefined,
    metadata: Partial<Assignment> = {},
  ): Promise<string | undefined> =>
    SyllabusManager.addClassAssignment(
      item,
      collectionId,
      classNumber,
      metadata,
      API_UI_SOURCE,
    ),
  /** Move / set the class number for the item’s primary assignment. */
  setClassNumber: (
    item: Zotero.Item,
    collectionId: CollectionId,
    classNumber: number | undefined,
  ): Promise<void> =>
    SyllabusManager.setSyllabusClassNumber(
      item,
      collectionId,
      classNumber,
      API_UI_SOURCE,
    ),
  /**
   * Mark a specific assignment done (`"done"`) or clear done (`null`).
   * Prefer {@link personal.setDone} when using personal reading order.
   */
  setReadingStatus: (
    item: Zotero.Item,
    collectionId: CollectionId,
    assignmentId: string | undefined,
    status: "done" | null,
  ): Promise<void> =>
    SyllabusManager.setReadingStatus(
      item,
      collectionId,
      assignmentId,
      status,
      API_UI_SOURCE,
    ),
  /** Whether the item is considered reading-done in this collection. */
  isItemReadingDone: (collectionId: CollectionId, itemKey: string): boolean =>
    SyllabusManager.isItemReadingDone(collectionId, itemKey),
  /** Whether a specific assignment is marked reading-done. */
  isAssignmentReadingDone: (
    collectionId: CollectionId,
    itemKey: string,
    assignmentId: string | undefined,
  ): boolean =>
    SyllabusManager.isAssignmentReadingDone(
      collectionId,
      itemKey,
      assignmentId,
    ),
  /**
   * Add items to a class (and to the collection if needed) — same as the
   * “Add to class” UI path.
   */
  addItemsToClass: (
    items: readonly Zotero.Item[],
    collectionId: number,
    classNumber: number,
  ): Promise<void> => addItemsToClass(items, collectionId, classNumber),
  /** Place items in the unnumbered / priority-only band of the syllabus. */
  addItemsToUnnumbered: (
    items: readonly Zotero.Item[],
    collectionId: number,
  ): Promise<void> => addItemsToUnnumbered(items, collectionId),
  /** Place items under Further reading. */
  addItemsToFurtherReading: (
    items: readonly Zotero.Item[],
    collectionId: number,
  ): Promise<void> => addItemsToFurtherReading(items, collectionId),
  /** Remove the assignment for a given class number. */
  remove: (
    item: Zotero.Item,
    collectionId: CollectionId,
    classNumber: number,
  ): Promise<void> =>
    SyllabusManager.removeClassAssignment(
      item,
      collectionId,
      classNumber,
      API_UI_SOURCE,
    ),
  /** Remove one assignment by its stable assignment id. */
  removeById: (
    item: Zotero.Item,
    collectionId: CollectionId,
    assignmentId: string,
  ): Promise<void> =>
    SyllabusManager.removeAssignmentById(
      item,
      collectionId,
      assignmentId,
      API_UI_SOURCE,
    ),
  /** Remove every assignment for this item on this syllabus. */
  removeAll: (item: Zotero.Item, collectionId: CollectionId): Promise<void> =>
    SyllabusManager.removeAllAssignments(item, collectionId, API_UI_SOURCE),
};

/**
 * Navigate the Zotero UI: open Syllabus / Reading Schedule / Annotation Feed
 * tabs, jump to a class or assignment, and read/set collection view mode.
 */
const view = {
  /** Open the Syllabus page for a collection (creates the view if needed). */
  openSyllabus: (collectionId: number): void =>
    openCollectionSyllabusPage(collectionId),
  /**
   * Open Syllabus scrolled to a class. Pass `"further-reading"` or `null` for
   * those bands; optional `itemId` focuses a card.
   */
  openAtClass: (
    collectionId: number,
    classNumber: number | null | "further-reading",
    itemId?: number,
  ): void => openCollectionSyllabusAtClass(collectionId, classNumber, itemId),
  /** Open Syllabus focused on a specific assignment card. */
  openAssignment: (
    collectionId: number,
    itemId: number,
    assignmentData: Assignment,
  ): void =>
    openSyllabusAssignmentInCollection(collectionId, itemId, assignmentData),
  /** Open the Reading Schedule tab. */
  openReadingSchedule: (): void => openReadingScheduleTab(),
  /** Open the Annotation Feed tab for a library. */
  openMyAnnotations: (libraryID: number): void =>
    openMyAnnotationsTab(libraryID),
  /** Current items-pane mode for the selected collection (`table` / `gallery` / `syllabus` / …). */
  getCollectionViewMode: (): CollectionViewMode =>
    SyllabusManager.getCollectionViewMode(),
  /** Set the items-pane mode for the selected collection. */
  setCollectionViewMode: (mode: CollectionViewMode): Promise<void> =>
    SyllabusManager.setCollectionViewMode(mode),
};

/**
 * Pinning for **Home → Pinned** and the top of Reading Schedule.
 * Distinct from Course Information priority and from “Add to Home” shelves.
 */
const pinned = {
  /** Whether the item is on the pinned list. */
  isItem: (item: Zotero.Item): boolean => isPinnedItem(item),
  /** Whether the collection is pinned as a syllabus / collection pin. */
  isSyllabus: (collection: Zotero.Collection): boolean =>
    isPinnedSyllabus(collection),
  /** Pin or unpin an item. */
  setItem: (item: Zotero.Item, pinnedFlag: boolean): Promise<void> =>
    setPinnedItem(item, pinnedFlag),
  /** Pin or unpin a collection (prefer the syllabus collection, not a class folder). */
  setSyllabus: (
    collection: Zotero.Collection,
    pinnedFlag: boolean,
  ): Promise<boolean> => setPinnedSyllabus(collection, pinnedFlag),
  /** Pinned items, optionally limited to a library. */
  listItems: (libraryID?: number): Promise<Zotero.Item[]> =>
    listPinnedItems(libraryID),
  /** Pinned collections / syllabi, optionally limited to a library. */
  listSyllabi: (libraryID?: number): Promise<Zotero.Collection[]> =>
    listPinnedSyllabi(libraryID),
};

/**
 * **Personal reading order** — a flat item-key sequence for a collection,
 * separate from syllabus class order. Used for Gallery sort, Next up on pins,
 * and done checkboxes when personal order is active.
 */
const personal = {
  /** Current personal order (item keys), after pruning missing items. */
  getOrder: (collection: Zotero.Collection | number): string[] =>
    getPersonalReadingOrderKeys(collection),
  /** Replace the personal order list. Returns the stored order. */
  setOrder: (
    collection: Zotero.Collection | number,
    orderKeys: string[],
  ): Promise<string[]> => setPersonalReadingOrder(collection, orderKeys),
  /** Move an item to the front of the personal reading order. Returns the new order. */
  pinItem: (
    collection: Zotero.Collection | number,
    itemKey: string,
  ): Promise<string[]> => pinItemToPersonalReadingOrder(collection, itemKey),
  /** Remove an item from the personal reading order. Returns the new order. */
  removeItem: (
    collection: Zotero.Collection | number,
    itemKey: string,
  ): Promise<string[]> =>
    removeItemFromPersonalReadingOrder(collection, itemKey),
  /** Whether the item is marked done in personal reading order. */
  isDone: (collection: Zotero.Collection | number, itemKey: string): boolean =>
    isPersonalItemReadingDone(collection, itemKey),
  /**
   * Set item done. Pass sibling assignment ids when the item has multiple
   * syllabus assignments that should stay in sync.
   */
  setDone: (
    collection: Zotero.Collection | number,
    itemKey: string,
    done: boolean,
    siblingAssignmentIds: string[] = [],
  ): Promise<void> =>
    setPersonalItemReadingDone(collection, itemKey, done, siblingAssignmentIds),
  /** Whether a specific assignment is marked done in personal reading order. */
  isAssignmentDone: (
    collection: Zotero.Collection | number,
    itemKey: string,
    assignmentId: string | undefined | null,
  ): boolean =>
    isPersonalAssignmentReadingDone(collection, itemKey, assignmentId),
  /** Set done for a specific assignment in personal reading order. */
  setAssignmentDone: (
    collection: Zotero.Collection | number,
    itemKey: string,
    assignmentId: string,
    done: boolean,
    siblingAssignmentIds: string[],
  ): Promise<void> =>
    setPersonalAssignmentReadingDone(
      collection,
      itemKey,
      assignmentId,
      done,
      siblingAssignmentIds,
    ),
};

/**
 * Public JavaScript API for **other Zotero plugins** and scripts (for example
 * [Actions & Tags](https://github.com/windingwind/zotero-actions-tags)).
 * At runtime the facade is attached as `Zotero.Syllabus.api` on the Syllabus
 * addon instance.
 *
 * Always wait until Syllabus (and Zotero’s UI) are ready before calling anything
 * else:
 *
 * ```js
 * await Zotero.Syllabus.api.whenReady();
 *
 * const collection = ZoteroPane.getSelectedCollection();
 * if (collection && Zotero.Syllabus.api.syllabus.has(collection)) {
 *   const metadata = Zotero.Syllabus.api.syllabus.getMetadata(collection.id);
 *   Zotero.Syllabus.api.view.openSyllabus(collection.id);
 * }
 * ```
 *
 * Namespaces below: `syllabus`, `class`, `assignment`, `view`, `pinned`,
 * `personal`. Top-level helpers: `version`, `isReady()`, `whenReady()`.
 */
export const syllabusApi = {
  /** Installed plugin version (from `package.json`). */
  version: packageVersion as string,
  isReady,
  whenReady,
  syllabus,
  /**
   * Classes (weeks / sessions). Access as `Zotero.Syllabus.api.class`.
   */
  class: klass,
  assignment,
  view,
  pinned,
  personal,
};

/**
 * Shape of `Zotero.Syllabus.api` (same as {@link syllabusApi}).
 *
 * @internal Not documented as a standalone page — use the `syllabusApi` variable docs.
 */
export type SyllabusApi = typeof syllabusApi;

/** @hidden Kept as the module default for `import api from "./api"`. */
export default syllabusApi;
