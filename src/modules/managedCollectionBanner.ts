import { getString } from "../utils/locale";
import { getSelectedCollection } from "../utils/zotero";
import {
  getCollectionTreeKind,
  isAutoManagedCollection,
} from "./autoManagedCollection";

const BANNER_ID = "syllabus-managed-folder-banner";
const TITLE_CLASS = "syllabus-managed-folder-banner-title";
const MESSAGE_CLASS = "syllabus-managed-folder-banner-message";
const SVG_NS = "http://www.w3.org/2000/svg";

function messageForCollection(collectionId: number): string {
  const kind = getCollectionTreeKind(collectionId);
  if (kind === "reading-schedule-root" || kind === "calendar-date") {
    return getString("managed-folder-banner-schedule");
  }
  return getString("managed-folder-banner-class");
}

function createLockIcon(doc: Document): SVGSVGElement {
  const svg = doc.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", "16");
  svg.setAttribute("height", "16");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("class", "syllabus-managed-folder-banner-icon");

  const rect = doc.createElementNS(SVG_NS, "rect");
  rect.setAttribute("width", "18");
  rect.setAttribute("height", "11");
  rect.setAttribute("x", "3");
  rect.setAttribute("y", "11");
  rect.setAttribute("rx", "2");
  rect.setAttribute("ry", "2");
  rect.setAttribute("fill", "none");
  rect.setAttribute("stroke", "currentColor");
  rect.setAttribute("stroke-width", "2");

  const path = doc.createElementNS(SVG_NS, "path");
  path.setAttribute("d", "M7 11V7a5 5 0 0 1 10 0v4");
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "currentColor");
  path.setAttribute("stroke-width", "2");
  path.setAttribute("stroke-linecap", "round");

  svg.append(rect, path);
  return svg;
}

function createBanner(doc: Document): HTMLElement {
  // XUL vbox so the items tree flexes around this notice instead of overlaying it.
  const banner = (
    doc as Document & { createXULElement: (tag: string) => HTMLElement }
  ).createXULElement("vbox");
  banner.id = BANNER_ID;
  banner.classList.add("syllabus-managed-folder-banner");
  banner.setAttribute("flex", "0");
  banner.setAttribute("role", "status");
  banner.setAttribute("aria-live", "polite");

  const inner = doc.createElement("div");
  inner.className = "syllabus-managed-folder-banner-inner";

  const text = doc.createElement("div");
  text.className = "syllabus-managed-folder-banner-text";

  const title = doc.createElement("div");
  title.className = TITLE_CLASS;
  title.textContent = getString("managed-folder-banner-title");

  const message = doc.createElement("div");
  message.className = MESSAGE_CLASS;

  text.append(title, message);
  inner.append(createLockIcon(doc), text);
  banner.append(inner);
  return banner;
}

function ensureBanner(
  doc: Document,
  itemsTree: HTMLElement | null,
  container: HTMLElement,
): HTMLElement | null {
  const existing = doc.getElementById(BANNER_ID) as HTMLElement | null;
  if (existing) {
    return existing;
  }

  const parent = itemsTree?.parentNode || container;
  if (!parent) {
    return null;
  }

  const banner = createBanner(doc);
  if (itemsTree && itemsTree.parentNode === parent) {
    parent.insertBefore(banner, itemsTree);
  } else {
    parent.appendChild(banner);
  }
  return banner;
}

/** Show a notice above the items list for auto-managed class/schedule folders. */
export function updateManagedCollectionBanner(
  win: _ZoteroTypes.MainWindow,
  options: {
    collectionId: number | null;
    itemsListVisible: boolean;
  },
): void {
  const doc = win.document;
  const container = doc.getElementById(
    "zotero-items-pane-container",
  ) as HTMLElement | null;
  const itemsTree = doc.getElementById(
    "zotero-items-tree",
  ) as HTMLElement | null;
  if (!container && !itemsTree) {
    return;
  }

  const shouldShow =
    options.itemsListVisible &&
    options.collectionId != null &&
    isAutoManagedCollection(options.collectionId);

  const existing = doc.getElementById(BANNER_ID) as HTMLElement | null;
  if (!shouldShow) {
    if (existing) {
      existing.hidden = true;
    }
    return;
  }

  const banner =
    existing || (container && ensureBanner(doc, itemsTree, container));
  if (!banner || options.collectionId == null) {
    return;
  }

  const message = banner.querySelector(`.${MESSAGE_CLASS}`);
  if (message) {
    message.textContent = messageForCollection(options.collectionId);
  }
  banner.hidden = false;
  banner.removeAttribute("hidden");
}

/** Re-apply the items-list notice after managed folders are remembered. */
export function refreshManagedCollectionBanner(
  win: _ZoteroTypes.MainWindow,
): void {
  const customView = win.document.getElementById(
    "syllabus-custom-view",
  ) as HTMLElement | null;
  updateManagedCollectionBanner(win, {
    collectionId: getSelectedCollection()?.id ?? null,
    itemsListVisible: !customView || customView.style.display === "none",
  });
}

export function removeManagedCollectionBanner(
  win: _ZoteroTypes.MainWindow,
): void {
  win.document.getElementById(BANNER_ID)?.remove();
}
