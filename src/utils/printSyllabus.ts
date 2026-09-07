import { pickSavePath } from "./file";
import { getString } from "./locale";
import {
  coerceItemDensity,
  type ItemDensity,
} from "../modules/react-zotero-sync/itemDensity";

type PrintBrowsingContext = {
  print: (settings: unknown) => Promise<unknown>;
  isContent?: boolean;
};

type HiddenBrowserHandle = {
  _createdPromise: Promise<unknown>;
  load: (source: string) => Promise<boolean>;
  waitForDocument: (opts?: {
    allowInteractiveAfter?: number | false;
  }) => Promise<unknown>;
  getPageData: (
    props: string[],
    options?: { timeout?: number },
  ) => Promise<Record<string, string>>;
  browsingContext: PrintBrowsingContext;
  destroy: () => void;
  style: CSSStyleDeclaration;
};

type PrintUtilsWindow = Window & {
  PrintUtils?: {
    SAVE_TO_PDF_PRINTER?: string;
    getPrintSettings: (
      printerName?: string,
      defaultsOnly?: boolean,
      allowPseudoPrinter?: boolean,
    ) => Record<string, unknown>;
  };
};

const PRINT_FONT =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

const PRINT_DOCUMENT_CSS = `
  * { box-sizing: border-box; }
  html {
    color-scheme: only light;
    background: #fff;
  }
  html, body, .print, .syllabus-page, .pb-12, .h-full {
    overflow: visible !important;
    height: auto !important;
    min-height: 0 !important;
    max-height: none !important;
  }
  body {
    margin: 0;
    padding: 0.25in 0;
    color: #111;
    background: #fff;
    font-family: ${PRINT_FONT};
    font-size: 14px;
    line-height: 1.45;
  }
  body, body * {
    color: #111;
  }
  *::before, *::after {
    display: none !important;
    content: none !important;
  }
  .syllabus-page,
  .syllabus-class-groups,
  .syllabus-class-group,
  .syllabus-class-items,
  .syllabus-item-card,
  .flex, .flex-col, .flex-row, .inline-flex, .contents {
    display: block !important;
    overflow: visible !important;
    height: auto !important;
    max-height: none !important;
    position: static !important;
    flex: none !important;
  }
  .syllabus-class-group + .syllabus-class-group {
    margin-top: 1.75rem;
  }
  body[data-item-density="standard"] .syllabus-class-group + .syllabus-class-group,
  .density-standard .syllabus-class-group + .syllabus-class-group {
    margin-top: 1.1rem;
  }
  body[data-item-density="row"] .syllabus-class-group + .syllabus-class-group,
  .density-row .syllabus-class-group + .syllabus-class-group {
    margin-top: 0.75rem;
  }
  .syllabus-class-header {
    text-transform: uppercase;
    font-weight: 600;
    font-size: 12px;
    letter-spacing: 0.06em;
    color: #555 !important;
    margin: 0 0 0.2rem;
  }
  .text-3xl { font-size: 1.75rem; font-weight: 600; }
  .text-2xl { font-size: 1.4rem; font-weight: 600; }
  .text-xl { font-size: 1.2rem; font-weight: 600; }
  .text-lg { font-size: 1.1rem; }
  .font-semibold { font-weight: 600; }
  .font-medium { font-weight: 500; }
  .syllabus-item-card {
    background: #f4f4f4;
    padding: 0.7rem 0.9rem;
    border-radius: 0.5rem;
    margin: 0.45rem 0;
  }
  body[data-item-density="standard"] .syllabus-item-card,
  .density-standard .syllabus-item-card {
    padding: 0.4rem 0.65rem;
    margin: 0.25rem 0;
    border-radius: 0.35rem;
  }
  body[data-item-density="row"] .syllabus-item-card,
  .density-row .syllabus-item-card {
    background: transparent;
    padding: 0.1rem 0;
    margin: 0.05rem 0;
    border-radius: 0;
  }
  .syllabus-item-title-row {
    font-weight: 500;
    font-size: 1.05rem;
    margin-bottom: 0.15rem;
  }
  body[data-item-density="row"] .syllabus-item-title-row,
  .density-row .syllabus-item-title-row {
    font-size: 0.95rem;
    font-weight: 400;
    margin-bottom: 0;
  }
  .syllabus-item-metadata,
  .text-secondary {
    color: #555 !important;
    font-size: 0.9rem;
  }
  .syllabus-item-description,
  .syllabus-item-reference {
    margin-top: 0.25rem;
    font-size: 0.95rem;
  }
  body[data-item-density="row"] .syllabus-item-description,
  body[data-item-density="row"] .syllabus-item-reference,
  .density-row .syllabus-item-description,
  .density-row .syllabus-item-reference {
    display: none !important;
  }
  .uppercase { text-transform: uppercase; }
  .syllabus-print-page-break {
    break-after: page;
    page-break-after: always;
    height: 0;
    overflow: hidden;
  }
  .syllabus-print-bibliography {
    color: #111 !important;
    background: #fff !important;
    padding-top: 0.15in;
  }
  .syllabus-print-bibliography,
  .syllabus-print-bibliography * {
    color: #111 !important;
  }
  img, video, svg, canvas, iframe {
    max-width: 100% !important;
    max-height: 3.5in !important;
    height: auto !important;
  }
  @page { margin: 0.75in; }
  @media print {
    html, body { background: #fff; }
    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
  }
`;

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function classListHas(el: Element, name: string): boolean {
  return el.classList.contains(name);
}

