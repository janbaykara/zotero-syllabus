// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h, Fragment } from "preact";
import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import {
  Image,
  LayoutGrid,
  LayoutList,
  Maximize2,
  MoreHorizontal,
  Newspaper,
  AlignJustify,
  StretchHorizontal,
  Rows2,
  Rows3,
  Highlighter,
  ListOrdered,
  CalendarPlus,
} from "lucide-preact";
import { getString } from "../utils/locale";
import { confirmPrompt } from "../utils/window";
import {
  ITEM_DENSITIES,
  useZoteroItemDensity,
  type ItemDensity,
} from "./react-zotero-sync/itemDensity";
import { useZoteroReaderMode } from "./react-zotero-sync/readerMode";
import { useReadingScheduleCollectionPref } from "./react-zotero-sync/readingScheduleCollectionPref";
import { densityLabel } from "./browsePage";
import type { GalleryLayout } from "./galleryLayout";
import type { MagazinePacking } from "./magazinePacking";
import { useBooleanPref } from "./react-zotero-sync/booleanPref";
import { useAnnotationsQuoteOrder } from "./myAnnotationsPrefs";
import type { AnnotationsQuoteOrder } from "./explorerQueries";
import type { FluentMessageId } from "../../typings/i10n";

const DENSITY_ICONS: Record<
  ItemDensity,
  typeof Rows3 | typeof Rows2 | typeof Maximize2
> = {
  row: Rows3,
  standard: Rows2,
  expanded: Maximize2,
};

const DENSITY_TITLE_IDS: Record<ItemDensity, FluentMessageId> = {
  row: "page-density-row",
  standard: "page-density-standard",
  expanded: "page-density-expanded",
};

const LAYOUT_OPTIONS: {
  mode: GalleryLayout;
  labelKey: FluentMessageId;
  titleKey: FluentMessageId;
  Icon: typeof Image;
}[] = [
  {
    mode: "card",
    labelKey: "gallery-layout-card",
    titleKey: "gallery-layout-card-title",
    Icon: LayoutList,
  },
  {
    mode: "cover",
    labelKey: "gallery-layout-cover",
    titleKey: "gallery-layout-cover-title",
    Icon: Image,
  },
  {
    mode: "annotations",
    labelKey: "gallery-layout-annotations",
    titleKey: "gallery-layout-annotations-title",
    Icon: Highlighter,
  },
  {
    mode: "magazine",
    labelKey: "gallery-layout-magazine",
    titleKey: "gallery-layout-magazine-title",
    Icon: Newspaper,
  },
];

const QUOTE_ORDER_OPTIONS: {
  mode: AnnotationsQuoteOrder;
  labelKey: FluentMessageId;
  titleKey: FluentMessageId;
  Icon: typeof ListOrdered;
}[] = [
  {
    mode: "location",
    labelKey: "annotations-quote-order-location",
    titleKey: "annotations-quote-order-location-title",
    Icon: ListOrdered,
  },
  {
    mode: "dateAdded",
    labelKey: "annotations-quote-order-date-added",
    titleKey: "annotations-quote-order-date-added-title",
    Icon: CalendarPlus,
  },
];

const PACKING_OPTIONS: {
  mode: MagazinePacking;
  labelKey: FluentMessageId;
  titleKey: FluentMessageId;
  Icon: typeof LayoutGrid;
}[] = [
  {
    mode: "vertical",
    labelKey: "gallery-packing-vertical",
    titleKey: "gallery-packing-vertical-title",
    Icon: AlignJustify,
  },
  {
    mode: "grid",
    labelKey: "gallery-packing-grid",
    titleKey: "gallery-packing-grid-title",
    Icon: LayoutGrid,
  },
  {
    mode: "packed",
    labelKey: "gallery-packing-packed",
    titleKey: "gallery-packing-packed-title",
    Icon: StretchHorizontal,
  },
];

function confirmReadingScheduleCollectionToggle(enable: boolean): boolean {
  if (enable) {
    return confirmPrompt(
      getString("enable-reading-schedule-collection-title"),
      getString("enable-reading-schedule-collection-message"),
    );
  }
  return confirmPrompt(
    getString("disable-reading-schedule-collection-title"),
    getString("disable-reading-schedule-collection-message"),
  );
}

