import { useAtomValue } from "jotai";
import { getSelectedCollection } from "../../utils/zotero";
import { atomFromExternal } from "./jotaiExternal";

export const selectedCollectionIdAtom = atomFromExternal({
  getSnapshot: () => getSelectedCollection()?.id || null,
  subscribe: (onStoreChange) => {
    const notifierCallback = {
      notify: async (
        _event: string,
        type: string,
        _ids: number[] | string[],
        _extraData: { [key: string]: any },
      ) => {
        if (type === "collection" || type === "tab") {
          onStoreChange();
        }
      },
    };

    const notifierID = Zotero.Notifier.registerObserver(notifierCallback, [
      "collection",
      "tab",
    ]);

    const intervalID = setInterval(() => {
      onStoreChange();
    }, 200);

    return () => {
      clearInterval(intervalID);
      Zotero.Notifier.unregisterObserver(notifierID);
    };
  },
});

export function useSelectedCollectionId(): number | null {
  return useAtomValue(selectedCollectionIdAtom);
}
