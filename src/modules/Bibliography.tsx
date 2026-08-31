// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h, Fragment } from "preact";
import { twMerge } from "tailwind-merge";
import { escapeHtml } from "../utils/printSyllabus";
import { getString } from "../utils/locale";

function styleBibliographyEntries(html: string): string {
  try {
    const doc = new DOMParser().parseFromString(
      `<div id="syllabus-bib-root">${html}</div>`,
      "text/html",
    );
    const root = doc.getElementById("syllabus-bib-root");
    if (!root) {
      return html;
    }
    const entries = root.querySelectorAll(".csl-entry");
    const targets = entries.length ? [...entries] : [...root.children];
    targets.forEach((el) => {
      const style = (el as { style?: CSSStyleDeclaration }).style;
      if (!style) {
        return;
      }
      style.setProperty("margin", "0 0 0.7em", "important");
      style.setProperty("padding-left", "1.65em", "important");
      style.setProperty("text-indent", "-1.65em", "important");
      style.setProperty("line-height", "1.45", "important");
      style.setProperty("overflow-wrap", "anywhere", "important");
    });
    root.querySelectorAll("a").forEach((anchor) => {
      const style = (anchor as { style?: CSSStyleDeclaration }).style;
      if (!style) {
        return;
      }
      style.setProperty("color", "#1d4ed8", "important");
      style.setProperty("overflow-wrap", "anywhere", "important");
      style.setProperty("word-break", "break-word", "important");
    });
    return root.innerHTML;
  } catch {
    return html;
  }
}

export function bibliographyToHtml(
  content: string,
  _compactMode = false,
  isHtml = false,
): string {
  const body = isHtml
    ? styleBibliographyEntries(content)
    : escapeHtml(content).replace(/\r\n|\n/g, "<br>");
  return `<section class="syllabus-print-bibliography" style="color:#111;padding-top:4px">
  <h2 class="syllabus-print-bibliography-heading" style="font-size:20px;font-weight:700;margin:0 0 16px;letter-spacing:-0.02em">${getString("bibliography-heading")}</h2>
  <div class="syllabus-print-bibliography-body" style="color:#111;font-size:12.5px;line-height:1.45">${body}</div>
</section>`;
}

export function Bibliography({
  text,
  compactMode = false,
}: {
  text: string;
  compactMode?: boolean;
}) {
  return (
    <section className="syllabus-print-bibliography">
      <header className="syllabus-bibliography">
        <div
          className={twMerge(
            "font-semibold mt-12 mb-4",
            compactMode ? "text-xl" : "text-2xl",
          )}
        >
          {getString("bibliography-heading")}
        </div>
      </header>
      <div className="syllabus-print-bibliography-body flex flex-col gap-3">
        {text}
      </div>
    </section>
  );
}