function isPrintHidden(el: Element): boolean {
  return (
    classListHas(el, "in-[.print]:hidden") ||
    classListHas(el, "in-[.print]:hidden!")
  );
}

function isPrintOnly(el: Element): boolean {
  return (
    classListHas(el, "in-[.print]:block") ||
    classListHas(el, "in-[.print]:block!")
  );
}

type FormField = Element & {
  value: string;
  type?: string;
  checked?: boolean;
};

function asElement(node: Node | Element | null): Element | null {
  // Plugin chrome modules may not expose the Element constructor, so avoid
  // `instanceof Element` (throws ReferenceError: Element is not defined).
  if (!node || node.nodeType !== 1 /* Node.ELEMENT_NODE */) {
    return null;
  }
  return node as Element;
}

function asFormField(node: Node | Element | null): FormField | null {
  const el = asElement(node);
  return el ? (el as FormField) : null;
}

function copyFormValues(source: HTMLElement, clone: HTMLElement): void {
  const srcEls = source.querySelectorAll("input, textarea, select");
  const dstEls = clone.querySelectorAll("input, textarea, select");
  if (srcEls.length !== dstEls.length) {
    return;
  }
  srcEls.forEach((src, i) => {
    const dst = dstEls[i];
    const from = asFormField(src);
    const to = asFormField(dst);
    if (!from || !to || from.tagName !== to.tagName) {
      return;
    }
    to.value = from.value;
    to.setAttribute("value", from.value);
    if (from.tagName === "INPUT") {
      to.checked = from.checked;
    }
    if (from.tagName === "TEXTAREA") {
      to.textContent = from.value;
    }
  });
}

function syncPrintOnlyTextFromInputs(root: ParentNode): void {
  [...root.querySelectorAll("input, textarea")].forEach((node) => {
    const el = asFormField(node);
    if (!el?.value) {
      return;
    }
    // TextInput places its print-only mirror as the next sibling. Do not walk
    // all print-only cousins under a shared parent (e.g. course code +
    // institution in the masthead Fragment), or the last input overwrites every
    // field and duplicates its value in the PDF.
    const sibling = asElement(el.nextElementSibling);
    if (sibling && isPrintOnly(sibling)) {
      sibling.textContent = el.value;
    }
  });
}

