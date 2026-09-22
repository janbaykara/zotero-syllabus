import { assert } from "chai";
import {
  applyPriorityListReplacement,
  countAssignmentsWithPriority,
  emptyCollectionDocument,
} from "../src/modules/syllabusNote";
import { COLLECTION_SYLLABUS_DOCUMENT_VERSION } from "../src/utils/schemas";

describe("priority remap helpers", function () {
  it("counts assignments using a priority id", function () {
    const document = {
      ...emptyCollectionDocument(),
      version: COLLECTION_SYLLABUS_DOCUMENT_VERSION,
      items: {
        AAAA: [
          { id: "a1", priority: "essential" },
          { id: "a2", priority: "optional" },
        ],
        BBBB: [{ id: "b1", priority: "essential" }],
        CCCC: [{ id: "c1" }],
      },
    };
    assert.equal(countAssignmentsWithPriority(document, "essential"), 2);
    assert.equal(countAssignmentsWithPriority(document, "optional"), 1);
    assert.equal(countAssignmentsWithPriority(document, "missing"), 0);
  });

  const nextPriorities = [
    { id: "essential", name: "Essential", color: "#000", order: 1 },
    { id: "optional", name: "Optional", color: "#999", order: 2 },
  ];

  it("replaces the priorities list and remaps orphaned assignments", function () {
    const document = {
      ...emptyCollectionDocument(),
      version: COLLECTION_SYLLABUS_DOCUMENT_VERSION,
      priorities: [
        { id: "essential", name: "Essential", color: "#000", order: 1 },
        { id: "custom", name: "Custom", color: "#f00", order: 2 },
        { id: "optional", name: "Optional", color: "#999", order: 3 },
      ],
      items: {
        AAAA: [
          { id: "a1", priority: "essential" },
          { id: "a2", priority: "custom" },
        ],
        BBBB: [{ id: "b1", priority: "custom" }],
      },
    };

    const remaps = new Map<string, string | null>([["custom", "optional"]]);
    const next = applyPriorityListReplacement(document, nextPriorities, remaps);

    assert.deepEqual(
      next.priorities.map((p) => p.id),
      ["essential", "optional"],
    );
    assert.equal(next.items.AAAA[0].priority, "essential");
    assert.equal(next.items.AAAA[1].priority, "optional");
    assert.equal(next.items.BBBB[0].priority, "optional");
  });

  it("clears orphaned assignments with no remap target", function () {
    const document = {
      ...emptyCollectionDocument(),
      version: COLLECTION_SYLLABUS_DOCUMENT_VERSION,
      priorities: [
        { id: "essential", name: "Essential", color: "#000", order: 1 },
        { id: "custom", name: "Custom", color: "#f00", order: 2 },
      ],
      items: {
        AAAA: [{ id: "a1", priority: "custom" }],
      },
    };

    const remaps = new Map<string, string | null>([["custom", null]]);
    const next = applyPriorityListReplacement(document, nextPriorities, remaps);

    assert.isUndefined(next.items.AAAA[0].priority);
  });

  it("clears orphaned assignments missing from remaps", function () {
    const document = {
      ...emptyCollectionDocument(),
      version: COLLECTION_SYLLABUS_DOCUMENT_VERSION,
      items: {
        AAAA: [{ id: "a1", priority: "gone" }],
      },
    };

    const next = applyPriorityListReplacement(document, nextPriorities);
    assert.isUndefined(next.items.AAAA[0].priority);
  });
});
