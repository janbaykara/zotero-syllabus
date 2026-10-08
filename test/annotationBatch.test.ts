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
    const a = makeAnn(1, { annotationColor: "#ffd400" });
    const b = makeAnn(2, { annotationColor: "#ff6666" });
    items.set(1, a);
    items.set(2, b);
    const saved: number[] = [];
    a.saveTx = async () => {
      saved.push(a.id);
    };
    b.saveTx = async () => {
      saved.push(b.id);
    };

    const count = await recolorAnnotations([1, 2], "#2ea8e5");
    assert.equal(count, 2);
    assert.equal(a.annotationColor, "#2ea8e5");
    assert.equal(b.annotationColor, "#2ea8e5");
    assert.deepEqual(saved, [1, 2]);

    const again = await recolorAnnotations([1], "#2ea8e5");
    assert.equal(again, 0);
  });

  it("tags and untags annotations", async function () {
    const a = makeAnn(1, { tags: ["Todo"] });
    const b = makeAnn(2, { tags: [] });
    items.set(1, a);
    items.set(2, b);

    assert.equal(await tagAnnotations([1, 2], "Important"), 1);
    assert.deepEqual(collectTagsForAnnotations([1, 2]), ["Important", "Todo"]);

    assert.equal(await tagAnnotations([1], "todo"), 0);
    assert.equal(await untagAnnotations([1, 2], "Todo"), 1);
    assert.deepEqual(collectTagsForAnnotations([1, 2]), ["Important"]);
  });

  it("ignores missing and non-annotation items", async function () {
    items.set(3, {
      ...makeAnn(3),
      itemType: "journalArticle",
      isAnnotation: () => false,
    });
    assert.equal(await recolorAnnotations([3, 99], "#ff6666"), 0);
    assert.equal(await tagAnnotations([3, 99], "x"), 0);
    assert.deepEqual(collectTagsForAnnotations([3, 99]), []);
  });
});