function replaceFormControlsWithText(root: ParentNode): void {
  [...root.querySelectorAll("input, textarea")].forEach((node) => {
    const el = asFormField(node);
    if (!el) {
      return;
    }
    if (
      el.type === "checkbox" ||
      el.type === "hidden" ||
      el.type === "button"
    ) {
      el.remove();
      return;
    }
    const text = (el.value || "").trim();
    if (!text) {
      el.remove();
      return;
    }
    const div = el.ownerDocument.createElement("div");
    div.textContent = text;
    el.replaceWith(div);
  });
}

function removeScreenOnlyElements(root: ParentNode): void {
  [...root.querySelectorAll("*")].forEach((node) => {
    const el = asElement(node);
    if (!el || isPrintOnly(el)) {
      return;
    }
    if (
      isPrintHidden(el) ||
      classListHas(el, "hidden") ||
      classListHas(el, "sr-only")
    ) {
      el.remove();
    }
  });
}

function asStyleable(el: Element): CSSStyleDeclaration | null {
  return (el as { style?: CSSStyleDeclaration }).style || null;
}

function setPrintStyle(el: Element, props: Record<string, string>): void {
  const style = asStyleable(el);
  if (!style) {
    return;
  }
  for (const [name, value] of Object.entries(props)) {
    style.setProperty(name, value, "important");
  }
}

function expandCharacterSeparators(root: ParentNode): void {
  root.querySelectorAll(".character-separator").forEach((el) => {
    const kids = [...el.children];
    kids.forEach((kid, i) => {
      if (i > 0) {
        el.insertBefore(el.ownerDocument.createTextNode(" · "), kid);
      }
    });
  });
}

function flattenPrintLayout(root: ParentNode): void {
  root.querySelectorAll("*").forEach((node) => {
    const el = node as Element;
    if (!el.classList) {
      return;
    }
    if (isPrintOnly(el) || classListHas(el, "contents")) {
      setPrintStyle(el, { display: "block" });
    }
    const classes = [...el.classList];
    if (
      classes.includes("flex") ||
      classes.includes("inline-flex") ||
      classes.includes("flex-col") ||
      classes.includes("flex-row")
    ) {
      setPrintStyle(el, { display: "block" });
    }
    if (classes.includes("sticky") || classes.includes("fixed")) {
      setPrintStyle(el, { position: "static", top: "auto" });
    }
    setPrintStyle(el, { opacity: "1" });
  });
}

function putTitlesBeforeBadges(root: ParentNode): void {
  root.querySelectorAll(".syllabus-item-text").forEach((text) => {
    const title = text.querySelector(":scope > .syllabus-item-title-row");
    if (title && text.firstElementChild && title !== text.firstElementChild) {
      text.insertBefore(title, text.firstElementChild);
    }
  });
}

function polishClassHeadings(root: ParentNode): void {
  root.querySelectorAll(".syllabus-class-heading").forEach((row) => {
    const header = row.querySelector(":scope > .syllabus-class-header");
    if (!header) {
      return;
    }
    setPrintStyle(row, {
      display: "table",
      width: "100%",
      "border-collapse": "collapse",
      "margin-bottom": "6px",
      "page-break-inside": "avoid",
      "break-inside": "avoid",
    });
    setPrintStyle(header, {
      display: "table-cell",
      width: "1%",
      "white-space": "nowrap",
      "padding-right": "12px",
      "vertical-align": "baseline",
    });
    const title = header.nextElementSibling;
    if (title) {
      setPrintStyle(title, {
        display: "table-cell",
        "vertical-align": "baseline",
      });
    }
  });
}

function polishMasthead(root: ParentNode): void {
  root.querySelectorAll(".syllabus-masthead-meta").forEach((row) => {
    const kids = [...row.children].filter((kid) => kid.textContent?.trim());
    setPrintStyle(row, {
      display: "block",
      color: "#555",
      "font-size": "13px",
      "margin-top": "4px",
      "margin-bottom": "4px",
    });
    kids.forEach((kid, i) => {
      setPrintStyle(kid, {
        display: "inline",
        color: "#555",
        "font-size": "13px",
        "font-weight": "500",
      });
      if (i < kids.length - 1) {
        kid.after(kid.ownerDocument.createTextNode(" · "));
      }
    });
  });
  root.querySelectorAll("[syllabus-view-title-container]").forEach((el) => {
    setPrintStyle(el, {
      "margin-bottom": "22px",
      "padding-bottom": "16px",
      "border-bottom": "1px solid #e5e7eb",
    });
  });
}

