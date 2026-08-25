// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h, Fragment } from "preact";
import { twMerge } from "tailwind-merge";
import { renderComponent } from "../utils/react";
import { useZoteroCollectionTitle } from "./react-zotero-sync/collectionTitle";
import { useZoteroCollectionItems } from "./react-zotero-sync/collectionItems";
import { useCollectionTagGroups } from "./tagGroups";
import {
  BrowsePageLayout,
  SlimSyllabusItemCard,
  useBrowsePageChrome,
} from "./browsePage";

interface TagsPageProps {
  collectionId: number;
}

export function TagsPage({ collectionId }: TagsPageProps) {
  const [title] = useZoteroCollectionTitle(collectionId);
  const syllabusItems = useZoteroCollectionItems(collectionId);
  const { tagGroups, untaggedItems } = useCollectionTagGroups(syllabusItems);
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

  return (
    <BrowsePageLayout
      title={title || "Untitled"}
      compactMode={compactMode}
      onToggleCompact={toggleCompactMode}
      contentClassName={compactMode ? "gap-10 mt-4" : "gap-12 mt-6"}
    >
      {tagGroups.length === 0 && untaggedItems.length === 0 && (
        <p className="text-secondary text-lg">No items in this collection.</p>
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
    </BrowsePageLayout>
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
