import { assert } from "chai";
import {
  coerceMagazinePacking,
  getDefaultMagazinePacking,
  getMagazinePacking,
  saveMagazinePackingGlobally,
  setDefaultMagazinePacking,
  setMagazinePacking,
} from "../src/modules/magazinePacking";
import { config } from "../package.json";
import { zoteroCache } from "../src/utils/cache";

const GLOBAL_PREF = `${config.prefsPrefix}.magazinePacking`;
const VIEW_PREF = `${config.prefsPrefix}.galleryPacking`;

describe("magazinePacking", function () {
  beforeEach(function () {
    Zotero.Prefs.clear(GLOBAL_PREF, true);
    Zotero.Prefs.clear(VIEW_PREF, true);
    zoteroCache.invalidatePref(GLOBAL_PREF);
    zoteroCache.invalidatePref(VIEW_PREF);
  });

  it("coerces packing modes and defaults to packed", function () {
    assert.equal(coerceMagazinePacking("vertical"), "vertical");
    assert.equal(coerceMagazinePacking("grid"), "grid");
    assert.equal(coerceMagazinePacking("packed"), "packed");
    assert.equal(coerceMagazinePacking("chaos"), "packed");
    assert.equal(getDefaultMagazinePacking(), "packed");
  });

  it("stores per-view packing and falls back to the global default", function () {
    setDefaultMagazinePacking("grid");
    assert.equal(getMagazinePacking("missing-view"), "grid");
    setMagazinePacking("12", "vertical");
    assert.equal(getMagazinePacking("12"), "vertical");
    assert.equal(getMagazinePacking("other"), "grid");
  });

  it("defaults Reading Schedule to vertical until a view value is stored", function () {
    setDefaultMagazinePacking("grid");
    assert.equal(getMagazinePacking("reading-schedule"), "vertical");
    setMagazinePacking("reading-schedule", "packed");
    assert.equal(getMagazinePacking("reading-schedule"), "packed");
  });

  it("saves packing globally for the current view", function () {
    saveMagazinePackingGlobally("reading-schedule", "vertical");
    assert.equal(getDefaultMagazinePacking(), "vertical");
    assert.equal(getMagazinePacking("reading-schedule"), "vertical");
  });
});
