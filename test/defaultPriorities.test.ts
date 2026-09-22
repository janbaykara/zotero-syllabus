import { assert } from "chai";
import { config } from "../package.json";
import { zoteroCache } from "../src/utils/cache";
import {
  clonePriorities,
  getBuiltInDefaultPriorities,
  getGlobalDefaultPriorities,
  setGlobalDefaultPriorities,
} from "../src/modules/defaultPriorities";
import { DEFAULT_PRIORITIES } from "../src/utils/schemas";

const PREF_KEY = `${config.prefsPrefix}.defaultPriorities`;

describe("defaultPriorities", function () {
  let previous: unknown;

  beforeEach(function () {
    previous = Zotero.Prefs.get(PREF_KEY, true);
    Zotero.Prefs.clear(PREF_KEY, true);
    zoteroCache.invalidatePref(PREF_KEY);
  });

  afterEach(function () {
    if (previous === undefined || previous === null) {
      Zotero.Prefs.clear(PREF_KEY, true);
    } else {
      Zotero.Prefs.set(PREF_KEY, previous as string, true);
    }
    zoteroCache.invalidatePref(PREF_KEY);
  });

  it("falls back to built-in defaults when pref is empty", function () {
    const globals = getGlobalDefaultPriorities();
    assert.isAtLeast(globals.length, 1);
    assert.deepEqual(
      globals.map((p) => p.id),
      getBuiltInDefaultPriorities().map((p) => p.id),
    );
  });

  it("round-trips custom global priorities", function () {
    const custom = clonePriorities(DEFAULT_PRIORITIES).map((p, i) => ({
      ...p,
      name: i === 0 ? "Informação da Disciplina" : p.name,
      order: i + 1,
    }));
    setGlobalDefaultPriorities(custom);
    zoteroCache.invalidatePref(PREF_KEY);

    const loaded = getGlobalDefaultPriorities();
    assert.equal(loaded[0]?.name, "Informação da Disciplina");
    assert.deepEqual(
      loaded.map((p) => p.id),
      custom.map((p) => p.id),
    );
  });

  it("ignores invalid pref JSON and falls back", function () {
    Zotero.Prefs.set(PREF_KEY, "{not-json", true);
    zoteroCache.invalidatePref(PREF_KEY);
    const globals = getGlobalDefaultPriorities();
    assert.deepEqual(
      globals.map((p) => p.id),
      getBuiltInDefaultPriorities().map((p) => p.id),
    );
  });
});
