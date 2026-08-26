// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h, Fragment } from "preact";
import { twMerge } from "tailwind-merge";

export function Bibliography({
  text,
  compactMode = false,
}: {
  text: string;
  compactMode?: boolean;
}) {
  return (
    <div className="hidden in-[.print]:block">
      <header className="syllabus-bibliography">
        <div
          className={twMerge(
            "font-semibold mt-12 mb-4",
            compactMode ? "text-xl" : "text-2xl",
          )}
        >
          Bibliography
        </div>
      </header>
      <div className={twMerge("flex flex-col gap-3")}>
        {text.split("\n").map((line) => (
          <div key={line}>{line}</div>
        ))}
      </div>
    </div>
  );
}
