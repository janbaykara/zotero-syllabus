import { assert } from "chai";
import {
  applyFurtherReadingOrder,
  buildSyllabusClassGroups,
  visibleSyllabusClassGroups,
  type SyllabusClassGroup,
} from "../src/modules/classGroups";
import { SettingsSyllabusMetadataSchema } from "../src/utils/schemas";

function fakeItem(options: {
  id: number;
  key: string;
  regular: boolean;
  attachment?: boolean;
  note?: boolean;
  parentItemID?: number | false;
  tags?: string[];
  title?: string;
}): Zotero.Item {
  const tags = options.tags || [];
  return {
    id: options.id,
    key: options.key,
    deleted: false,
    isRegularItem: () => options.regular,
    isAttachment: () => Boolean(options.attachment),
    isNote: () => Boolean(options.note),
    isTopLevelItem: () => !options.parentItemID,
    parentItemID: options.parentItemID ?? false,
    hasTag: (tag: string) => tags.includes(tag),
    getDisplayTitle: () => options.title || options.key,
  } as unknown as Zotero.Item;
}

describe("buildSyllabusClassGroups", function () {
  function metadata() {
    return SettingsSyllabusMetadataSchema.parse({
      classes: {
        "class-1": { number: 1, title: "Week 1" },
      },
    });
  }

  it("places an assigned standalone attachment in the target class", function () {
    const attachment = fakeItem({
      id: 11,
      key: "ATTKEY",
      regular: false,
      attachment: true,
    });
    const { classGroups, furtherReadingItems } = buildSyllabusClassGroups(
      1,
      [
        {
          zoteroItem: attachment,
          assignments: [
            {
              id: "a1",
              classId: "class-1",
              classNumber: 1,
            },
          ],
        },
      ],
      metadata(),
    );
    const classOne = classGroups.find((group) => group.classNumber === 1);
    assert.isOk(classOne);
    assert.equal(classOne?.itemAssignments[0]?.item.key, "ATTKEY");
    assert.equal(furtherReadingItems.length, 0);
  });

  it("still skips parented attachments", function () {
    const child = fakeItem({
      id: 12,
      key: "CHILDATT",
      regular: false,
      attachment: true,
      parentItemID: 99,
    });
    const { classGroups, furtherReadingItems } = buildSyllabusClassGroups(
      1,
      [
        {
          zoteroItem: child,
          assignments: [
            {
              id: "a2",
              classId: "class-1",
              classNumber: 1,
            },
          ],
        },
      ],
      metadata(),
    );
    const classOne = classGroups.find((group) => group.classNumber === 1);
    assert.equal(classOne?.itemAssignments.length ?? 0, 0);
    assert.equal(furtherReadingItems.length, 0);
  });

  it("places an assigned class note with readings, not further reading", function () {
    const note = fakeItem({
      id: 21,
      key: "NOTEKEY",
      regular: false,
      note: true,
      title: "Seminar prep",
    });
    const reading = fakeItem({
      id: 22,
      key: "BOOKKEY",
      regular: true,
      title: "A Book",
    });
    const { classGroups, furtherReadingItems } = buildSyllabusClassGroups(
      1,
      [
        {
          zoteroItem: note,
          assignments: [
            {
              id: "n1",
              classId: "class-1",
              classNumber: 1,
            },
          ],
        },
        {
          zoteroItem: reading,
          assignments: [
            {
              id: "r1",
              classId: "class-1",
              classNumber: 1,
            },
          ],
        },
      ],
      metadata(),
    );
    const classOne = classGroups.find((group) => group.classNumber === 1);
    assert.isOk(classOne);
    assert.equal(classOne?.itemAssignments.length, 2);
    assert.sameMembers(
      classOne?.itemAssignments.map((row) => row.item.key) || [],
      ["NOTEKEY", "BOOKKEY"],
    );
    assert.equal(furtherReadingItems.length, 0);
  });

  it("skips the syllabus document note; unassigned notes go to the unnumbered group", function () {
    const syllabusDoc = fakeItem({
      id: 31,
      key: "SYLDOC",
      regular: false,
      note: true,
      tags: ["zotero-syllabus"],
    });
    const unassigned = fakeItem({
      id: 32,
      key: "FREE",
      regular: false,
      note: true,
    });
    const { classGroups, furtherReadingItems } = buildSyllabusClassGroups(
      1,
      [
        {
          zoteroItem: syllabusDoc,
          assignments: [
            {
              id: "s1",
              classId: "class-1",
              classNumber: 1,
            },
          ],
        },
        {
          zoteroItem: unassigned,
          assignments: [],
        },
      ],
      metadata(),
    );
    const classOne = classGroups.find((group) => group.classNumber === 1);
    const unnumbered = classGroups.find((group) => group.classNumber === null);
    assert.equal(classOne?.itemAssignments.length ?? 0, 0);
    assert.equal(furtherReadingItems.length, 0);
    assert.equal(unnumbered?.itemAssignments.length, 1);
    assert.equal(unnumbered?.itemAssignments[0]?.item.key, "FREE");
  });

  it("skips parented child notes", function () {
    const childNote = fakeItem({
      id: 41,
      key: "CHILDNOTE",
      regular: false,
      note: true,
      parentItemID: 99,
    });
    const { classGroups, furtherReadingItems } = buildSyllabusClassGroups(
      1,
      [
        {
          zoteroItem: childNote,
          assignments: [
            {
              id: "c1",
              classId: "class-1",
              classNumber: 1,
            },
          ],
        },
      ],
      metadata(),
    );
    const classOne = classGroups.find((group) => group.classNumber === 1);
    assert.equal(classOne?.itemAssignments.length ?? 0, 0);
    assert.equal(furtherReadingItems.length, 0);
  });

  it("places unassigned class notes in the unnumbered top group", function () {
    const note = fakeItem({
      id: 51,
      key: "PERSONAL",
      regular: false,
      note: true,
      title: "My thoughts",
    });
    const { classGroups, furtherReadingItems } = buildSyllabusClassGroups(
      1,
      [
        {
          zoteroItem: note,
          assignments: [],
        },
      ],
      metadata(),
    );
    const classOne = classGroups.find((group) => group.classNumber === 1);
    const unnumbered = classGroups.find((group) => group.classNumber === null);
    assert.equal(classOne?.itemAssignments.length ?? 0, 0);
    assert.equal(furtherReadingItems.length, 0);
    assert.equal(unnumbered?.itemAssignments.length, 1);
    assert.equal(unnumbered?.itemAssignments[0]?.item.key, "PERSONAL");
  });

  it("applies stored further-reading order and keeps leftovers", function () {
    const alpha = fakeItem({ id: 1, key: "ALPHA", regular: true });
    const beta = fakeItem({ id: 2, key: "BETA", regular: true });
    const gamma = fakeItem({ id: 3, key: "GAMMA", regular: true });
    const ordered = applyFurtherReadingOrder(
      [{ item: alpha }, { item: beta }, { item: gamma }],
      ["GAMMA", "ALPHA"],
    );
    assert.deepEqual(
      ordered.map((entry) => entry.item.key),
      ["GAMMA", "ALPHA", "BETA"],
    );
  });

  it("keeps every class while editing", function () {
    const groups = sampleClassGroups();
    assert.deepEqual(
      visibleSyllabusClassGroups(groups).map((g) => g.classNumber),
      [1, 2, 3],
    );
  });

  it("hides empty classes when locked, keeping description-only classes", function () {
    const groups = sampleClassGroups();
    assert.deepEqual(
      visibleSyllabusClassGroups(groups, { hideEmpty: true }).map(
        (g) => g.classNumber,
      ),
      [2, 3],
    );
  });

  it("keeps only classes with items when searching", function () {
    const groups = sampleClassGroups();
    assert.deepEqual(
      visibleSyllabusClassGroups(groups, {
        hideEmpty: true,
        requireItems: true,
      }).map((g) => g.classNumber),
      [3],
    );
  });
});

function sampleClassGroups(): SyllabusClassGroup[] {
  return [
    classGroup(1, 0),
    classGroup(2, 0, "Intro session"),
    classGroup(3, 2),
  ];
}

function classGroup(
  classNumber: number,
  itemCount: number,
  description = "",
): SyllabusClassGroup {
  return {
    classNumber,
    syllabusMetadata: {
      title: "",
      description,
    },
    itemAssignments: Array.from({ length: itemCount }, (_, i) => ({
      item: fakeItem({
        id: classNumber * 10 + i,
        key: `K${classNumber}-${i}`,
        regular: true,
      }),
      assignment: { id: `a-${classNumber}-${i}`, classNumber },
    })),
  };
}