export function SyllabusViewMenu({
  showLayout = false,
  layout = "card",
  onLayoutChange,
  magazinePacking = "packed",
  onMagazinePackingChange,
  showCheckboxes = true,
  showScheduleCollection = false,
}: {
  /** Card / Cover / Annotations / Magazine — Reading Schedule and locked syllabus. */
  showLayout?: boolean;
  layout?: GalleryLayout;
  onLayoutChange?: (layout: GalleryLayout) => void;
  /** Reading Schedule Magazine packing (omit on locked syllabus). */
  magazinePacking?: MagazinePacking;
  onMagazinePackingChange?: (packing: MagazinePacking) => void;
  showCheckboxes?: boolean;
  /** Library “Reading Schedule” collection toggle (schedule page only). */
  showScheduleCollection?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const [density, setDensity] = useZoteroItemDensity();
  const [readerMode, setReaderMode] = useZoteroReaderMode();
  const [generateCollection, setGenerateCollection] =
    useReadingScheduleCollectionPref();
  const [quoteOrder, setQuoteOrder] = useAnnotationsQuoteOrder();
  const [showItemsWithoutAnnotations, setShowItemsWithoutAnnotations] =
    useBooleanPref("galleryShowItemsWithoutAnnotations");
  const showDensity = !showLayout || layout === "card";

  const handleGenerateCollectionChange = useCallback(
    (checked: boolean) => {
      if (checked === generateCollection) {
        return;
      }
      if (!confirmReadingScheduleCollectionToggle(checked)) {
        return;
      }
      setGenerateCollection(checked);
    },
    [generateCollection, setGenerateCollection],
  );

  useEffect(() => {
    if (!open) {
      return;
    }
    const onPointerDown = (event: MouseEvent) => {
      const root = rootRef.current;
      if (!root || !(event.target instanceof Node)) {
        return;
      }
      if (!root.contains(event.target)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    const win = Zotero.getMainWindow();
    win.document.addEventListener("mousedown", onPointerDown, true);
    win.document.addEventListener("keydown", onKeyDown, true);
    return () => {
      win.document.removeEventListener("mousedown", onPointerDown, true);
      win.document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [open]);

  return (
    <div className="syllabus-gallery-menu in-[.print]:hidden" ref={rootRef}>
      <button
        type="button"
        className="syllabus-gallery-menu-btn"
        data-tour="syllabus-view-options"
        aria-label={getString("page-view-options-aria")}
        aria-haspopup="menu"
        aria-expanded={open}
        title={getString("page-view-options-aria")}
        onClick={() => setOpen((value) => !value)}
      >
        <MoreHorizontal size={18} strokeWidth={2} aria-hidden="true" />
      </button>
      {open ? (
        <div
          className="syllabus-gallery-popover"
          role="menu"
          aria-label={getString("page-view-options-aria")}
          data-tour="syllabus-view-settings"
        >
          <div className="syllabus-gallery-toolbar">
            {showLayout ? (
              <div className="syllabus-gallery-toolbar-cluster">
                <div className="syllabus-gallery-toolbar-heading">
                  <span className="syllabus-gallery-groupby-label">
                    {getString("gallery-menu-view")}
                  </span>
                </div>
                <div
                  role="radiogroup"
                  aria-label={getString("gallery-menu-view")}
                  className="syllabus-gallery-groupby"
                >
                  {LAYOUT_OPTIONS.map(({ mode, labelKey, titleKey, Icon }) => (
                    <button
                      key={mode}
                      type="button"
                      role="radio"
                      aria-checked={layout === mode}
                      title={getString(titleKey)}
                      className="syllabus-gallery-groupby-btn"
                      onClick={() => onLayoutChange?.(mode)}
                    >
                      <Icon size={12} strokeWidth={2} aria-hidden="true" />
                      {getString(labelKey)}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            {showLayout && layout === "magazine" && onMagazinePackingChange ? (
              <div className="syllabus-gallery-toolbar-cluster">
                <div className="syllabus-gallery-toolbar-heading">
                  <span className="syllabus-gallery-groupby-label">
                    {getString("gallery-menu-packing")}
                  </span>
                </div>
                <div
                  role="radiogroup"
                  aria-label={getString("gallery-menu-packing")}
                  className="syllabus-gallery-groupby"
                >
                  {PACKING_OPTIONS.map(({ mode, labelKey, titleKey, Icon }) => (
                    <button
                      key={mode}
                      type="button"
                      role="radio"
                      aria-checked={magazinePacking === mode}
                      title={getString(titleKey)}
                      className="syllabus-gallery-groupby-btn"
                      onClick={() => onMagazinePackingChange(mode)}
                    >
                      <Icon size={12} strokeWidth={2} aria-hidden="true" />
                      {getString(labelKey)}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            {showLayout && layout === "annotations" ? (
              <div className="syllabus-gallery-toolbar-cluster">
                <div className="syllabus-gallery-toolbar-heading">
                  <span className="syllabus-gallery-groupby-label">
                    {getString("annotations-quote-order-menu")}
                  </span>
                </div>
                <div
                  role="radiogroup"
                  aria-label={getString("annotations-quote-order-menu")}
                  className="syllabus-gallery-groupby"
                >
                  {QUOTE_ORDER_OPTIONS.map(
                    ({ mode, labelKey, titleKey, Icon }) => (
                      <button
                        key={mode}
                        type="button"
                        role="radio"
                        aria-checked={quoteOrder === mode}
                        title={getString(titleKey)}
                        className="syllabus-gallery-groupby-btn"
                        onClick={() => setQuoteOrder(mode)}
                      >
                        <Icon size={12} strokeWidth={2} aria-hidden="true" />
                        {getString(labelKey)}
                      </button>
                    ),
                  )}
                </div>
                <label className="flex items-center gap-2.5 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={showItemsWithoutAnnotations}
                    onChange={(e) =>
                      setShowItemsWithoutAnnotations(e.currentTarget.checked)
                    }
                    className="w-4 h-4 cursor-pointer accent-accent-green! shrink-0"
                  />
                  <span className="font-medium leading-snug">
                    {getString("gallery-annotations-show-empty")}
                  </span>
                </label>
              </div>
            ) : null}
            {showDensity ? (
              <div className="syllabus-gallery-toolbar-cluster">
                <div className="syllabus-gallery-toolbar-heading">
                  <span className="syllabus-gallery-groupby-label">
                    {getString("settings-density")}
                  </span>
                </div>
                <div
                  role="radiogroup"
                  aria-label={getString("settings-density")}
                  className="syllabus-gallery-groupby"
                >
                  {ITEM_DENSITIES.map((mode) => {
                    const Icon = DENSITY_ICONS[mode];
                    return (
                      <button
                        key={mode}
                        type="button"
                        role="radio"
                        aria-checked={density === mode}
                        title={getString(DENSITY_TITLE_IDS[mode])}
                        className="syllabus-gallery-groupby-btn"
                        onClick={() => setDensity(mode)}
                      >
                        <Icon size={12} strokeWidth={2} aria-hidden="true" />
                        {densityLabel(mode)}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
            {showCheckboxes ? (
              <div className="syllabus-gallery-toolbar-cluster">
                <label
                  className="flex items-center gap-2.5 cursor-pointer text-sm"
                  title={
                    readerMode
                      ? getString("page-reader-disable")
                      : getString("page-reader-enable")
                  }
                >
                  <input
                    type="checkbox"
                    checked={readerMode}
                    onChange={(e) => setReaderMode(e.currentTarget.checked)}
                    className="w-4 h-4 cursor-pointer accent-accent-green! shrink-0"
                  />
                  <span className="font-medium leading-snug">
                    {getString("page-view-checkboxes")}
                  </span>
                </label>
              </div>
            ) : null}
            {showScheduleCollection ? (
              <div className="syllabus-gallery-toolbar-cluster">
                <div className="syllabus-gallery-toolbar-heading">
                  <span className="syllabus-gallery-groupby-label">
                    {getString("schedule-settings-library")}
                  </span>
                </div>
                <p className="text-secondary text-xs leading-snug m-0 max-w-72">
                  {getString("schedule-settings-desc")}
                </p>
                <label
                  className="flex items-start gap-2.5 cursor-pointer text-sm"
                  data-tour="reading-schedule-generate-collection"
                >
                  <input
                    type="checkbox"
                    checked={generateCollection}
                    onChange={(e) =>
                      handleGenerateCollectionChange(e.currentTarget.checked)
                    }
                    className="w-4 h-4 mt-0.5 cursor-pointer accent-accent-green! shrink-0"
                  />
                  <span className="font-medium leading-snug">
                    {getString("schedule-settings-checkbox")}
                  </span>
                </label>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
