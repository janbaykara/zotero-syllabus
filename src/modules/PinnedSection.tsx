// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h, Fragment } from "preact";
import type { JSX } from "preact";
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
import {
  openCollectionSyllabusAtClass,
  openCollectionSyllabusPage,
} from "./ClassReadingBlock";
import { SyllabusManager } from "./syllabus";
import { ProseText } from "./ProseText";
import {
  getItemCreatorLine,
  getItemTitle,
  openItemBestAttachment,
} from "../utils/items";
import { getCachedItem } from "../utils/cache";
import { libraryDisplayName } from "../utils/zotero";
import { getString } from "../utils/locale";
import { TabManager } from "../utils/tabManager";
import type { ItemDensity } from "./react-zotero-sync/itemDensity";
import type { GalleryLayout } from "./galleryLayout";
import {
  READING_TILE_GAP,
  readingContentWidthClass,
  readingTileWidthCss,
} from "./galleryLayout";
import {
  ReadingItemsLayout,
  readingContextLabel,
  type ReadingLayoutRow,
} from "./readingItemsLayout";
import { GalleryTile } from "./GalleryPage";
import { GalleryCover } from "./GalleryCover";
import { openZoteroItemContextMenu } from "../utils/itemContextMenu";
import { openZoteroCollectionContextMenu } from "../utils/collectionContextMenu";
import { setLibraryViewMode } from "./explorerConfig";
import { useScheduleStickyTop } from "./scheduleSticky";

function itemHasViewableAttachment(item: Zotero.Item): boolean {
  return item.getAttachments().some((attId) => {
    const att = getCachedItem(attId);
    return !!(att && att.isAttachment());
  });
}

/** Open Reader when possible; otherwise select the item in My Library Table. */
function openPinnedItem(item: Zotero.Item): void {
  if (itemHasViewableAttachment(item)) {
    openItemBestAttachment(item);
    return;
  }
  void showPinnedItemInLibraryTable(item);
}

/**
 * Select a pinned item in My Library Table (Home → Table) so the row is visible.
 */
async function showPinnedItemInLibraryTable(item: Zotero.Item): Promise<void> {
  try {
    setLibraryViewMode(item.libraryID, "collection");
    TabManager.selectLibraryTab();
    const pane = ztoolkit.getGlobal("ZoteroPane");
    const collectionsView = pane?.collectionsView as
      | {
          selectLibrary?: (libraryID: number) => Promise<unknown> | unknown;
        }
      | null
      | undefined;
    if (
      collectionsView &&
      typeof collectionsView.selectLibrary === "function"
    ) {
      await collectionsView.selectLibrary(item.libraryID);
    }
    await SyllabusManager.applyCollectionViewModeFromToolbar("collection");
    if (!item.deleted && pane && typeof pane.selectItem === "function") {
      await pane.selectItem(item.id, { noTabSwitch: true });
    }
  } catch (error) {
    ztoolkit.log("Error showing pinned item in library table:", error);
  }
}

