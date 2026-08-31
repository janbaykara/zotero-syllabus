// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h, Fragment } from "preact";
import { useCallback } from "preact/hooks";
import { twMerge } from "tailwind-merge";
import { isZotero8OrLater } from "../utils/zotero";
import { getString, getUiDir } from "../utils/locale";
import { confirmPrompt } from "../utils/window";
import { useZoteroCompactMode } from "./react-zotero-sync/compactMode";
import { useReadingScheduleCollectionPref } from "./react-zotero-sync/readingScheduleCollectionPref";

interface ReadingScheduleSettingsPageProps {
  onBack: () => void;
}

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

export function ReadingScheduleSettingsPage({
  onBack,
}: ReadingScheduleSettingsPageProps) {
  const [compactMode] = useZoteroCompactMode();
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

  return (
    <div
      className="syllabus-page overflow-y-auto overflow-x-hidden h-full"
      dir={getUiDir()}
    >
      <div className="pb-12">
        <div
          className={twMerge(
            "sticky top-0 z-10 bg-background py-1",
            isZotero8OrLater() ? "md:pt-8" : "pt-8",
          )}
        >
          <div className="container-padded bg-background">
            <div className="flex flex-row items-center gap-4 justify-between">
              <div className="flex-1 text-3xl font-semibold">
                {getString("schedule-settings-title")}
              </div>
              <div className="inline-flex items-center gap-2 shrink grow-0">
                <button
                  type="button"
                  onClick={onBack}
                  title={getString("schedule-settings-back")}
                  aria-label={getString("schedule-settings-back")}
                >
                  ← {getString("nav-back")}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="container-padded mt-8 space-y-8">
          <section
            className="space-y-4"
            data-tour="reading-schedule-generate-collection"
          >
            <h2 className="text-2xl font-semibold">
              {getString("schedule-settings-library")}
            </h2>
            <p className="text-secondary">
              {getString("schedule-settings-desc")}
            </p>
            <label
              className={twMerge(
                "flex items-center gap-3 cursor-pointer",
                compactMode ? "text-sm" : "text-base",
              )}
            >
              <input
                type="checkbox"
                checked={generateCollection}
                onChange={(e) =>
                  handleGenerateCollectionChange(e.currentTarget.checked)
                }
                className="w-4 h-4 cursor-pointer accent-accent-green!"
              />
              <span className="font-medium">
                {getString("schedule-settings-checkbox")}
              </span>
            </label>
          </section>
        </div>
      </div>
    </div>
  );
}
