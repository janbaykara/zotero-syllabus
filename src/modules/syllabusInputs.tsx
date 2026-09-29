import type { ItemDensity } from "./react-zotero-sync/itemDensity";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h, Fragment } from "preact";
import { flushSync } from "preact/compat";
import { useState, useEffect, useLayoutEffect, useRef } from "preact/hooks";
import type { JSX } from "preact";
import { twMerge } from "tailwind-merge";
import { SettingsClassMetadata } from "./syllabus";
import { useDebouncedEffect } from "../utils/react/useDebouncedEffect";
import { ProseText } from "./ProseText";
import { getString } from "../utils/locale";
import {
  formatReadingDate,
  parseReadingDate,
  toLocalDateKey,
} from "../utils/dates";

function readingDateToInputValue(iso: string | undefined | null): string {
  if (!iso) {
    return "";
  }
  const date = parseReadingDate(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return toLocalDateKey(date);
}

function isoFromInputValue(value: string): string {
  const date = parseReadingDate(value);
  return new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  ).toISOString();
}

export function ReadingDateInput({
  initialValue,
  onSave,
  density = "expanded",
}: {
  initialValue?: SettingsClassMetadata["readingDate"]; // ISO date string
  /** @deprecated Ignored — Add due date seeds today. */
  defaultDate?: SettingsClassMetadata["readingDate"];
  onSave: (date: string | undefined) => void | Promise<void>;
  density?: ItemDensity;
}) {
  const [value, setValue] = useState(readingDateToInputValue(initialValue));
  const [picking, setPicking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const pickingRef = useRef(false);
  pickingRef.current = picking;

  useEffect(() => {
    // Avoid clobbering an in-progress pick with a stale prop write.
    if (pickingRef.current) {
      return;
    }
    setValue(readingDateToInputValue(initialValue));
  }, [initialValue]);

  useDebouncedEffect(
    () => {
      // Don't persist while the native picker is open — a parent re-render
      // remounts the input and detaches the popup.
      if (pickingRef.current) {
        return;
      }
      if (value) {
        const isoString = isoFromInputValue(value);
        if (isoString !== initialValue) {
          onSave(isoString);
        }
      } else if (initialValue) {
        onSave(undefined);
      }
    },
    [initialValue, value, picking],
    500,
  );

  function clear() {
    setValue("");
    setPicking(false);
    onSave(undefined);
  }

  function startPicking() {
    const today = toLocalDateKey(new Date());
    // Commit DOM synchronously inside the click gesture so showPicker()
    // targets the same input the user activated.
    flushSync(() => {
      setValue(today);
      setPicking(true);
    });
    const el = inputRef.current;
    if (!el) {
      return;
    }
    el.focus();
    try {
      (el as HTMLInputElement & { showPicker?: () => void }).showPicker?.();
    } catch {
      // showPicker can throw if the input isn't eligible
    }
  }

  function syncFromInput() {
    const live = inputRef.current?.value;
    if (live != null && live !== "") {
      setValue(live);
    }
  }

  function onDateChange(e: JSX.TargetedEvent<HTMLInputElement>) {
    setValue(e.currentTarget.value);
  }

  function onPickerBlur() {
    // Native pickers often blur before `change`, and swapping trees on
    // setPicking(false) used to remount the input and drop the selection.
    // Read the live DOM value first, keep the same <input>, then exit pick.
    window.setTimeout(() => {
      syncFromInput();
      setPicking(false);
    }, 250);
  }

  const linkButtonClass =
    "inline-flex items-center justify-center gap-1 cursor-pointer bg-transparent border-0 p-0 text-xs text-secondary hover:text-primary";
  const hoverRevealClass =
    "hidden group-hover/class:inline-flex group-focus-within/class:inline-flex";
  const idleHideOnHoverClass =
    "inline-flex group-hover/class:hidden group-focus-within/class:hidden";

  const dateInputClass = twMerge(
    "px-2 py-1 border border-quinary rounded-md bg-background text-secondary focus:outline-3 focus:outline-accent-blue focus:outline-offset-2",
    density !== "expanded" ? "text-sm" : "text-base",
  );

  const showAdd = !value && !picking;
  const showIdle = Boolean(value) && !picking;
  const showEditor = picking || Boolean(value);

  return (
    <div
      className="flex flex-row items-center gap-2"
      data-tour="syllabus-class-reading-date"
    >
      {showAdd ? (
        <button
          key="add"
          type="button"
          className={twMerge(linkButtonClass, hoverRevealClass)}
          onClick={startPicking}
        >
          <span
            className="syllabus-class-add-icon syllabus-class-add-icon-due-date"
            aria-hidden="true"
          />
          {getString("due-date-add")}
        </button>
      ) : null}

      {showIdle ? (
        <div
          key="idle"
          className={twMerge(
            idleHideOnHoverClass,
            "items-baseline gap-1 text-secondary",
          )}
        >
          <span className="text-tertiary">
            {getString("class-due-date-label")}{" "}
          </span>
          <span className="text-secondary">
            {formatReadingDate(value || initialValue || "")}
          </span>
        </div>
      ) : null}

      {showEditor ? (
        <div
          key="editor"
          className={twMerge(
            "flex-row items-center gap-2",
            // Keep this node mounted across pick → idle so the <input> is
            // not recreated (that detaches an open native date picker).
            picking ? "inline-flex" : hoverRevealClass,
          )}
        >
          <button type="button" className={linkButtonClass} onClick={clear}>
            {getString("due-date-clear")}
          </button>
          <input
            ref={inputRef}
            type="date"
            value={value}
            onInput={onDateChange}
            onChange={onDateChange}
            onBlur={picking ? onPickerBlur : undefined}
            className={dateInputClass}
            placeholder={getString("placeholder-select-date")}
          />
        </div>
      ) : null}
    </div>
  );
}

function supportsCssFieldSizing(): boolean {
  try {
    return (
      typeof CSS !== "undefined" &&
      typeof CSS.supports === "function" &&
      CSS.supports("field-sizing", "content")
    );
  } catch {
    return false;
  }
}

export function TextInput({
  initialValue,
  onSave,
  placeholder,
  elementType = "input",
  emptyBehavior = "reset",
  className,
  containerClassName,
  fieldSizing = "content",
  readOnly = false,
  ...elementProps
}: {
  initialValue: string;
  onSave: (value: string) => void | Promise<void>;
  placeholder?: string;
  emptyBehavior?: "reset" | "delete";
  elementType?: "input" | "textarea";
  className?: string;
  fieldSizing?: "content" | "fixed" | "auto";
  readOnly?: boolean;
  containerClassName?: string;
} & JSX.HTMLAttributes<HTMLInputElement | HTMLTextAreaElement>) {
  const [value, setValue] = useState(initialValue);
  const [editing, setEditing] = useState(false);
  const focusedRef = useRef(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const valueRef = useRef(value);
  const initialValueRef = useRef(initialValue);
  const onSaveRef = useRef(onSave);
  const emptyBehaviorRef = useRef(emptyBehavior);

  valueRef.current = value;
  initialValueRef.current = initialValue;
  onSaveRef.current = onSave;
  emptyBehaviorRef.current = emptyBehavior;

  function save(next: string) {
    onSaveRef.current(
      emptyBehaviorRef.current === "reset"
        ? next || initialValueRef.current
        : next,
    );
  }

  useEffect(() => {
    if (focusedRef.current) {
      return;
    }
    setValue(initialValue);
  }, [initialValue]);

  useDebouncedEffect(
    () => {
      if (value !== initialValue) {
        save(value);
      }
    },
    [initialValue, value],
    500,
  );

  // Flush pending edits if the field unmounts before debounce/blur fires
  useEffect(() => {
    return () => {
      const pending = valueRef.current;
      const committed = initialValueRef.current;
      if (pending !== committed) {
        onSaveRef.current(
          emptyBehaviorRef.current === "reset" ? pending || committed : pending,
        );
      }
    };
  }, []);

  useLayoutEffect(() => {
    if (
      fieldSizing !== "content" ||
      elementType !== "textarea" ||
      !inputRef.current
    ) {
      return;
    }
    const el = inputRef.current;
    if (supportsCssFieldSizing()) {
      el.style.height = "";
      el.removeAttribute("rows");
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    if (value) {
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
      el.removeAttribute("rows");
    } else {
      el.style.height = "auto";
      el.setAttribute("rows", "1");
    }
    if (el.ownerDocument.activeElement === el && start != null && end != null) {
      el.setSelectionRange(start, end);
    }
  }, [value, fieldSizing, elementType, editing]);

  useLayoutEffect(() => {
    if (elementType !== "textarea" || !editing || readOnly) {
      return;
    }
    const el = inputRef.current;
    if (!el) {
      return;
    }
    el.focus();
    const len = el.value.length;
    try {
      el.setSelectionRange(len, len);
    } catch {
      // Some inputs reject setSelectionRange
    }
  }, [editing, elementType, readOnly]);

  // Hide the entire component when readOnly and no value
  if (readOnly && !value && !initialValue) {
    return null;
  }

  const displayValue = value || initialValue || "";
  const hasContent = Boolean(displayValue.trim());
  const resolvedPlaceholder =
    placeholder || getString("placeholder-add-description");

  function beginEditing() {
    if (readOnly) {
      return;
    }
    setEditing(true);
  }

  function onRenderedClick(e: JSX.TargetedMouseEvent<HTMLDivElement>) {
    const target = e.target as Element | null;
    if (target?.closest?.("a")) {
      return;
    }
    beginEditing();
  }

  // Single-line inputs keep always-editable behavior
  if (elementType === "input") {
    return (
      <>
        {h(elementType, {
          ...elementProps,
          ref: inputRef,
          type: "text",
          value,
          readOnly,
          disabled: readOnly,
          onChange: readOnly
            ? undefined
            : (e: JSX.TargetedEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                setValue((e.target as HTMLInputElement).value),
          onFocus: readOnly
            ? undefined
            : () => {
                focusedRef.current = true;
              },
          onBlur: readOnly
            ? undefined
            : () => {
                focusedRef.current = false;
                save(value);
              },
          onKeyDown: readOnly
            ? undefined
            : (
                e: JSX.TargetedKeyboardEvent<
                  HTMLInputElement | HTMLTextAreaElement
                >,
              ) => {
                if (e.key === "Escape") {
                  e.preventDefault();
                  e.currentTarget.blur();
                  save(value);
                  return;
                }
                if (e.key === "Enter") {
                  e.preventDefault();
                  e.currentTarget.blur();
                  save(value);
                }
              },
          onSelect: readOnly
            ? (
                e: JSX.TargetedEvent<HTMLInputElement | HTMLTextAreaElement>,
              ) => {
                e.preventDefault();
                e.currentTarget.setSelectionRange(0, 0);
              }
            : undefined,
          onClick: readOnly
            ? (
                e: JSX.TargetedMouseEvent<
                  HTMLInputElement | HTMLTextAreaElement
                >,
              ) => {
                e.preventDefault();
                e.currentTarget.blur();
              }
            : undefined,
          placeholder: readOnly ? undefined : resolvedPlaceholder,
          className: twMerge(
            "bg-transparent border-none focus:outline-3 focus:outline-accent-blue focus:rounded-xs focus:outline-offset-2 field-sizing-content in-[.print]:hidden",
            readOnly && "cursor-default select-none",
            className,
          ),
          style: {
            "--color-focus-border": "var(--color-accent-blue)",
          },
        })}
        <div
          className="hidden in-[.print]:block"
          style={{ whiteSpace: "normal" }}
        >
          {displayValue}
        </div>
      </>
    );
  }

  const showEditor = !readOnly && editing;
  const showRendered = hasContent && (readOnly || !editing);
  const showEmptyPrompt = !readOnly && !editing && !hasContent;

  return (
    <div className={twMerge("w-full", containerClassName)}>
      {showEditor ? (
        <>
          <textarea
            {...(elementProps as JSX.HTMLAttributes<HTMLTextAreaElement>)}
            ref={inputRef as { current: HTMLTextAreaElement | null }}
            value={value}
            onChange={(e) => setValue((e.target as HTMLTextAreaElement).value)}
            onFocus={() => {
              focusedRef.current = true;
            }}
            onBlur={() => {
              focusedRef.current = false;
              save(value);
              setEditing(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                e.currentTarget.blur();
                save(value);
              }
            }}
            placeholder={resolvedPlaceholder}
            className={twMerge(
              "bg-transparent border-none focus:outline-3 focus:outline-accent-blue focus:rounded-xs focus:outline-offset-2 field-sizing-content in-[.print]:hidden w-full",
              className,
            )}
            style={{
              "--color-focus-border": "var(--color-accent-blue)",
            }}
          />
          <div className="hidden in-[.print]:block">
            <ProseText text={displayValue} />
          </div>
        </>
      ) : null}

      {showRendered ? (
        <div
          className={twMerge(
            !readOnly && "cursor-text",
            "focus-within:outline-3 focus-within:outline-accent-blue focus-within:rounded-xs focus-within:outline-offset-2",
            className,
          )}
        >
          <ProseText text={displayValue} onClick={onRenderedClick} />
        </div>
      ) : null}

      {showEmptyPrompt ? (
        <button
          type="button"
          className={twMerge(
            "bg-transparent border-none p-0 m-0 text-left w-full cursor-text",
            className,
            "text-tertiary",
          )}
          onClick={beginEditing}
        >
          {resolvedPlaceholder}
        </button>
      ) : null}
    </div>
  );
}
