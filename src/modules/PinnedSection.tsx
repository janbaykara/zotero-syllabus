// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h, Fragment } from "preact";
import type { JSX } from "preact";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "preact/hooks";
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
  applyPinnedShelfOrder,
  getPinnedShelfOrder,
  movePinnedShelfEntry,
  pinnedShelfEntryKey,
  resolvePinnedOrderLibraryID,
  setPinnedShelfOrder,
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
import { libraryDisplayName, selectZoteroCollection } from "../utils/zotero";
import { getString } from "../utils/locale";
import { TabManager } from "../utils/tabManager";
import type { ItemDensity } from "./react-zotero-sync/itemDensity";
import type { GalleryLayout } from "./galleryLayout";
import type { MagazinePacking } from "./magazinePacking";
import {
  ReadingItemsLayout,
  readingContextLabel,
  useReadingItemsPack,
  type ReadingLayoutRow,
} from "./readingItemsLayout";
import {
  READING_TILE_GAP,
  readingContentWidthClass,
  readingItemsPackClass,
  readingTileWidthCss,
} from "./galleryLayout";
import { GalleryTile, GalleryGroupIcon } from "./GalleryPage";
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

/** Select the item so the item pane / sidebar updates (stay on current view). */
function selectPinnedItem(item: Zotero.Item): void {
  try {
    const pane = ztoolkit.getGlobal("ZoteroPane");
    if (!item.deleted && pane && typeof pane.selectItem === "function") {
      void pane.selectItem(item.id, { noTabSwitch: true });
    }
  } catch (error) {
    ztoolkit.log("Error selecting pinned item:", error);
  }
}

/** Open Reader when possible; otherwise select the item in My Library Table. */
function openPinnedItem(item: Zotero.Item): void {
  if (itemHasViewableAttachment(item)) {
    openItemBestAttachment(item);
    return;
  }
  void showPinnedItemInLibraryTable(item);
}

