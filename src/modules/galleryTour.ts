import { getString } from "../utils/locale";
import { getPrefKey, getPrefValue, setPref } from "../utils/prefs";
import { zoteroCache } from "../utils/cache";
import {
  GALLERY_LAYOUT_MODES,
  getGalleryLayout,
  setDefaultGalleryLayout,
  setGalleryLayout,
  type GalleryLayout,
} from "./galleryLayout";
import {
  getGalleryGroupBy,
  setGalleryGroupBy,
  type GalleryGroupBy,
} from "./galleryGroupBy";

export {
  GALLERY_TOUR_EVENT_OPEN_SETTINGS,
  GALLERY_TOUR_EVENT_CLOSE_SETTINGS,
  maybeShowGalleryTour,
  requestGalleryTourOpenSettings,
  requestGalleryTourCloseSettings,
};

const LATEST_GALLERY_TOUR_VERSION = 1;
const GALLERY_TOUR_EVENT_OPEN_SETTINGS = "syllabus-gallery-tour-open-settings";
const GALLERY_TOUR_EVENT_CLOSE_SETTINGS =
  "syllabus-gallery-tour-close-settings";

let galleryTourInProgress = false;

function requestGalleryTourOpenSettings(win: Window = Zotero.getMainWindow()) {
  win?.dispatchEvent(new win.CustomEvent(GALLERY_TOUR_EVENT_OPEN_SETTINGS));
}

function requestGalleryTourCloseSettings(win: Window = Zotero.getMainWindow()) {
  win?.dispatchEvent(new win.CustomEvent(GALLERY_TOUR_EVENT_CLOSE_SETTINGS));
}

function markGalleryTourDone() {
  setPref("latestGalleryTourVersion", LATEST_GALLERY_TOUR_VERSION);
  zoteroCache.invalidatePref(getPrefKey("latestGalleryTourVersion"));
}

function isGalleryTourDone(): boolean {
  return (
    getPrefValue("latestGalleryTourVersion") == LATEST_GALLERY_TOUR_VERSION
  );
}

async function waitForElement(
  win: _ZoteroTypes.MainWindow,
  finder: string | (() => Element | null | undefined),
  timeoutMs = 8000,
): Promise<Element | null> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const el =
      typeof finder === "function"
        ? finder()
        : win.document.querySelector(finder);
    if (el) {
      return el;
    }
    await Zotero.Promise.delay(50);
  }
  return null;
}

async function settleTourUi(ms = 400): Promise<void> {
  await Zotero.Promise.delay(ms);
}

function anotherGuideIsOpen(win: Window): boolean {
  return !!win.document.querySelector(".guide-panel, #guide-panel-mask");
}

function applyGalleryTourState(
  viewKey: string,
  layout: GalleryLayout,
  groupBy: GalleryGroupBy,
) {
  setGalleryLayout(viewKey, layout);
  setGalleryGroupBy(viewKey, groupBy);
}

function appendChoiceButtons(
  body: HTMLElement,
  onPick: (mode: GalleryLayout) => void,
) {
  const doc = body.ownerDocument;
  const row = doc.createElement("div");
  row.style.display = "flex";
  row.style.flexDirection = "column";
  row.style.gap = "8px";
  row.style.marginTop = "12px";
  row.style.width = "100%";
  row.style.alignItems = "stretch";
  for (const mode of GALLERY_LAYOUT_MODES) {
    const button = doc.createElement("button");
    button.type = "button";
    button.textContent = getString(
      mode === "cover"
        ? "gallery-layout-cover"
        : mode === "magazine"
          ? "gallery-layout-magazine"
          : "gallery-layout-card",
    );
    button.style.cssText =
      "appearance: auto; font: inherit; padding: 6px 12px; min-width: 12em; cursor: pointer;";
    button.addEventListener("click", () => onPick(mode));
    row.appendChild(button);
  }
  body.appendChild(row);
}

