// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h, Fragment } from "preact";
import { useCallback } from "preact/hooks";
import { twMerge } from "tailwind-merge";
import { isZotero8OrLater } from "../utils/zotero";
import { getString } from "../utils/locale";
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
    <div className="syllabus-page overflow-y-auto overflow-x-hidden h-full">
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
                Reading Schedule Settings
              </div>
              <div className="inline-flex items-center gap-2 shrink grow-0">
                <button
                  type="button"
                  onClick={onBack}
                  title="Back to reading schedule"
                  aria-label="Back to reading schedule"
                >
                  ← Back
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
            <h2 className="text-2xl font-semibold">Library collection</h2>
            <p className="text-secondary">
              Off by default. When enabled, a top-level “Reading Schedule”
              collection is kept in each library that has a syllabus, with a
              folder for each recent and upcoming reading date. Group syllabi
              get their own schedule because items cannot cross libraries.
              Folders are created, renamed, and filled automatically. Turning
              this off deletes those collections; syllabus items stay in place.
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
                Generate “Reading Schedule” collection?
              </span>
            </label>
          </section>
        </div>
      </div>
    </div>
  );
}
