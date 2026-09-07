import {
  Document,
  ExternalHyperlink,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import { getString } from "./locale";
import { saveBinaryToFile, saveToFile } from "./file";
import { openSyllabusPrintDialog } from "./printSyllabus";

export type SyllabusExportFormat = "pdf" | "docx" | "markdown" | "html";

export type ExportInline =
  | { type: "text"; text: string }
  | { type: "link"; text: string; href: string };

export type ExportBlock =
  | { type: "heading"; level: 1 | 2 | 3; runs: ExportInline[] }
  | { type: "paragraph"; runs: ExportInline[] }
  | { type: "listItem"; runs: ExportInline[] }
  | { type: "blank" };

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function pushTextRun(runs: ExportInline[], text: string): void {
  const normalized = text.replace(/\s+/g, " ");
  if (!normalized || !normalized.trim()) {
    if (normalized && runs.length) {
      const last = runs[runs.length - 1];
      if (last.type === "text" && !/\s$/.test(last.text)) {
        last.text += " ";
      }
    }
    return;
  }
  if (runs.length) {
    const last = runs[runs.length - 1];
    if (last.type === "text") {
      last.text += normalized;
      return;
    }
  }
  runs.push({ type: "text", text: normalized });
}

/** Collect text and hyperlinks from a DOM subtree. */
export function runsFromNode(root: Node | null | undefined): ExportInline[] {
  const runs: ExportInline[] = [];
  if (!root) {
    return runs;
  }

  const visit = (node: Node): void => {
    if (node.nodeType === Node.TEXT_NODE) {
      pushTextRun(runs, node.textContent || "");
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return;
    }
    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();
    if (tag === "script" || tag === "style" || tag === "svg") {
      return;
    }
    if (tag === "br") {
      pushTextRun(runs, " ");
      return;
    }
    if (tag === "a") {
      const href = (el.getAttribute("href") || "").trim();
      const text = normalizeWhitespace(el.textContent || "");
      if (text && /^https?:\/\//i.test(href)) {
        runs.push({ type: "link", text, href });
        return;
      }
      if (text) {
        pushTextRun(runs, text);
      }
      return;
    }
    for (const child of Array.from(el.childNodes)) {
      visit(child as Node);
    }
  };

  visit(root);
  return runs
    .map((run) =>
      run.type === "text"
        ? { ...run, text: run.text.replace(/\s+/g, " ") }
        : run,
    )
    .filter((run) => (run.type === "text" ? run.text.trim() : true))
    .map((run) =>
      run.type === "text" ? { ...run, text: run.text.trim() } : run,
    );
}

function runsText(runs: ExportInline[]): string {
  return runs
    .map((run) => run.text)
    .join("")
    .trim();
}

function pushBlock(blocks: ExportBlock[], block: ExportBlock): void {
  if (block.type === "blank") {
    if (!blocks.length || blocks[blocks.length - 1].type === "blank") {
      return;
    }
    blocks.push(block);
    return;
  }
  if (!runsText(block.runs)) {
    return;
  }
  blocks.push(block);
}

function itemCardBlocks(card: Element): ExportBlock[] {
  const blocks: ExportBlock[] = [];
  const title = card.querySelector(".syllabus-item-title");
  const titleRuns = runsFromNode(title);
  if (titleRuns.length) {
    pushBlock(blocks, { type: "listItem", runs: titleRuns });
  }

  const meta = card.querySelector(".syllabus-item-metadata");
  const metaRuns = runsFromNode(meta);
  if (metaRuns.length) {
    pushBlock(blocks, { type: "paragraph", runs: metaRuns });
  }

  const description = card.querySelector(".syllabus-item-description");
  const descriptionRuns = runsFromNode(description);
  if (descriptionRuns.length) {
    pushBlock(blocks, { type: "paragraph", runs: descriptionRuns });
  }

  const reference = card.querySelector(".syllabus-item-reference");
  const referenceRuns = runsFromNode(reference);
  if (referenceRuns.length) {
    pushBlock(blocks, { type: "paragraph", runs: referenceRuns });
  }

  return blocks;
}

/**
 * Build an intermediate block list from printable syllabus HTML
 * (full document from `buildPrintableHtml`, or a fragment).
 */
export function blocksFromPrintableHtml(html: string): ExportBlock[] {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const blocks: ExportBlock[] = [];
  const page =
    doc.querySelector(".syllabus-page") || doc.body || doc.documentElement;

  const titleEl =
    page.querySelector(".text-3xl") ||
    page.querySelector("h1") ||
    doc.querySelector("title");
  const titleRuns = runsFromNode(titleEl);
  if (titleRuns.length) {
    pushBlock(blocks, { type: "heading", level: 1, runs: titleRuns });
  }

  const masthead = page.querySelector(".syllabus-masthead-meta");
  const mastheadRuns = runsFromNode(masthead);
  if (mastheadRuns.length) {
    pushBlock(blocks, { type: "paragraph", runs: mastheadRuns });
  }

  const description = page.querySelector(".syllabus-collection-description");
  const descriptionRuns = runsFromNode(description);
  if (descriptionRuns.length) {
    pushBlock(blocks, { type: "paragraph", runs: descriptionRuns });
  }

  // Course links: anchors that survive print outside item cards / bibliography.
  page.querySelectorAll("a.underline, a[href]").forEach((anchor) => {
    if (
      anchor.closest(".syllabus-item-card") ||
      anchor.closest(".syllabus-print-bibliography") ||
      anchor.closest(".syllabus-item-title")
    ) {
      return;
    }
    const href = (anchor.getAttribute("href") || "").trim();
    const text = normalizeWhitespace(anchor.textContent || "");
    if (!text || !/^https?:\/\//i.test(href)) {
      return;
    }
    // Only pick up standalone link rows in the links section area.
    if (!anchor.closest(".container-padded")) {
      return;
    }
    pushBlock(blocks, {
      type: "paragraph",
      runs: [{ type: "link", text, href }],
    });
  });

  page.querySelectorAll(".syllabus-class-group").forEach((group) => {
    pushBlock(blocks, { type: "blank" });
    const heading = group.querySelector(".syllabus-class-heading");
    const headingRuns = runsFromNode(heading);
    if (headingRuns.length) {
      pushBlock(blocks, { type: "heading", level: 2, runs: headingRuns });
    }
    group.querySelectorAll(".syllabus-item-card").forEach((card) => {
      for (const block of itemCardBlocks(card)) {
        pushBlock(blocks, block);
      }
    });
  });

  const further = page.querySelector("[data-tour='syllabus-further-reading']");
  if (further) {
    pushBlock(blocks, { type: "blank" });
    const furtherHeading =
      further.querySelector(".text-2xl, .text-xl, .font-semibold") ||
      further.querySelector("h2");
    // Prefer the visible further-reading heading text near the top.
    const headingCandidate =
      further.querySelector(":scope > div .font-semibold") || furtherHeading;
    const furtherHeadingRuns = runsFromNode(headingCandidate);
    if (furtherHeadingRuns.length) {
      pushBlock(blocks, {
        type: "heading",
        level: 2,
        runs: furtherHeadingRuns,
      });
    } else {
      pushBlock(blocks, {
        type: "heading",
        level: 2,
        runs: [{ type: "text", text: getString("further-reading-heading") }],
      });
    }
    further.querySelectorAll(".syllabus-item-card").forEach((card) => {
      for (const block of itemCardBlocks(card)) {
        pushBlock(blocks, block);
      }
    });
  }

  const bibliography =
    doc.querySelector(".syllabus-print-bibliography") ||
    page.querySelector(".syllabus-print-bibliography");
  if (bibliography) {
    pushBlock(blocks, { type: "blank" });
    const bibHeading =
      bibliography.querySelector(".syllabus-print-bibliography-heading") ||
      bibliography.querySelector("h2");
    const bibHeadingRuns = runsFromNode(bibHeading);
    if (bibHeadingRuns.length) {
      pushBlock(blocks, { type: "heading", level: 2, runs: bibHeadingRuns });
    } else {
      pushBlock(blocks, {
        type: "heading",
        level: 2,
        runs: [{ type: "text", text: getString("bibliography-heading") }],
      });
    }

    const body =
      bibliography.querySelector(".syllabus-print-bibliography-body") ||
      bibliography;
    const entries = body.querySelectorAll(".csl-entry");
    if (entries.length) {
      entries.forEach((entry) => {
        const runs = runsFromNode(entry);
        pushBlock(blocks, { type: "paragraph", runs });
      });
    } else {
      const runs = runsFromNode(body);
      // Avoid duplicating the heading text already emitted.
      const headingText = runsText(bibHeadingRuns);
      if (runsText(runs) && runsText(runs) !== headingText) {
        pushBlock(blocks, { type: "paragraph", runs });
      }
    }
  }

  while (blocks.length && blocks[blocks.length - 1].type === "blank") {
    blocks.pop();
  }
  return blocks;
}

function escapeMarkdown(text: string): string {
  // Escape only characters that commonly break prose or link labels.
  return text.replace(/([\\`*_{}[\]<>])/g, "\\$1");
}

function inlineToMarkdown(runs: ExportInline[]): string {
  return runs
    .map((run) => {
      if (run.type === "link") {
        return `[${escapeMarkdown(run.text)}](${run.href})`;
      }
      return escapeMarkdown(run.text);
    })
    .join("");
}

export function blocksToMarkdown(blocks: ExportBlock[]): string {
  const lines: string[] = [];
  for (const block of blocks) {
    if (block.type === "blank") {
      if (lines.length && lines[lines.length - 1] !== "") {
        lines.push("");
      }
      continue;
    }
    const text = inlineToMarkdown(block.runs);
    if (!text) {
      continue;
    }
    if (block.type === "heading") {
      if (lines.length && lines[lines.length - 1] !== "") {
        lines.push("");
      }
      lines.push(`${"#".repeat(block.level)} ${text}`);
      lines.push("");
      continue;
    }
    if (block.type === "listItem") {
      lines.push(`- ${text}`);
      continue;
    }
    lines.push(text);
    lines.push("");
  }
  return `${lines
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()}\n`;
}

function inlineToDocxChildren(
  runs: ExportInline[],
): (TextRun | ExternalHyperlink)[] {
  return runs.map((run) => {
    if (run.type === "link") {
      return new ExternalHyperlink({
        children: [
          new TextRun({
            text: run.text,
            style: "Hyperlink",
            color: "1D4ED8",
            underline: {},
          }),
        ],
        link: run.href,
      });
    }
    return new TextRun(run.text);
  });
}

const HEADING_LEVELS = {
  1: HeadingLevel.HEADING_1,
  2: HeadingLevel.HEADING_2,
  3: HeadingLevel.HEADING_3,
} as const;

export function blocksToDocxParagraphs(blocks: ExportBlock[]): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  for (const block of blocks) {
    if (block.type === "blank") {
      paragraphs.push(new Paragraph({ children: [] }));
      continue;
    }
    const children = inlineToDocxChildren(block.runs);
    if (!children.length) {
      continue;
    }
    if (block.type === "heading") {
      paragraphs.push(
        new Paragraph({
          heading: HEADING_LEVELS[block.level],
          children,
        }),
      );
      continue;
    }
    if (block.type === "listItem") {
      paragraphs.push(
        new Paragraph({
          children,
          bullet: { level: 0 },
        }),
      );
      continue;
    }
    paragraphs.push(new Paragraph({ children }));
  }
  return paragraphs;
}

export async function blocksToDocxBytes(
  blocks: ExportBlock[],
  title: string,
): Promise<Uint8Array> {
  const doc = new Document({
    title: title || "Syllabus",
    sections: [
      {
        properties: {},
        children: blocksToDocxParagraphs(blocks),
      },
    ],
  });
  // Prefer base64 → bytes so we do not depend on Blob/ArrayBuffer JSZip
  // variants that are flaky in privileged Firefox chrome.
  const base64 = await Packer.toBase64String(doc);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/** Save prepared printable HTML in the chosen non-PDF format. */
export async function saveSyllabusExport(opts: {
  format: Exclude<SyllabusExportFormat, "pdf">;
  title: string;
  htmlContent: string;
  filename: string;
}): Promise<boolean> {
  const { format, title, htmlContent, filename } = opts;

  if (format === "html") {
    return saveToFile(
      filename,
      htmlContent,
      getString("dialog-save-html"),
      true,
      [[getString("file-filter-html"), "*.html"]],
    );
  }

  const blocks = blocksFromPrintableHtml(htmlContent);

  if (format === "markdown") {
    return saveToFile(
      filename,
      blocksToMarkdown(blocks),
      getString("dialog-save-markdown"),
      true,
      [[getString("file-filter-markdown"), "*.md"]],
    );
  }

  const bytes = await blocksToDocxBytes(blocks, title);
  return saveBinaryToFile(filename, bytes, getString("dialog-save-word"), [
    [getString("file-filter-word"), "*.docx"],
  ]);
}

export async function saveSyllabusPdf(opts: {
  htmlContent: string;
  filename: string;
  onReady?: () => void;
}): Promise<boolean> {
  return openSyllabusPrintDialog(opts.htmlContent, opts.filename, opts.onReady);
}
