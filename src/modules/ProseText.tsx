// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h, Fragment } from "preact";
import { splitProse } from "../utils/prose";

/**
 * Renders plain-text prose with paragraph breaks (blank lines) and soft
 * line breaks (single newlines). Text is escaped via Preact children.
 */
export function ProseText({
  text,
  className,
}: {
  text: string | null | undefined;
  className?: string;
}) {
  const paragraphs = splitProse(text);
  if (paragraphs.length === 0) {
    return null;
  }

  return (
    <div className={className ? `syllabus-prose ${className}` : "syllabus-prose"}>
      {paragraphs.map((lines, pi) => (
        <p key={pi}>
          {lines.map((line, li) => (
            <Fragment key={li}>
              {li > 0 ? <br /> : null}
              {line}
            </Fragment>
          ))}
        </p>
      ))}
    </div>
  );
}
