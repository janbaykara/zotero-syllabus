import { assert } from "chai";
import { getItemField, getItemTitle } from "../src/utils/items";

async function createItem(
  type: string,
  fields: Record<string, string>,
): Promise<Zotero.Item> {
  const item = new Zotero.Item(type);
  item.libraryID = Zotero.Libraries.userLibraryID;
  for (const [field, value] of Object.entries(fields)) {
    item.setField(field, value);
  }
  await item.saveTx();
  return item;
}

describe("getItemTitle", function () {
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

  it("returns the Title field for ordinary items", async function () {
    const item = await createItem("book", {
      title: "The Structure of Scientific Revolutions",
    });
    items.push(item);
    assert.equal(getItemTitle(item), "The Structure of Scientific Revolutions");
  });

  it("returns Case Name, Name of Act, and Subject instead of Untitled", async function () {
    const legalCase = await createItem("case", {
      caseName: "Brown v. Board of Education",
    });
    const statute = await createItem("statute", {
      nameOfAct: "Civil Rights Act of 1964",
    });
    const email = await createItem("email", {
      subject: "Readings for week 3",
    });
    items.push(legalCase, statute, email);

    assert.equal(legalCase.getField("title"), "");
    assert.equal(statute.getField("title"), "");
    assert.equal(email.getField("title"), "");

    assert.equal(getItemTitle(legalCase), "Brown v. Board of Education");
    assert.equal(getItemTitle(statute), "Civil Rights Act of 1964");
    assert.equal(getItemTitle(email), "Readings for week 3");
  });
});

describe("getItemField", function () {
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

  it("returns dateDecided, dateEnacted, and issueDate via date", async function () {
    const legalCase = await createItem("case", {
      caseName: "Brown v. Board of Education",
      dateDecided: "1954-05-17",
    });
    const statute = await createItem("statute", {
      nameOfAct: "Civil Rights Act of 1964",
      dateEnacted: "1964-07-02",
    });
    const patent = await createItem("patent", {
      title: "A folding bicycle",
      issueDate: "1896-01-01",
    });
    items.push(legalCase, statute, patent);

    assert.equal(legalCase.getField("date"), "");
    assert.equal(statute.getField("date"), "");
    assert.equal(patent.getField("date"), "");

    assert.match(getItemField(legalCase, "date"), /1954/);
    assert.match(getItemField(statute, "date"), /1964/);
    assert.match(getItemField(patent, "date"), /1896/);
  });

  it("returns bookTitle via publicationTitle", async function () {
    const section = await createItem("bookSection", {
      title: "The Nature of Normal Science",
      bookTitle: "The Structure of Scientific Revolutions",
    });
    items.push(section);

    assert.equal(section.getField("publicationTitle"), "");
    assert.equal(
      getItemField(section, "publicationTitle"),
      "The Structure of Scientific Revolutions",
    );
  });
});
