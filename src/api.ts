/**
 * Public JS API for other Zotero plugins and scripts.
 * Access via `Zotero.Syllabus.api` after `await Zotero.Syllabus.api.whenReady()`.
 *
 * @see https://github.com/janbaykara/zotero-syllabus#api
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
  ItemSyllabusAssignment,
  ItemSyllabusData,
  Priority,
  SettingsClassMetadata,
  SettingsSyllabusMetadata,
} from "./utils/schemas";

type CollectionId = number | GetByLibraryAndKeyArgs;

const API_SOURCE = "background" as const;
const API_UI_SOURCE = "context-menu" as const;
const API_ITEM_PANE_SOURCE = "item-pane" as const;
const API_PAGE_SOURCE = "page" as const;

function isReady(): boolean {
  try {
    return Boolean(addon?.data?.initialized);
  } catch {
    return false;
  }
}

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

const syllabus = {
  has: (collectionId: CollectionId | Zotero.Collection) =>
    collectionHasSyllabusNote(collectionId),
  ensure: (collectionId: CollectionId | Zotero.Collection) =>
    ensureSyllabusNoteForUser(collectionId),
  getMetadata: (collectionId: CollectionId) =>
    SyllabusManager.getSyllabusMetadata(collectionId),
  setMetadata: (
    collectionId: CollectionId,
    metadata: SettingsSyllabusMetadata,
  ) => SyllabusManager.setCollectionMetadata(collectionId, metadata, API_SOURCE),
  patchMetadata: (
    collectionId: CollectionId,
    patch: Partial<SettingsSyllabusMetadata>,
  ) =>
    SyllabusManager.patchCollectionMetadata(collectionId, patch, API_SOURCE),
  getDocument: (collectionId: CollectionId | Zotero.Collection) =>
    getCollectionDocument(collectionId),
  getDocumentSnapshot: (collectionId: CollectionId | Zotero.Collection) =>
    getCollectionDocumentSnapshot(collectionId),
  getDictionary: () => getSyllabusCollectionDictionary(),
  getLocked: (collectionId: CollectionId) =>
    SyllabusManager.getLocked(collectionId),
  setLocked: (collectionId: CollectionId, locked: boolean) =>
    SyllabusManager.setLocked(collectionId, locked, API_PAGE_SOURCE),
  getDescription: (collectionId: CollectionId) =>
    SyllabusManager.getCollectionDescription(collectionId),
  setDescription: (collectionId: CollectionId, description: string) =>
    SyllabusManager.setCollectionDescription(
      collectionId,
      description,
      API_SOURCE,
    ),
  getInstitution: (collectionId: CollectionId) =>
    SyllabusManager.getInstitution(collectionId),
  setInstitution: (collectionId: CollectionId, institution: string) =>
    SyllabusManager.setInstitution(collectionId, institution, API_SOURCE),
  getCourseCode: (collectionId: CollectionId) =>
    SyllabusManager.getCourseCode(collectionId),
  setCourseCode: (collectionId: CollectionId, courseCode: string) =>
    SyllabusManager.setCourseCode(collectionId, courseCode, API_SOURCE),
  getNomenclature: (collectionId: CollectionId) =>
    SyllabusManager.getNomenclature(collectionId),
  setNomenclature: (collectionId: CollectionId, nomenclature: string) =>
    SyllabusManager.setNomenclature(
      collectionId,
      nomenclature,
      API_PAGE_SOURCE,
    ),
  getPriorities: (collectionId: CollectionId) =>
    SyllabusManager.getPrioritiesForCollection(collectionId),
  setPriorities: (collectionId: CollectionId, priorities: Priority[]) =>
    SyllabusManager.setPriorities(collectionId, priorities, API_SOURCE),
  getCslStyle: (collectionId: CollectionId) =>
    SyllabusManager.getCslStyle(collectionId),
  setCslStyle: (collectionId: CollectionId, cslStyle: string | null) =>
    SyllabusManager.setCslStyle(collectionId, cslStyle, API_PAGE_SOURCE),
  getCreateSubcollections: (collectionId: CollectionId) =>
    SyllabusManager.getCreateSubcollections(collectionId),
  setCreateSubcollections: (
    collectionId: CollectionId,
    createSubcollections: boolean,
  ) =>
    SyllabusManager.setCreateSubcollections(
      collectionId,
      createSubcollections,
      API_PAGE_SOURCE,
    ),
  getLinks: (collectionId: CollectionId) =>
    SyllabusManager.getCollectionLinks(collectionId),
  setLinks: (collectionId: CollectionId, links: string[]) =>
    SyllabusManager.setCollectionLinks(collectionId, links, API_PAGE_SOURCE),
};

const klass = {
  ensure: (collectionId: CollectionId, classNumber: number) =>
    SyllabusManager.ensureClass(collectionId, classNumber),
  add: (collectionId: CollectionId, classNumber: number) =>
    SyllabusManager.addClass(collectionId, classNumber, API_PAGE_SOURCE),
  delete: (collectionId: CollectionId, classNumber: number) =>
    SyllabusManager.deleteClass(collectionId, classNumber, API_PAGE_SOURCE),
  getByNumber: (collectionId: CollectionId, classNumber: number) =>
    SyllabusManager.getClassByNumber(collectionId, classNumber),
  getIdByNumber: (collectionId: CollectionId, classNumber: number) =>
    SyllabusManager.getClassIdByNumber(collectionId, classNumber),
  getNumber: (collectionId: CollectionId, classId: string | undefined) =>
    SyllabusManager.getClassNumber(collectionId, classId),
  getMetadata: (collectionId: CollectionId, classNumber: number) =>
    SyllabusManager.getClassMetadata(collectionId, classNumber),
  setMetadata: (
    collectionId: CollectionId,
    classNumber: number,
    metadata: Partial<SettingsClassMetadata>,
  ) =>
    SyllabusManager.setClassMetadata(
      collectionId,
      classNumber,
      metadata,
      API_ITEM_PANE_SOURCE,
    ),
  getTitle: (
    collectionId: CollectionId,
    classNumber: number,
    includeClassNumber = false,
  ) =>
    SyllabusManager.getClassTitle(
      collectionId,
      classNumber,
      includeClassNumber,
    ),
  setTitle: (
    collectionId: CollectionId,
    classNumber: number,
    title: string | null | undefined,
  ) =>
    SyllabusManager.setClassTitle(
      collectionId,
      classNumber,
      title,
      API_ITEM_PANE_SOURCE,
    ),
  getDescription: (collectionId: CollectionId, classNumber: number) =>
    SyllabusManager.getClassDescription(collectionId, classNumber),
  setDescription: (
    collectionId: CollectionId,
    classNumber: number,
    description: string | null | undefined,
  ) =>
    SyllabusManager.setClassDescription(
      collectionId,
      classNumber,
      description,
      API_PAGE_SOURCE,
    ),
  getReadingDate: (collectionId: CollectionId, classNumber: number) =>
    SyllabusManager.getClassReadingDate(collectionId, classNumber),
  setReadingDate: (
    collectionId: CollectionId,
    classNumber: number,
    readingDate: string | null | undefined,
  ) =>
    SyllabusManager.setClassReadingDate(
      collectionId,
      classNumber,
      readingDate,
      API_ITEM_PANE_SOURCE,
    ),
  getStatus: (collectionId: CollectionId, classNumber: number) =>
    SyllabusManager.getClassStatus(collectionId, classNumber),
  setStatus: (
    collectionId: CollectionId,
    classNumber: number,
    status: SettingsClassMetadata["status"],
  ) =>
    SyllabusManager.setClassStatus(
      collectionId,
      classNumber,
      status ?? null,
      API_ITEM_PANE_SOURCE,
    ),
  getFullNumberRange: (collectionId: CollectionId) =>
    SyllabusManager.getFullClassNumberRange(collectionId),
};

const assignment = {
  getForItem: (item: Zotero.Item): ItemSyllabusData | undefined =>
    SyllabusManager.getItemSyllabusData(item),
  getForItemInCollection: (item: Zotero.Item, collectionId: CollectionId) =>
    SyllabusManager.getItemSyllabusDataForCollection(item, collectionId),
  set: (
    item: Zotero.Item,
    collectionId: CollectionId,
    assignments: ItemSyllabusAssignment[],
  ) =>
    SyllabusManager.setItemAssignments(
      item,
      collectionId,
      assignments,
      API_SOURCE,
    ),
  add: (
    item: Zotero.Item,
    collectionId: CollectionId,
    classNumber: number | null | undefined,
    metadata: Partial<ItemSyllabusAssignment> = {},
  ) =>
    SyllabusManager.addClassAssignment(
      item,
      collectionId,
      classNumber,
      metadata,
      API_UI_SOURCE,
    ),
  setClassNumber: (
    item: Zotero.Item,
    collectionId: CollectionId,
    classNumber: number | undefined,
  ) =>
    SyllabusManager.setSyllabusClassNumber(
      item,
      collectionId,
      classNumber,
      API_UI_SOURCE,
    ),
  setReadingStatus: (
    item: Zotero.Item,
    collectionId: CollectionId,
    assignmentId: string | undefined,
    status: "done" | null,
  ) =>
    SyllabusManager.setReadingStatus(
      item,
      collectionId,
      assignmentId,
      status,
      API_UI_SOURCE,
    ),
  isItemReadingDone: (collectionId: CollectionId, itemKey: string) =>
    SyllabusManager.isItemReadingDone(collectionId, itemKey),
  isAssignmentReadingDone: (
    collectionId: CollectionId,
    itemKey: string,
    assignmentId: string | undefined,
  ) =>
    SyllabusManager.isAssignmentReadingDone(
      collectionId,
      itemKey,
      assignmentId,
    ),
  addItemsToClass: (
    items: readonly Zotero.Item[],
    collectionId: number,
    classNumber: number,
  ) => addItemsToClass(items, collectionId, classNumber),
  addItemsToUnnumbered: (
    items: readonly Zotero.Item[],
    collectionId: number,
  ) => addItemsToUnnumbered(items, collectionId),
  addItemsToFurtherReading: (
    items: readonly Zotero.Item[],
    collectionId: number,
  ) => addItemsToFurtherReading(items, collectionId),
  remove: (
    item: Zotero.Item,
    collectionId: CollectionId,
    classNumber: number,
  ) =>
    SyllabusManager.removeClassAssignment(
      item,
      collectionId,
      classNumber,
      API_UI_SOURCE,
    ),
  removeById: (
    item: Zotero.Item,
    collectionId: CollectionId,
    assignmentId: string,
  ) =>
    SyllabusManager.removeAssignmentById(
      item,
      collectionId,
      assignmentId,
      API_UI_SOURCE,
    ),
  removeAll: (item: Zotero.Item, collectionId: CollectionId) =>
    SyllabusManager.removeAllAssignments(item, collectionId, API_UI_SOURCE),
};

const view = {
  openSyllabus: (collectionId: number) =>
    openCollectionSyllabusPage(collectionId),
  openAtClass: (
    collectionId: number,
    classNumber: number | null | "further-reading",
    itemId?: number,
  ) => openCollectionSyllabusAtClass(collectionId, classNumber, itemId),
  openAssignment: (
    collectionId: number,
    itemId: number,
    assignmentData: ItemSyllabusAssignment,
  ) =>
    openSyllabusAssignmentInCollection(collectionId, itemId, assignmentData),
  openReadingSchedule: () => openReadingScheduleTab(),
  openMyAnnotations: (libraryID: number) => openMyAnnotationsTab(libraryID),
  getCollectionViewMode: (): CollectionViewMode =>
    SyllabusManager.getCollectionViewMode(),
  setCollectionViewMode: (mode: CollectionViewMode) =>
    SyllabusManager.setCollectionViewMode(mode),
};

const pinned = {
  isItem: (item: Zotero.Item) => isPinnedItem(item),
  isSyllabus: (collection: Zotero.Collection) => isPinnedSyllabus(collection),
  setItem: (item: Zotero.Item, pinnedFlag: boolean) =>
    setPinnedItem(item, pinnedFlag),
  setSyllabus: (collection: Zotero.Collection, pinnedFlag: boolean) =>
    setPinnedSyllabus(collection, pinnedFlag),
  listItems: (libraryID?: number) => listPinnedItems(libraryID),
  listSyllabi: (libraryID?: number) => listPinnedSyllabi(libraryID),
};

const personal = {
  getOrder: (collection: Zotero.Collection | number) =>
    getPersonalReadingOrderKeys(collection),
  setOrder: (collection: Zotero.Collection | number, orderKeys: string[]) =>
    setPersonalReadingOrder(collection, orderKeys),
  pinItem: (collection: Zotero.Collection | number, itemKey: string) =>
    pinItemToPersonalReadingOrder(collection, itemKey),
  isDone: (collection: Zotero.Collection | number, itemKey: string) =>
    isPersonalItemReadingDone(collection, itemKey),
  setDone: (
    collection: Zotero.Collection | number,
    itemKey: string,
    done: boolean,
    siblingAssignmentIds: string[] = [],
  ) =>
    setPersonalItemReadingDone(
      collection,
      itemKey,
      done,
      siblingAssignmentIds,
    ),
  isAssignmentDone: (
    collection: Zotero.Collection | number,
    itemKey: string,
    assignmentId: string | undefined | null,
  ) => isPersonalAssignmentReadingDone(collection, itemKey, assignmentId),
  setAssignmentDone: (
    collection: Zotero.Collection | number,
    itemKey: string,
    assignmentId: string,
    done: boolean,
    siblingAssignmentIds: string[],
  ) =>
    setPersonalAssignmentReadingDone(
      collection,
      itemKey,
      assignmentId,
      done,
      siblingAssignmentIds,
    ),
};

const api = {
  version: packageVersion as string,
  isReady,
  whenReady,
  syllabus,
  class: klass,
  assignment,
  view,
  pinned,
  personal,
};

export type SyllabusApi = typeof api;
export default api;
