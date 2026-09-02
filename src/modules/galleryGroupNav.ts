export type GalleryGroupIconSpec =
  | { kind: "item-type"; itemType: string }
  | { kind: "creator" }
  | { kind: "uncredited" }
  | { kind: "tag" }
  | { kind: "untagged" }
  | { kind: "collection" }
  | { kind: "collection-root" }
  | { kind: "class" }
  | { kind: "further-reading" };

export type GalleryNavGroup = {
  id: string;
  label: string;
  icon: GalleryGroupIconSpec;
};

export type GalleryGroupTop = {
  id: string;
  top: number;
};

type SubcollectionNavNode = {
  collectionId: number;
  name: string;
  itemIds: number[];
  children: SubcollectionNavNode[];
};

function subtreeHasContent(node: SubcollectionNavNode): boolean {
  if (node.itemIds.length > 0) {
    return true;
  }
  return node.children.some(subtreeHasContent);
}

/** Flatten a subcollection tree into gallery nav pills, matching render order. */
export function flattenSubcollectionNavGroups(
  node: SubcollectionNavNode,
  rootLabel: string,
): GalleryNavGroup[] {
  const groups: GalleryNavGroup[] = [];
  if (node.itemIds.length > 0) {
    groups.push({
      id: `col-root-${node.collectionId}`,
      label: rootLabel,
      icon: { kind: "collection-root" },
    });
  }
  const walk = (current: SubcollectionNavNode, isRoot: boolean) => {
    if (!isRoot && subtreeHasContent(current)) {
      groups.push({
        id: `col-${current.collectionId}`,
        label: current.name,
        icon: { kind: "collection" },
      });
    }
    for (const child of current.children) {
      walk(child, false);
    }
  };
  walk(node, true);
  return groups;
}

/** Last group whose top has crossed the activation line (just below the sticky header). */
export function findActiveGalleryGroupId(
  groups: GalleryGroupTop[],
  activationLine: number,
  slack = 1,
): string | null {
  if (groups.length === 0) {
    return null;
  }
  let activeId = groups[0].id;
  for (const group of groups) {
    if (group.top <= activationLine + slack) {
      activeId = group.id;
    }
  }
  return activeId;
}

export function scrollElementBelowSticky(
  container: HTMLElement,
  target: HTMLElement,
  sticky: HTMLElement | null,
  padding = 0,
): void {
  const containerRect = container.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  const stickyBottom = sticky
    ? sticky.getBoundingClientRect().bottom
    : containerRect.top;
  // Overshoot by 1px so rounding cannot leave the previous group as the spy hit.
  const top = targetRect.top - stickyBottom + container.scrollTop - padding + 1;
  container.scrollTo({ top: Math.max(0, Math.ceil(top)), behavior: "smooth" });
}

export function scrollChildIntoNearestHorizontal(
  container: HTMLElement,
  child: HTMLElement,
  padding = 12,
): void {
  const containerRect = container.getBoundingClientRect();
  const childRect = child.getBoundingClientRect();
  if (childRect.left < containerRect.left + padding) {
    container.scrollLeft += childRect.left - containerRect.left - padding;
  } else if (childRect.right > containerRect.right - padding) {
    container.scrollLeft += childRect.right - containerRect.right + padding;
  }
}
