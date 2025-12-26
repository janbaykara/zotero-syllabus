// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h, Fragment } from "preact";
import { renderComponent } from "../utils/react";
import { useZoteroCollectionTitle } from "./react-zotero-sync/collectionTitle";
// import { useZoteroClassMetadata } from "./react-zotero-sync/classMetadata";
import { useZoteroCollectionDescription } from "./react-zotero-sync/collectionMetadata";
// import { useZoteroCollectionItems } from './react-zotero-sync/collectionItems';

function Page({ collectionId }: { collectionId: number }) {
  const [title, setTitle] = useZoteroCollectionTitle(collectionId);
  const [description, setDescription] = useZoteroCollectionDescription(collectionId);
  // const [classes, setClasses] = useZoteroClassMetadata(collectionId);
  // const items = useZoteroCollectionItems(collectionId);

  return (
    <div>
      <h1>Syllabus Page</h1>
      <p>Collection ID: {collectionId}</p>
      <p><input type="text" value={title} onChange={(e) => setTitle(e.target?.value || title || "")} /></p>
      <p><input type="text" value={description} onChange={(e) => setDescription(e.target?.value || description || "")} /></p>
      {/* <p>Items: {items.length}</p>
      <ul>
        {items.map((item) => (
          <li key={item.id}>{item.id}</li>
        ))}
      </ul> */}
      {/* <p>Classes: {Object.keys(classes).length}</p> */}
      {/* <ul>
        {Object.keys(classes).map((classNumber) => (
          <li key={classNumber}>
            <h3>{classNumber}</h3>
            <input type="text" value={classes[classNumber].title} onChange={(e) => setClasses(parseInt(classNumber), { title: e.target?.value || classes[classNumber].title || "" })} />
            <input type="text" value={classes[classNumber].description} onChange={(e) => setClasses(parseInt(classNumber), { description: e.target?.value || classes[classNumber].description || "" })} />
          </li>
        ))}
      </ul> */}
    </div>
  );
}

export function renderPage(win: _ZoteroTypes.MainWindow, rootElement: HTMLElement, collectionId: number) {
  renderComponent(win, rootElement, <Page collectionId={collectionId} />);
}