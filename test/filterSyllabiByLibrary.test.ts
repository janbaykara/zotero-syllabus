import { assert } from "chai";
import { filterSyllabiByLibrary } from "../src/modules/classReadings";
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
