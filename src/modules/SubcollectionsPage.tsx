// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h, Fragment } from "preact";
import { useCallback, useState } from "preact/hooks";
import type { JSX } from "preact";
import { twMerge } from "tailwind-merge";
import { Maximize2, Minimize2 } from "lucide-preact";
import { renderComponent } from "../utils/react";
import { isZotero8OrLater } from "../utils/zotero";
import { useZoteroCollectionTitle } from "./react-zotero-sync/collectionTitle";
import { useZoteroSelectedItemIds } from "./react-zotero-sync/selectedItem";
import { useZoteroCompactMode } from "./react-zotero-sync/compactMode";
import { SubcollectionNode, useSubcollectionTree } from "./subcollectionGroups";
import { SyllabusItemCard } from "./SyllabusPage";

interface SubcollectionsPageProps {
  collectionId: number;
}

export function SubcollectionsPage({ collectionId }: SubcollectionsPageProps) {
  const [title] = useZoteroCollectionTitle(collectionId);
  const { root, resolveItems } = useSubcollectionTree(collectionId);
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

  const isEmpty = !root || !subtreeHasContent(root);

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
            compactMode ? "gap-6 mt-4" : "gap-8 mt-6",
            "flex flex-col",
          )}
        >
          {isEmpty && (
            <p className="text-secondary text-lg">
              No subcollections or items in this collection.
            </p>
          )}

          {root && !isEmpty && (
            <SubcollectionSection
              node={root}
              depth={0}
              isRoot
              compactMode={compactMode}
              resolveItems={resolveItems}
              renderItemCard={renderItemCard}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function subtreeHasContent(node: SubcollectionNode): boolean {
  if (node.itemIds.length > 0) return true;
  return node.children.some(subtreeHasContent);
}

function SubcollectionSection({
  node,
  depth,
  isRoot = false,
  compactMode,
  resolveItems,
  renderItemCard,
}: {
  node: SubcollectionNode;
  depth: number;
  isRoot?: boolean;
  compactMode: boolean;
  resolveItems: (ids: number[]) => Zotero.Item[];
  renderItemCard: (item: Zotero.Item, keyPrefix: string) => JSX.Element;
}) {
  const items = resolveItems(node.itemIds);
  const hasContent = subtreeHasContent(node);

  if (!hasContent && !isRoot) {
    return null;
  }

  return (
    <div
      className={twMerge(
        "syllabus-subcollection-box in-[.print]:scheme-light",
        isRoot
          ? "space-y-6"
          : twMerge(
              "rounded-lg border border-quinary bg-background",
              compactMode ? "p-3 space-y-3" : "p-4 space-y-4",
            ),
      )}
      data-collection-id={node.collectionId}
      data-depth={depth}
    >
      {!isRoot && (
        <div
          className={twMerge(
            "font-semibold text-primary",
            compactMode ? "text-lg" : "text-xl",
          )}
        >
          {node.name}
        </div>
      )}

      {isRoot && items.length > 0 && (
        <div className="syllabus-class-group in-[.print]:scheme-light space-y-2">
          <div
            className={twMerge(
              "font-semibold text-secondary",
              compactMode ? "text-base mb-2" : "text-lg mb-3",
            )}
          >
            In this collection
          </div>
          <div className={compactMode ? "space-y-2" : "space-y-4"}>
            {items.map((item) =>
              renderItemCard(item, `root-${node.collectionId}`),
            )}
          </div>
        </div>
      )}

      {!isRoot && items.length > 0 && (
        <div className={compactMode ? "space-y-2" : "space-y-4"}>
          {items.map((item) =>
            renderItemCard(item, `col-${node.collectionId}`),
          )}
        </div>
      )}

      {node.children.map((child) => (
        <SubcollectionSection
          key={child.collectionId}
          node={child}
          depth={depth + 1}
          compactMode={compactMode}
          resolveItems={resolveItems}
          renderItemCard={renderItemCard}
        />
      ))}
    </div>
  );
}

export function renderSubcollectionsPage(
  win: _ZoteroTypes.MainWindow,
  rootElement: HTMLElement,
  collectionId: number,
) {
  renderComponent(
    win,
    rootElement,
    <SubcollectionsPage collectionId={collectionId} />,
    "syllabus-custom-view",
  );
}
