import { assert } from "chai";
import {
  anyHighlightColorDescriptions,
  getHighlightColorDescription,
} from "../src/highlight-descriptions/compat";
import { zoteroCache } from "../src/utils/cache";

const PREF_YELLOW = "extensions.highlightdescriptions.color_ffd400";
const PREF_GRAY = "extensions.highlightdescriptions.color_aaaaaa";

describe("highlightDescriptionsCompat", function () {
  const previous = new Map<string, unknown>();

  beforeEach(function () {
    previous.clear();
    for (const key of [PREF_YELLOW, PREF_GRAY]) {
      previous.set(key, Zotero.Prefs.get(key, true));
      try {
        Zotero.Prefs.clear(key, true);
      } catch {
        /* already clear */
      }
      zoteroCache.invalidatePref(key);
    }
  });

  afterEach(function () {
    for (const key of [PREF_YELLOW, PREF_GRAY]) {
      const value = previous.get(key);
      if (value === undefined) {
        try {
          Zotero.Prefs.clear(key, true);
        } catch {
          /* already clear */
        }
      } else {
        Zotero.Prefs.set(key, value as string | number | boolean, true);
      }
      zoteroCache.invalidatePref(key);
    }
  });

  it("returns null when the Highlight Descriptions pref is missing", function () {
    assert.isNull(getHighlightColorDescription("#ffd400"));
  });

  it("returns the stored label for a colour", function () {
    Zotero.Prefs.set(PREF_YELLOW, "Important/interesting", true);
    zoteroCache.invalidatePref(PREF_YELLOW);
    assert.equal(
      getHighlightColorDescription("#ffd400"),
      "Important/interesting",
    );
  });

  it("normalizes hex case before looking up the pref", function () {
    Zotero.Prefs.set(PREF_YELLOW, "Claim", true);
    zoteroCache.invalidatePref(PREF_YELLOW);
    assert.equal(getHighlightColorDescription("#FFD400"), "Claim");
  });

  it("treats blank and dash labels as absent", function () {
    Zotero.Prefs.set(PREF_GRAY, "-", true);
    zoteroCache.invalidatePref(PREF_GRAY);
    assert.isNull(getHighlightColorDescription("#aaaaaa"));

    Zotero.Prefs.set(PREF_GRAY, "   ", true);
    zoteroCache.invalidatePref(PREF_GRAY);
    assert.isNull(getHighlightColorDescription("#aaaaaa"));
  });

  it("returns null for unparseable colours", function () {
    assert.isNull(getHighlightColorDescription("not-a-color"));
    assert.isNull(getHighlightColorDescription(""));
  });

  it("reports whether any colour in a list has a label", function () {
    assert.isFalse(anyHighlightColorDescriptions(["#ffd400", "#aaaaaa"]));
    Zotero.Prefs.set(PREF_YELLOW, "Important", true);
    zoteroCache.invalidatePref(PREF_YELLOW);
    assert.isTrue(anyHighlightColorDescriptions(["#ffd400", "#aaaaaa"]));
  });
});
