// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h } from "preact";
import { useRef } from "preact/hooks";
import { Plus, X } from "lucide-preact";
import { getString } from "../utils/locale";
import { openAnnotationTagFilterPopup } from "../utils/annotationTagFilterPopup";
import {
  setAnnotationTagFilter,
  tagFilterInheritsDefault,
  useAnnotationTagFilter,
} from "./myAnnotationsPrefs";
import { GallerySaveGlobalButton } from "./GallerySegmentedControl";

/** Opens Zotero's native annotation tags-box to pick one or more filter tags. */
export function AnnotationTagFilter({
  libraryID,
  scope,
  showGlobe: showGlobeProp,
}: {
  libraryID: number;
  scope: string;
  showGlobe?: boolean;
}) {
  const [tagFilter, setTagFilter, tagFilterGlobal] =
    useAnnotationTagFilter(scope);
  const showGlobe = (showGlobeProp ?? true) && tagFilterInheritsDefault(scope);
  const addButtonRef = useRef<HTMLButtonElement>(null);

  const openPicker = () => {
    const anchor = addButtonRef.current;
    if (!anchor) {
      return;
    }
    openAnnotationTagFilterPopup({
      libraryID,
      selected: tagFilter,
      anchor,
      // Pref write so filtering updates even if the options menu closes.
      onChange: (tags) => setAnnotationTagFilter(scope, tags),
    });
  };

  const removeTag = (tag: string) => {
    const key = tag.toLowerCase();
    setTagFilter(tagFilter.filter((entry) => entry.toLowerCase() !== key));
  };

  return (
    <div className="syllabus-gallery-toolbar-cluster">
      <div className="syllabus-gallery-toolbar-heading">
        <span className="syllabus-gallery-groupby-label">
          {getString("my-annotations-menu-tag")}
        </span>
        <div className="syllabus-gallery-toolbar-heading-actions">
          <button
            type="button"
            className="syllabus-gallery-save-global"
            disabled={tagFilter.length === 0}
            title={getString("my-annotations-menu-tag-clear")}
            aria-label={getString("my-annotations-menu-tag-clear")}
            onClick={(event) => {
              event.stopPropagation();
              setTagFilter([]);
            }}
          >
            <X size={14} strokeWidth={2} aria-hidden="true" />
          </button>
          {showGlobe ? (
            <GallerySaveGlobalButton globalSetting={tagFilterGlobal} />
          ) : null}
        </div>
      </div>
      <div
        role="group"
        aria-label={getString("my-annotations-menu-tag")}
        className="syllabus-annotation-tag-filter"
      >
        {tagFilter.map((tag) => {
          const removeLabel = getString("my-annotations-menu-tag-remove", {
            args: { tag },
          });
          return (
            <span
              key={tag.toLowerCase()}
              className="syllabus-annotation-tag-pill"
            >
              <span className="syllabus-annotation-tag-pill-label" title={tag}>
                {tag}
              </span>
              <button
                type="button"
                className="syllabus-annotation-tag-pill-remove"
                title={removeLabel}
                aria-label={removeLabel}
                onClick={(event) => {
                  event.stopPropagation();
                  removeTag(tag);
                }}
              >
                <X size={11} strokeWidth={2.5} aria-hidden="true" />
              </button>
            </span>
          );
        })}
        <button
          ref={addButtonRef}
          type="button"
          className="syllabus-annotation-tag-filter-add"
          aria-label={getString("my-annotations-menu-tag-add")}
          title={getString("my-annotations-menu-tag-add")}
          onClick={(event) => {
            event.stopPropagation();
            openPicker();
          }}
        >
          <Plus size={14} strokeWidth={2} aria-hidden="true" />
          <span>{getString("my-annotations-menu-tag-add")}</span>
        </button>
      </div>
    </div>
  );
}
