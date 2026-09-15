// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h, Fragment } from "preact";
import { useCallback, useEffect, useState } from "preact/hooks";
import { twMerge } from "tailwind-merge";
import { BookOpen, Pin, PinOff } from "lucide-preact";
import {
  listNextUpReadings,
  listPinnedItems,
  openIntentionNote,
  readIntentionText,
  setPinnedSyllabus,
  subscribePinnedChanges,
  unpinItemWithNotePrompt,
  type NextUpReading,
} from "./pinned";
import { SyllabusItemCard } from "./SyllabusItemCard";
import {
  openCollectionSyllabusPage,
  selectItemInCollection,
} from "./ClassReadingBlock";
import { SyllabusManager } from "./syllabus";
import { ProseText } from "./ProseText";
import { getItemCreatorLine, getItemTitle } from "../utils/items";
import { libraryDisplayName } from "../utils/zotero";
import { getString } from "../utils/locale";
import type { ItemDensity } from "./react-zotero-sync/itemDensity";

export function usePinnedScheduleData(libraryID?: number) {
  const [pinnedItems, setPinnedItems] = useState<Zotero.Item[]>([]);
  const [nextUp, setNextUp] = useState<NextUpReading[]>([]);
  const [tick, setTick] = useState(0);

  const reload = useCallback(() => {
    void (async () => {
      const [items, readings] = await Promise.all([
        listPinnedItems(libraryID),
        listNextUpReadings(libraryID),
      ]);
      setPinnedItems(items);
      setNextUp(readings);
    })();
  }, [libraryID]);

  useEffect(() => {
    reload();
  }, [reload, tick]);

  useEffect(() => {
    return subscribePinnedChanges(() => setTick((n) => n + 1));
  }, []);

  useEffect(() => {
    const id = Zotero.Notifier.registerObserver(
      {
        notify(event: string, type: string) {
          if (type === "item" && (event === "modify" || event === "add")) {
            setTick((n) => n + 1);
          }
        },
      },
      ["item"],
      "syllabus-pinned-schedule",
    );
    return () => {
      Zotero.Notifier.unregisterObserver(id);
    };
  }, []);

  return { pinnedItems, nextUp, reload };
}

export function PinnedSection({
  density,
  showLibraryName,
  pinnedItems,
  nextUp,
  onChanged,
  embedded = false,
}: {
  density: ItemDensity;
  showLibraryName: boolean;
  pinnedItems: Zotero.Item[];
  nextUp: NextUpReading[];
  onChanged: () => void;
  /** When true, omit section chrome (Homepage shelf supplies its own header). */
  embedded?: boolean;
}) {
  if (pinnedItems.length === 0 && nextUp.length === 0) {
    return null;
  }

  return (
    <div
      className={embedded ? undefined : "container-padded mt-6 mb-2"}
      data-tour={
        embedded ? "explorer-shelf-pinned" : "reading-schedule-pinned"
      }
    >
      {embedded ? null : (
        <div className="text-3xl text-tertiary mb-4 flex items-center gap-2">
          <Pin size={22} className="shrink-0" aria-hidden="true" />
          {getString("pinned-section-heading")}
        </div>
      )}

      <div className="space-y-6">
        {pinnedItems.map((item) => (
          <PinnedItemRow
            key={item.id}
            item={item}
            density={density}
            showLibraryName={showLibraryName}
            onChanged={onChanged}
          />
        ))}

        {nextUp.map((reading) => (
          <NextUpRow
            key={`${reading.collection.id}-${reading.assignment.id}`}
            reading={reading}
            density={density}
            showLibraryName={showLibraryName}
            onChanged={onChanged}
          />
        ))}
      </div>
    </div>
  );
}

