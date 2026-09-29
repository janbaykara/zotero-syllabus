// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h, Fragment } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { Search, X } from "lucide-preact";
import { twMerge } from "tailwind-merge";
import { getString } from "../utils/locale";
import type { FluentMessageId } from "../../typings/i10n";
import type { MyAnnotationsSearchScope } from "./myAnnotationsPrefs";

const SEARCH_SCOPE_OPTIONS: Array<{
  mode: MyAnnotationsSearchScope;
  labelKey: FluentMessageId;
}> = [
  { mode: "both", labelKey: "my-annotations-search-scope-both" },
  {
    mode: "annotations",
    labelKey: "my-annotations-search-scope-annotations",
  },
  { mode: "fulltext", labelKey: "my-annotations-search-scope-fulltext" },
];

/** Search icon → gallery popover with query field + scope radios. */
export function MyAnnotationsSearchMenu({
  searchInput,
  onSearchInput,
  searchScope,
  onSearchScope,
  searchActive,
}: {
  searchInput: string;
  onSearchInput: (value: string, options?: { immediate?: boolean }) => void;
  searchScope: MyAnnotationsSearchScope;
  onSearchScope: (mode: MyAnnotationsSearchScope) => void;
  searchActive: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
        if (searchInput) {
          event.preventDefault();
          onSearchInput("");
          return;
        }
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
  }, [open, searchInput, onSearchInput]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const input = inputRef.current;
    if (!input) {
      return;
    }
    input.focus();
    const len = input.value.length;
    try {
      input.setSelectionRange(len, len);
    } catch {
      // Some search inputs do not support selection ranges.
    }
  }, [open]);

  return (
    <div className="syllabus-gallery-menu in-[.print]:hidden" ref={rootRef}>
      <button
        type="button"
        className={twMerge(
          "syllabus-gallery-menu-btn",
          searchActive && "is-search-active",
        )}
        data-tour="my-annotations-search"
        aria-label={getString("my-annotations-search-aria")}
        aria-haspopup="dialog"
        aria-expanded={open}
        title={getString("my-annotations-search-aria")}
        onClick={() => setOpen((value) => !value)}
      >
        <Search size={18} strokeWidth={2} aria-hidden="true" />
      </button>
      {open ? (
        <div
          className="syllabus-gallery-popover syllabus-my-annotations-search-popover"
          role="dialog"
          aria-label={getString("my-annotations-search-aria")}
          data-tour="my-annotations-search-panel"
        >
          <div className="syllabus-gallery-toolbar">
            <div className="syllabus-gallery-toolbar-cluster">
              <div className="syllabus-my-annotations-search-field">
                <input
                  ref={inputRef}
                  type="search"
                  value={searchInput}
                  onInput={(e) =>
                    onSearchInput((e.target as HTMLInputElement).value)
                  }
                  onSearch={(e) =>
                    onSearchInput((e.target as HTMLInputElement).value)
                  }
                  onPaste={(e) => {
                    const input = e.currentTarget as HTMLInputElement;
                    const pasted = e.clipboardData?.getData("text") ?? "";
                    if (!pasted) {
                      return;
                    }
                    e.preventDefault();
                    const start = input.selectionStart ?? searchInput.length;
                    const end = input.selectionEnd ?? searchInput.length;
                    const next =
                      searchInput.slice(0, start) +
                      pasted +
                      searchInput.slice(end);
                    onSearchInput(next, { immediate: true });
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      e.stopPropagation();
                      if (searchInput) {
                        e.preventDefault();
                        onSearchInput("");
                        return;
                      }
                      setOpen(false);
                    }
                  }}
                  placeholder={getString("my-annotations-search-placeholder")}
                  aria-label={getString("my-annotations-search-aria")}
                  className="syllabus-my-annotations-search-input w-full box-border min-w-64 px-2 py-1 text-base rounded-md border border-quinary bg-background text-secondary focus:outline-3 focus:outline-accent-blue focus:outline-offset-2"
                />
                <button
                  type="button"
                  className="syllabus-gallery-save-global"
                  disabled={!searchInput}
                  title={getString("my-annotations-search-clear")}
                  aria-label={getString("my-annotations-search-clear")}
                  data-tour="my-annotations-search-clear"
                  onClick={() => {
                    onSearchInput("");
                    const input = inputRef.current;
                    if (input) {
                      input.focus();
                    }
                  }}
                >
                  <X size={14} strokeWidth={2} aria-hidden="true" />
                </button>
              </div>
            </div>
            <div className="syllabus-gallery-toolbar-cluster">
              <div className="syllabus-gallery-toolbar-heading">
                <span className="syllabus-gallery-groupby-label">
                  {getString("my-annotations-search-scope-aria")}
                </span>
              </div>
              <div
                role="radiogroup"
                aria-label={getString("my-annotations-search-scope-aria")}
                className="syllabus-my-annotations-search-scope"
              >
                {SEARCH_SCOPE_OPTIONS.map(({ mode, labelKey }) => (
                  <label
                    key={mode}
                    className="syllabus-my-annotations-search-scope-option"
                  >
                    <input
                      type="radio"
                      name="my-annotations-search-scope"
                      value={mode}
                      checked={searchScope === mode}
                      onChange={() => onSearchScope(mode)}
                    />
                    {getString(labelKey)}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
