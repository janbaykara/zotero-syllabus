// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h, Fragment } from "preact";
import { useCallback, useEffect, useMemo, useState } from "preact/hooks";
import { twMerge } from "tailwind-merge";
import { BookOpen, Pin, PinOff } from "lucide-preact";
import {
  listNextUpReadings,
  listPinnedItems,
  openIntentionNote,
  readIntentionText,
  setPinnedSyllabus,
  subscribePinnedChanges,
  confirmUnpinPinnedItem,
  confirmUnpinPinnedSyllabus,
  unpinItemWithNotePrompt,
  type NextUpReading,
} from "./pinned";
import { SyllabusItemCard } from "./SyllabusItemCard";
import { openCollectionSyllabusPage } from "./ClassReadingBlock";
import { SyllabusManager } from "./syllabus";
import { ProseText } from "./ProseText";
import { getItemCreatorLine, getItemTitle } from "../utils/items";
import { libraryDisplayName } from "../utils/zotero";
import { getString } from "../utils/locale";
import type { ItemDensity } from "./react-zotero-sync/itemDensity";
import type { GalleryLayout } from "./galleryLayout";
import {
  ReadingItemsLayout,
  readingContextLabel,
  type ReadingLayoutRow,
} from "./readingItemsLayout";
import { useScheduleStickyTop } from "./scheduleSticky";

