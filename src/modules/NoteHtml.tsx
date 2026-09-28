// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h } from "preact";
import type { JSX } from "preact";
import { noteHtmlToDisplayHtml } from "../utils/noteHtml";

/**
 * Renders a Zotero note’s stored HTML (emphasis, links, lists, headings).
 * Display-only; editing stays in Zotero’s note editor.
 */
export function NoteHtml({
  html,
  className,
  onClick,
}: {
  html: string | null | undefined;
  className?: string;
  onClick?: (e: JSX.TargetedMouseEvent<HTMLDivElement>) => void;
}) {
  const sanitized = noteHtmlToDisplayHtml(html);
  if (!sanitized) {
    return null;
  }

  return (
    <div
      className={className ? `syllabus-prose ${className}` : "syllabus-prose"}
      // Sanitized: allowlist + protocol check in noteHtml.ts
      dangerouslySetInnerHTML={{ __html: sanitized }}
      onClick={onClick}
    />
  );
}
