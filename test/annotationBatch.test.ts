import { assert } from "chai";
import {
  collectTagsForAnnotations,
  recolorAnnotations,
  tagAnnotations,
  untagAnnotations,
} from "../src/utils/annotationBatch";

type FakeAnn = {
  id: number;
  deleted: boolean;
  itemType: string;
  annotationColor: string;
  isAnnotation: () => boolean;
  getTags: () => Array<{ tag: string }>;
  addTag: (tag: string) => void;
  removeTag: (tag: string) => void;
  saveTx: (opts?: unknown) => Promise<void>;
};

function makeAnn(
  id: number,
  opts?: { annotationColor?: string; tags?: string[] },
): FakeAnn {
  const tags = [...(opts?.tags || [])];
  return {
    id,
    deleted: false,
    itemType: "annotation",
    annotationColor: opts?.annotationColor || "#ffd400",
    isAnnotation: () => true,
    getTags: () => tags.map((tag) => ({ tag })),
    addTag: (tag: string) => {
      if (!tags.some((entry) => entry.toLowerCase() === tag.toLowerCase())) {
        tags.push(tag);
      }
    },
    removeTag: (tag: string) => {
      const key = tag.toLowerCase();
      const index = tags.findIndex((entry) => entry.toLowerCase() === key);
      if (index >= 0) {
        tags.splice(index, 1);
      }
    },
    saveTx: async () => {},
  };
}

describe("annotationBatch", function () {
  const items = new Map<number, FakeAnn>();
  let previousGet: typeof Zotero.Items.get;

  beforeEach(function () {
    items.clear();
    previousGet = Zotero.Items.get.bind(Zotero.Items);
    Zotero.Items.get = ((id: number) =>
      items.get(id) || false) as typeof Zotero.Items.get;
  });

  afterEach(function () {
    Zotero.Items.get = previousGet;
  });

  it("recolours annotations and skips unchanged colours", async function () {
    // Distinct ids per test so getCachedItem cannot reuse another case's fakes.
    const a = makeAnn(91001, { annotationColor: "#ffd400" });
    const b = makeAnn(91002, { annotationColor: "#ff6666" });
    items.set(91001, a);
    items.set(91002, b);
    const saved: number[] = [];
    a.saveTx = async () => {
      saved.push(a.id);
    };
    b.saveTx = async () => {
      saved.push(b.id);
    };

    const count = await recolorAnnotations([91001, 91002], "#2ea8e5");
    assert.equal(count, 2);
    assert.equal(a.annotationColor, "#2ea8e5");
    assert.equal(b.annotationColor, "#2ea8e5");
    assert.deepEqual(saved, [91001, 91002]);

    const again = await recolorAnnotations([91001], "#2ea8e5");
    assert.equal(again, 0);
  });

  it("tags and untags annotations", async function () {
    const a = makeAnn(92001, { tags: ["Todo"] });
    const b = makeAnn(92002, { tags: [] });
    items.set(92001, a);
    items.set(92002, b);

    // Neither annotation has "Important" yet — both should be updated.
    assert.equal(await tagAnnotations([92001, 92002], "Important"), 2);
    assert.deepEqual(collectTagsForAnnotations([92001, 92002]), [
      "Important",
      "Todo",
    ]);

    assert.equal(await tagAnnotations([92001], "todo"), 0);
    assert.equal(await untagAnnotations([92001, 92002], "Todo"), 1);
    assert.deepEqual(collectTagsForAnnotations([92001, 92002]), ["Important"]);
  });

  it("ignores missing and non-annotation items", async function () {
    items.set(93003, {
      ...makeAnn(93003),
      itemType: "journalArticle",
      isAnnotation: () => false,
    });
    assert.equal(await recolorAnnotations([93003, 93099], "#ff6666"), 0);
    assert.equal(await tagAnnotations([93003, 93099], "x"), 0);
    assert.deepEqual(collectTagsForAnnotations([93003, 93099]), []);
  });
});
