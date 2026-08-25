import { assert } from "chai";
import { config } from "../package.json";
import {
  getSelectedCollection,
  getSelectedCollections,
} from "../src/utils/zotero";

describe("startup", function () {
  it("should have plugin instance defined", function () {
    assert.isNotEmpty(Zotero[config.addonInstance]);
  });

  it("getSelectedCollections returns an array", function () {
    assert.isArray(getSelectedCollections());
  });

  it("getSelectedCollection does not throw", function () {
    const collection = getSelectedCollection();
    assert.isTrue(collection === null || typeof collection.id === "number");
  });
});
