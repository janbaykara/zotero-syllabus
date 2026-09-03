import { assert } from "chai";
import {
  classesToNumberKeyed,
  findClassIdByNumber,
  getClassNumberById,
  hydrateAssignment,
  normalizeClassList,
  orderedClassIds,
} from "../src/utils/schemas";

describe("class order", function () {
  it("places stored numbers in those slots and fills gaps with empty classes", function () {
    const id3 = "class-week-3";
    const id5 = "class-week-5";
    const id8 = "class-week-8";
    const normalized = normalizeClassList({
      classes: {
        [id3]: { number: 3, title: "Three" },
        [id5]: { number: 5, title: "Five" },
        [id8]: { number: 8, title: "Eight" },
      },
    });

    assert.lengthOf(orderedClassIds(normalized), 8);
    assert.equal(orderedClassIds(normalized)[2], id3);
    assert.equal(orderedClassIds(normalized)[4], id5);
    assert.equal(orderedClassIds(normalized)[7], id8);
    assert.equal(
      getClassNumberById(normalized.classes, id3, normalized.classOrder),
      3,
    );
    assert.equal(
      getClassNumberById(normalized.classes, id5, normalized.classOrder),
      5,
    );
    assert.equal(
      getClassNumberById(normalized.classes, id8, normalized.classOrder),
      8,
    );
    assert.equal(normalized.classes?.[id3]?.title, "Three");
    assert.equal(normalized.classes?.[id3]?.number, undefined);
    assert.equal(
      normalized.classes?.[orderedClassIds(normalized)[0]]?.title,
      "",
    );
    assert.equal(
      normalized.classes?.[orderedClassIds(normalized)[3]]?.title,
      "",
    );

    const keyed = classesToNumberKeyed(
      normalized.classes,
      normalized.classOrder,
    );
    assert.equal(keyed?.["3"]?.title, "Three");
    assert.equal(keyed?.["5"]?.title, "Five");
    assert.equal(keyed?.["1"]?.title, "");
  });

  it("fills number gaps with unnumbered classes before creating empty placeholders", function () {
    const numbered = "class-n";
    const extra = "class-extra";
    const normalized = normalizeClassList({
      classes: {
        [numbered]: { number: 2, title: "Two" },
        [extra]: { title: "Loose" },
      },
    });
    const order = orderedClassIds(normalized);
    assert.lengthOf(order, 2);
    assert.equal(order[0], extra);
    assert.equal(order[1], numbered);
    assert.equal(
      getClassNumberById(normalized.classes, extra, normalized.classOrder),
      1,
    );
    assert.equal(
      getClassNumberById(normalized.classes, numbered, normalized.classOrder),
      2,
    );
  });

  it("keeps numbered weeks in place and slots leading unnumbered classes into earlier gaps", function () {
    const week1 = "class-week-1";
    const week2 = "class-week-2";
    const week3 = "class-week-3";
    const week4 = "class-week-4";
    const normalized = normalizeClassList({
      classes: {
        [week1]: { title: "Week 1: What is play?" },
        [week2]: { title: "Week 2: What is play for?" },
        [week3]: { number: 5, title: "Week 3: Observing play" },
        [week4]: { number: 6, title: "Week 4: Types of play" },
      },
    });
    const order = orderedClassIds(normalized);
    assert.lengthOf(order, 6);
    assert.equal(order[0], week1);
    assert.equal(order[1], week2);
    assert.equal(normalized.classes?.[order[2]]?.title, "");
    assert.equal(normalized.classes?.[order[3]]?.title, "");
    assert.equal(order[4], week3);
    assert.equal(order[5], week4);
    assert.equal(
      getClassNumberById(normalized.classes, week3, normalized.classOrder),
      5,
    );
  });

  it("keeps the first class when two share a number and appends the duplicate", function () {
    const first = "class-first";
    const dup = "class-dup";
    const normalized = normalizeClassList({
      classes: {
        [first]: { number: 1, title: "First" },
        [dup]: { number: 1, title: "Duplicate" },
      },
    });
    const order = orderedClassIds(normalized);
    assert.lengthOf(order, 2);
    assert.equal(order[0], first);
    assert.equal(order[1], dup);
    assert.equal(
      getClassNumberById(normalized.classes, first, normalized.classOrder),
      1,
    );
    assert.equal(
      getClassNumberById(normalized.classes, dup, normalized.classOrder),
      2,
    );
  });

  it("respects an existing classOrder and does not re-pad from leftover numbers", function () {
    const a = "class-a";
    const b = "class-b";
    const normalized = normalizeClassList({
      classOrder: [b, a],
      classes: {
        [a]: { number: 9, title: "A" },
        [b]: { number: 1, title: "B" },
      },
    });
    assert.deepEqual(orderedClassIds(normalized), [b, a]);
    assert.equal(
      getClassNumberById(normalized.classes, b, normalized.classOrder),
      1,
    );
    assert.equal(
      getClassNumberById(normalized.classes, a, normalized.classOrder),
      2,
    );
    assert.lengthOf(orderedClassIds(normalized), 2);
  });

  it("looks up leftover stored numbers before classOrder exists", function () {
    const id = "class-five";
    const classes = { [id]: { number: 5, title: "Five" } };
    assert.equal(findClassIdByNumber(classes, 5), id);
    assert.equal(findClassIdByNumber(classes, 1), undefined);
    assert.equal(getClassNumberById(classes, id), 5);
    const keyed = classesToNumberKeyed(classes);
    assert.equal(keyed?.["5"]?.title, "Five");
    assert.notProperty(keyed || {}, "1");
  });

  it("hydrates assignment classNumber from list index", function () {
    const id = "class-three";
    const normalized = normalizeClassList({
      classes: { [id]: { number: 3, title: "Three" } },
    });
    const hydrated = hydrateAssignment(
      { id: "a1", classId: id },
      normalized.classes,
      normalized.classOrder,
    );
    assert.equal(hydrated.classNumber, 3);
  });
});
