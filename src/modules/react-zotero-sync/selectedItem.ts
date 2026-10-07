import { useAtomValue } from "jotai";
import { isItemRemovalEvent } from "../../utils/cache";
import { isSyllabusAssignableItem } from "../../utils/items";
import { atomFromExternal } from "./jotaiExternal";

function arraysEqual(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((id, i) => id === b[i]);
}

function readSelectedItemIdsFromPane(): number[] {
  const pane = ztoolkit.getGlobal("ZoteroPane");
  const selectedItems = pane?.getSelectedItems() || [];
  return selectedItems
    .filter((item) => isSyllabusAssignableItem(item))
    .map((item) => item.id);
}

/** Module cache so delete events can filter before the pane catches up. */
let selectedItemIds: number[] = [];

function syncFromPane(): boolean {
  const next = readSelectedItemIdsFromPane();
  if (arraysEqual(selectedItemIds, next)) {
    return false;
  }
  selectedItemIds = next;
  return true;
}

export const selectedItemIdsAtom = atomFromExternal({
  // Object.is so modify events can force refresh via selectedItemIds.slice().
  getSnapshot: () => selectedItemIds,
  subscribe: (onStoreChange) => {
    syncFromPane();

    const notifierCallback = {
      notify: async (
        event: string,
        type: string,
        ids: number[] | string[],
        _extraData: { [key: string]: any },
      ) => {
        if (type === "item") {
          const itemIdsArray = ids as number[];
          const hasSelectedItem = selectedItemIds.some((id) =>
            itemIdsArray.includes(id),
          );

          if (
            hasSelectedItem &&
            (event === "modify" || isItemRemovalEvent(event))
          ) {
            if (event === "modify") {
              // Same ids, but force subscribers that key off this atom to refresh.
              selectedItemIds = selectedItemIds.slice();
              onStoreChange();
            } else {
              selectedItemIds = selectedItemIds.filter(
                (id) => !itemIdsArray.includes(id),
              );
              onStoreChange();
            }
          } else if (syncFromPane()) {
            onStoreChange();
          }
        } else if (type === "tab") {
          if (syncFromPane()) {
            onStoreChange();
          }
        }
      },
    };

    const notifierID = Zotero.Notifier.registerObserver(notifierCallback, [
      "item",
      "tab",
    ]);

    const intervalID = setInterval(() => {
      if (syncFromPane()) {
        onStoreChange();
      }
    }, 200);

    return () => {
      clearInterval(intervalID);
      Zotero.Notifier.unregisterObserver(notifierID);
    };
  },
});

export function useZoteroSelectedItemIds(): number[] | null {
  const itemIds = useAtomValue(selectedItemIdsAtom) ?? [];
  return itemIds.length > 0 ? itemIds : null;
}