function selectPinnedItem(item: Zotero.Item): void {
  try {
    ztoolkit.getGlobal("ZoteroPane").selectItem(item.id);
  } catch (error) {
    ztoolkit.log("Error selecting pinned item:", error);
  }
}

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
  layout = "card",
  showLibraryName,
  pinnedItems,
  nextUp,
  onChanged,
  embedded = false,
  showUnpinCheckboxes = false,
}: {
  density: ItemDensity;
  layout?: GalleryLayout;
  showLibraryName: boolean;
  pinnedItems: Zotero.Item[];
  nextUp: NextUpReading[];
  onChanged: () => void;
  /** When true, omit section chrome (Homepage shelf supplies its own header). */
  embedded?: boolean;
  /** Reading Schedule: checkboxes that confirm and unpin. */
  showUnpinCheckboxes?: boolean;
}) {
  const layoutRows = useMemo((): ReadingLayoutRow[] => {
    const rows: ReadingLayoutRow[] = [];
    for (const item of pinnedItems) {
      const collectionIds = item.getCollections();
      const collectionId = collectionIds[0] ?? 0;
      const intention = readIntentionText(item);
      rows.push({
        key: `pinned-item-${item.id}`,
        item,
        collectionId,
        assignment: {
          id: `pinned-${item.id}`,
          classInstruction: intention || undefined,
        },
        slim: true,
        onReaderCheck: showUnpinCheckboxes
          ? async () => {
              const ok = await confirmUnpinPinnedItem(item);
              if (ok) {
                onChanged();
              }
            }
          : undefined,
      });
    }
    for (const reading of nextUp) {
      rows.push({
        key: `pinned-next-${reading.collection.id}-${reading.assignment.id}`,
        item: reading.item,
        collectionId: reading.collection.id,
        assignment: reading.assignment,
        classNumber: reading.classNumber,
        slim: true,
        contextLabel: readingContextLabel({
          collectionId: reading.collection.id,
          classNumber: reading.classNumber,
          classTitle: reading.classTitle,
          collectionName: reading.collection.name,
        }),
        onReaderCheck: showUnpinCheckboxes
          ? async () => {
              const ok = await confirmUnpinPinnedSyllabus(reading.collection);
              if (ok) {
                onChanged();
              }
            }
          : undefined,
      });
    }
    return rows;
  }, [pinnedItems, nextUp, showUnpinCheckboxes, onChanged]);

  if (pinnedItems.length === 0 && nextUp.length === 0) {
    return null;
  }

  return (
    <div
      className={embedded ? undefined : "mt-6 mb-2"}
      data-tour={embedded ? "explorer-shelf-pinned" : "reading-schedule-pinned"}
    >
      {embedded ? null : (
        <PinnedStickyHeading />
      )}

      <div
        className={
          embedded
            ? undefined
            : layout === "card"
              ? "container-padded"
              : "w-full min-w-0 max-w-full"
        }
      >
        {layout !== "card" ? (
          <ReadingItemsLayout
            layout={layout}
            density={density}
            isLocked
            template="strip"
            showPriority={false}
            coverRail={embedded && layout === "cover"}
            rows={layoutRows}
            onItemClick={(item) => {
              selectPinnedItem(item);
            }}
          />
        ) : (
          <div className="space-y-6">
            {pinnedItems.map((item) => (
              <PinnedItemRow
                key={item.id}
                item={item}
                density={density}
                showLibraryName={showLibraryName}
                showUnpinCheckbox={showUnpinCheckboxes}
                onChanged={onChanged}
              />
            ))}

            {nextUp.map((reading) => (
              <NextUpRow
                key={`${reading.collection.id}-${reading.assignment.id}`}
                reading={reading}
                density={density}
                showLibraryName={showLibraryName}
                showUnpinCheckbox={showUnpinCheckboxes}
                onChanged={onChanged}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PinnedItemRow({
  item,
  density,
  showLibraryName,
  showUnpinCheckbox,
  onChanged,
}: {
  item: Zotero.Item;
  density: ItemDensity;
  showLibraryName: boolean;
  showUnpinCheckbox: boolean;
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

  const handleReaderCheck = async () => {
    const ok = await confirmUnpinPinnedItem(item);
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
          readerMode={showUnpinCheckbox}
          onReaderCheck={showUnpinCheckbox ? handleReaderCheck : undefined}
          onClick={(clicked) => {
            selectPinnedItem(clicked);
          }}
        />
      ) : (
        <div className="relative">
          {showUnpinCheckbox ? (
            <input
              type="checkbox"
              checked={false}
              className="absolute right-full mr-1 w-4 h-4 cursor-pointer shrink-0"
              style={{ top: "0.35rem" }}
              title={getString("pinned-done-unpin-title")}
              aria-label={getString("pinned-done-unpin-title")}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => {
                e.currentTarget.checked = false;
                void handleReaderCheck();
              }}
            />
          ) : null}
          <button
            type="button"
            className={twMerge(
              "w-full text-left border-0 bg-transparent cursor-pointer p-0",
              density === "row" ? "text-base" : "text-lg",
            )}
            onClick={() => {
              selectPinnedItem(item);
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
        </div>
      )}
    </div>
  );
}

function NextUpRow({
  reading,
  density,
  showLibraryName,
  showUnpinCheckbox,
  onChanged,
}: {
  reading: NextUpReading;
  density: ItemDensity;
  showLibraryName: boolean;
  showUnpinCheckbox: boolean;
  onChanged: () => void;
}) {
  const handleUnpinSyllabus = async () => {
    await setPinnedSyllabus(reading.collection, false);
    onChanged();
  };

  const handleReaderCheck = async () => {
    const ok = await confirmUnpinPinnedSyllabus(reading.collection);
    if (ok) {
      onChanged();
    }
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
        readerMode={showUnpinCheckbox}
        onReaderCheck={showUnpinCheckbox ? handleReaderCheck : undefined}
        onClick={(item) => {
          selectPinnedItem(item);
        }}
      />
      {reading.classTitle ? (
        <div className="text-tertiary text-sm mt-1">
          {
            SyllabusManager.getNomenclatureFormatted(reading.collection.id)
              .singularCapitalized
          }{" "}
          {reading.classNumber}
          {reading.classTitle ? `: ${reading.classTitle}` : ""}
        </div>
      ) : null}
    </div>
  );
}

function PinnedStickyHeading() {
  const top = useScheduleStickyTop("week");
  return (
    <div
      className="syllabus-schedule-sticky-week mb-4"
      style={top}
    >
      <div className="container-padded text-3xl text-tertiary flex items-center gap-2">
        <Pin size={22} className="shrink-0" aria-hidden="true" />
        {getString("pinned-section-heading")}
      </div>
    </div>
  );
}
