// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h, Fragment } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { ArrowDown, ArrowUp, MoreHorizontal } from "lucide-preact";
import { getString } from "../utils/locale";
import { useBooleanPref } from "./react-zotero-sync/booleanPref";
import type { MyAnnotationsOrder } from "./myAnnotationsPrefs";

const ORDER_OPTIONS: {
  mode: MyAnnotationsOrder;
  labelKey:
    "my-annotations-order-newest-last" | "my-annotations-order-newest-first";
  titleKey:
    | "my-annotations-order-newest-last-title"
    | "my-annotations-order-newest-first-title";
  Icon: typeof ArrowDown;
}[] = [
  {
    mode: "newestLast",
    labelKey: "my-annotations-order-newest-last",
    titleKey: "my-annotations-order-newest-last-title",
    Icon: ArrowDown,
  },
  {
    mode: "newestFirst",
    labelKey: "my-annotations-order-newest-first",
    titleKey: "my-annotations-order-newest-first-title",
    Icon: ArrowUp,
  },
];

/** ⋯ menu: chronological order + Annotation Feed copy preferences. */
export function MyAnnotationsMenu({
  order,
  onOrder,
}: {
  order: MyAnnotationsOrder;
  onOrder: (mode: MyAnnotationsOrder) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const [blockquote, setBlockquote] = useBooleanPref(
    "myAnnotationsCopyBlockquote",
  );
  const [citeKey, setCiteKey] = useBooleanPref("myAnnotationsCopyCiteKey");

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
        data-tour="my-annotations-view-options"
        aria-label={getString("my-annotations-options-aria")}
        aria-haspopup="menu"
        aria-expanded={open}
        title={getString("my-annotations-options-aria")}
        onClick={() => setOpen((value) => !value)}
      >
        <MoreHorizontal size={18} strokeWidth={2} aria-hidden="true" />
      </button>
      {open ? (
        <div
          className="syllabus-gallery-popover"
          role="menu"
          aria-label={getString("my-annotations-options-aria")}
          data-tour="my-annotations-view-settings"
        >
          <div className="syllabus-gallery-toolbar">
            <div className="syllabus-gallery-toolbar-cluster">
              <div className="syllabus-gallery-toolbar-heading">
                <span className="syllabus-gallery-groupby-label">
                  {getString("my-annotations-menu-order")}
                </span>
              </div>
              <div
                role="radiogroup"
                aria-label={getString("my-annotations-menu-order")}
                className="syllabus-gallery-groupby"
              >
                {ORDER_OPTIONS.map(({ mode, labelKey, titleKey, Icon }) => (
                  <button
                    key={mode}
                    type="button"
                    role="radio"
                    aria-checked={order === mode}
                    title={getString(titleKey)}
                    className="syllabus-gallery-groupby-btn"
                    onClick={() => onOrder(mode)}
                  >
                    <Icon size={12} strokeWidth={2} aria-hidden="true" />
                    {getString(labelKey)}
                  </button>
                ))}
              </div>
            </div>
            <div className="syllabus-gallery-toolbar-cluster">
              <div className="syllabus-gallery-toolbar-heading">
                <span className="syllabus-gallery-groupby-label">
                  {getString("my-annotations-menu-copy")}
                </span>
              </div>
              <p className="text-secondary text-xs leading-snug m-0 max-w-72">
                {getString("my-annotations-menu-copy-desc")}
              </p>
              <label className="flex items-start gap-2.5 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={blockquote}
                  onChange={(e) => setBlockquote(e.currentTarget.checked)}
                  className="w-4 h-4 mt-0.5 cursor-pointer accent-accent-green! shrink-0"
                />
                <span className="font-medium leading-snug">
                  {getString("my-annotations-copy-blockquote")}
                </span>
              </label>
              <label className="flex items-start gap-2.5 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={citeKey}
                  onChange={(e) => setCiteKey(e.currentTarget.checked)}
                  className="w-4 h-4 mt-0.5 cursor-pointer accent-accent-green! shrink-0"
                />
                <span className="font-medium leading-snug">
                  {getString("my-annotations-copy-cite-key")}
                </span>
              </label>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
