import { generateBibliographicReference } from "./cite";
import { getCachedItem } from "./cache";
import type { ItemDensity } from "../modules/react-zotero-sync/itemDensity";

function itemTypeToIconSlug(itemType: string): string {
  return itemType
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/_/g, "-")
    .toLowerCase();
}

const iconSvgCache = new Map<string, string | null>();

async function readChromeText(url: string): Promise<string | null> {
  try {
    if (typeof fetch === "function") {
      const res = await fetch(url);
      if (res.ok) {
        return await res.text();
      }
    }
  } catch {
    // fall through
  }
  try {
    if (typeof Zotero.File?.getContentsAsync === "function") {
      const contents = await Zotero.File.getContentsAsync(url);
      if (typeof contents === "string") {
        return contents;
      }
    }
  } catch {
    // ignore
  }
  return null;
}

async function svgForItemType(
  itemType: string,
  size: 16 | 28,
): Promise<string | null> {
  const slug = itemTypeToIconSlug(itemType);
  const cacheKey = `${size}:${slug}`;
  if (iconSvgCache.has(cacheKey)) {
    return iconSvgCache.get(cacheKey) || null;
  }
  const url = `chrome://zotero/skin/item-type/${size}/light/${slug}.svg`;
  let svg = await readChromeText(url);
  if (!svg && size === 28) {
    svg = await readChromeText(
      `chrome://zotero/skin/item-type/16/light/${slug}.svg`,
    );
  }
  if (!svg) {
    svg = await readChromeText(
      `chrome://zotero/skin/item-type/16/light/document.svg`,
    );
  }
  iconSvgCache.set(cacheKey, svg);
  return svg;
}

function svgToDataUri(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

async function itemTypeIconDataUri(
  itemType: string,
  size: 16 | 28,
): Promise<string | null> {
  const svg = await svgForItemType(itemType, size);
  return svg ? svgToDataUri(svg) : null;
}

async function blobOrHttpToDataUri(src: string): Promise<string | null> {
  if (!src || src.startsWith("data:")) {
    return src || null;
  }
  try {
    const res = await fetch(src);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    const contentType =
      res.headers.get("content-type") || "application/octet-stream";
    const bytes = new Uint8Array(buf);
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    return `data:${contentType};base64,${btoa(binary)}`;
  } catch (err) {
    ztoolkit.log("blobOrHttpToDataUri failed:", src.slice(0, 64), err);
    return null;
  }
}

/** Replace CSS item-type icons with embedded SVG images for public HTML. */
export async function embedPublishItemTypeIcons(
  root: ParentNode,
  density: ItemDensity,
): Promise<void> {
  const size: 16 | 28 = density === "row" ? 16 : 28;
  const icons = Array.from(
    root.querySelectorAll(
      ".syllabus-item-thumbnail .icon-item-type[data-item-type]",
    ),
  ) as Element[];
  for (const icon of icons) {
    const itemType = icon.getAttribute("data-item-type") || "document";
    const dataUri = await itemTypeIconDataUri(itemType, size);
    if (!dataUri) continue;
    const doc = icon.ownerDocument;
    if (!doc) continue;
    const img = doc.createElement("img");
    img.src = dataUri;
    img.alt = "";
    img.width = size;
    img.height = size;
    img.className = "syllabus-publish-item-type-icon";
    img.setAttribute("aria-hidden", "true");
    icon.replaceWith(img);
  }
}

/** Inline cover <img> sources so blob:/chrome: URLs survive outside Zotero. */
export async function embedPublishCoverImages(root: ParentNode): Promise<void> {
  const images = Array.from(
    root.querySelectorAll(
      ".syllabus-item-thumbnail img, .syllabus-item-thumbnail-cover img",
    ),
  ) as HTMLImageElement[];
  for (const img of images) {
    const src = img.getAttribute("src") || "";
    if (!src || src.startsWith("data:")) continue;
    const dataUri = await blobOrHttpToDataUri(src);
    if (dataUri) {
      img.setAttribute("src", dataUri);
    } else {
      img.removeAttribute("src");
    }
  }
}

/**
 * Put a bibliographic citation under each reading.
 * Row: citation on its own line under the title (not beside it).
 * Standard/expanded: replace the metadata block; drop duplicate reference lines.
 */
export async function replacePublishMetadataWithCitations(
  root: ParentNode,
  density: ItemDensity,
  cslStyle?: string | null,
): Promise<void> {
  const cards = Array.from(
    root.querySelectorAll(
      ".syllabus-item-card[data-item-id], .syllabus-gallery-tile[data-item-id], .syllabus-magazine-tile[data-item-id]",
    ),
  ) as Element[];
  for (const card of cards) {
    const id = Number.parseInt(card.getAttribute("data-item-id") || "", 10);
    if (!Number.isFinite(id)) continue;
    const item = getCachedItem(id) || Zotero.Items.get(id);
    if (!item || item.isAttachment?.() || item.isNote?.()) continue;

    let citation = "";
    try {
      citation =
        (await generateBibliographicReference(item, true, cslStyle || null)) ||
        "";
    } catch (err) {
      ztoolkit.log("citation for publish failed:", id, err);
    }
    if (!citation.trim()) continue;

    const doc = card.ownerDocument;
    if (!doc) continue;

    let meta = card.querySelector(
      ".syllabus-item-metadata",
    ) as HTMLElement | null;
    if (!meta) {
      meta = doc.createElement("div");
      meta.className = "syllabus-item-metadata";
    }
    meta.textContent = citation.trim();
    meta.classList.add("syllabus-publish-citation");
    // Row author·year was a character-separator flex; citation is plain text.
    meta.classList.remove(
      "flex",
      "flex-row",
      "character-separator",
      "items-baseline",
      "justify-end",
      "text-right",
      "whitespace-nowrap",
      "shrink-0",
    );

    if (density === "row") {
      const textCol = card.querySelector(".syllabus-item-text");
      const title = card.querySelector(".syllabus-item-title");
      const titleLine = title?.parentElement;
      if (titleLine && textCol && titleLine !== textCol) {
        titleLine.classList.add("syllabus-publish-title-line");
      }
      if (textCol) {
        textCol.appendChild(meta);
      } else {
        card.appendChild(meta);
      }
    } else if (!meta.isConnected) {
      const textCol = card.querySelector(".syllabus-item-text");
      (textCol || card).appendChild(meta);
    }

    // Avoid duplicating the expanded in-card reference line.
    card.querySelectorAll(".syllabus-item-reference").forEach((el) => {
      el.remove();
    });
  }
}
