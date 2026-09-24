import { assert } from "chai";
import {
  applyFurtherReadingOrder,
  buildSyllabusClassGroups,
} from "../src/modules/classGroups";
import { SettingsSyllabusMetadataSchema } from "../src/utils/schemas";

function fakeItem(options: {
  id: number;
  key: string;
  regular: boolean;
  attachment?: boolean;
  parentItemID?: number | false;
}): Zotero.Item {
  return {
    id: options.id,
    key: options.key,
    deleted: false,
    isRegularItem: () => options.regular,
    isAttachment: () => Boolean(options.attachment),
    parentItemID: options.parentItemID ?? false,
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
});
