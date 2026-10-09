/** Local export of a Gallery collection as PDF / Word / Markdown / HTML. */

import slugify from "slugify";
import { getString } from "./locale";
import { getItemCreatorLine, getItemTitle, isClassNoteItem } from "./items";
import {
  saveSyllabusExport,
  saveSyllabusPdf,
  type SyllabusExportFormat,
} from "./exportSyllabus";
import { buildPrintableHtml } from "./printSyllabus";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildGalleryListInnerHtml(
  items: Zotero.Item[],
  description?: string,
): string {
  const desc = (description || "").trim();
  const descBlock = desc
    ? `<div class="syllabus-collection-description" style="margin:0 0 1.25rem;color:#333;line-height:1.45">${escapeHtml(desc)}</div>`
    : "";
  const rows = items
    .filter((item) => item.isRegularItem?.() && !isClassNoteItem(item))
    .map((item) => {
      const title = escapeHtml(getItemTitle(item) || item.key);
      const creators = escapeHtml(getItemCreatorLine(item));
      const date = escapeHtml(String(item.getField?.("date") || "").trim());
      const meta = [creators, date].filter(Boolean).join(" · ");
      return `<li class="sv-export-item"><div class="sv-export-title">${title}</div>${
        meta ? `<div class="sv-export-meta">${meta}</div>` : ""
      }</li>`;
    })
    .join("");
  return `<div class="syllabus-gallery-export">${descBlock}<ul class="sv-export-list" style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:0.75rem">${rows}</ul></div>`;
}

export async function exportGalleryCollection(opts: {
  collectionId: number;
  title: string;
  description?: string;
  items: Zotero.Item[];
  format: SyllabusExportFormat;
}): Promise<void> {
  const progress = new ztoolkit.ProgressWindow(getString("app-name"), {
    closeOnClick: false,
    closeTime: -1,
  })
    .createLine({
      text: getString("progress-print-preparing"),
      type: "default",
    })
    .show();

  try {
    const exportTitle = opts.title.trim() || "Reading list";
    const description = (opts.description || "").trim() || undefined;
    const innerHTML = buildGalleryListInnerHtml(opts.items, description);
    const htmlContent = await buildPrintableHtml({
      title: exportTitle,
      innerHTML,
      bibliographyHtml: "",
      density: "expanded",
      description,
    });
    const slug =
      slugify(exportTitle, { lower: true, strict: true }) || "reading-list";
    const extension =
      opts.format === "pdf"
        ? "pdf"
        : opts.format === "docx"
          ? "docx"
          : opts.format === "markdown"
            ? "md"
            : "html";
    const filename = `gallery-${slug}.${extension}`;

    if (opts.format === "pdf") {
      await saveSyllabusPdf({
        htmlContent,
        filename,
        onReady: () => progress.close(),
      });
      return;
    }

    progress.close();
    await saveSyllabusExport({
      format: opts.format,
      title: exportTitle,
      htmlContent,
      filename,
    });
  } catch (err) {
    ztoolkit.log("Error exporting gallery:", err);
    progress.close();
    new ztoolkit.ProgressWindow(getString("app-name"), {
      closeOnClick: true,
      closeTime: 5000,
    })
      .createLine({
        text: getString("progress-print-failed"),
        type: "fail",
      })
      .show();
  }
}
