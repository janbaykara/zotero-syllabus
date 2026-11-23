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
import { PersonalOrderCaptureItem } from "./PersonalOrderCapture";
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

export function DensityIcon({
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

export function clearZoteroItemSelection(): void {
  try {
    const pane = ztoolkit.getGlobal("ZoteroPane");
    // selectItem(-1) / selectItems([]) are unreliable while a custom view is
    // showing; the items-tree selection API clears Zotero + Item Pane state.
    const clear = pane.itemsView?.selection?.clearSelection;
    if (typeof clear === "function") {
      clear.call(pane.itemsView.selection);
      return;
    }
    if (typeof pane.selectItem === "function") {
      pane.selectItem(-1);
    }
  } catch (err) {
    ztoolkit.log("Error clearing item selection:", err);
  }
}

/** Targets that own item selection (clicking them should not clear). */
const SELECTION_ITEM_SELECTOR = [
  "[data-syllabus-identifier]",
  ".syllabus-gallery-tile",
  ".syllabus-magazine-tile",
  ".syllabus-item-card",
  ".syllabus-personal-order-capture-item",
  ".syllabus-my-annotations-stream-entry",
  ".syllabus-annotation-row",
].join(", ");

const SELECTION_OUTSIDE_IGNORE_SELECTOR = [
  // Keep selection when interacting with Zotero chrome / popovers outside the
  // reading list. Form fields inside the custom view should still deselect
  // items (clicking the description is an "outside" click).
  "#zotero-collections-tree",
  "#zotero-collections-pane",
  ".syllabus-gallery-popover",
  "#zotero-item-pane",
  "#zotero-context-pane",
  "browser.reader",
  ".reader",
].join(", ");

/**
 * Walk composedPath / parentNode and test a selector without relying on
 * `path.includes(node)` (Xray wrappers break reference equality). Prefer
 * `closest` when available; fall back to id / class / data-attr matches so
 * chrome ↔ sandbox compartments still resolve.
 */
function eventPathHitsSelector(event: Event, selector: string): boolean {
  const path =
    typeof event.composedPath === "function" ? event.composedPath() : [];
  const nodes: unknown[] =
    path.length > 0 ? path : [event.target].filter(Boolean);

  // Also walk parentNode from the target — more reliable under Xray than
  // depending solely on composedPath entries having a working closest().
  let walk: unknown = event.target;
  for (let depth = 0; walk && depth < 40; depth++) {
    nodes.push(walk);
    const parent =
      (walk as { parentNode?: unknown; parentElement?: unknown; host?: unknown })
        .parentElement ??
      (walk as { parentNode?: unknown }).parentNode ??
      (walk as { host?: unknown }).host;
    walk = parent && parent !== walk ? parent : null;
  }

  for (const node of nodes) {
    if (!node) {
      continue;
    }
    const el = node as Element;
    if (typeof el.closest === "function") {
      try {
        if (el.closest(selector)) {
          return true;
        }
      } catch {
        // Xray may throw on some nodes; fall through to attribute checks.
      }
    }
    if (selectorMatchesElementShallow(el, selector)) {
      return true;
    }
  }
  return false;
}

/** Best-effort match for simple selectors used in selection outside-click. */
function selectorMatchesElementShallow(
  el: Element,
  selector: string,
): boolean {
  const id = typeof el.id === "string" ? el.id : "";
  const tag =
    typeof (el as { tagName?: string }).tagName === "string"
      ? (el as { tagName: string }).tagName.toLowerCase()
      : "";
  const className = String(
    (el as { className?: unknown }).className ?? "",
  ).toString();
  const classList = className.split(/\s+/).filter(Boolean);

  // Split on commas for selector lists.
  for (const part of selector.split(",")) {
    const s = part.trim();
    if (!s) {
      continue;
    }
    if (s.startsWith("#") && id === s.slice(1)) {
      return true;
    }
    if (s.startsWith(".") && classList.includes(s.slice(1))) {
      return true;
    }
    if (
      s.startsWith("[data-syllabus-identifier]") ||
      s === "[data-syllabus-identifier]"
    ) {
      if (
        typeof el.getAttribute === "function" &&
        el.getAttribute("data-syllabus-identifier") != null
      ) {
        return true;
      }
    }
    if (s.includes("[contenteditable")) {
      if (
        typeof el.getAttribute === "function" &&
        el.getAttribute("contenteditable") === "true"
      ) {
        return true;
      }
    }
    if (s.includes(".") && s.includes("[")) {
      // e.g. browser.reader — tag + class
      const [tagPart, classPart] = s.split(".");
      if (
        tag &&
        tagPart.toLowerCase() === tag &&
        classList.includes(classPart)
      ) {
        return true;
      }
    }
    if (!s.startsWith("#") && !s.startsWith(".") && !s.startsWith("[")) {
      if (tag === s.toLowerCase()) {
        return true;
      }
    }
  }
  return false;
}

/**
 * True when an outside pointer should clear custom-view item selection.
 * Skips clicks on items themselves and chrome that should keep selection.
 */
export function shouldClearSelectionOnPointer(event: Event): boolean {
  if (eventPathHitsSelector(event, SELECTION_ITEM_SELECTOR)) {
    return false;
  }
  if (eventPathHitsSelector(event, SELECTION_OUTSIDE_IGNORE_SELECTOR)) {
    return false;
  }
  return true;
}

export function useItemIdentifierSelection() {
  const selectedItemIds = useZoteroSelectedItemIds();
  const [selectedIdentifiers, setSelectedIdentifiers] = useState<Set<string>>(
    new Set(),
  );

  const clearSelection = useCallback(() => {
    setSelectedIdentifiers(new Set());
    clearZoteroItemSelection();
  }, []);

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
          clearZoteroItemSelection();
        } else {
          pane.selectItem(item.id);
        }
      } catch (err) {
        ztoolkit.log("Error selecting item:", err);
      }
    },
    [selectedItemIds],
  );

  return {
    selectedIdentifiers,
    selectedItemIds,
    handleIdentifierClick,
    clearSelection,
  };
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
  showGalleryNote = false,
  readerMode = false,
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
  showGalleryNote?: boolean;
  readerMode?: boolean;
}) {
  return (
    <PersonalOrderCaptureItem item={item}>
      <SyllabusItemCard
        key={`${keyPrefix}-${item.id}`}
        item={item}
        collectionId={collectionId}
        classNumber={undefined}
        slim={true}
        density={density}
        readerMode={readerMode}
        isLocked={true}
        showGalleryNote={showGalleryNote}
        selectedIdentifiers={selectedIdentifiers}
        onIdentifierClick={onIdentifierClick}
        onContextMenu={onContextMenu}
        isZoteroSelected={selectedItemIds?.includes(item.id) || false}
        isIdentifierSelected={selectedIdentifiers.has(`item:${item.id}`)}
      />
    </PersonalOrderCaptureItem>
  );
}
