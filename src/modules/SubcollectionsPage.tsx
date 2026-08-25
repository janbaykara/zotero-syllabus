// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h, Fragment } from "preact";
import type { JSX } from "preact";
import { twMerge } from "tailwind-merge";
import { renderComponent } from "../utils/react";
import { useZoteroCollectionTitle } from "./react-zotero-sync/collectionTitle";
import { SubcollectionNode, useSubcollectionTree } from "./subcollectionGroups";
import {
  BrowsePageLayout,
  SlimSyllabusItemCard,
  useBrowsePageChrome,
} from "./browsePage";

interface SubcollectionsPageProps {
  collectionId: number;
}

export function SubcollectionsPage({ collectionId }: SubcollectionsPageProps) {
  const [title] = useZoteroCollectionTitle(collectionId);
  const { root, resolveItems } = useSubcollectionTree(collectionId);
  const {
    compactMode,
    toggleCompactMode,
    selectedIdentifiers,
    selectedItemIds,
    handleIdentifierClick,
  } = useBrowsePageChrome();

  const renderItemCard = (item: Zotero.Item, keyPrefix: string) => (
    <SlimSyllabusItemCard
      item={item}
      collectionId={collectionId}
      keyPrefix={keyPrefix}
      compactMode={compactMode}
      selectedIdentifiers={selectedIdentifiers}
      selectedItemIds={selectedItemIds}
      onIdentifierClick={handleIdentifierClick}
    />
  );

  const isEmpty = !root || !subtreeHasContent(root);

  return (
    <BrowsePageLayout
      title={title || "Untitled"}
      compactMode={compactMode}
      onToggleCompact={toggleCompactMode}
      contentClassName={compactMode ? "gap-6 mt-4" : "gap-8 mt-6"}
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
    </BrowsePageLayout>
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