/** Turn item titles into clickable links when the card has a web URL. */
function linkItemTitles(root: ParentNode): void {
  root
    .querySelectorAll(".syllabus-item-card[data-print-url]")
    .forEach((card) => {
      const href = (card.getAttribute("data-print-url") || "").trim();
      if (!/^https?:\/\//i.test(href)) {
        return;
      }
      const title = card.querySelector(".syllabus-item-title");
      if (!title || title.querySelector("a")) {
        return;
      }
      const text = (title.textContent || "").trim();
      if (!text) {
        return;
      }
      const anchor = title.ownerDocument.createElement("a");
      anchor.setAttribute("href", href);
      anchor.className = "syllabus-item-print-link";
      while (title.firstChild) {
        anchor.appendChild(title.firstChild);
      }
      title.appendChild(anchor);
    });
}

function polishLinks(root: ParentNode): void {
  root.querySelectorAll("a, .underline").forEach((el) => {
    const isItemTitleLink = classListHas(el, "syllabus-item-print-link");
    setPrintStyle(el, {
      color: "#1d4ed8",
      "text-decoration": "underline",
      ...(isItemTitleLink
        ? { "font-size": "inherit", "font-weight": "inherit" }
        : { "font-size": "13px" }),
      "overflow-wrap": "anywhere",
      "word-break": "break-word",
    });
  });
}

