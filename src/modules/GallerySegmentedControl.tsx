// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h } from "preact";
import { Globe, LayoutGrid } from "lucide-preact";
import { twMerge } from "tailwind-merge";
import { getString } from "../utils/locale";
import type { GalleryGlobalSetting } from "./galleryLayout";

export type GallerySegmentOption<T extends string> = {
  mode: T;
  label: string;
  title: string;
  Icon: typeof LayoutGrid;
};

export function GallerySegmentedControl<T extends string>({
  label,
  ariaLabel,
  value,
  onChange,
  options,
  tourPrefix,
  globalSetting,
}: {
  label: string;
  ariaLabel: string;
  value: T;
  onChange: (mode: T) => void;
  options: GallerySegmentOption<T>[];
  tourPrefix?: string;
  globalSetting?: GalleryGlobalSetting<T>;
}) {
  return (
    <div className="syllabus-gallery-toolbar-cluster">
      <div className="syllabus-gallery-toolbar-heading">
        <span className="syllabus-gallery-groupby-label">{label}</span>
        {globalSetting ? (
          <button
            type="button"
            className={twMerge(
              "syllabus-gallery-save-global",
              globalSetting.isCustom && "is-active",
            )}
            title={
              globalSetting.isCustom
                ? getString("gallery-save-globally-active-title")
                : getString("gallery-save-globally-title")
            }
            aria-label={getString("gallery-save-globally")}
            aria-pressed={globalSetting.isCustom}
            onClick={(event) => {
              event.stopPropagation();
              globalSetting.saveGlobally();
            }}
          >
            <Globe size={14} strokeWidth={2} aria-hidden="true" />
          </button>
        ) : null}
      </div>
      <div
        role="radiogroup"
        aria-label={ariaLabel}
        className="syllabus-gallery-groupby"
      >
        {options.map(({ mode, label: optionLabel, title, Icon }) => (
          <button
            key={mode}
            type="button"
            role="radio"
            aria-checked={value === mode}
            title={title}
            className="syllabus-gallery-groupby-btn"
            data-tour={tourPrefix ? `${tourPrefix}-${mode}` : undefined}
            onClick={() => onChange(mode)}
          >
            <Icon size={12} strokeWidth={2} aria-hidden="true" />
            {optionLabel}
          </button>
        ))}
      </div>
    </div>
  );
}
