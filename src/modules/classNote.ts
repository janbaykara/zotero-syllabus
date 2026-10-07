/**
 * Create a standalone note in a syllabus collection (optionally assigned to a
 * class) and select it so the native note editor opens.
 */

import { getCachedCollectionById } from "../utils/cache";
import { escapeHtml } from "../utils/printSyllabus";
import {
  collectionLibraryIsEditable,
  selectZoteroCollection,
} from "../utils/zotero";
import { selectItemInCollection } from "./ClassReadingBlock";
import { displayAssignmentIdForNote } from "./classGroups";
import { SyllabusManager } from "./syllabus";

function classNoteStarterHtml(
  collectionId: number,
  classNumber: number,
): string {
  const label = SyllabusManager.getClassTitle(collectionId, classNumber, true);
  const safe = escapeHtml(label || "");
  return safe ? `<h1>${safe}</h1><p></p>` : "<p></p>";
}

/**
 * Create a top-level note in the collection and add it as a member.
 * Does not assign a class. Returns null on failure / non-editable library.
 */
async function createCollectionNoteItem(
  collectionId: number,
  starterHtml: string,
  logLabel: string,
): Promise<Zotero.Item | null> {
  const collection = getCachedCollectionById(collectionId);
  if (!collection || !collectionLibraryIsEditable(collection)) {
    return null;
  }

  const note = new Zotero.Item("note");
  note.libraryID = collection.libraryID;
  // Zotero 8: save before setNote / addToCollection.
  await note.saveTx({ skipSelect: true });
  try {
    note.setNote(starterHtml);
  } catch (error) {
    ztoolkit.log(`${logLabel}: setNote failed:`, error);
  }
  try {
    note.addToCollection(collection.id);
  } catch (error) {
    ztoolkit.log(
      `${logLabel}: addToCollection failed, trying collection.addItem:`,
      error,
    );
    if (note.id) {
      try {
        await collection.addItem(note.id);
      } catch (error2) {
        ztoolkit.log(`${logLabel}: collection.addItem failed:`, error2);
      }
    }
  }
  await note.saveTx({ skipSelect: true });
  return note;
}

async function selectCreatedNote(
  note: Zotero.Item,
  collectionId: number,
): Promise<void> {
  try {
    selectZoteroCollection(collectionId);
  } catch {
    // Collection focus is best-effort before selectItem.
  }
  // Await selection so the item pane / note editor opens on the new note.
  await selectItemInCollection(note, collectionId);
}

/**
 * Create a top-level note in the parent syllabus collection, assign it to
 * `classNumber`, and select it for editing. Returns the note and assignment
 * id, or null on failure / non-editable library.
 */
export async function createAndAssignClassNote(
  collectionId: number,
  classNumber: number,
): Promise<{ note: Zotero.Item; assignmentId: string } | null> {
  try {
    const note = await createCollectionNoteItem(
      collectionId,
      classNoteStarterHtml(collectionId, classNumber),
      "createAndAssignClassNote",
    );
    if (!note) {
      return null;
    }

    const assignmentId = await SyllabusManager.addClassAssignment(
      note,
      collectionId,
      classNumber,
      {},
      "page",
    );
    if (!assignmentId) {
      ztoolkit.log("createAndAssignClassNote: assignment id missing");
      return null;
    }

    await selectCreatedNote(note, collectionId);
    return { note, assignmentId };
  } catch (error) {
    ztoolkit.log("createAndAssignClassNote failed:", error);
    return null;
  }
}

/**
 * Create a top-level note in the syllabus collection with no class assignment
 * (shows in the unnumbered section) and select it for editing.
 */
export async function createStandaloneClassNote(
  collectionId: number,
): Promise<{ note: Zotero.Item; assignmentId: string } | null> {
  try {
    const note = await createCollectionNoteItem(
      collectionId,
      "<p></p>",
      "createStandaloneClassNote",
    );
    if (!note) {
      return null;
    }

    await selectCreatedNote(note, collectionId);
    return { note, assignmentId: displayAssignmentIdForNote(note) };
  } catch (error) {
    ztoolkit.log("createStandaloneClassNote failed:", error);
    return null;
  }
}
