// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h } from "preact";
import type { JSX } from "preact";
import { Check, X } from "lucide-preact";
import { twMerge } from "tailwind-merge";
import { getString } from "../utils/locale";
import {
  annotationSwatchUsesDarkMark,
  toggleAnnotationColorFilter,
} from "../utils/annotationColors";
import { useAnnotationColorFilter } from "./myAnnotationsPrefs";

/** Swatch group of colours that actually exist; multiple can be on. */
export function AnnotationColorFilter({
  colors,
  scope,
}: {
  colors: string[];
  scope: string;
}) {
  const [colorFilter, setColorFilter] = useAnnotationColorFilter(scope);
  if (colors.length === 0) {
    return null;
  }
  return (
    <div className="syllabus-gallery-toolbar-cluster">
      <div className="syllabus-gallery-toolbar-heading">
        <span className="syllabus-gallery-groupby-label">
          {getString("my-annotations-menu-color")}
        </span>
        <button
          type="button"
          className="syllabus-gallery-save-global"
          disabled={colorFilter.length === 0}
          title={getString("my-annotations-menu-color-clear")}
          aria-label={getString("my-annotations-menu-color-clear")}
          onClick={(event) => {
            event.stopPropagation();
            setColorFilter([]);
          }}
        >
          <X size={14} strokeWidth={2} aria-hidden="true" />
        </button>
      </div>
      <div
        role="group"
        aria-label={getString("my-annotations-menu-color")}
        className="syllabus-annotation-color-filter"
      >
        {colors.map((hex) => {
          const checked = colorFilter.includes(hex);
          const label = getString("my-annotations-color-swatch", {
            args: { color: hex },
          });
          return (
            <button
              key={hex}
              type="button"
              role="checkbox"
              aria-checked={checked}
              aria-label={label}
              title={label}
              className={twMerge(
                "syllabus-annotation-color-filter-btn",
                annotationSwatchUsesDarkMark(hex) && "is-light",
              )}
              style={{ "--swatch-color": hex } as JSX.CSSProperties}
              onClick={() =>
                setColorFilter(toggleAnnotationColorFilter(colorFilter, hex))
              }
            >
              {checked ? (
                <Check size={12} strokeWidth={2.5} aria-hidden="true" />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
