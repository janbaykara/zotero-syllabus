import { useCallback } from "preact/hooks";
import { useAtomValue } from "jotai";
import { SyllabusManager, GetByLibraryAndKeyArgs } from "../syllabus";
import { atomFamilyFromExternal } from "./jotaiExternal";

function collectionTitleKey(
  collectionId: number | GetByLibraryAndKeyArgs,
): string {
  if (typeof collectionId === "number") {
    return String(collectionId);
  }
  return `${collectionId[0]}:${collectionId[1]}`;
}

export const collectionTitleAtomFamily = atomFamilyFromExternal(
  (collectionId: number | GetByLibraryAndKeyArgs) => ({
    getSnapshot: () => {
      const collection =
        SyllabusManager.getCollectionFromIdentifier(collectionId);
      return collection ? collection.name : "";
    },
    subscribe: (onStoreChange: () => void) => {
      const observer = {
        notify(
          event: string,
          type: string,
          ids: (number | string)[],
          _extraData: any,
        ) {
          const collection =
            SyllabusManager.getCollectionFromIdentifier(collectionId);
          if (
            collection &&
            type === "collection" &&
            ids.includes(collection.id) &&
            (event === "modify" || event === "refresh")
          ) {
            onStoreChange();
          }
        },
      };

      const notifierId = Zotero.Notifier.registerObserver(observer, [
        "collection",
      ]);
      return () => {
        Zotero.Notifier.unregisterObserver(notifierId);
      };
    },
  }),
  (a, b) => collectionTitleKey(a) === collectionTitleKey(b),
);

export function useZoteroCollectionTitle(
  collectionId: number | GetByLibraryAndKeyArgs,
) {
  const titleFromZotero = useAtomValue(collectionTitleAtomFamily(collectionId));

  const setTitle = useCallback(
    (title: string) => {
      const collection =
        SyllabusManager.getCollectionFromIdentifier(collectionId);
      if (collection) {
        SyllabusManager.setCollectionTitle(collection.id, title, "page");
      }
    },
    [collectionId],
  );

  return [titleFromZotero, setTitle] as const;
}
