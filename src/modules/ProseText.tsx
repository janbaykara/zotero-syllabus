// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h } from "preact";
import type { JSX } from "preact";
import { proseToDisplayHtml } from "../utils/prose";

/**
 * Renders Markdown prose (emphasis, links, lists, blockquotes, soft breaks).
 * Source stays plain text; this is display-only.
 */
export function ProseText({
  text,
  className,
  onClick,
}: {
  text: string | null | undefined;
  className?: string;
  onClick?: (e: JSX.TargetedMouseEvent<HTMLDivElement>) => void;
}) {
  const html = proseToDisplayHtml(text);
  if (!html) {
    return null;
  }

  return (
    <div
      className={className ? `syllabus-prose ${className}` : "syllabus-prose"}
      // Sanitized: markdown-it html:false + protocol allowlist in prose.ts
      dangerouslySetInnerHTML={{ __html: html }}
      onClick={onClick}
    />
  );
}
