import { assert } from "chai";
import {
  openZoteroCollectionContextMenu,
  type CollectionContextMenuPaneLike,
} from "../src/utils/collectionContextMenu";

function fakeCollection(id: number, treeViewID = `C${id}`): Zotero.Collection {
  return { id, treeViewID } as Zotero.Collection;
}

function mouseEvent(screenX: number, screenY: number): MouseEvent {
  return new MouseEvent("contextmenu", {
    bubbles: true,
    cancelable: true,
    screenX,
    screenY,
  });
}

function fakePane(options: {
  selectCalls?: string[];
  openCalls?: Array<{ x?: number; y?: number }>;
  selectFails?: boolean;
}): CollectionContextMenuPaneLike {
  return {
    collectionsView: {
      selectByID: async (id: string) => {
        options.selectCalls?.push(id);
        if (options.selectFails) {
          throw new Error("select failed");
        }
      },
    },
    onCollectionsContextMenuOpen: async (_event, x, y) => {
      options.openCalls?.push({ x, y });
    },
  };
}

describe("collectionContextMenu", function () {
  it("selects the collection then opens the collection menu", async function () {
    const selectCalls: string[] = [];
    const openCalls: Array<{ x?: number; y?: number }> = [];
    const pane = fakePane({ selectCalls, openCalls });
    const collection = fakeCollection(42);
    const event = mouseEvent(120, 240);

    await openZoteroCollectionContextMenu(collection, event, null, pane);

    assert.isTrue(event.defaultPrevented);
    assert.deepEqual(selectCalls, ["C42"]);
    assert.deepEqual(openCalls, [{ x: 120, y: 240 }]);
  });

  it("does not open the menu when selection fails", async function () {
    const openCalls: Array<{ x?: number; y?: number }> = [];
    const pane = fakePane({ openCalls, selectFails: true });
    const event = mouseEvent(10, 20);

    await openZoteroCollectionContextMenu(fakeCollection(7), event, null, pane);

    assert.deepEqual(openCalls, []);
  });
});
