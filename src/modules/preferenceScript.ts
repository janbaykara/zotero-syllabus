import { config } from "../../package.json";
import { getPref, PREFS_KEYS } from "../utils/prefs";

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
  // You can initialize some UI elements on prefs window
  // with addon.data.prefs.window.document
  // Or bind some events to the elements
  if (addon.data.prefs?.window == undefined) return;
  // Preferences UI can be customized here if needed
  ztoolkit.log("Preference window loaded");
}

function bindPrefEvents() {
  for (const pref of PREFS_KEYS) {
    // addon.data
    //   .prefs!.window.document?.querySelector(
    //     `#zotero-prefpane-${config.addonRef}-${pref}`,
    //   )
    //   ?.addEventListener("command", (e: Event) => {
    //     ztoolkit.log(e);
    //     addon.data.prefs!.window.alert(
    //       `Successfully changed to ${(e.target as XUL.Checkbox).checked}!`,
    //     );
    //   });
  }
}
