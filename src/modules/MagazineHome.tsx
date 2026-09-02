// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h } from "preact";
import { Folder, GraduationCap, BookOpen, Tags } from "lucide-preact";
import { getString } from "../utils/locale";
import type { ItemSortMode } from "../utils/items";
import type { TagGroup } from "./tagGroups";
import type { SubcollectionNode } from "./subcollectionGroups";
import {
  magazineSectionTemplate,
  pickMagazineDesks,
  pickRecentMediaItems,
  remainderItemIds,
  type MagazineDeskInput,
} from "./magazineDesks";
import { MagazineGrid, type MagazineTileClick } from "./MagazineTile";
import { MagazineShelf } from "./MagazineShelf";

function collectChildDesks(
  root: SubcollectionNode | null,
): { id: string; title: string; itemIds: number[] }[] {
  if (!root) {
    return [];
  }
  return root.children.map((child) => ({
    id: `col-${child.collectionId}`,
    title: child.name,
    itemIds: collectNodeItemIds(child),
  }));
}

function collectNodeItemIds(node: SubcollectionNode): number[] {
  const ids = [...node.itemIds];
  for (const child of node.children) {
    ids.push(...collectNodeItemIds(child));
  }
  return ids;
}

function deskIcon(id: string) {
  if (id.startsWith("tag-")) {
    return Tags;
  }
  if (id === "further-reading") {
    return BookOpen;
  }
  if (id.startsWith("class-")) {
    return GraduationCap;
  }
  return Folder;
}

export function MagazineHome({
  items,
  tagGroups,
  classDesks = [],
  subcollectionRoot,
  sortBy,
  selectedItemIds,
  onClick,
  onDoubleClick,
  onContextMenu,
}: {
  items: Zotero.Item[];
  tagGroups: TagGroup[];
  classDesks?: MagazineDeskInput[];
  subcollectionRoot: SubcollectionNode | null;
  sortBy: ItemSortMode;
  selectedItemIds: number[] | null | undefined;
  onClick: MagazineTileClick;
  onDoubleClick: (item: Zotero.Item) => void;
  onContextMenu: MagazineTileClick;
}) {
  const videos = pickRecentMediaItems(items, "video");
  const audio = pickRecentMediaItems(items, "audio");
  const shelfIds = [...videos, ...audio].map((item) => item.id);
  const byId = new Map(items.map((item) => [item.id, item]));

  const subDesks = collectChildDesks(subcollectionRoot);
  const tagDesks = [...tagGroups]
    .sort(
      (a, b) => b.items.length - a.items.length || a.tag.localeCompare(b.tag),
    )
    .map((group, index) => ({
      id: `tag-${index}`,
      title: group.tag,
      itemIds: group.items.map((item) => item.id),
    }));
  const desks = pickMagazineDesks([...classDesks, ...subDesks, ...tagDesks]);
  const restIds = remainderItemIds(
    items.map((item) => item.id),
    desks,
    shelfIds,
  );
  const restItems = restIds
    .map((id) => byId.get(id))
    .filter((item): item is Zotero.Item => !!item);

  const tileProps = {
    sortBy,
    selectedItemIds,
    onClick,
    onDoubleClick,
    onContextMenu,
  };

  return (
    <div className="syllabus-magazine-home">
      <MagazineShelf
        kind="video"
        items={videos}
        selectedItemIds={selectedItemIds}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
        onContextMenu={onContextMenu}
      />
      <MagazineShelf
        kind="audio"
        items={audio}
        selectedItemIds={selectedItemIds}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
        onContextMenu={onContextMenu}
      />
      {desks.map((desk, index) => {
        const deskItems = desk.itemIds
          .map((id) => byId.get(id))
          .filter((item): item is Zotero.Item => !!item);
        if (deskItems.length === 0) {
          return null;
        }
        const Icon = deskIcon(desk.id);
        return (
          <section
            key={desk.id}
            className="syllabus-magazine-desk"
            data-gallery-group={desk.id}
          >
            <h2 className="syllabus-magazine-desk-title">
              <Icon size={16} strokeWidth={2} aria-hidden="true" />
              <span>{desk.title}</span>
            </h2>
            <MagazineGrid
              items={deskItems}
              keyPrefix={desk.id}
              template={magazineSectionTemplate(index)}
              {...tileProps}
            />
          </section>
        );
      })}
      {restItems.length > 0 ? (
        <section
          className="syllabus-magazine-desk"
          data-gallery-group="magazine-well"
        >
          {desks.length > 0 ? (
            <h2 className="syllabus-magazine-desk-title">
              <span>{getString("gallery-in-this-collection")}</span>
            </h2>
          ) : null}
          <MagazineGrid
            items={restItems}
            keyPrefix="well"
            template={magazineSectionTemplate(desks.length)}
            {...tileProps}
          />
        </section>
      ) : null}
    </div>
  );
}
