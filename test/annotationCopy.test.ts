import { assert } from "chai";
import { config } from "../package.json";
import {
  annotationHasCopyText,
  formatAnnotationCopyText,
  formatGroupCopyText,
} from "../src/modules/annotationStream";
import type { MyAnnotationStreamEntry } from "../src/modules/explorerQueries";
import { zoteroCache } from "../src/utils/cache";
import { getPref, setPref } from "../src/utils/prefs";

const BLOCKQUOTE_KEY = `${config.prefsPrefix}.myAnnotationsCopyBlockquote`;
const CITE_KEY = `${config.prefsPrefix}.myAnnotationsCopyCiteKey`;

function fakeParent(citationKey: string): Zotero.Item {
  return {
    id: 99,
    isRegularItem: () => true,
    getField: (field: string) => (field === "citationKey" ? citationKey : ""),
  } as unknown as Zotero.Item;
}

function entry(
  overrides: Partial<MyAnnotationStreamEntry> = {},
): MyAnnotationStreamEntry {
  return {
    id: 1,
    quote: "A quoted line",
    comment: "",
    color: "#ffd400",
    dateAdded: "",
    dateModified: "",
    pageLabel: "",
    sortIndex: "",
    parent: null,
    ...overrides,
  };
}

describe("annotation copy formatting", function () {
  this.timeout(30_000);

  const previous = new Map<string, unknown>();

  beforeEach(function () {
    previous.clear();
    for (const key of [BLOCKQUOTE_KEY, CITE_KEY]) {
      previous.set(key, Zotero.Prefs.get(key, true));
      Zotero.Prefs.set(key, false, true);
      zoteroCache.invalidatePref(key);
    }
  });

  afterEach(function () {
    for (const key of [BLOCKQUOTE_KEY, CITE_KEY]) {
      const value = previous.get(key);
      if (value === undefined || value === null) {
        Zotero.Prefs.clear(key, true);
      } else {
        Zotero.Prefs.set(key, value as boolean, true);
      }
      zoteroCache.invalidatePref(key);
    }
  });

  it("copies the quote without formatting when prefs are off", function () {
    assert.equal(formatAnnotationCopyText(entry()), "A quoted line");
  });

  it("wraps the quote as a Markdown blockquote when enabled", function () {
    setPref("myAnnotationsCopyBlockquote", true);
    assert.equal(formatAnnotationCopyText(entry()), "> A quoted line");
    assert.equal(
      formatAnnotationCopyText(entry({ quote: "first line\n\nsecond line" })),
      "> first line\n>\n> second line",
    );
  });

  it("appends a Pandoc cite key when enabled", function () {
    setPref("myAnnotationsCopyCiteKey", true);
    assert.equal(
      formatAnnotationCopyText(entry({ parent: fakeParent("smith2020") })),
      "A quoted line [@smith2020]",
    );
  });

  it("applies both options together", function () {
    setPref("myAnnotationsCopyBlockquote", true);
    setPref("myAnnotationsCopyCiteKey", true);
    assert.equal(
      formatAnnotationCopyText(entry({ parent: fakeParent("smith2020") })),
      "> A quoted line [@smith2020]",
    );
  });

  it("does not wrap comments in a blockquote", function () {
    setPref("myAnnotationsCopyBlockquote", true);
    assert.equal(
      formatAnnotationCopyText(entry({ quote: "quoted", comment: "my note" })),
      "> quoted\n\nmy note",
    );
  });

  it("joins a group's copy text", function () {
    setPref("myAnnotationsCopyBlockquote", true);
    assert.equal(
      formatGroupCopyText([
        entry({ id: 1, quote: "one" }),
        entry({ id: 2, quote: "two" }),
      ]),
      "> one\n\n> two",
    );
  });

  it("copies a comment-only annotation", function () {
    assert.equal(
      formatAnnotationCopyText(entry({ quote: "", comment: "just a note" })),
      "just a note",
    );
  });

  it("strips HTML from comments", function () {
    assert.equal(
      formatAnnotationCopyText(
        entry({ quote: "quoted", comment: "Hello <i>world</i>" }),
      ),
      "quoted\n\nHello world",
    );
  });

  it("omits [@cite] when the parent has no key", function () {
    setPref("myAnnotationsCopyCiteKey", true);
    assert.equal(formatAnnotationCopyText(entry()), "A quoted line");
  });

  it("reads the latest pref after the first getPref snapshot", function () {
    assert.isFalse(getPref("myAnnotationsCopyBlockquote"));
    assert.equal(formatAnnotationCopyText(entry()), "A quoted line");

    setPref("myAnnotationsCopyBlockquote", true);
    assert.isTrue(getPref("myAnnotationsCopyBlockquote"));
    assert.equal(formatAnnotationCopyText(entry()), "> A quoted line");

    setPref("myAnnotationsCopyBlockquote", false);
    assert.isFalse(getPref("myAnnotationsCopyBlockquote"));
    assert.equal(formatAnnotationCopyText(entry()), "A quoted line");
  });

  it("follows checkbox toggles that bypass setPref (prefs pane)", function () {
    assert.equal(formatAnnotationCopyText(entry()), "A quoted line");

    Zotero.Prefs.set(BLOCKQUOTE_KEY, true, true);
    Zotero.Prefs.set(CITE_KEY, true, true);
    assert.equal(
      formatAnnotationCopyText(entry({ parent: fakeParent("smith2020") })),
      "> A quoted line [@smith2020]",
    );

    Zotero.Prefs.set(BLOCKQUOTE_KEY, false, true);
    Zotero.Prefs.set(CITE_KEY, false, true);
    assert.equal(
      formatAnnotationCopyText(entry({ parent: fakeParent("smith2020") })),
      "A quoted line",
    );
  });

  it("invalidates the simple-pref cache when Zotero.Prefs.set fires", async function () {
    assert.isFalse(getPref("myAnnotationsCopyBlockquote"));
    Zotero.Prefs.set(BLOCKQUOTE_KEY, true, true);

    const started = Date.now();
    while (
      getPref("myAnnotationsCopyBlockquote") !== true &&
      Date.now() - started < 2000
    ) {
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    assert.isTrue(getPref("myAnnotationsCopyBlockquote"));
  });

  it("treats quote or comment as copyable", function () {
    assert.isTrue(annotationHasCopyText(entry()));
    assert.isTrue(annotationHasCopyText(entry({ quote: "", comment: "note" })));
    assert.isFalse(annotationHasCopyText(entry({ quote: "", comment: "" })));
  });
});