/** Gecko print often ignores <style> here; inline styles do survive. */
function applyInlinePrintStyles(
  root: ParentNode,
  density: ItemDensity = "expanded",
): void {
  root.querySelectorAll("*").forEach((el) => {
    const classes = el.classList ? [...el.classList] : [];
    const style = asStyleable(el);
    const existingBg = style?.getPropertyValue("background-color") || "";

    if (classes.includes("text-3xl")) {
      setPrintStyle(el, {
        "font-size": density === "row" ? "20px" : "24px",
        "font-weight": "700",
        "letter-spacing": "-0.02em",
        "line-height": "1.25",
        "margin-bottom": "2px",
      });
    } else if (classes.includes("text-2xl")) {
      setPrintStyle(el, {
        "font-size": density === "row" ? "15px" : "17px",
        "font-weight": "700",
      });
    } else if (classes.includes("text-xl")) {
      setPrintStyle(el, {
        "font-size": density === "row" ? "14px" : "16px",
        "font-weight": "600",
      });
    } else if (classes.includes("text-lg")) {
      setPrintStyle(el, {
        "font-size": density === "row" ? "13px" : "15px",
      });
    }

    if (classes.includes("font-semibold") || classes.includes("font-bold")) {
      setPrintStyle(el, { "font-weight": "700" });
    } else if (classes.includes("font-medium")) {
      setPrintStyle(el, { "font-weight": "600" });
    }

    if (
      classes.includes("syllabus-class-header") ||
      classes.includes("uppercase")
    ) {
      setPrintStyle(el, { "text-transform": "uppercase" });
    }
    if (classes.includes("syllabus-class-header")) {
      setPrintStyle(el, {
        "font-size": "11px",
        "font-weight": "700",
        "letter-spacing": "0.08em",
        color: "#6b7280",
      });
    }
    if (classes.includes("syllabus-class-groups")) {
      setPrintStyle(el, {
        "margin-top": density === "row" ? "4px" : "8px",
      });
    }
    if (classes.includes("syllabus-class-group")) {
      setPrintStyle(el, {
        "margin-bottom":
          density === "row" ? "12px" : density === "standard" ? "18px" : "26px",
      });
    }
    if (classes.includes("syllabus-class-items")) {
      setPrintStyle(el, {
        "margin-top": density === "row" ? "4px" : "8px",
      });
    }
    if (classes.includes("syllabus-item-card")) {
      if (density === "row") {
        setPrintStyle(el, {
          display: "block",
          background: "transparent",
          padding: "2px 0",
          "border-radius": "0",
          margin: "0 0 2px",
          "page-break-inside": "avoid",
          "break-inside": "avoid",
          "overflow-wrap": "anywhere",
        });
      } else if (density === "standard") {
        setPrintStyle(el, {
          display: "block",
          background:
            existingBg && existingBg !== "rgba(0, 0, 0, 0)"
              ? existingBg
              : "#f3f4f6",
          padding: "6px 10px",
          "border-radius": "6px",
          margin: "0 0 4px",
          "page-break-inside": "avoid",
          "break-inside": "avoid",
          "overflow-wrap": "anywhere",
        });
      } else {
        setPrintStyle(el, {
          display: "block",
          background:
            existingBg && existingBg !== "rgba(0, 0, 0, 0)"
              ? existingBg
              : "#f3f4f6",
          padding: "10px 14px",
          "border-radius": "8px",
          margin: "0 0 8px",
          "page-break-inside": "avoid",
          "break-inside": "avoid",
          "overflow-wrap": "anywhere",
        });
      }
    }
    if (classes.includes("syllabus-item-title-row")) {
      setPrintStyle(el, {
        "font-size":
          density === "row"
            ? "13px"
            : density === "standard"
              ? "13.5px"
              : "14.5px",
        "font-weight": density === "row" ? "500" : "600",
        "line-height": "1.35",
        "margin-bottom": density === "row" ? "0" : "3px",
      });
    }
    if (
      classes.includes("syllabus-item-metadata") ||
      classes.includes("text-secondary")
    ) {
      setPrintStyle(el, {
        color: "#6b7280",
        "font-size": density === "row" ? "12px" : "12.5px",
      });
    }
    if (
      classes.includes("syllabus-item-description") ||
      classes.includes("syllabus-item-reference")
    ) {
      if (density === "row") {
        setPrintStyle(el, { display: "none" });
      } else {
        setPrintStyle(el, {
          "margin-top": "4px",
          "font-size": "13px",
          "line-height": "1.4",
        });
      }
    }
  });
}

function resolvePrintDensity(
  source: HTMLElement,
  density?: ItemDensity,
): ItemDensity {
  if (density) {
    return coerceItemDensity(density);
  }
  const fromAttr =
    source.getAttribute("data-item-density") ||
    source.dataset?.itemDensity ||
    "";
  return coerceItemDensity(fromAttr || "expanded");
}

/** Clone the live syllabus into print-safe HTML (no screen-only chrome). */
export function serializeSyllabusForPrint(
  source: HTMLElement,
  density?: ItemDensity,
): string {
  const resolved = resolvePrintDensity(source, density);
  const clone = source.cloneNode(true) as HTMLElement;
  clone.setAttribute("data-item-density", resolved);
  copyFormValues(source, clone);
  syncPrintOnlyTextFromInputs(clone);
  clone
    .querySelectorAll("script, iframe, object, embed, button, svg")
    .forEach((el) => el.remove());
  removeScreenOnlyElements(clone);
  replaceFormControlsWithText(clone);
  expandCharacterSeparators(clone);
  putTitlesBeforeBadges(clone);
  linkItemTitles(clone);
  flattenPrintLayout(clone);
  applyInlinePrintStyles(clone, resolved);
  polishClassHeadings(clone);
  polishMasthead(clone);
  polishLinks(clone);
  return clone.innerHTML;
}