/** Home shelf: click → sidebar; double-click → reader. */
function activatePinnedItem(item: Zotero.Item, embedded: boolean): void {
  if (embedded) {
    selectPinnedItem(item);
    return;
  }
  openPinnedItem(item);
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

function openPinnedCollection(reading: NextUpReading): void {
  if (reading.isSyllabus) {
    if (reading.classNumber != null && reading.item) {
      openCollectionSyllabusAtClass(
        reading.collection.id,
        reading.classNumber,
        reading.item.id,
      );
      return;
    }
    openCollectionSyllabusPage(reading.collection.id);
    return;
  }
  try {
    if (!selectZoteroCollection(reading.collection.id)) {
      return;
    }
    TabManager.selectLibraryTab();
  } catch (error) {
    ztoolkit.log("Error opening pinned collection:", error);
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
      const orderLibraryID = resolvePinnedOrderLibraryID(
        libraryID,
        items,
        readings,
      );
      const order =
        orderLibraryID != null ? getPinnedShelfOrder(orderLibraryID) : [];
      setPinnedItems(
        applyPinnedShelfOrder(
          items,
          (item) => pinnedShelfEntryKey("item", item.key),
          order,
        ),
      );
      setNextUp(
        applyPinnedShelfOrder(
          readings,
          (reading) =>
            pinnedShelfEntryKey("collection", reading.collection.key),
          order,
        ),
      );
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
  magazinePacking = "packed",
  showLibraryName,
  pinnedItems,
  nextUp,
  onChanged,
  embedded = false,
  showUnpinCheckboxes = false,
  libraryID,
}: {
  density: ItemDensity;
  layout?: GalleryLayout;
  magazinePacking?: MagazinePacking;
  showLibraryName: boolean;
  pinnedItems: Zotero.Item[];
  nextUp: NextUpReading[];
  onChanged: () => void;
  /** When true, omit section chrome (Homepage shelf supplies its own header). */
  embedded?: boolean;
  /** Reading Schedule: checkboxes that confirm and unpin. */
  showUnpinCheckboxes?: boolean;
  /** Library for persisted shelf order (Home / Reading Schedule). */
  libraryID?: number;
}) {
  /** Cover mode renders pinned collections as stacks — omit them from item tiles. */
  const coverMode = layout === "cover";

  const orderLibraryID = useMemo(
    () => resolvePinnedOrderLibraryID(libraryID, pinnedItems, nextUp),
    [libraryID, pinnedItems, nextUp],
  );

  /** Instant UI order; avoids a full pinned-item search reload on every drop. */
  const [orderOverride, setOrderOverride] = useState<string[] | null>(null);
  const membershipKey = useMemo(
    () =>
      [
        ...pinnedItems.map((item) => pinnedShelfEntryKey("item", item.key)),
        ...nextUp.map((reading) =>
          pinnedShelfEntryKey("collection", reading.collection.key),
        ),
      ]
        .sort()
        .join("|"),
    [pinnedItems, nextUp],
  );

  useEffect(() => {
    setOrderOverride(null);
  }, [membershipKey]);

  type CoverEntry =
    | { kind: "item"; key: string; item: Zotero.Item }
    | { kind: "collection"; key: string; reading: NextUpReading };

  const coverEntries = useMemo((): CoverEntry[] => {
    const entries: CoverEntry[] = [
      ...pinnedItems.map((item) => ({
        kind: "item" as const,
        key: pinnedShelfEntryKey("item", item.key),
        item,
      })),
      ...nextUp.map((reading) => ({
        kind: "collection" as const,
        key: pinnedShelfEntryKey("collection", reading.collection.key),
        reading,
      })),
    ];
    const order =
      orderOverride ??
      (orderLibraryID != null ? getPinnedShelfOrder(orderLibraryID) : []);
    if (order.length === 0) {
      return entries;
    }
    return applyPinnedShelfOrder(entries, (entry) => entry.key, order);
  }, [pinnedItems, nextUp, orderLibraryID, orderOverride]);

  const commitShelfOrder = useCallback(
    (keys: string[]) => {
      setOrderOverride(keys);
      if (orderLibraryID != null) {
        setPinnedShelfOrder(orderLibraryID, keys);
      }
    },
    [orderLibraryID],
  );

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
      if (!reading.isSyllabus || !reading.item || !reading.assignment) {
        continue;
      }
      rows.push({
        key: `pinned-next-${reading.collection.id}-${reading.assignment.id}`,
        item: reading.item,
        collectionId: reading.collection.id,
        assignment: reading.assignment,
        classNumber: reading.classNumber ?? undefined,
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

  const coverTileCount = coverEntries.length;
  const { wrapRef: coverPackRef, pack: coverPack } = useReadingItemsPack(
    "cover",
    coverTileCount,
    coverMode && !embedded && coverTileCount > 0,
  );

  if (pinnedItems.length === 0 && nextUp.length === 0) {
    return null;
  }

  const tileStyle = {
    "--reading-tile-width": readingTileWidthCss(),
    "--reading-tile-gap": READING_TILE_GAP,
  } as JSX.CSSProperties;

  const coverBody = coverMode ? (
    embedded ? (
      <PinnedOrderedList
        entries={coverEntries}
        canReorder={orderLibraryID != null}
        onReorder={commitShelfOrder}
        axis="x"
        className="syllabus-explorer-cover-rail"
        tileClassName="syllabus-pinned-shelf-tile"
        renderEntry={(entry) =>
          entry.kind === "item" ? (
            <GalleryTile
              item={entry.item}
              selected={false}
              onClick={(clicked) => {
                activatePinnedItem(clicked, true);
              }}
              onDoubleClick={(clicked) => {
                openItemBestAttachment(clicked);
              }}
              onContextMenu={(clicked, e) => {
                void openZoteroItemContextMenu(clicked, e);
              }}
            />
          ) : (
            <NextUpCoverStack reading={entry.reading} onChanged={onChanged} />
          )
        }
      />
    ) : (
      <div
        ref={coverPackRef}
        className={readingContentWidthClass("cover", coverPack)}
      >
        <PinnedOrderedList
          entries={coverEntries}
          canReorder={orderLibraryID != null}
          onReorder={commitShelfOrder}
          axis="x"
          className={twMerge(
            "syllabus-gallery-grid syllabus-pinned-collection-covers",
            readingItemsPackClass(coverPack),
          )}
          style={
            {
              ...tileStyle,
              "--reading-pack-count": coverTileCount,
            } as JSX.CSSProperties
          }
          tileClassName="syllabus-pinned-shelf-tile"
          renderEntry={(entry) =>
            entry.kind === "item" ? (
              <GalleryTile
                item={entry.item}
                selected={false}
                chrome={{
                  collectionId: entry.item.getCollections()[0] ?? 0,
                  assignment: {
                    id: `pinned-${entry.item.id}`,
                    classInstruction:
                      readIntentionText(entry.item) || undefined,
                  },
                  showPriority: false,
                  onUnpin: showUnpinCheckboxes
                    ? async () => {
                        const ok = await confirmUnpinPinnedItem(entry.item);
                        if (ok) {
                          onChanged();
                        }
                      }
                    : undefined,
                }}
                onClick={(clicked) => {
                  openPinnedItem(clicked);
                }}
                onDoubleClick={(clicked) => {
                  openItemBestAttachment(clicked);
                }}
                onContextMenu={(clicked, e) => {
                  void openZoteroItemContextMenu(clicked, e);
                }}
              />
            ) : (
              <NextUpCoverStack reading={entry.reading} onChanged={onChanged} />
            )
          }
        />
      </div>
    )
  ) : null;

  const cardBody =
    !coverMode && layout === "card" ? (
      <PinnedOrderedList
        entries={coverEntries}
        canReorder={orderLibraryID != null}
        onReorder={commitShelfOrder}
        axis="y"
        className="space-y-6"
        tileClassName="syllabus-pinned-shelf-card"
        renderEntry={(entry) =>
          entry.kind === "item" ? (
            <PinnedItemRow
              item={entry.item}
              density={density}
              showLibraryName={showLibraryName}
              showUnpinCheckbox={showUnpinCheckboxes}
              onChanged={onChanged}
              selectOnClick={embedded}
            />
          ) : (
            <NextUpRow
              reading={entry.reading}
              density={density}
              showLibraryName={showLibraryName}
              showUnpinCheckbox={showUnpinCheckboxes}
              onChanged={onChanged}
            />
          )
        }
      />
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
            : layout === "card" || layout === "annotations"
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
            magazinePacking={magazinePacking}
            rows={itemLayoutRows}
            onItemClick={(item, collectionId) => {
              const reading = nextUp.find(
                (entry) =>
                  entry.item?.id === item.id &&
                  entry.collection.id === collectionId,
              );
              if (reading) {
                openPinnedCollection(reading);
                return;
              }
              activatePinnedItem(item, embedded);
            }}
          />
        ) : null}
        {cardBody}
      </div>
    </div>
  );
}

const PINNED_SHELF_DRAG_MIME = "application/x-syllabus-pinned-shelf";

type PinnedCoverEntry =
  | { kind: "item"; key: string; item: Zotero.Item }
  | { kind: "collection"; key: string; reading: NextUpReading };

function PinnedOrderedList({
  entries,
  canReorder,
  onReorder,
  axis,
  className,
  style,
  tileClassName,
  renderEntry,
}: {
  entries: PinnedCoverEntry[];
  canReorder: boolean;
  onReorder: (keys: string[]) => void;
  axis: "x" | "y";
  className?: string;
  style?: JSX.CSSProperties;
  tileClassName: string;
  renderEntry: (entry: PinnedCoverEntry) => JSX.Element;
}) {
  const [draggingKey, setDraggingKey] = useState<string | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const draggingKeyRef = useRef<string | null>(null);
  const dropIndexRef = useRef<number | null>(null);
  const suppressClickRef = useRef(false);

  const finishDrag = useCallback(() => {
    draggingKeyRef.current = null;
    dropIndexRef.current = null;
    setDraggingKey(null);
    setDropIndex(null);
  }, []);

  const dropIndexForTile = (
    index: number,
    clientX: number,
    clientY: number,
    tile: HTMLElement,
  ) => {
    const rect = tile.getBoundingClientRect();
    const after =
      axis === "x"
        ? clientX > rect.left + rect.width / 2
        : clientY > rect.top + rect.height / 2;
    return after ? index + 1 : index;
  };

  const updateDropIndex = (
    index: number,
    clientX: number,
    clientY: number,
    tile: HTMLElement,
  ) => {
    const next = dropIndexForTile(index, clientX, clientY, tile);
    dropIndexRef.current = next;
    setDropIndex((current) => (current === next ? current : next));
  };

  const commitReorder = (fromKey: string, toIndex: number) => {
    if (!canReorder) {
      return;
    }
    const from = entries.findIndex((entry) => entry.key === fromKey);
    if (from < 0) {
      return;
    }
    const next = movePinnedShelfEntry(entries, from, toIndex);
    const keys = next.map((entry) => entry.key);
    if (keys.join("\0") === entries.map((entry) => entry.key).join("\0")) {
      return;
    }
    onReorder(keys);
  };

  const allowReorder = canReorder && entries.length > 1;

  return (
    <div
      className={className}
      style={style}
      onDragOver={(event) => {
        if (!draggingKeyRef.current || !event.dataTransfer) {
          return;
        }
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
      }}
    >
      {entries.map((entry, index) => (
        <div
          key={entry.key}
          className={twMerge(
            tileClassName,
            draggingKey === entry.key && "is-dragging",
            dropIndex === index && "is-drop-before",
            dropIndex === entries.length &&
              index === entries.length - 1 &&
              "is-drop-after",
          )}
          draggable={allowReorder}
          title={
            allowReorder ? getString("explorer-configure-reorder") : undefined
          }
          onDragStart={(event) => {
            if (!allowReorder || !event.dataTransfer) {
              return;
            }
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData(PINNED_SHELF_DRAG_MIME, entry.key);
            event.dataTransfer.setData("text/plain", entry.key);
            draggingKeyRef.current = entry.key;
            dropIndexRef.current = index;
            setDraggingKey(entry.key);
            setDropIndex(index);
            suppressClickRef.current = false;
          }}
          onDragEnd={() => {
            finishDrag();
          }}
          onDragOver={(event) => {
            if (!draggingKeyRef.current) {
              return;
            }
            event.preventDefault();
            if (event.dataTransfer) {
              event.dataTransfer.dropEffect = "move";
            }
            updateDropIndex(
              index,
              event.clientX,
              event.clientY,
              event.currentTarget as HTMLElement,
            );
          }}
          onDrop={(event) => {
            event.preventDefault();
            event.stopPropagation();
            const fromKey =
              event.dataTransfer?.getData(PINNED_SHELF_DRAG_MIME) ||
              event.dataTransfer?.getData("text/plain") ||
              draggingKeyRef.current;
            // Prefer live geometry on the drop target — React state can lag.
            const to = dropIndexForTile(
              index,
              event.clientX,
              event.clientY,
              event.currentTarget as HTMLElement,
            );
            if (fromKey) {
              suppressClickRef.current = true;
              commitReorder(fromKey, to);
            }
            finishDrag();
          }}
          onClickCapture={(event) => {
            if (!suppressClickRef.current) {
              return;
            }
            event.preventDefault();
            event.stopPropagation();
            suppressClickRef.current = false;
          }}
        >
          {renderEntry(entry)}
        </div>
      ))}
    </div>
  );
}

function NextUpCoverStack({
  reading,
  onChanged,
}: {
  reading: NextUpReading;
  onChanged: () => void;
}) {
  const { singularCapitalized } = SyllabusManager.getNomenclatureFormatted(
    reading.collection.id,
  );
  const stackItems =
    reading.unreadItems.length > 0
      ? reading.unreadItems.slice(0, 3)
      : reading.item
        ? [reading.item]
        : [];

  const handleUnpin = async () => {
    await setPinnedSyllabus(reading.collection, false);
    onChanged();
  };

  const classNumberLabel =
    reading.isSyllabus && reading.classNumber != null
      ? getString("menu-class-label", {
          args: {
            nomenclature: singularCapitalized,
            number: reading.classNumber,
          },
        })
      : "";
  const classTitle = reading.classTitle.trim();
  const className = classNumberLabel
    ? classTitle
      ? `${classNumberLabel}: ${classTitle}`
      : classNumberLabel
    : "";

  const open = () => openPinnedCollection(reading);
  const showProgress =
    reading.isSyllabus &&
    reading.progress != null &&
    reading.progress.total > 0;

  return (
    <div
      className="syllabus-pinned-collection-cover group/pinned-collection relative min-w-0"
      onContextMenu={(e) => {
        void openZoteroCollectionContextMenu(reading.collection, e);
      }}
    >
      <div
        role="button"
        tabIndex={0}
        className="syllabus-pinned-collection-cover-hit border-0 bg-transparent p-0 cursor-pointer text-left w-full min-w-0"
        onClick={open}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            open();
          }
        }}
      >
        <div
          className="syllabus-pinned-collection-stack"
          data-count={Math.max(stackItems.length, 1)}
        >
          {stackItems.length > 0 ? (
            stackItems.map((item, index) => (
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
            ))
          ) : (
            <div
              className="syllabus-pinned-collection-stack-layer syllabus-pinned-collection-stack-empty"
              data-stack-index={0}
            />
          )}
        </div>
      </div>
      <div className="syllabus-gallery-meta min-w-0 px-0.5">
        <div className="flex flex-row items-start gap-0.5 min-w-0">
          <div
            role="button"
            tabIndex={0}
            className="syllabus-gallery-title syllabus-pinned-collection-course text-sm font-medium text-primary leading-snug flex items-center gap-1 min-w-0 flex-1 cursor-pointer"
            onClick={open}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                open();
              }
            }}
          >
            <GalleryGroupIcon
              spec={{
                kind: reading.isSyllabus ? "syllabus" : "collection",
              }}
            />
            <span className="truncate">{reading.collection.name}</span>
          </div>
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
        {className ? (
          <div
            role="button"
            tabIndex={0}
            className="syllabus-gallery-creator syllabus-pinned-collection-class text-xs text-secondary truncate mt-0.5 cursor-pointer"
            onClick={open}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                open();
              }
            }}
          >
            {className}
          </div>
        ) : null}
        {showProgress && reading.progress ? (
          <div
            role="button"
            tabIndex={0}
            className="syllabus-pinned-collection-progress border-0 bg-transparent p-0 cursor-pointer text-left w-full min-w-0"
            title={getString("pinned-syllabus-progress", {
              args: {
                done: reading.progress.done,
                total: reading.progress.total,
              },
            })}
            onClick={open}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                open();
              }
            }}
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
          </div>
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
  selectOnClick = false,
}: {
  item: Zotero.Item;
  density: ItemDensity;
  showLibraryName: boolean;
  showUnpinCheckbox: boolean;
  onChanged: () => void;
  /** Home shelf: click selects for the item pane; double-click opens reader. */
  selectOnClick?: boolean;
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

  const handleClick = (clicked: Zotero.Item) => {
    activatePinnedItem(clicked, selectOnClick);
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
          isLocked
          hideHoverActions
          readerMode={showUnpinCheckbox}
          onReaderCheck={showUnpinCheckbox ? handleReaderCheck : undefined}
          onClick={handleClick}
          onContextMenu={(clicked, e) => {
            void openZoteroItemContextMenu(clicked, e);
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
              handleClick(item);
            }}
            onDblClick={() => {
              openItemBestAttachment(item);
            }}
            onContextMenu={(e) => {
              void openZoteroItemContextMenu(item, e);
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

  const open = () => openPinnedCollection(reading);
  const headerLabel = reading.isSyllabus
    ? getString("pinned-next-up-from", {
        args: { name: reading.collection.name },
      })
    : reading.collection.name;

  return (
    <div className="relative">
      <div className="flex flex-row items-start gap-2 justify-between mb-1">
        <button
          type="button"
          className="text-secondary text-sm text-left border-0 bg-transparent cursor-pointer p-0 hover:text-primary"
          onClick={open}
        >
          {headerLabel}
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
      {reading.isSyllabus && reading.item && reading.assignment ? (
        <SyllabusItemCard
          item={reading.item}
          collectionId={reading.collection.id}
          classNumber={reading.classNumber ?? undefined}
          assignment={reading.assignment}
          density={density}
          slim
          isLocked
          hideHoverActions
          readerMode={showUnpinCheckbox}
          onReaderCheck={showUnpinCheckbox ? handleReaderCheck : undefined}
          onClick={() => {
            openPinnedCollection(reading);
          }}
          onContextMenu={(_clicked, e) => {
            void openZoteroCollectionContextMenu(reading.collection, e);
          }}
        />
      ) : reading.item ? (
        <SyllabusItemCard
          item={reading.item}
          collectionId={reading.collection.id}
          assignment={{ id: `pinned-collection-${reading.collection.id}` }}
          density={density}
          slim
          isLocked
          hideHoverActions
          readerMode={showUnpinCheckbox}
          onReaderCheck={showUnpinCheckbox ? handleReaderCheck : undefined}
          onClick={() => {
            openPinnedCollection(reading);
          }}
          onContextMenu={(_clicked, e) => {
            void openZoteroCollectionContextMenu(reading.collection, e);
          }}
        />
      ) : null}
      {reading.isSyllabus && reading.classTitle ? (
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
