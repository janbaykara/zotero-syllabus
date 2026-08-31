import { assert } from "chai";
import {
  filterSyllabiByLibrary,
  syllabiSpanMultipleLibraries,
} from "../src/modules/classReadings";
import type { SyllabusData } from "../src/modules/react-zotero-sync/useSyllabi";

function syllabusInLibrary(libraryID: number): SyllabusData {
  return {
    collection: { libraryID } as Zotero.Collection,
    metadata: {},
    items: [],
  };
}

describe("filterSyllabiByLibrary", function () {
  const syllabi = [syllabusInLibrary(1), syllabusInLibrary(2)];

  it("keeps every syllabus when no library is specified", function () {
    assert.deepEqual(filterSyllabiByLibrary(syllabi, undefined), syllabi);
  });

  it("keeps only syllabi in the requested library", function () {
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
