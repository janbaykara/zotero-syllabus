// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h, Fragment } from "preact";
import { useState, useEffect, useLayoutEffect, useRef } from "preact/hooks";
import type { JSX } from "preact";
import { twMerge } from "tailwind-merge";
import { SettingsClassMetadata } from "./syllabus";
import { useDebouncedEffect } from "../utils/react/useDebouncedEffect";
import { ProseText } from "./ProseText";

export function ReadingDateInput({
  initialValue,
  defaultDate,
  onSave,
  compactMode = false,
}: {
  initialValue?: SettingsClassMetadata["readingDate"]; // ISO date string
  defaultDate?: SettingsClassMetadata["readingDate"]; // ISO date string from previous class
  onSave: (date: string | undefined) => void | Promise<void>;
  compactMode?: boolean;
}) {
  const [value, setValue] = useState(
    initialValue ? new Date(initialValue).toISOString().split("T")[0] : "",
  );

  useEffect(() => {
    if (initialValue) {
      setValue(new Date(initialValue).toISOString().split("T")[0]);
    } else {
      setValue("");
    }
  }, [initialValue]);

  const handleFocus = () => {
    // If the field is empty and we have a default date, populate it
    if (!value && defaultDate) {
      const defaultDateString = new Date(defaultDate)
        .toISOString()
        .split("T")[0];
      setValue(defaultDateString);
    }
  };

  useDebouncedEffect(
    () => {
      if (value) {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          const isoString = date.toISOString();
          if (isoString !== initialValue) {
            onSave(isoString);
          }
        }
      } else if (initialValue) {
        onSave(undefined);
      }
    },
    [initialValue, value],
    500,
  );

  function clear() {
    setValue("");
    onSave(undefined);
  }

  return (
    <div
      className="flex flex-row items-center gap-2"
      data-tour="syllabus-class-reading-date"
    >
      <label
        className={twMerge(
          "text-tertiary shrink-0",
          compactMode ? "text-sm" : "text-base",
        )}
      >
        {value ? (
          <span
            onClick={clear}
            className="underline text-secondary cursor-pointer"
          >
            Clear due date
          </span>
        ) : (
          <span>Add a due date</span>
        )}
      </label>
      <input
        type="date"
        value={value}
        onChange={(e) => setValue(e.currentTarget.value)}
        onFocus={handleFocus}
        className={twMerge(
          "px-2 py-1 border border-quinary rounded-md bg-background text-secondary focus:outline-3 focus:outline-accent-blue focus:outline-offset-2",
          compactMode ? "text-sm" : "text-base",
        )}
        placeholder="Select date"
      />
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
  }, [value, fieldSizing, elementType]);

  // Hide the entire component when readOnly and no value
  if (readOnly && !value && !initialValue) {
    return null;
  }

  const displayValue = value || initialValue || "";

  const el = (
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
              if (e.key === "Enter" && elementType !== "textarea") {
                e.preventDefault();
                e.currentTarget.blur();
                save(value);
              }
            },
        onSelect: readOnly
          ? (e: JSX.TargetedEvent<HTMLInputElement | HTMLTextAreaElement>) => {
              e.preventDefault();
              e.currentTarget.setSelectionRange(0, 0);
            }
          : undefined,
        onClick: readOnly
          ? (
              e: JSX.TargetedMouseEvent<HTMLInputElement | HTMLTextAreaElement>,
            ) => {
              e.preventDefault();
              e.currentTarget.blur();
            }
          : undefined,
        placeholder: readOnly ? undefined : placeholder || "Click to edit",
        className: twMerge(
          "bg-transparent border-none focus:outline-3 focus:outline-accent-blue focus:rounded-xs focus:outline-offset-2 field-sizing-content in-[.print]:hidden",
          readOnly && "cursor-default select-none",
          readOnly && elementType === "textarea" && "hidden",
          className,
        ),
        style: {
          "--color-focus-border": "var(--color-accent-blue)",
        },
      })}
      {elementType === "textarea" && readOnly ? (
        <div className="syllabus-prose">
          <ProseText text={displayValue} />
        </div>
      ) : (
        <div
          className="hidden in-[.print]:block"
          style={{
            whiteSpace: elementType === "textarea" ? undefined : "normal",
          }}
        >
          {elementType === "textarea" ? (
            <div className="syllabus-prose">
              <ProseText text={displayValue} />
            </div>
          ) : (
            displayValue
          )}
        </div>
      )}
    </>
  );

  if (elementType === "input") {
    return el;
  }

  return <div className={twMerge("w-full", containerClassName)}>{el}</div>;
}
