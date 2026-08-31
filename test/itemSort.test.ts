import { assert } from "chai";
import {
  sortItems,
  sortItemsByCreator,
  sortItemsByDate,
  sortItemsByTitle,
} from "../src/utils/items";
import { compareLocale } from "../src/utils/locale";

async function createBook(
  title: string,
  options: {
    creators?: Array<{ firstName: string; lastName: string }>;
    date?: string;
  } = {},
): Promise<Zotero.Item> {
  const item = new Zotero.Item("book");
  item.libraryID = Zotero.Libraries.userLibraryID;
  item.setField("title", title);
  if (options.date) {
    item.setField("date", options.date);
  }
  if (options.creators) {
    item.setCreators(
      options.creators.map((creator) => ({
        firstName: creator.firstName,
        lastName: creator.lastName,
        creatorType: "author",
      })),
    );
  }
  await item.saveTx();
  return item;
}

describe("compareLocale", function () {
  it("orders Latin titles without throwing", function () {
    assert.isBelow(compareLocale("Apple", "Zebra"), 0);
    assert.isAbove(compareLocale("Zebra", "Apple"), 0);
    assert.equal(compareLocale("Same", "Same"), 0);
  });
});

describe("item sort", function () {
  this.timeout(30_000);

  const items: Zotero.Item[] = [];

  afterEach(async function () {
    const ids = items.map((item) => item.id).filter(Boolean);
    items.length = 0;
    if (ids.length) {
      try {
        await Zotero.Items.erase(ids);
      } catch {
        /* profile is discarded after the run */
      }
    }
  });

  it("sorts by title A–Z", async function () {
    const zebra = await createBook("Zebra");
    const apple = await createBook("Apple");
    items.push(zebra, apple);

    const sorted = sortItemsByTitle([zebra, apple]);
    assert.deepEqual(
      sorted.map((item) => item.id),
      [apple.id, zebra.id],
    );
    assert.deepEqual(
      sortItems([zebra, apple], "title").map((item) => item.id),
      [apple.id, zebra.id],
    );
  });

  it("sorts by first creator last name A–Z", async function () {
    const woolf = await createBook("Mrs Dalloway", {
      creators: [{ firstName: "Virginia", lastName: "Woolf" }],
    });
    const austen = await createBook("Emma", {
      creators: [{ firstName: "Jane", lastName: "Austen" }],
    });
    items.push(woolf, austen);

    const sorted = sortItemsByCreator([woolf, austen]);
    assert.deepEqual(
      sorted.map((item) => item.id),
      [austen.id, woolf.id],
    );
  });

  it("puts items with no creator last", async function () {
    const woolf = await createBook("Orlando", {
      creators: [{ firstName: "Virginia", lastName: "Woolf" }],
    });
    const anonymous = await createBook("Beowulf");
    items.push(woolf, anonymous);

    const sorted = sortItemsByCreator([anonymous, woolf]);
    assert.deepEqual(
      sorted.map((item) => item.id),
      [woolf.id, anonymous.id],
    );
  });

  it("breaks creator ties by title", async function () {
    const pride = await createBook("Pride and Prejudice", {
      creators: [{ firstName: "Jane", lastName: "Austen" }],
    });
    const emma = await createBook("Emma", {
      creators: [{ firstName: "Jane", lastName: "Austen" }],
    });
    items.push(pride, emma);

    const sorted = sortItems([pride, emma], "creator");
    assert.deepEqual(
      sorted.map((item) => item.id),
      [emma.id, pride.id],
    );
  });

  it("sorts by date newest first", async function () {
    const older = await createBook("Older", { date: "1990" });
    const newer = await createBook("Newer", { date: "2020" });
    items.push(older, newer);

    const sorted = sortItemsByDate([older, newer]);
    assert.deepEqual(
      sorted.map((item) => item.id),
      [newer.id, older.id],
    );
    assert.deepEqual(
      sortItems([older, newer], "date").map((item) => item.id),
      [newer.id, older.id],
    );
  });
});
