import { assert } from "chai";
import { config } from "../package.json";
import { zoteroCache } from "../src/utils/cache";
import {
  GALLERY_LAYOUT_MODES,
  coerceGalleryLayout,
  getDefaultGalleryLayout,
  getGalleryLayout,
  saveGalleryLayoutGlobally,
  setDefaultGalleryLayout,
  setGalleryLayout,
} from "../src/modules/galleryLayout";
import {
  coerceGallerySortBy,
  getDefaultGallerySortBy,
  getGallerySortBy,
  saveGallerySortByGlobally,
  setDefaultGallerySortBy,
} from "../src/modules/gallerySort";
import {
  coerceGalleryGroupBy,
  getDefaultGalleryGroupBy,
  getGalleryGroupBy,
  saveGalleryGroupByGlobally,
  setDefaultGalleryGroupBy,
} from "../src/modules/galleryGroupBy";
import {
  getDefaultMagazineTypeSize,
  getMagazineTypeSize,
  saveMagazineTypeSizeGlobally,
  setDefaultMagazineTypeSize,
} from "../src/modules/magazineTypeSize";

const PREF_KEYS = [
  `${config.prefsPrefix}.galleryLayout`,
  `${config.prefsPrefix}.gallerySort`,
  `${config.prefsPrefix}.galleryGroupBy`,
  `${config.prefsPrefix}.galleryTypeSize`,
  `${config.prefsPrefix}.defaultGalleryLayout`,
  `${config.prefsPrefix}.defaultGallerySort`,
  `${config.prefsPrefix}.defaultGalleryGroupBy`,
  `${config.prefsPrefix}.magazineTypeSize`,
];

describe("gallery defaults", function () {
  const previous = new Map<string, unknown>();

  beforeEach(function () {
    previous.clear();
    for (const key of PREF_KEYS) {
      previous.set(key, Zotero.Prefs.get(key, true));
    }
  });

  afterEach(function () {
    for (const key of PREF_KEYS) {
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

  it("orders magazine before card", function () {
    assert.deepEqual([...GALLERY_LAYOUT_MODES], ["cover", "magazine", "card"]);
  });

  it("coerces unknown layouts to cover", function () {
    assert.equal(coerceGalleryLayout("magazine"), "magazine");
    assert.equal(coerceGalleryLayout("card"), "card");
    assert.equal(coerceGalleryLayout("nope"), "cover");
  });

  it("uses the global layout default when a view has no stored value", function () {
    Zotero.Prefs.clear(`${config.prefsPrefix}.galleryLayout`, true);
    zoteroCache.invalidatePref(`${config.prefsPrefix}.galleryLayout`);
    setDefaultGalleryLayout("magazine");
    assert.equal(getDefaultGalleryLayout(), "magazine");
    assert.equal(getGalleryLayout("missing-view"), "magazine");
  });

  it("keeps a stored collection layout over the global default", function () {
    setDefaultGalleryLayout("cover");
    setGalleryLayout("12", "card");
    assert.equal(getGalleryLayout("12"), "card");
    assert.equal(getDefaultGalleryLayout(), "cover");
  });

  it("save globally writes the default and the collection layout", function () {
    saveGalleryLayoutGlobally("12", "magazine");
    assert.equal(getDefaultGalleryLayout(), "magazine");
    assert.equal(getGalleryLayout("12"), "magazine");
  });

  it("uses the global sort default when a view has no stored value", function () {
    Zotero.Prefs.clear(`${config.prefsPrefix}.gallerySort`, true);
    zoteroCache.invalidatePref(`${config.prefsPrefix}.gallerySort`);
    setDefaultGallerySortBy("title");
    assert.equal(coerceGallerySortBy("dateAdded"), "dateAdded");
    assert.equal(getDefaultGallerySortBy(), "title");
    assert.equal(getGallerySortBy("missing-view"), "title");
  });

  it("save globally writes the default and the collection sort", function () {
    saveGallerySortByGlobally("12", "date");
    assert.equal(getDefaultGallerySortBy(), "date");
    assert.equal(getGallerySortBy("12"), "date");
  });

  it("uses the global group-by default when a view has no stored value", function () {
    Zotero.Prefs.clear(`${config.prefsPrefix}.galleryGroupBy`, true);
    zoteroCache.invalidatePref(`${config.prefsPrefix}.galleryGroupBy`);
    setDefaultGalleryGroupBy("type");
    assert.equal(coerceGalleryGroupBy("creator"), "creator");
    assert.equal(getDefaultGalleryGroupBy(), "type");
    assert.equal(getGalleryGroupBy("missing-view"), "type");
  });

  it("save globally writes the default and the collection group-by", function () {
    saveGalleryGroupByGlobally("12", "creator");
    assert.equal(getDefaultGalleryGroupBy(), "creator");
    assert.equal(getGalleryGroupBy("12"), "creator");
  });

  it("uses the global type size when a view has no stored value", function () {
    Zotero.Prefs.clear(`${config.prefsPrefix}.galleryTypeSize`, true);
    zoteroCache.invalidatePref(`${config.prefsPrefix}.galleryTypeSize`);
    setDefaultMagazineTypeSize("large");
    assert.equal(getDefaultMagazineTypeSize(), "large");
    assert.equal(getMagazineTypeSize("missing-view"), "large");
  });

  it("save globally writes the default and the collection type size", function () {
    saveMagazineTypeSizeGlobally("12", "large");
    assert.equal(getDefaultMagazineTypeSize(), "large");
    assert.equal(getMagazineTypeSize("12"), "large");
  });
});
