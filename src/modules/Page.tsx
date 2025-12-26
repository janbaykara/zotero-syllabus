// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h, Fragment } from "preact";
import { renderComponent } from "../utils/react";
import { useZoteroCollectionTitle } from "./react-zotero-sync/collectionTitle";
import { useZoteroSyllabusMetadata } from "./react-zotero-sync/syllabusMetadata";
import { useZoteroCollectionItems } from './react-zotero-sync/collectionItems';

function Page({ collectionId }: { collectionId: number }) {
  const [title, setTitle] = useZoteroCollectionTitle(collectionId);
  const [syllabusMetadata, setDescription, setClassDescription, setClassTitle] = useZoteroSyllabusMetadata(collectionId);
  const items = useZoteroCollectionItems(collectionId);

  return (
    <div>
      <h1>Syllabus Page</h1>
      <p>Collection ID: {collectionId}</p>
      <p><input type="text" value={title} onChange={(e) => setTitle(e.target?.value || title || "")} /></p>
      <p><input type="text" value={syllabusMetadata.description} onChange={(e) => setDescription(e.target?.value || syllabusMetadata.description || "")} /></p>
      <p>Items: {items.length}</p>
      <ul>
        {items.map((item) => (
          <li key={item.id}>{item.getField("title") || "Untitled"}</li>
        ))}
      </ul>
      <p>Classes: {Object.keys(syllabusMetadata.classes || {}).length}</p>
      <ul>
        {Object.keys(syllabusMetadata.classes || {}).map((classNumber) => (
          <li key={classNumber}>
            <h3>{classNumber}</h3>
            <input type="text" value={syllabusMetadata.classes?.[classNumber].title} onChange={(e) => setClassTitle(parseInt(classNumber), e.target?.value || syllabusMetadata.classes?.[classNumber].title || "")} />
            <input type="text" value={syllabusMetadata.classes?.[classNumber].description} onChange={(e) => setClassDescription(parseInt(classNumber), e.target?.value || syllabusMetadata.classes?.[classNumber].description || "")} />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function renderPage(win: _ZoteroTypes.MainWindow, rootElement: HTMLElement, collectionId: number) {
  renderComponent(win, rootElement, <Page collectionId={collectionId} />);
}