function openNextUpInSyllabus(reading: NextUpReading): void {
  openCollectionSyllabusAtClass(
    reading.collection.id,
    reading.classNumber,
    reading.item.id,
  );
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
  /** Cover mode renders pinned collections as stacks — omit them from item tiles. */
  const coverMode = layout === "cover";

  const pinnedLayoutRows = useMemo((): ReadingLayoutRow[] => {
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
    return rows;
  }, [pinnedItems, showUnpinCheckboxes, onChanged]);

  const itemLayoutRows = useMemo((): ReadingLayoutRow[] => {
    if (coverMode) {
      return pinnedLayoutRows;
    }
    const rows = [...pinnedLayoutRows];
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
  }, [coverMode, pinnedLayoutRows, nextUp, showUnpinCheckboxes, onChanged]);

  if (pinnedItems.length === 0 && nextUp.length === 0) {
    return null;
  }

  const tileStyle = {
    "--reading-tile-width": readingTileWidthCss(),
    "--reading-tile-gap": READING_TILE_GAP,
  } as JSX.CSSProperties;

  const coverBody =
    coverMode && embedded ? (
      <div className="syllabus-explorer-cover-rail">
        {pinnedItems.map((item) => (
          <GalleryTile
            key={`pinned-item-${item.id}`}
            item={item}
            selected={false}
            onClick={(clicked) => {
              openPinnedItem(clicked);
            }}
            onDoubleClick={openPinnedItem}
            onContextMenu={(clicked, e) => {
              void openZoteroItemContextMenu(clicked, e);
            }}
          />
        ))}
        {nextUp.map((reading) => (
          <NextUpCoverStack
            key={`pinned-next-${reading.collection.id}`}
            reading={reading}
            onChanged={onChanged}
            compact
          />
        ))}
      </div>
    ) : coverMode ? (
      <div className="space-y-6">
        {pinnedLayoutRows.length > 0 ? (
          <ReadingItemsLayout
            layout="cover"
            density={density}
            isLocked
            template="strip"
            showPriority={false}
            rows={pinnedLayoutRows}
            onItemClick={(item) => {
              openPinnedItem(item);
            }}
          />
        ) : null}
        {nextUp.length > 0 ? (
          <div className={readingContentWidthClass("cover", "narrow")}>
            <div
              className="syllabus-gallery-grid is-narrow syllabus-pinned-collection-covers"
              style={
                {
                  ...tileStyle,
                  "--reading-pack-count": Math.min(nextUp.length, 4),
                } as JSX.CSSProperties
              }
            >
              {nextUp.map((reading) => (
                <NextUpCoverStack
                  key={`pinned-next-${reading.collection.id}`}
                  reading={reading}
                  onChanged={onChanged}
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    ) : null;

  return (
    <div
      className={embedded ? undefined : "mt-6 mb-10"}
      data-tour={embedded ? "explorer-shelf-pinned" : "reading-schedule-pinned"}
    >
      {embedded ? null : <PinnedStickyHeading />}

      <div
        className={
          embedded
            ? undefined
            : layout === "card"
              ? "container-padded"
              : "w-full min-w-0 max-w-full"
        }
      >
        {coverBody}
        {!coverMode && layout !== "card" ? (
          <ReadingItemsLayout
            layout={layout}
            density={density}
            isLocked
            template="strip"
            showPriority={false}
            coverRail={false}
            rows={itemLayoutRows}
            onItemClick={(item, collectionId) => {
              const reading = nextUp.find(
                (entry) =>
                  entry.item.id === item.id &&
                  entry.collection.id === collectionId,
              );
              if (reading) {
                openNextUpInSyllabus(reading);
                return;
              }
              openPinnedItem(item);
            }}
          />
        ) : null}
        {!coverMode && layout === "card" ? (
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
        ) : null}
      </div>
    </div>
  );
}

function NextUpCoverStack({
  reading,
  onChanged,
  compact = false,
}: {
  reading: NextUpReading;
  onChanged: () => void;
  /** Explorer cover rail: slightly tighter heading. */
  compact?: boolean;
}) {
  const { singularCapitalized } = SyllabusManager.getNomenclatureFormatted(
    reading.collection.id,
  );
  const stackItems =
    reading.unreadItems.length > 0
      ? reading.unreadItems.slice(0, 3)
      : [reading.item];

  const handleUnpin = async () => {
    await setPinnedSyllabus(reading.collection, false);
    onChanged();
  };

  const className = reading.classTitle
    ? reading.classTitle
    : getString("menu-class-label", {
        args: {
          nomenclature: singularCapitalized,
          number: reading.classNumber,
        },
      });

  const open = () => openNextUpInSyllabus(reading);

  return (
    <div
      className="syllabus-pinned-collection-cover group/pinned-collection relative min-w-0"
      onContextMenu={(e) => {
        void openZoteroCollectionContextMenu(reading.collection, e);
      }}
    >
      <button
        type="button"
        className="syllabus-pinned-collection-cover-hit border-0 bg-transparent p-0 cursor-pointer text-left w-full min-w-0"
        onClick={open}
      >
        <div
          className="syllabus-pinned-collection-stack"
          data-count={stackItems.length}
        >
          {stackItems.map((item, index) => (
            <div
              key={item.id}
              className="syllabus-pinned-collection-stack-layer"
              data-stack-index={index}
              style={{
                zIndex: stackItems.length - index,
                ["--stack-index" as string]: String(index),
              }}
            >
              <GalleryCover item={item} selected={false} visible />
            </div>
          ))}
        </div>
      </button>
      <div
        className={twMerge(
          "syllabus-class-reading-heading mt-2 min-w-0 flex flex-col gap-0.5",
          compact ? "text-sm leading-snug" : "text-base leading-snug",
        )}
      >
        <div className="flex items-center gap-0.5 min-w-0">
          <button
            type="button"
            className="font-semibold min-w-0 flex-1 truncate border-0 bg-transparent p-0 cursor-pointer text-left text-inherit"
            onClick={open}
          >
            {reading.collection.name}
          </button>
          <button
            type="button"
            className="syllabus-pinned-collection-unpin shrink-0 text-secondary hover:text-primary hover:bg-quinary rounded p-1 cursor-pointer border-0 bg-transparent opacity-0 group-hover/pinned-collection:opacity-100 focus-visible:opacity-100"
            title={getString("pinned-unpin-syllabus")}
            aria-label={getString("pinned-unpin-syllabus")}
            onClick={(e) => {
              e.stopPropagation();
              void handleUnpin();
            }}
          >
            <PinOff size={16} />
          </button>
        </div>
        <button
          type="button"
          className="text-secondary min-w-0 truncate border-0 bg-transparent p-0 cursor-pointer text-left text-inherit"
          onClick={open}
        >
          {className}
        </button>
        {reading.progress.total > 0 ? (
          <button
            type="button"
            className="syllabus-pinned-collection-progress border-0 bg-transparent p-0 cursor-pointer text-left w-full min-w-0"
            title={getString("pinned-syllabus-progress", {
              args: {
                done: reading.progress.done,
                total: reading.progress.total,
              },
            })}
            onClick={open}
          >
            <div className="syllabus-pinned-collection-progress-track">
              <div
                className="syllabus-pinned-collection-progress-fill"
                style={{ width: `${reading.progress.percent}%` }}
              />
            </div>
            <span className="syllabus-pinned-collection-progress-pct">
              {reading.progress.percent}%
            </span>
          </button>
        ) : null}
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
            openPinnedItem(clicked);
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
              openPinnedItem(item);
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
        onClick={() => {
          openNextUpInSyllabus(reading);
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
    <div className="syllabus-schedule-sticky-week mb-4" style={top}>
      <div className="container-padded text-3xl text-tertiary flex items-center gap-2">
        <Pin size={22} className="shrink-0" aria-hidden="true" />
        {getString("pinned-section-heading")}
      </div>
    </div>
  );
}