export async function buildPrintableHtml({
  title,
  innerHTML,
  bibliographyHtml = "",
  density = "expanded",
}: {
  title: string;
  innerHTML: string;
  bibliographyHtml?: string;
  density?: ItemDensity;
}): Promise<string> {
  const resolved = coerceItemDensity(density);
  const safeTitle = escapeHtml(title || "Syllabus");
  const bodyStyle = [
    "margin:0",
    "padding:4px 2px",
    "color:#111",
    "background:#fff",
    `font-family:${PRINT_FONT}`,
    "font-size:14px",
    "line-height:1.45",
  ].join(";");

  return `<!DOCTYPE html>
<html style="background:#fff;color-scheme:only light">
<head>
  <meta charset="UTF-8">
  <title>${safeTitle}</title>
  <style type="text/css">${PRINT_DOCUMENT_CSS}</style>
</head>
<body class="print density-${resolved}" data-item-density="${resolved}" style="${bodyStyle}">
  <div class="syllabus-page" data-item-density="${resolved}">
    ${innerHTML}
  </div>
  ${
    bibliographyHtml
      ? `<div class="syllabus-print-page-break" style="break-after:page;page-break-after:always;height:0"></div><div style="font-family:${PRINT_FONT};color:#111;padding-top:4px">${bibliographyHtml}</div>`
      : ""
  }
</body>
</html>`;
}

function cc(contract: string): {
  getService: (iface: unknown) => unknown;
  createInstance: (iface: unknown) => unknown;
} {
  return Components.classes[contract] as unknown as {
    getService: (iface: unknown) => unknown;
    createInstance: (iface: unknown) => unknown;
  };
}

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message: string,
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => {
    clearTimeout(timeoutId);
  });
}

const SAVE_TO_PDF_PRINTER = "Mozilla Save to PDF";

function createSilentPdfSettings(
  win: Window,
  pdfPath: string,
): Record<string, unknown> {
  const ps = Ci.nsIPrintSettings;
  const zWin = win as PrintUtilsWindow;
  const printSettingsService = cc(
    "@mozilla.org/gfx/printsettings-service;1",
  ).getService(Ci.nsIPrintSettingsService) as {
    createNewPrintSettings: () => Record<string, unknown>;
    initPrintSettingsFromPrefs?: (
      settings: Record<string, unknown>,
      usePrinterName: boolean,
      flags: number,
    ) => void;
  };

  let settings: Record<string, unknown>;
  if (typeof zWin.PrintUtils?.getPrintSettings === "function") {
    settings = zWin.PrintUtils.getPrintSettings(
      SAVE_TO_PDF_PRINTER,
      false,
      true,
    );
  } else {
    settings = printSettingsService.createNewPrintSettings();
    try {
      printSettingsService.initPrintSettingsFromPrefs?.(
        settings,
        true,
        ps.kInitSaveAll,
      );
    } catch (error) {
      ztoolkit.log("initPrintSettingsFromPrefs failed:", error);
    }
  }

  // Prefs/last-used printer must not win: that sends the job to a real
  // printer (e.g. RICOH) instead of writing a PDF.
  settings.printerName = SAVE_TO_PDF_PRINTER;
  settings.isInitializedFromPrinter = true;
  settings.isInitializedFromPrefs = true;
  settings.printSilent = true;
  settings.outputFormat = ps.kOutputFormatPDF;
  settings.outputDestination = ps.kOutputDestinationFile;
  settings.toFileName = pdfPath;
  settings.paperSizeUnit = ps.kPaperSizeInches;
  settings.paperWidth = 8.5;
  settings.paperHeight = 11;
  settings.usePageRuleSizeAsPaperSize = false;
  settings.unwriteableMarginTop = 0;
  settings.unwriteableMarginLeft = 0;
  settings.unwriteableMarginBottom = 0;
  settings.unwriteableMarginRight = 0;
  settings.printBGColors = true;
  settings.printBGImages = true;
  // shrinkToFit scales a tall document as one viewport and blanks later pages.
  settings.shrinkToFit = false;
  settings.scaling = 1;
  settings.headerStrCenter = "";
  settings.headerStrLeft = "";
  settings.headerStrRight = "";
  settings.footerStrCenter = "";
  settings.footerStrLeft = "";
  settings.footerStrRight = "";
  return settings;
}

