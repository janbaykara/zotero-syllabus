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
    let result: unknown;
    try {
      result = getSelectedCollections();
    } catch (error) {
      assert.fail(
        `getSelectedCollections threw: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    assert.isArray(result);
  });

  it("getSelectedCollection does not throw", function () {
    let collection: ReturnType<typeof getSelectedCollection>;
    try {
      collection = getSelectedCollection();
    } catch (error) {
      assert.fail(
        `getSelectedCollection threw: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    assert.isTrue(collection === null || typeof collection.id === "number");
  });
});
