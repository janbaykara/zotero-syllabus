// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h } from "preact";
import { twMerge } from "tailwind-merge";
import { getString } from "../utils/locale";

type AddReadingButtonProps = {
  onClick: () => void;
  title?: string;
  ariaLabel?: string;
  /** When true, only show on parent `group/class` hover / focus (class footers). */
  hoverReveal?: boolean;
  className?: string;
};

/**
 * Centered “Add readings” control — same chrome as the class-group footer.
 */
export function AddReadingButton({
  onClick,
  title,
  ariaLabel,
  hoverReveal = false,
  className,
}: AddReadingButtonProps) {
  const label = getString("class-add-readings");
  return (
    <div
      className={twMerge(
        "flex items-center justify-center gap-2 w-full in-[.print]:hidden p-2",
        hoverReveal &&
          "opacity-0 group-hover/class:opacity-100 focus-within:opacity-100 focus-visible:opacity-100 transition-opacity",
        className,
      )}
    >
      <button
        type="button"
        className="inline-flex items-center justify-center gap-1 cursor-pointer bg-transparent border-0 p-0 text-xs text-secondary hover:text-primary"
        onClick={onClick}
        title={title || label}
        aria-label={ariaLabel || title || label}
      >
        <span
          className="syllabus-class-add-icon syllabus-class-add-icon-item"
          aria-hidden="true"
        />
        {label}
      </button>
    </div>
  );
}