async function waitForPdfFile(pdfPath: string): Promise<Uint8Array> {
  for (let i = 0; i < 50; i++) {
    try {
      if (await IOUtils.exists(pdfPath)) {
        const stat = await IOUtils.stat(pdfPath);
        if (stat.size > 0) {
          return IOUtils.read(pdfPath);
        }
      }
    } catch {
      // File may not exist yet.
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("PDF was not created");
}

async function printToStream(
  browsingContext: PrintBrowsingContext,
  settings: Record<string, unknown>,
): Promise<Uint8Array> {
  const stream = cc("@mozilla.org/storagestream;1").createInstance(
    Ci.nsIStorageStream,
  ) as {
    init: (segmentSize: number, maxSize: number) => void;
    getOutputStream: (offset: number) => unknown;
    newInputStream: (offset: number) => unknown;
    close: () => void;
  };
  stream.init(4096, 0xffffffff);
  settings.outputDestination = Ci.nsIPrintSettings.kOutputDestinationStream;
  settings.outputStream = stream.getOutputStream(0);
  await browsingContext.print(settings);

  const input = cc("@mozilla.org/binaryinputstream;1").createInstance(
    Ci.nsIBinaryInputStream,
  ) as {
    setInputStream: (stream: unknown) => void;
    available: () => number;
    readBytes: (count: number) => string;
  };
  input.setInputStream(stream.newInputStream(0));
  const chunks: Uint8Array[] = [];
  let remaining = input.available();
  while (remaining > 0) {
    const bytes = input.readBytes(remaining);
    chunks.push(Uint8Array.from(bytes, (ch) => ch.charCodeAt(0)));
    remaining = input.available();
  }
  stream.close();
  const total = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  const pdf = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    pdf.set(chunk, offset);
    offset += chunk.byteLength;
  }
  if (pdf.byteLength === 0) {
    throw new Error("PDF was not created");
  }
  return pdf;
}

async function printBrowsingContextToPdf(
  win: Window,
  browsingContext: PrintBrowsingContext,
  pdfPath: string,
): Promise<void> {
  const settings = createSilentPdfSettings(win, pdfPath);
  ztoolkit.log(
    "Silent PDF export",
    String(settings.printerName || ""),
    "dest",
    String(settings.outputDestination),
    "format",
    String(settings.outputFormat),
    "isContent",
    String(browsingContext.isContent),
    "to",
    pdfPath,
  );

  try {
    await withTimeout(
      browsingContext.print(settings),
      45000,
      "PDF export timed out",
    );
    await waitForPdfFile(pdfPath);
    return;
  } catch (error) {
    ztoolkit.log("File PDF export failed, trying memory stream:", error);
  }

  const streamSettings = createSilentPdfSettings(win, pdfPath);
  const pdfBytes = await withTimeout(
    printToStream(browsingContext, streamSettings),
    45000,
    "PDF export timed out",
  );
  await IOUtils.write(pdfPath, pdfBytes);
}

function withPdfExtension(path: string): string {
  return path.toLowerCase().endsWith(".pdf") ? path : `${path}.pdf`;
}

async function writeTempPrintHtml(html: string): Promise<{
  path: string;
  uri: string;
}> {
  const file = Zotero.getTempDirectory().clone();
  file.append("zotero-syllabus-print.html");
  if (file.exists()) {
    file.remove(false);
  }
  await Zotero.File.putContentsAsync(file, html);
  return { path: file.path, uri: Zotero.File.pathToFileURI(file.path) };
}

function preparePrintBrowser(browser: HiddenBrowserHandle): void {
  // HiddenBrowser defaults to display:none, which clips print to one viewport.
  // Start tall enough that the first layout includes the whole syllabus; html
  // and body are height:auto so extra widget height does not become blank pages.
  const style = browser.style;
  style.display = "block";
  style.position = "fixed";
  style.left = "-20000px";
  style.top = "0";
  style.width = "8.5in";
  style.height = "80in";
  style.minHeight = "80in";
  style.border = "none";
  style.background = "#fff";
  style.overflow = "visible";
}

async function loadHtmlInHiddenBrowser(html: string): Promise<{
  browser: HiddenBrowserHandle;
  tempPath: string;
}> {
  const { HiddenBrowser } = ChromeUtils.importESModule(
    "chrome://zotero/content/HiddenBrowser.mjs",
  ) as {
    HiddenBrowser: new (options: {
      useHiddenFrame: boolean;
    }) => HiddenBrowserHandle;
  };

  const temp = await writeTempPrintHtml(html);

  const tryLoad = async (
    source: string,
  ): Promise<HiddenBrowserHandle | null> => {
    const browser = new HiddenBrowser({ useHiddenFrame: false });
    try {
      await browser._createdPromise;
      preparePrintBrowser(browser);
      const ok = await browser.load(source);
      if (!ok) {
        ztoolkit.log("HiddenBrowser.load failed for", source.slice(0, 80));
        browser.destroy();
        return null;
      }
      preparePrintBrowser(browser);
      try {
        await browser.waitForDocument();
      } catch (error) {
        ztoolkit.log("HiddenBrowser.waitForDocument:", error);
      }
      ztoolkit.log(
        "HiddenBrowser ready, isContent:",
        String(browser.browsingContext?.isContent),
      );
      return browser;
    } catch (error) {
      ztoolkit.log("HiddenBrowser load threw:", error);
      try {
        browser.destroy();
      } catch {
        // Ignore.
      }
      return null;
    }
  };

  let browser = await tryLoad(temp.path);
  if (!browser) {
    ztoolkit.log("HiddenBrowser file load failed, trying data URI");
    const dataUri = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
    browser = await tryLoad(dataUri);
  }
  if (!browser) {
    try {
      await IOUtils.remove(temp.path, { ignoreAbsent: true });
    } catch {
      // Ignore.
    }
    throw new Error("Print document never loaded");
  }
  return { browser, tempPath: temp.path };
}

/**
 * Save the printable syllabus HTML as a PDF.
 * Uses Zotero's HiddenBrowser so print() runs on a content browsing context.
 */
export async function openSyllabusPrintDialog(
  html: string,
  defaultFilename: string,
  onReady?: () => void,
): Promise<boolean> {
  const win = Zotero.getMainWindow();
  if (!win) {
    throw new Error("No Zotero main window");
  }

  onReady?.();
  const chosenPath = await pickSavePath(
    defaultFilename,
    getString("dialog-save-pdf"),
    [[getString("file-filter-pdf"), "*.pdf"]],
  );
  if (!chosenPath) {
    return false;
  }
  const pdfPath = withPdfExtension(chosenPath);

  const saving = new ztoolkit.ProgressWindow(getString("app-name"), {
    closeOnClick: false,
    closeTime: -1,
  })
    .createLine({
      text: getString("progress-saving-pdf"),
      type: "default",
    })
    .show();

  let browser: HiddenBrowserHandle | undefined;
  let tempPath: string | undefined;

  try {
    const loaded = await loadHtmlInHiddenBrowser(html);
    browser = loaded.browser;
    tempPath = loaded.tempPath;

    const browsingContext = browser.browsingContext;
    if (!browsingContext || typeof browsingContext.print !== "function") {
      throw new Error("Unable to print to PDF");
    }

    await printBrowsingContextToPdf(win, browsingContext, pdfPath);
    saving.close();
    try {
      Zotero.File.pathToFile(pdfPath).reveal();
    } catch (error) {
      ztoolkit.log("Error revealing syllabus PDF:", error);
    }
    return true;
  } catch (error) {
    saving.close();
    throw error;
  } finally {
    try {
      browser?.destroy();
    } catch (error) {
      ztoolkit.log("Error destroying print browser:", error);
    }
    if (tempPath) {
      try {
        await IOUtils.remove(tempPath, { ignoreAbsent: true });
      } catch {
        // Ignore.
      }
    }
  }
}
