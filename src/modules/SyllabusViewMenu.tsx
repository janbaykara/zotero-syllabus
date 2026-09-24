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
  useItemDensity,
  type ItemDensity,
} from "./react-zotero-sync/itemDensity";
import { useReaderMode } from "./react-zotero-sync/readerMode";
import { useReadingScheduleCollectionPref } from "./react-zotero-sync/readingScheduleCollectionPref";
import { useBooleanPref } from "./react-zotero-sync/booleanPref";
import { densityLabel } from "./browsePage";
import type { GalleryGlobalSetting, GalleryLayout } from "./galleryLayout";
import type { MagazinePacking } from "./magazinePacking";
import { AnnotationColorFilter } from "./AnnotationColorFilter";
import { useViewQuoteOrder } from "./myAnnotationsPrefs";
import { useShowItemsWithoutAnnotations } from "./showItemsWithoutAnnotations";
import {
  GalleryPrefCheckbox,
  GallerySaveGlobalButton,
  GallerySegmentedControl,
} from "./GallerySegmentedControl";
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
  viewKey,
  showLayout = false,
  layout = "card",
  onLayoutChange,
  layoutGlobal,
  magazinePacking = "packed",
  onMagazinePackingChange,
  magazinePackingGlobal,
  showCheckboxes = true,
  showScheduleCollection = false,
  showGlobal = true,
  annotationColors = [],
  colorFilterScope,
}: {
  viewKey: string;
  /** Card / Cover / Annotations / Magazine — Reading Schedule and locked syllabus. */
  showLayout?: boolean;
  layout?: GalleryLayout;
  onLayoutChange?: (layout: GalleryLayout) => void;
  layoutGlobal?: GalleryGlobalSetting<GalleryLayout>;
  /** Reading Schedule Magazine packing (omit on locked syllabus). */
  magazinePacking?: MagazinePacking;
  onMagazinePackingChange?: (packing: MagazinePacking) => void;
  magazinePackingGlobal?: GalleryGlobalSetting<MagazinePacking>;
  showCheckboxes?: boolean;
  /** Library “Reading Schedule” collection toggle (schedule page only). */
  showScheduleCollection?: boolean;
  /** Globe “save as default for other views”. Off on Reading Schedule. */
  showGlobal?: boolean;
  annotationColors?: string[];
  colorFilterScope?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const [density, setDensity, densityGlobal] = useItemDensity(viewKey);
  const [readerMode, setReaderMode, readerModeGlobal] = useReaderMode(viewKey);
  const [generateCollection, setGenerateCollection] =
    useReadingScheduleCollectionPref();
  const [applyToPinned, setApplyToPinned] = useBooleanPref(
    "applyReadingScheduleLayoutToPinned",
  );
  const [quoteOrder, setQuoteOrder, quoteOrderGlobal] =
    useViewQuoteOrder(viewKey);
  const [
    showItemsWithoutAnnotations,
    setShowItemsWithoutAnnotations,
    showEmptyGlobal,
  ] = useShowItemsWithoutAnnotations(viewKey);
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
      if (!root || eventInMenu(event, root)) {
        return;
      }
      setOpen(false);
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
            {showScheduleCollection ? (
              <div className="syllabus-gallery-toolbar-section">
                <div className="syllabus-gallery-toolbar-cluster">
                  <div className="syllabus-gallery-toolbar-heading">
                    <span className="syllabus-gallery-groupby-label">
                      {getString("schedule-settings-library")}
                    </span>
                  </div>
                  <label
                    className="flex items-center gap-2.5 cursor-pointer text-sm"
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
              </div>
            ) : null}
            {showLayout || showCheckboxes ? (
              <div className="syllabus-gallery-toolbar-section">
                {showLayout ? (
                  <div className="syllabus-gallery-toolbar-cluster">
                    <div className="syllabus-gallery-toolbar-heading">
                      <span className="syllabus-gallery-groupby-label">
                        {getString("gallery-menu-view")}
                      </span>
                      {showGlobal && layoutGlobal ? (
                        <GallerySaveGlobalButton globalSetting={layoutGlobal} />
                      ) : null}
                    </div>
                    <div
                      role="radiogroup"
                      aria-label={getString("gallery-menu-view")}
                      className="syllabus-gallery-groupby"
                    >
                      {LAYOUT_OPTIONS.map(
                        ({ mode, labelKey, titleKey, Icon }) => (
                          <button
                            key={mode}
                            type="button"
                            role="radio"
                            aria-checked={layout === mode}
                            title={getString(titleKey)}
                            className="syllabus-gallery-groupby-btn"
                            onClick={() => onLayoutChange?.(mode)}
                          >
                            <Icon
                              size={12}
                              strokeWidth={2}
                              aria-hidden="true"
                            />
                            {getString(labelKey)}
                          </button>
                        ),
                      )}
                    </div>
                  </div>
                ) : null}
                {showLayout && showScheduleCollection ? (
                  <GalleryPrefCheckbox
                    label={getString("schedule-apply-to-pinned")}
                    checked={applyToPinned}
                    onChange={setApplyToPinned}
                  />
                ) : null}
                {showCheckboxes ? (
                  <GalleryPrefCheckbox
                    label={getString("page-view-checkboxes")}
                    title={
                      readerMode
                        ? getString("page-reader-disable")
                        : getString("page-reader-enable")
                    }
                    checked={readerMode}
                    onChange={setReaderMode}
                    globalSetting={showGlobal ? readerModeGlobal : undefined}
                  />
                ) : null}
              </div>
            ) : null}
            {showDensity ||
            (showLayout && layout === "magazine" && onMagazinePackingChange) ||
            (showLayout && layout === "annotations") ? (
              <div className="syllabus-gallery-toolbar-section">
                {showDensity ? (
                  <GallerySegmentedControl
                    label={getString("settings-density")}
                    ariaLabel={getString("settings-density")}
                    value={density}
                    onChange={setDensity}
                    options={ITEM_DENSITIES.map((mode) => ({
                      mode,
                      label: densityLabel(mode),
                      title: getString(DENSITY_TITLE_IDS[mode]),
                      Icon: DENSITY_ICONS[mode],
                    }))}
                    globalSetting={showGlobal ? densityGlobal : undefined}
                  />
                ) : null}
                {showLayout &&
                layout === "magazine" &&
                onMagazinePackingChange ? (
                  <div className="syllabus-gallery-toolbar-cluster">
                    <div className="syllabus-gallery-toolbar-heading">
                      <span className="syllabus-gallery-groupby-label">
                        {getString("gallery-menu-packing")}
                      </span>
                      {showGlobal && magazinePackingGlobal ? (
                        <GallerySaveGlobalButton
                          globalSetting={magazinePackingGlobal}
                        />
                      ) : null}
                    </div>
                    <div
                      role="radiogroup"
                      aria-label={getString("gallery-menu-packing")}
                      className="syllabus-gallery-groupby"
                    >
                      {PACKING_OPTIONS.map(
                        ({ mode, labelKey, titleKey, Icon }) => (
                          <button
                            key={mode}
                            type="button"
                            role="radio"
                            aria-checked={magazinePacking === mode}
                            title={getString(titleKey)}
                            className="syllabus-gallery-groupby-btn"
                            onClick={() => onMagazinePackingChange(mode)}
                          >
                            <Icon
                              size={12}
                              strokeWidth={2}
                              aria-hidden="true"
                            />
                            {getString(labelKey)}
                          </button>
                        ),
                      )}
                    </div>
                  </div>
                ) : null}
                {showLayout && layout === "annotations" ? (
                  <>
                    <GallerySegmentedControl
                      label={getString("annotations-quote-order-menu")}
                      ariaLabel={getString("annotations-quote-order-menu")}
                      value={quoteOrder}
                      onChange={setQuoteOrder}
                      options={QUOTE_ORDER_OPTIONS.map(
                        ({ mode, labelKey, titleKey, Icon }) => ({
                          mode,
                          label: getString(labelKey),
                          title: getString(titleKey),
                          Icon,
                        }),
                      )}
                      globalSetting={showGlobal ? quoteOrderGlobal : undefined}
                    />
                    {colorFilterScope ? (
                      <AnnotationColorFilter
                        colors={annotationColors}
                        scope={colorFilterScope}
                        showGlobe={showGlobal}
                      />
                    ) : null}
                    <GalleryPrefCheckbox
                      label={getString("gallery-annotations-show-empty")}
                      checked={showItemsWithoutAnnotations}
                      onChange={setShowItemsWithoutAnnotations}
                      globalSetting={showGlobal ? showEmptyGlobal : undefined}
                    />
                  </>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function pointInRect(x: number, y: number, rect: DOMRect): boolean {
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

function eventInMenu(event: MouseEvent, root: HTMLElement): boolean {
  if (event.target instanceof Node && root.contains(event.target)) {
    return true;
  }
  const { clientX: x, clientY: y } = event;
  if (pointInRect(x, y, root.getBoundingClientRect())) {
    return true;
  }
  const popovers = Array.from(
    root.querySelectorAll(".syllabus-gallery-popover"),
  ) as HTMLElement[];
  for (const el of popovers) {
    if (pointInRect(x, y, el.getBoundingClientRect())) {
      return true;
    }
  }
  return false;
}
