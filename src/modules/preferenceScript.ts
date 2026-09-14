import { config } from "../../package.json";
import { getPrefValue, setPref } from "../utils/prefs";

const ISSUES_URL = "https://github.com/janbaykara/zotero-syllabus/issues";
const REDDIT_URL =
  "https://www.reddit.com/r/zotero/comments/1w3eu97/zotero_syllabus_a_plugin_for_students_to_organise/";

export async function registerPrefsScripts(_window: Window) {
  // This function is called when the prefs window is opened
  // See addon/content/preferences.xhtml onpaneload
  if (!addon.data.prefs) {
    addon.data.prefs = {
      window: _window,
      columns: [],
      rows: [],
    };
  } else {
    addon.data.prefs.window = _window;
  }
  updatePrefsUI();
  bindPrefEvents();
}

async function updatePrefsUI() {
  const win = addon.data.prefs?.window;
  if (!win) return;
  ztoolkit.log("Preference window loaded");
  syncWpmInput(win);
}

function syncWpmInput(win: Window) {
  const input = win.document.getElementById(
    `zotero-prefpane-${config.addonRef}-wpm`,
  ) as HTMLInputElement | null;
  if (!input) return;
  const wpm = Number(getPrefValue("wpm"));
  input.value = String(Number.isFinite(wpm) && wpm > 0 ? wpm : 220);
}

function bindPrefEvents() {
  const win = addon.data.prefs?.window;
  if (!win) return;
  const doc = win.document;

  const wpmInput = doc.getElementById(
    `zotero-prefpane-${config.addonRef}-wpm`,
  ) as HTMLInputElement | null;
  if (wpmInput && !wpmInput.dataset.syllabusBound) {
    wpmInput.dataset.syllabusBound = "1";
    const commit = () => {
      const raw = Number(wpmInput.value);
      if (!Number.isFinite(raw)) {
        syncWpmInput(win);
        return;
      }
      const clamped = Math.min(1000, Math.max(60, Math.round(raw)));
      wpmInput.value = String(clamped);
      setPref("wpm", clamped);
    };
    wpmInput.addEventListener("change", commit);
    wpmInput.addEventListener("blur", commit);
  }

  bindLaunchLink(
    doc.getElementById(`${config.addonRef}-pref-link-issues`),
    ISSUES_URL,
  );
  bindLaunchLink(
    doc.getElementById(`${config.addonRef}-pref-link-reddit`),
    REDDIT_URL,
  );
}

function bindLaunchLink(el: Element | null, url: string) {
  if (!el || (el as HTMLElement).dataset.syllabusBound) return;
  (el as HTMLElement).dataset.syllabusBound = "1";
  el.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    Zotero.launchURL(url);
  });
}
