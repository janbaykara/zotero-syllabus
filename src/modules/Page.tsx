// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h, Fragment } from "preact";
import { renderComponent } from "../utils/react";
import { useZoteroCollectionTitle } from "./react/collectionTitle";
// import { useZoteroCollectionItems } from './react/hooks';

function Page({ collectionId }: { collectionId: number }) {
  const [title, setTitle] = useZoteroCollectionTitle(collectionId);
  // const items = useZoteroCollectionItems(collectionId);

  return (
    <div>
      <h1>Syllabus Page</h1>
      <p>Collection ID: {collectionId}</p>
      <p>Collection Title: <input type="text" value={title} onChange={(e) => setTitle(e.target?.value || title || "")} /></p>
      {/* <p>Items: {items.length}</p>
      <ul>
        {items.map((item) => (
          <li key={item.id}>{item.getField("title") || "Untitled"}</li>
        ))}
      </ul> */}
    </div>
  );
}

export function renderPage(win: _ZoteroTypes.MainWindow, rootElement: HTMLElement, collectionId: number) {
  renderComponent(win, rootElement, <Page collectionId={collectionId} />);
}