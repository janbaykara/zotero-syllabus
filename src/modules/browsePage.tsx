// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h } from "preact";
import { useCallback, useState } from "preact/hooks";
import type { ComponentChildren, JSX } from "preact";
import { twMerge } from "tailwind-merge";
import { Maximize2, Rows2, Rows3 } from "lucide-preact";
import { isZotero8OrLater } from "../utils/zotero";
import { useZoteroSelectedItemIds } from "./react-zotero-sync/selectedItem";
import {
  nextItemDensity,
  useZoteroItemDensity,
  type ItemDensity,
} from "./react-zotero-sync/itemDensity";
import { SyllabusItemCard } from "./SyllabusItemCard";
import { getString, getUiDir } from "../utils/locale";
import type { FluentMessageId } from "../../typings/i10n";

const DENSITY_LABEL_IDS: Record<ItemDensity, FluentMessageId> = {
  row: "page-density-row",
  standard: "page-density-standard",
  expanded: "page-density-expanded",
};

export function densityLabel(density: ItemDensity): string {
  return getString(DENSITY_LABEL_IDS[density]);
}

export function densityCycleTitle(current: ItemDensity): string {
  return getString("page-density-cycle", {
    args: { next: densityLabel(nextItemDensity(current)) },
  });
}

function DensityIcon({
  density,
  className,
}: {
  density: ItemDensity;
  className?: string;
}) {
  if (density === "row") {
    return <Rows3 size={20} className={className} />;
  }
  if (density === "standard") {
    return <Rows2 size={20} className={className} />;
  }
  return <Maximize2 size={20} className={className} />;
}

export function useItemIdentifierSelection() {
  const selectedItemIds = useZoteroSelectedItemIds();
  const [selectedIdentifiers, setSelectedIdentifiers] = useState<Set<string>>(
    new Set(),
  );

  const handleIdentifierClick = useCallback(
    (
      item: Zotero.Item,
      _assignmentId: string | undefined,
      e?: JSX.TargetedMouseEvent<HTMLElement>,
    ) => {
      const identifier = `item:${item.id}`;

      setSelectedIdentifiers((prev) => {
        const next = new Set(prev);
        if (e?.shiftKey) {
          if (next.has(identifier)) {
            next.delete(identifier);
          } else {
            next.add(identifier);
          }
        } else {
          next.clear();
          if (!prev.has(identifier)) {
            next.add(identifier);
          }
        }
        return next;
      });

      try {
        const pane = ztoolkit.getGlobal("ZoteroPane");
        if (e?.shiftKey) {
          const selectedItems = pane.getSelectedItems(true) as number[];
          const itemId = item.id;
          const newSelection = selectedItems.includes(itemId)
            ? selectedItems.filter((id) => id !== itemId)
            : [...selectedItems, itemId];
          if (newSelection.length > 0) {
            pane.selectItems(newSelection);
          } else {
            pane.selectItem(itemId);
          }
        } else if (selectedItemIds?.includes(item.id)) {
          pane.selectItem(-1);
        } else {
          pane.selectItem(item.id);
        }
      } catch (err) {
        ztoolkit.log("Error selecting item:", err);
      }
    },
    [selectedItemIds],
  );

  return { selectedIdentifiers, selectedItemIds, handleIdentifierClick };
}

export function useBrowsePageChrome() {
  const [density, , cycleDensity] = useZoteroItemDensity();
  const selection = useItemIdentifierSelection();

  return { density, cycleDensity, ...selection };
}

export function BrowsePageLayout({
  title,
  density,
  onCycleDensity,
  contentClassName,
  children,
}: {
  title: string;
  density: ItemDensity;
  onCycleDensity: () => void;
  contentClassName?: string;
  children: ComponentChildren;
}) {
  const cycleTitle = densityCycleTitle(density);
  return (
    <div
      className={twMerge(
        "syllabus-page overflow-y-auto overflow-x-hidden h-full in-[.print]:scheme-light relative",
        `density-${density}`,
      )}
      data-item-density={density}
      dir={getUiDir()}
    >
      <div className="pb-12">
        <div
          className={twMerge(
            "sticky top-0 z-40 bg-background py-1",
            isZotero8OrLater() ? "md:pt-8" : "pt-8",
            "in-[.print]:static",
          )}
        >
          <div className="container-padded bg-background">
            <div className="flex flex-row items-center gap-2 justify-between">
              <div className="flex-1 text-3xl font-semibold grow shrink-0 text-primary">
                {title || getString("untitled")}
              </div>
              <div className="inline-flex items-center gap-2.5 shrink grow-0">
                <div
                  className="grow-0 shrink-0 flex items-center in-[.print]:hidden cursor-pointer"
                  title={cycleTitle}
                  aria-label={cycleTitle}
                  onClick={onCycleDensity}
                >
                  <DensityIcon
                    density={density}
                    className="text-secondary hover:text-primary hover:bg-quinary rounded p-1"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          className={twMerge(
            "container-padded flex flex-col",
            contentClassName,
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

export function SlimSyllabusItemCard({
  item,
  collectionId,
  keyPrefix,
  density,
  selectedIdentifiers,
  selectedItemIds,
  onIdentifierClick,
  onContextMenu,
}: {
  item: Zotero.Item;
  collectionId: number;
  keyPrefix: string;
  density: ItemDensity;
  selectedIdentifiers: Set<string>;
  selectedItemIds: number[] | null;
  onIdentifierClick: (
    item: Zotero.Item,
    assignmentId: string | undefined,
    e?: JSX.TargetedMouseEvent<HTMLElement>,
  ) => void;
  onContextMenu?: (
    item: Zotero.Item,
    e: JSX.TargetedMouseEvent<HTMLElement>,
  ) => void;
}) {
  return (
    <SyllabusItemCard
      key={`${keyPrefix}-${item.id}`}
      item={item}
      collectionId={collectionId}
      classNumber={undefined}
      slim={true}
      density={density}
      readerMode={false}
      isLocked={true}
      selectedIdentifiers={selectedIdentifiers}
      onIdentifierClick={onIdentifierClick}
      onContextMenu={onContextMenu}
      isZoteroSelected={selectedItemIds?.includes(item.id) || false}
      isIdentifierSelected={selectedIdentifiers.has(`item:${item.id}`)}
    />
  );
}