async function maybeShowGalleryTour(
  win: _ZoteroTypes.MainWindow,
  viewKey: string,
): Promise<void> {
  if (!viewKey || galleryTourInProgress || isGalleryTourDone()) {
    return;
  }
  if ((__env__ as string) === "test") {
    return;
  }
  if (anotherGuideIsOpen(win)) {
    return;
  }
  const ready = await waitForElement(
    win,
    '[data-tour="gallery-options"]',
    4000,
  );
  if (!ready || anotherGuideIsOpen(win) || isGalleryTourDone()) {
    return;
  }

  galleryTourInProgress = true;
  const snapshot = {
    layout: getGalleryLayout(viewKey),
    groupBy: getGalleryGroupBy(viewKey),
  };
  let chosen: GalleryLayout | null = null;

  try {
    const doc = win.document;
    const guide = new ztoolkit.Guide();

    guide.addStep({
      title: getString("galleryTour-settings-title"),
      description: getString("galleryTour-settings-desc"),
      element: () =>
        doc.querySelector('[data-tour="gallery-settings"]') ||
        doc.querySelector('[data-tour="gallery-options"]') ||
        doc.documentElement!,
      showButtons: ["next", "close"],
      closeBtnText: getString("galleryTour-skip"),
      showProgress: true,
      onBeforeRender: async () => {
        requestGalleryTourOpenSettings(win);
        await waitForElement(win, '[data-tour="gallery-settings"]');
        await settleTourUi(200);
      },
    });

    guide.addStep({
      title: getString("galleryTour-cover-title"),
      description: getString("galleryTour-cover-desc"),
      element: () =>
        doc.querySelector("#syllabus-custom-view") || doc.documentElement!,
      position: "center",
      showButtons: ["prev", "next"],
      showProgress: true,
      onBeforeRender: async () => {
        requestGalleryTourOpenSettings(win);
        applyGalleryTourState(viewKey, "cover", "none");
        await waitForElement(win, '[data-tour="gallery-layout-cover"]');
        await settleTourUi(350);
      },
    });

    guide.addStep({
      title: getString("galleryTour-magazine-title"),
      description: getString("galleryTour-magazine-desc"),
      element: () =>
        doc.querySelector("#syllabus-custom-view") || doc.documentElement!,
      position: "center",
      showButtons: ["prev", "next"],
      showProgress: true,
      onBeforeRender: async () => {
        requestGalleryTourOpenSettings(win);
        applyGalleryTourState(viewKey, "magazine", "auto");
        await waitForElement(win, '[data-tour="gallery-layout-magazine"]');
        await settleTourUi(350);
      },
    });

    guide.addStep({
      title: getString("galleryTour-card-title"),
      description: getString("galleryTour-card-desc"),
      element: () =>
        doc.querySelector("#syllabus-custom-view") || doc.documentElement!,
      position: "center",
      showButtons: ["prev", "next"],
      showProgress: true,
      onBeforeRender: async () => {
        requestGalleryTourOpenSettings(win);
        applyGalleryTourState(viewKey, "card", "type");
        await waitForElement(win, '[data-tour="gallery-layout-card"]');
        await settleTourUi(350);
      },
    });

    guide.addStep({
      title: getString("galleryTour-choose-title"),
      description: getString("galleryTour-choose-desc"),
      position: "center",
      showButtons: ["prev", "close"],
      closeBtnText: getString("galleryTour-skip"),
      showProgress: true,
      onBeforeRender: async () => {
        requestGalleryTourCloseSettings(win);
        await settleTourUi(150);
      },
      onRender: ({ state }) => {
        const body = (state.controller as unknown as { _body?: HTMLElement })
          ._body;
        if (!body) {
          return;
        }
        appendChoiceButtons(body, (mode) => {
          chosen = mode;
          (state.controller as unknown as { abort?: () => void }).abort?.();
        });
      },
    });

    await guide.show(doc);
    markGalleryTourDone();
    if (chosen) {
      setDefaultGalleryLayout(chosen);
      applyGalleryTourState(viewKey, chosen, snapshot.groupBy);
    } else {
      applyGalleryTourState(viewKey, snapshot.layout, snapshot.groupBy);
    }
  } catch (error) {
    ztoolkit.log("Error showing gallery tour:", error);
  } finally {
    requestGalleryTourCloseSettings(win);
    galleryTourInProgress = false;
  }
}
