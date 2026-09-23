import { assert } from "chai";
import { config } from "../package.json";
import { zoteroCache } from "../src/utils/cache";
import {
  getDefaultSyllabusLayout,
  getGalleryLayout,
  saveGalleryLayoutGlobally,
  setDefaultSyllabusLayout,
  setGalleryLayout,
} from "../src/modules/galleryLayout";
import {
  getViewItemDensity,
  saveItemDensityGlobally,
  setItemDensity,
  setViewItemDensity,
} from "../src/modules/react-zotero-sync/itemDensity";
import {
  getViewReaderMode,
  saveReaderModeGlobally,
  setViewReaderMode,
} from "../src/modules/react-zotero-sync/readerMode";
import {
  getShowItemsWithoutAnnotations,
  saveShowItemsWithoutAnnotationsGlobally,
  setShowItemsWithoutAnnotations,
} from "../src/modules/showItemsWithoutAnnotations";
import {
  getAnnotationColorFilter,
  getDefaultAnnotationColorFilter,
  getViewQuoteOrder,
  saveAnnotationColorFilterGlobally,
  setAnnotationColorFilter,
  setViewQuoteOrder,
} from "../src/modules/myAnnotationsPrefs";
import {
  getDefaultFurtherReadingSortBy,
  getFurtherReadingSortBy,
  saveFurtherReadingSortByGlobally,
  setDefaultFurtherReadingSortBy,
  setFurtherReadingSortBy,
} from "../src/modules/furtherReadingSort";
import { setPref } from "../src/utils/prefs";

const PREF_KEYS = [
  `${config.prefsPrefix}.galleryLayout`,
  `${config.prefsPrefix}.defaultGalleryLayout`,
  `${config.prefsPrefix}.defaultSyllabusLayout`,
  `${config.prefsPrefix}.itemDensities`,
  `${config.prefsPrefix}.defaultItemDensity`,
  `${config.prefsPrefix}.readerModes`,
  `${config.prefsPrefix}.readerMode`,
  `${config.prefsPrefix}.showItemsWithoutAnnotations`,
  `${config.prefsPrefix}.galleryShowItemsWithoutAnnotations`,
  `${config.prefsPrefix}.annotationsQuoteOrderByView`,
  `${config.prefsPrefix}.annotationsQuoteOrder`,
  `${config.prefsPrefix}.annotationColorFilter`,
  `${config.prefsPrefix}.defaultAnnotationColorFilter`,
  `${config.prefsPrefix}.furtherReadingSort`,
  `${config.prefsPrefix}.defaultFurtherReadingSort`,
];

describe("view-scoped display prefs", function () {
  const previous = new Map<string, unknown>();

  beforeEach(function () {
    previous.clear();
    for (const key of PREF_KEYS) {
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

  it("uses defaultSyllabusLayout for syllabus and reading-schedule keys", function () {
    setDefaultSyllabusLayout("magazine");
    assert.equal(getDefaultSyllabusLayout(), "magazine");
    assert.equal(getGalleryLayout("syllabus:12"), "magazine");
    assert.equal(getGalleryLayout("reading-schedule"), "magazine");
    assert.equal(getGalleryLayout("12"), "cover");
    setGalleryLayout("syllabus:12", "cover");
    assert.equal(getGalleryLayout("syllabus:12"), "cover");
    saveGalleryLayoutGlobally("reading-schedule", "annotations");
    assert.equal(getDefaultSyllabusLayout(), "annotations");
    assert.equal(getGalleryLayout("reading-schedule"), "annotations");
    assert.equal(getGalleryLayout("12"), "cover");
  });

  it("stores density per view and saves the default", function () {
    setItemDensity("expanded");
    assert.equal(getViewItemDensity("missing"), "expanded");
    setViewItemDensity("12", "row");
    assert.equal(getViewItemDensity("12"), "row");
    assert.equal(getViewItemDensity("syllabus:12"), "expanded");
    saveItemDensityGlobally("12", "standard");
    assert.equal(getViewItemDensity("missing"), "standard");
    assert.equal(getViewItemDensity("12"), "standard");
  });

  it("stores reader mode per view and saves the default", function () {
    assert.isFalse(getViewReaderMode("missing"));
    setViewReaderMode("syllabus:12", true);
    assert.isTrue(getViewReaderMode("syllabus:12"));
    assert.isFalse(getViewReaderMode("12"));
    saveReaderModeGlobally("syllabus:12", true);
    assert.isTrue(getViewReaderMode("missing"));
  });

  it("stores show-empty per view and saves the default", function () {
    assert.isTrue(getShowItemsWithoutAnnotations("missing"));
    setShowItemsWithoutAnnotations("12", false);
    assert.isFalse(getShowItemsWithoutAnnotations("12"));
    assert.isTrue(getShowItemsWithoutAnnotations("syllabus:12"));
    saveShowItemsWithoutAnnotationsGlobally("12", false);
    assert.isFalse(getShowItemsWithoutAnnotations("missing"));
  });

  it("stores quote order per view and falls back to the default", function () {
    assert.equal(getViewQuoteOrder("missing"), "location");
    setViewQuoteOrder("12", "dateAdded");
    assert.equal(getViewQuoteOrder("12"), "dateAdded");
    assert.equal(getViewQuoteOrder("syllabus:12"), "location");
  });

  it("inherits the colour-filter default except on named explorer/feed scopes", function () {
    setPref("defaultAnnotationColorFilter", "#ffd400");
    zoteroCache.invalidatePref(
      `${config.prefsPrefix}.defaultAnnotationColorFilter`,
    );
    assert.deepEqual(getDefaultAnnotationColorFilter(), ["#ffd400"]);
    assert.deepEqual(getAnnotationColorFilter("12"), ["#ffd400"]);
    assert.deepEqual(getAnnotationColorFilter("syllabus:12"), ["#ffd400"]);
    assert.deepEqual(getAnnotationColorFilter("feed"), []);
    assert.deepEqual(getAnnotationColorFilter("explorer"), []);
    setAnnotationColorFilter("12", []);
    assert.deepEqual(getAnnotationColorFilter("12"), []);
    assert.deepEqual(getAnnotationColorFilter("99"), ["#ffd400"]);
    saveAnnotationColorFilterGlobally("syllabus:12", ["#2ea8e5"]);
    assert.deepEqual(getDefaultAnnotationColorFilter(), ["#2ea8e5"]);
    assert.deepEqual(getAnnotationColorFilter("99"), ["#2ea8e5"]);
  });

  it("saves further-reading sort as the default", function () {
    assert.equal(getFurtherReadingSortBy(12), "title");
    setFurtherReadingSortBy(12, "date");
    assert.equal(getFurtherReadingSortBy(12), "date");
    assert.equal(getFurtherReadingSortBy(99), "title");
    saveFurtherReadingSortByGlobally(12, "creator");
    assert.equal(getDefaultFurtherReadingSortBy(), "creator");
    setDefaultFurtherReadingSortBy("creator");
    assert.equal(getFurtherReadingSortBy(99), "creator");
  });
});
