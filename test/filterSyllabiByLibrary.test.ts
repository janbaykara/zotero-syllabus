import { assert } from "chai";
import {
  filterSyllabiByLibrary,
  groupUpcomingReadingsByCourse,
  pickUpcomingClassReadings,
  syllabiSpanMultipleLibraries,
} from "../src/modules/classReadings";
import type { ClassReading } from "../src/modules/ClassReadingBlock";
import type { SyllabusData } from "../src/modules/react-zotero-sync/useSyllabi";

function syllabusInLibrary(libraryID: number): SyllabusData {
  return {
    collection: { libraryID } as Zotero.Collection,
    metadata: {},
    items: [],
  };
}

function reading(
  partial: Partial<ClassReading> & { readingDate: string },
): ClassReading {
  return {
    collectionId: 1,
    collectionName: "Course A",
    libraryID: 1,
    classNumber: 1,
    classTitle: "",
    classDescription: "",
    items: [],
    ...partial,
  };
}

describe("classReadings", function () {
  describe("filterSyllabiByLibrary", function () {
    it("keeps every syllabus when no library is specified", function () {
      const syllabi = [syllabusInLibrary(1), syllabusInLibrary(2)];
      assert.deepEqual(filterSyllabiByLibrary(syllabi, undefined), syllabi);
    });

    it("keeps only syllabi in the requested library", function () {
      const syllabi = [syllabusInLibrary(1), syllabusInLibrary(2)];
      const filtered = filterSyllabiByLibrary(syllabi, 2);
      assert.equal(filtered.length, 1);
      assert.equal(filtered[0].collection.libraryID, 2);
    });
  });

  describe("syllabiSpanMultipleLibraries", function () {
    it("is false when every syllabus is in one library", function () {
      assert.isFalse(
        syllabiSpanMultipleLibraries([
          syllabusInLibrary(1),
          syllabusInLibrary(1),
        ]),
      );
    });

    it("is true when syllabi come from more than one library", function () {
      assert.isTrue(
        syllabiSpanMultipleLibraries([
          syllabusInLibrary(1),
          syllabusInLibrary(5),
        ]),
      );
    });
  });

  describe("pickUpcomingClassReadings", function () {
    const now = new Date(2026, 8, 2);

    it("keeps every deadline in the next week", function () {
      const picked = pickUpcomingClassReadings(
        [
          reading({ classNumber: 1, readingDate: "2026-09-03" }),
          reading({ classNumber: 2, readingDate: "2026-09-09" }),
          reading({ classNumber: 3, readingDate: "2026-09-10" }),
          reading({ classNumber: 4, readingDate: "2026-09-01" }),
        ],
        now,
      );
      assert.deepEqual(
        picked.map((row) => row.classNumber),
        [1, 2],
      );
    });

    it("falls back to the next date within a month when the week is empty", function () {
      const picked = pickUpcomingClassReadings(
        [
          reading({
            collectionId: 1,
            collectionName: "Course A",
            classNumber: 1,
            readingDate: "2026-09-20",
          }),
          reading({
            collectionId: 2,
            collectionName: "Course B",
            classNumber: 2,
            readingDate: "2026-09-20",
          }),
          reading({
            collectionId: 3,
            collectionName: "Course C",
            classNumber: 3,
            readingDate: "2026-09-25",
          }),
          reading({ classNumber: 4, readingDate: "2026-10-20" }),
        ],
        now,
      );
      assert.deepEqual(
        picked.map((row) => row.collectionName),
        ["Course A", "Course B"],
      );
    });

    it("returns nothing when the next deadline is more than a month away", function () {
      assert.deepEqual(
        pickUpcomingClassReadings(
          [reading({ readingDate: "2026-11-01" })],
          now,
        ),
        [],
      );
    });
  });

  describe("groupUpcomingReadingsByCourse", function () {
    it("groups classes under their course in date order", function () {
      const groups = groupUpcomingReadingsByCourse([
        reading({
          collectionId: 2,
          collectionName: "Course B",
          classNumber: 1,
          readingDate: "2026-09-08",
        }),
        reading({
          collectionId: 1,
          collectionName: "Course A",
          classNumber: 3,
          readingDate: "2026-09-04",
        }),
        reading({
          collectionId: 1,
          collectionName: "Course A",
          classNumber: 2,
          readingDate: "2026-09-03",
        }),
      ]);
      assert.deepEqual(
        groups.map((group) => [
          group.collectionName,
          group.classes.map((row) => row.classNumber),
        ]),
        [
          ["Course A", [2, 3]],
          ["Course B", [1]],
        ],
      );
    });
  });
});