function PinnedItemRow({
  item,
  density,
  showLibraryName,
  onChanged,
}: {
  item: Zotero.Item;
  density: ItemDensity;
  showLibraryName: boolean;
  onChanged: () => void;
}) {
  const intention = readIntentionText(item);
  const collectionIds = item.getCollections();
  const collectionId = collectionIds[0] ?? 0;

  const handleUnpin = async () => {
    const ok = await unpinItemWithNotePrompt(item);
    if (ok) {
      onChanged();
    }
  };

  return (
    <div className="relative group/pinned">
      <div className="flex flex-row items-start gap-2 justify-between mb-1">
        <div className="text-secondary text-sm">
          {getString("pinned-item-label")}
          {showLibraryName ? (
            <span className="text-tertiary">
              {" "}
              · {libraryDisplayName(item.libraryID)}
            </span>
          ) : null}
        </div>
        <div className="flex flex-row gap-1 shrink-0">
          <button
            type="button"
            className="text-secondary hover:text-primary hover:bg-quinary rounded p-1 cursor-pointer border-0 bg-transparent"
            title={getString("pinned-edit-intention")}
            aria-label={getString("pinned-edit-intention")}
            onClick={() => void openIntentionNote(item)}
          >
            <BookOpen size={16} />
          </button>
          <button
            type="button"
            className="text-secondary hover:text-primary hover:bg-quinary rounded p-1 cursor-pointer border-0 bg-transparent"
            title={getString("pinned-unpin-item")}
            aria-label={getString("pinned-unpin-item")}
            onClick={() => void handleUnpin()}
          >
            <PinOff size={16} />
          </button>
        </div>
      </div>
      {collectionId ? (
        <SyllabusItemCard
          item={item}
          collectionId={collectionId}
          assignment={{
            id: `pinned-${item.id}`,
            classInstruction: intention || undefined,
          }}
          density={density}
          slim
          hideHoverActions
          onClick={(clicked) => {
            selectItemInCollection(clicked, collectionId);
          }}
        />
      ) : (
        <button
          type="button"
          className={twMerge(
            "w-full text-left border-0 bg-transparent cursor-pointer p-0",
            density === "row" ? "text-base" : "text-lg",
          )}
          onClick={() => {
            try {
              ztoolkit.getGlobal("ZoteroPane").selectItem(item.id);
            } catch (error) {
              ztoolkit.log("Error selecting pinned item:", error);
            }
          }}
        >
          <div className="font-medium">
            {getItemTitle(item) || getString("untitled")}
          </div>
          <div className="text-secondary text-sm">
            {getItemCreatorLine(item)}
          </div>
          {intention ? (
            <ProseText text={intention} className="text-secondary mt-1" />
          ) : null}
        </button>
      )}
    </div>
  );
}

function NextUpRow({
  reading,
  density,
  showLibraryName,
  onChanged,
}: {
  reading: NextUpReading;
  density: ItemDensity;
  showLibraryName: boolean;
  onChanged: () => void;
}) {
  const handleUnpinSyllabus = async () => {
    await setPinnedSyllabus(reading.collection, false);
    onChanged();
  };

  return (
    <div className="relative">
      <div className="flex flex-row items-start gap-2 justify-between mb-1">
        <button
          type="button"
          className="text-secondary text-sm text-left border-0 bg-transparent cursor-pointer p-0 hover:text-primary"
          onClick={() => openCollectionSyllabusPage(reading.collection.id)}
        >
          {getString("pinned-next-up-from", {
            args: { name: reading.collection.name },
          })}
          {showLibraryName ? (
            <span className="text-tertiary">
              {" "}
              · {libraryDisplayName(reading.libraryID)}
            </span>
          ) : null}
        </button>
        <button
          type="button"
          className="text-secondary hover:text-primary hover:bg-quinary rounded p-1 cursor-pointer border-0 bg-transparent shrink-0"
          title={getString("pinned-unpin-syllabus")}
          aria-label={getString("pinned-unpin-syllabus")}
          onClick={() => void handleUnpinSyllabus()}
        >
          <PinOff size={16} />
        </button>
      </div>
      <SyllabusItemCard
        item={reading.item}
        collectionId={reading.collection.id}
        classNumber={reading.classNumber}
        assignment={reading.assignment}
        density={density}
        slim
        hideHoverActions
        onClick={(item) => {
          selectItemInCollection(item, reading.collection.id);
        }}
      />
      {reading.classTitle ? (
        <div className="text-tertiary text-sm mt-1">
          {SyllabusManager.getNomenclatureFormatted(reading.collection.id)
            .singularCapitalized}{" "}
          {reading.classNumber}
          {reading.classTitle ? `: ${reading.classTitle}` : ""}
        </div>
      ) : null}
    </div>
  );
}
