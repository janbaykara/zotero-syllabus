import { getCachedItem } from "./cache";

type SelectItemsDialogIO = {
  singleSelection: boolean;
  multiSelect: boolean;
  dataIn: unknown;
  dataOut: unknown;
  deferred: _ZoteroTypes.Promise.DeferredPromise<void>;
  filterLibraryIDs?: number[];
  itemTreeID?: string;
};

/**
 * Open Zotero’s Select Items dialog (library tree + search).
 * Returns [] on cancel, in tests, or if the window cannot open.
 */
export async function pickLibraryItems(options?: {
  libraryID?: number;
}): Promise<Zotero.Item[]> {
  if ((__env__ as string) === "test") {
    return [];
  }
  const win = Zotero.getMainWindow();
  if (!win) {
    return [];
  }

  const io: SelectItemsDialogIO = {
    singleSelection: false,
    multiSelect: true,
    dataIn: null,
    dataOut: null,
    deferred: Zotero.Promise.defer(),
    itemTreeID: "zotero-syllabus-select-items",
  };
  if (options?.libraryID != null) {
    io.filterLibraryIDs = [options.libraryID];
  }

  try {
    win.openDialog(
      "chrome://zotero/content/selectItemsDialog.xhtml",
      "",
      "chrome,dialog=no,centerscreen,resizable=yes",
      io,
    );
    await io.deferred.promise;
  } catch (error) {
    ztoolkit.log("Error opening item picker:", error);
    return [];
  }

  const ids = Array.isArray(io.dataOut)
    ? io.dataOut.filter((id): id is number => typeof id === "number")
    : [];
  if (ids.length === 0) {
    return [];
  }

  return ids
    .map((id) => getCachedItem(id) || Zotero.Items.get(id))
    .filter((item): item is Zotero.Item => Boolean(item));
}
