// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h, Fragment } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { Maximize2, MoreHorizontal, Rows2, Rows3 } from "lucide-preact";
import { getString } from "../utils/locale";
import {
  ITEM_DENSITY_CYCLE,
  useZoteroItemDensity,
  type ItemDensity,
} from "./react-zotero-sync/itemDensity";
import { useZoteroReaderMode } from "./react-zotero-sync/readerMode";
import { densityLabel } from "./browsePage";
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

export function SyllabusViewMenu() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const [density, setDensity] = useZoteroItemDensity();
  const [readerMode, setReaderMode] = useZoteroReaderMode();

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
                {ITEM_DENSITY_CYCLE.map((mode) => {
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
          </div>
        </div>
      ) : null}
    </div>
  );
}
