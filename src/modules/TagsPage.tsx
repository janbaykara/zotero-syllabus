// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h, Fragment } from "preact";
import { useCallback, useState } from "preact/hooks";
import type { JSX } from "preact";
import { twMerge } from "tailwind-merge";
import { Maximize2, Minimize2 } from "lucide-preact";
import { renderComponent } from "../utils/react";
import { isZotero8OrLater } from "../utils/zotero";
import { useZoteroCollectionTitle } from "./react-zotero-sync/collectionTitle";
import { useZoteroCollectionItems } from "./react-zotero-sync/collectionItems";
import { useZoteroSelectedItemIds } from "./react-zotero-sync/selectedItem";
import { useZoteroCompactMode } from "./react-zotero-sync/compactMode";
import { useCollectionTagGroups } from "./tagGroups";
import { SyllabusItemCard } from "./SyllabusPage";

interface TagsPageProps {
  collectionId: number;
}

export function TagsPage({ collectionId }: TagsPageProps) {
  const [title] = useZoteroCollectionTitle(collectionId);
  const syllabusItems = useZoteroCollectionItems(collectionId);
  const { tagGroups, untaggedItems } = useCollectionTagGroups(syllabusItems);
  const [compactMode, setCompactMode] = useZoteroCompactMode();
  const selectedItemIds = useZoteroSelectedItemIds();
  const [selectedIdentifiers, setSelectedIdentifiers] = useState<Set<string>>(
    new Set(),
  );

  const toggleCompactMode = useCallback(() => {
    setCompactMode(!compactMode);
  }, [compactMode, setCompactMode]);

  const handleIdentifierClick = useCallback(
    (
      item: Zotero.Item,
      _assignmentId: string | undefined,
      e?: JSX.TargetedMouseEvent<HTMLElement>,
    ) => {
      const identifier = `item:${item.id}`;

      setSelectedIdentifiers((prev) => {
        const newSet = new Set(prev);
        if (e?.shiftKey) {
          if (newSet.has(identifier)) {
            newSet.delete(identifier);
          } else {
            newSet.add(identifier);
          }
        } else {
          newSet.clear();
          if (!prev.has(identifier)) {
            newSet.add(identifier);
          }
        }
        return newSet;
      });

      try {
        const pane = ztoolkit.getGlobal("ZoteroPane");
        if (e?.shiftKey) {
          const selectedItems = pane.getSelectedItems(true) as number[];
          const itemId = item.id;
          let newSelection: number[];
          if (selectedItems.includes(itemId)) {
            newSelection = selectedItems.filter((id) => id !== itemId);
          } else {
            newSelection = [...selectedItems, itemId];
          }
          if (newSelection.length > 0) {
            pane.selectItems(newSelection);
          } else {
            pane.selectItem(itemId);
          }
        } else {
          const isZoteroSelected = selectedItemIds?.includes(item.id) || false;
          if (isZoteroSelected) {
            pane.selectItem(-1);
          } else {
            pane.selectItem(item.id);
          }
        }
      } catch (err) {
        ztoolkit.log("Error selecting item:", err);
      }
    },
    [selectedItemIds],
  );

  const renderItemCard = (item: Zotero.Item, keyPrefix: string) => (
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
      onIdentifierClick={handleIdentifierClick}
      isZoteroSelected={selectedItemIds?.includes(item.id) || false}
      isIdentifierSelected={selectedIdentifiers.has(`item:${item.id}`)}
    />
  );

  return (
    <div
      className={twMerge(
        "syllabus-page overflow-y-auto overflow-x-hidden h-full in-[.print]:scheme-light relative",
        compactMode && "compact-mode",
      )}
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
                {title || "Untitled"}
              </div>
              <div className="inline-flex items-center gap-2.5 shrink grow-0">
                <div
                  className="grow-0 shrink-0 flex items-center in-[.print]:hidden cursor-pointer"
                  title={
                    compactMode ? "Disable compact mode" : "Enable compact mode"
                  }
                  aria-label={
                    compactMode ? "Disable compact mode" : "Enable compact mode"
                  }
                  onClick={toggleCompactMode}
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
            "container-padded",
            compactMode ? "gap-10 mt-4" : "gap-12 mt-6",
            "flex flex-col",
          )}
        >
          {tagGroups.length === 0 && untaggedItems.length === 0 && (
            <p className="text-secondary text-lg">
              No items in this collection.
            </p>
          )}

          {tagGroups.map(({ tag, items }) => (
            <div
              key={tag}
              className="syllabus-class-group in-[.print]:scheme-light"
            >
              <div
                className={twMerge(
                  "font-semibold",
                  compactMode ? "text-xl mb-2" : "text-2xl mb-4",
                )}
              >
                {tag}
              </div>
              <div className={compactMode ? "space-y-2" : "space-y-4"}>
                {items.map((item) => renderItemCard(item, tag))}
              </div>
            </div>
          ))}

          {untaggedItems.length > 0 && (
            <div className="syllabus-class-group in-[.print]:scheme-light">
              <div
                className={twMerge(
                  "font-semibold",
                  compactMode ? "text-xl mb-2" : "text-2xl mb-4",
                )}
              >
                Untagged
              </div>
              {!compactMode && (
                <p className="text-secondary text-lg mb-4">
                  Items in this section have no tags.
                </p>
              )}
              <div className={compactMode ? "space-y-2" : "space-y-4"}>
                {untaggedItems.map((item) => renderItemCard(item, "untagged"))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function renderTagsPage(
  win: _ZoteroTypes.MainWindow,
  rootElement: HTMLElement,
  collectionId: number,
) {
  renderComponent(
    win,
    rootElement,
    <TagsPage collectionId={collectionId} />,
    "syllabus-custom-view",
  );
}
