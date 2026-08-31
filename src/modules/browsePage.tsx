// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h } from "preact";
import { useCallback, useState } from "preact/hooks";
import type { ComponentChildren, JSX } from "preact";
import { twMerge } from "tailwind-merge";
import { Maximize2, Minimize2 } from "lucide-preact";
import { isZotero8OrLater } from "../utils/zotero";
import { useZoteroSelectedItemIds } from "./react-zotero-sync/selectedItem";
import { useZoteroCompactMode } from "./react-zotero-sync/compactMode";
import { SyllabusItemCard } from "./SyllabusItemCard";
import { getString, getUiDir } from "../utils/locale";

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
  const [compactMode, setCompactMode] = useZoteroCompactMode();
  const selection = useItemIdentifierSelection();
  const toggleCompactMode = useCallback(() => {
    setCompactMode(!compactMode);
  }, [compactMode, setCompactMode]);

  return { compactMode, toggleCompactMode, ...selection };
}

export function BrowsePageLayout({
  title,
  compactMode,
  onToggleCompact,
  contentClassName,
  children,
}: {
  title: string;
  compactMode: boolean;
  onToggleCompact: () => void;
  contentClassName?: string;
  children: ComponentChildren;
}) {
  return (
    <div
      className={twMerge(
        "syllabus-page overflow-y-auto overflow-x-hidden h-full in-[.print]:scheme-light relative",
        compactMode && "compact-mode",
      )}
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
                  title={
                    compactMode
                      ? getString("page-compact-disable")
                      : getString("page-compact-enable")
                  }
                  aria-label={
                    compactMode
                      ? getString("page-compact-disable")
                      : getString("page-compact-enable")
                  }
                  onClick={onToggleCompact}
                >
                  {compactMode ? (
                    <Maximize2
                      size={20}
                      className="text-secondary hover:text-primary hover:bg-quinary rounded p-1"
                    />
                  ) : (
                    <Minimize2
                      size={20}
                      className="text-secondary hover:text-primary hover:bg-quinary rounded p-1"
                    />
                  )}
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
  compactMode,
  selectedIdentifiers,
  selectedItemIds,
  onIdentifierClick,
}: {
  item: Zotero.Item;
  collectionId: number;
  keyPrefix: string;
  compactMode: boolean;
  selectedIdentifiers: Set<string>;
  selectedItemIds: number[] | null;
  onIdentifierClick: (
    item: Zotero.Item,
    assignmentId: string | undefined,
    e?: JSX.TargetedMouseEvent<HTMLElement>,
  ) => void;
}) {
  return (
    <SyllabusItemCard
      key={`${keyPrefix}-${item.id}`}
      item={item}
      collectionId={collectionId}
      classNumber={undefined}
      slim={true}
      compactMode={compactMode}
      readerMode={false}
      isLocked={true}
      selectedIdentifiers={selectedIdentifiers}
      onIdentifierClick={onIdentifierClick}
      isZoteroSelected={selectedItemIds?.includes(item.id) || false}
      isIdentifierSelected={selectedIdentifiers.has(`item:${item.id}`)}
    />
  );
}
