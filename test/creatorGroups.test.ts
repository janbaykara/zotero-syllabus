import { assert } from "chai";
import { groupItemsByCreator } from "../src/modules/creatorGroups";

async function createBook(
  title: string,
  creators?: Array<{ firstName: string; lastName: string }>,
): Promise<Zotero.Item> {
  const item = new Zotero.Item("book");
  item.libraryID = Zotero.Libraries.userLibraryID;
  item.setField("title", title);
  if (creators) {
    item.setCreators(
      creators.map((creator) => ({
        firstName: creator.firstName,
        lastName: creator.lastName,
        creatorType: "author",
      })),
    );
  }
  await item.saveTx();
  return item;
}

describe("creator groups", function () {
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

  it("groups by first creator and sorts groups A–Z", async function () {
    const woolf = await createBook("Mrs Dalloway", [
      { firstName: "Virginia", lastName: "Woolf" },
    ]);
    const austen = await createBook("Emma", [
      { firstName: "Jane", lastName: "Austen" },
    ]);
    const pride = await createBook("Pride and Prejudice", [
      { firstName: "Jane", lastName: "Austen" },
    ]);
    items.push(woolf, austen, pride);

    const { creatorGroups, uncreditedItems } = groupItemsByCreator([
      woolf,
      austen,
      pride,
    ]);
    assert.deepEqual(
      creatorGroups.map((group) => group.label),
      ["Austen, Jane", "Woolf, Virginia"],
    );
    assert.deepEqual(
      creatorGroups[0].items.map((item) => item.id).sort(),
      [austen.id, pride.id].sort(),
    );
    assert.deepEqual(
      creatorGroups[1].items.map((item) => item.id),
      [woolf.id],
    );
    assert.equal(uncreditedItems.length, 0);
  });

  it("puts items with no creator in a separate list", async function () {
    const woolf = await createBook("Orlando", [
      { firstName: "Virginia", lastName: "Woolf" },
    ]);
    const anonymous = await createBook("Beowulf");
    items.push(woolf, anonymous);

    const { creatorGroups, uncreditedItems } = groupItemsByCreator([
      anonymous,
      woolf,
    ]);
    assert.deepEqual(
      creatorGroups.map((group) => group.label),
      ["Woolf, Virginia"],
    );
    assert.deepEqual(
      uncreditedItems.map((item) => item.id),
      [anonymous.id],
    );
  });
});
