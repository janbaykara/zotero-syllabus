import { useMemo } from "preact/hooks";
import { atom, useAtomValue } from "jotai";
import { getCachedItem, isObjectLifecycleEvent } from "../../utils/cache";
import { atomFamilyFromExternal } from "./jotaiExternal";

const itemVersions = new Map<number, number>();
const emptyItemVersionAtom = atom(0);

export const itemVersionAtomFamily = atomFamilyFromExternal(
  (itemId: number) => ({
    getSnapshot: () => itemVersions.get(itemId) ?? 0,
    subscribe: (onStoreChange: () => void) => {
      const observer = {
        notify(
          event: string,
          type: string,
          ids: (number | string)[],
          _extraData: any,
        ) {
          if (
            type === "item" &&
            ids.includes(itemId) &&
            isObjectLifecycleEvent(event)
          ) {
            itemVersions.set(itemId, (itemVersions.get(itemId) ?? 0) + 1);
            onStoreChange();
          }
        },
      };

      const notifierID = Zotero.Notifier.registerObserver(observer, ["item"]);
      return () => {
        Zotero.Notifier.unregisterObserver(notifierID);
      };
    },
  }),
);

export function useZoteroItem(itemId: number | null) {
  const version = useAtomValue(
    itemId && itemId > 0
      ? itemVersionAtomFamily(itemId)
      : emptyItemVersionAtom,
  );

  const item = useMemo(() => {
    if (!itemId) {
      return null;
    }
    return getCachedItem(itemId);
  }, [itemId, version]);

  return { item, version: itemId ? version : 0 } as {
    item: Zotero.Item | null;
    version: number;
  };
}
