// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h, Fragment } from "preact";
import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import { MoreHorizontal } from "lucide-preact";
import { getString } from "../utils/locale";
import { confirmPrompt } from "../utils/window";
import { useReadingScheduleCollectionPref } from "./react-zotero-sync/readingScheduleCollectionPref";

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

export function ReadingScheduleSettingsMenu() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const [generateCollection, setGenerateCollection] =
    useReadingScheduleCollectionPref();

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
    <div className="syllabus-gallery-menu" ref={rootRef}>
      <button
        type="button"
        className="syllabus-gallery-menu-btn"
        data-tour="reading-schedule-settings-button"
        aria-label={getString("schedule-edit-settings")}
        aria-haspopup="menu"
        aria-expanded={open}
        title={getString("schedule-edit-settings")}
        onClick={() => setOpen((value) => !value)}
      >
        <MoreHorizontal size={18} strokeWidth={2} aria-hidden="true" />
      </button>
      {open ? (
        <div
          className="syllabus-gallery-popover"
          role="menu"
          aria-label={getString("schedule-settings-title")}
          data-tour="reading-schedule-settings"
        >
          <div className="syllabus-gallery-toolbar">
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
          </div>
        </div>
      ) : null}
    </div>
  );
}
