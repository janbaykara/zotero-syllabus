/**
 * Augment zotero-types where the published defs lag the live ZoteroPane API.
 */
declare namespace _ZoteroTypes {
  namespace ItemTreeManager {
    interface ItemTreeColumnOptions {
      /** Initial visibility. Persisted when listed in `zoteroPersist`. */
      hidden?: boolean;
    }
  }

  interface ZoteroPane {
    /**
     * Second arg is historically `inLibraryRoot?: boolean`; Zotero 7+ also
     * accepts `{ noTabSwitch?: boolean }` so custom tabs stay put.
     */
    selectItem(
      itemID: number,
      inLibraryRootOrOptions?: boolean | { noTabSwitch?: boolean },
    ): undefined | boolean | Promise<boolean>;

    /** `location` is optional — omit to open at the last-read position. */
    viewPDF(
      itemID: number,
      location?: _ZoteroTypes.Reader.Location,
    ): Promise<void>;
  }
}
