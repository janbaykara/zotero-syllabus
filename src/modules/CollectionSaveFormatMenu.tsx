// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h, Fragment } from "preact";
import { useLayoutEffect, useRef, useState } from "preact/hooks";
import type { JSX } from "preact";
import {
  CodeXml,
  FileText,
  FileType,
  Globe,
  Hash,
  Printer,
} from "lucide-preact";
import { getString, getUiDir } from "../utils/locale";
import type { SyllabusExportFormat } from "../utils/exportSyllabus";

function useSaveFormatPopover(
  open: boolean,
  setOpen: (open: boolean) => void,
  rootRef: { current: HTMLDivElement | null },
): JSX.CSSProperties {
  const [popoverStyle, setPopoverStyle] = useState<JSX.CSSProperties>({});
  const setOpenRef = useRef(setOpen);
  setOpenRef.current = setOpen;

  useLayoutEffect(() => {
    if (!open) {
      return;
    }
    const doc = rootRef.current?.ownerDocument || document;
    const updatePosition = () => {
      const el = rootRef.current;
      if (!el) {
        return;
      }
      const rect = el.getBoundingClientRect();
      const view = doc.documentElement;
      setPopoverStyle(
        getUiDir() === "rtl"
          ? { top: rect.bottom + 6, left: rect.left }
          : { top: rect.bottom + 6, right: view.clientWidth - rect.right },
      );
    };
    updatePosition();
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current?.contains(event.target as Node)) {
        return;
      }
      setOpenRef.current(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenRef.current(false);
      }
    };
    const win = doc.defaultView;
    win?.addEventListener("resize", updatePosition);
    doc.addEventListener("pointerdown", onPointerDown, true);
    doc.addEventListener("keydown", onKeyDown);
    return () => {
      win?.removeEventListener("resize", updatePosition);
      doc.removeEventListener("pointerdown", onPointerDown, true);
      doc.removeEventListener("keydown", onKeyDown);
    };
  }, [open, rootRef]);

  return popoverStyle;
}

const SAVE_FORMAT_OPTIONS: {
  format: SyllabusExportFormat;
  labelKey:
    | "page-save-pdf"
    | "page-save-word"
    | "page-save-markdown"
    | "page-save-html";
  Icon: typeof FileText;
}[] = [
  { format: "pdf", labelKey: "page-save-pdf", Icon: FileText },
  { format: "docx", labelKey: "page-save-word", Icon: FileType },
  { format: "markdown", labelKey: "page-save-markdown", Icon: Hash },
  { format: "html", labelKey: "page-save-html", Icon: CodeXml },
];

type SaveMenuAction =
  { kind: "export"; format: SyllabusExportFormat } | { kind: "publish" };

export function CollectionSaveFormatMenu({
  onSelect,
  onPublish,
  hasClassNotes = false,
  /** Gallery header: globe that publishes only (no local export popover). */
  compact = false,
}: {
  onSelect?: (format: SyllabusExportFormat) => void;
  onPublish: () => void;
  /** When the collection has class notes, remind that they stay private. */
  hasClassNotes?: boolean;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const popoverStyle = useSaveFormatPopover(open, setOpen, rootRef);

  // Gallery: one-click publish — no Word/PDF/Markdown/HTML menu.
  if (compact) {
    return (
      <div
        className="syllabus-save-format relative grow-0 shrink-0 in-[.print]:hidden"
        ref={rootRef}
      >
        <div
          className="syllabus-save-format-trigger"
          title={getString("page-publish")}
          aria-label={getString("page-publish")}
          role="button"
          tabIndex={0}
          onClick={() => onPublish()}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onPublish();
            }
          }}
        >
          <Globe size={18} strokeWidth={2} aria-hidden="true" />
        </div>
      </div>
    );
  }

  const run = (action: SaveMenuAction) => {
    setOpen(false);
    if (action.kind === "export") {
      onSelect?.(action.format);
    } else {
      onPublish();
    }
  };

  return (
    <div
      className="syllabus-save-format relative grow-0 shrink-0 in-[.print]:hidden"
      ref={rootRef}
    >
      <div
        className="syllabus-save-format-trigger flex items-center cursor-pointer"
        title={getString("page-print")}
        aria-label={getString("page-print")}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
      >
        <Printer
          size={20}
          strokeWidth={2}
          className="text-secondary hover:text-primary hover:bg-quinary rounded p-1"
          aria-hidden="true"
        />
      </div>
      {open ? (
        <div
          className="syllabus-explorer-configure-popover syllabus-save-format-popover"
          role="menu"
          aria-label={getString("page-print")}
          style={popoverStyle}
        >
          <ul className="syllabus-explorer-configure-list">
            {SAVE_FORMAT_OPTIONS.map(({ format, labelKey, Icon }) => (
              <li key={format}>
                <button
                  type="button"
                  role="menuitem"
                  className="syllabus-save-format-option"
                  onClick={() => run({ kind: "export", format })}
                >
                  <Icon size={16} strokeWidth={2} aria-hidden="true" />
                  {getString(labelKey)}
                </button>
              </li>
            ))}
            <li>
              <button
                type="button"
                role="menuitem"
                className="syllabus-save-format-option"
                onClick={() => run({ kind: "publish" })}
              >
                <Globe size={16} strokeWidth={2} aria-hidden="true" />
                {getString("page-publish")}
              </button>
            </li>
          </ul>
          {hasClassNotes ? (
            <>
              <hr className="syllabus-save-format-divider" />
              <p className="syllabus-save-format-note">
                {getString("print-notes-excluded")}
              </p>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
