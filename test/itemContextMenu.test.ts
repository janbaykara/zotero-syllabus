import { assert } from "chai";
import {
  isItemContextMenuKey,
  itemContextMenuScreenPoint,
  openZoteroItemContextMenu,
  shouldSkipItemContextMenuTarget,
  type ItemContextMenuPaneLike,
} from "../src/utils/itemContextMenu";

function fakeItem(id: number): Zotero.Item {
  return { id } as Zotero.Item;
}

function mouseEvent(
  screenX: number,
  screenY: number,
  target?: EventTarget | null,
): MouseEvent {
  const event = new MouseEvent("contextmenu", {
    bubbles: true,
    cancelable: true,
    screenX,
    screenY,
  });
  if (target) {
    Object.defineProperty(event, "target", { value: target });
  }
  return event;
}

function fakePane(options: {
  selected?: number[];
  selectCalls?: number[];
  selectItemsCalls?: number[][];
  selectOptions?: Array<{ noTabSwitch?: boolean } | undefined>;
  clearCalls?: number[];
  openCalls?: Array<{ x?: number; y?: number }>;
}): ItemContextMenuPaneLike {
  let selected = options.selected ?? [];
  return {
    getSelectedItems: (asIDs?: boolean) => {
      assert.isTrue(asIDs);
      return selected;
    },
    selectItem: async (id: number, selectOptions?) => {
      options.selectCalls?.push(id);
      options.selectOptions?.push(selectOptions);
      selected = [id];
      return true;
    },
    selectItems: async (ids: number[], selectOptions?) => {
      options.selectItemsCalls?.push([...ids]);
      options.selectOptions?.push(selectOptions);
      selected = [...ids];
      return true;
    },
    itemsView: {
      selection: {
        clearSelection: () => {
          options.clearCalls?.push(1);
          selected = [];
        },
      },
    },
    onItemsContextMenuOpen: async (_event, x, y) => {
      options.openCalls?.push({ x, y });
    },
  };
}

describe("itemContextMenu", function () {
  describe("isItemContextMenuKey", function () {
    it("matches ContextMenu and Shift+F10", function () {
      assert.isTrue(
        isItemContextMenuKey(
          new KeyboardEvent("keydown", { key: "ContextMenu" }),
        ),
      );
      assert.isTrue(
        isItemContextMenuKey(
          new KeyboardEvent("keydown", { key: "F10", shiftKey: true }),
        ),
      );
      assert.isFalse(
        isItemContextMenuKey(new KeyboardEvent("keydown", { key: "F10" })),
      );
      assert.isFalse(
        isItemContextMenuKey(new KeyboardEvent("keydown", { key: "Enter" })),
      );
    });
  });

  describe("shouldSkipItemContextMenuTarget", function () {
    it("skips inputs, textareas, and iframes", function () {
      const doc = Zotero.getMainWindow().document;
      const input = doc.createElement("input");
      const textarea = doc.createElement("textarea");
      const iframe = doc.createElement("iframe");
      const div = doc.createElement("div");
      assert.isTrue(shouldSkipItemContextMenuTarget(input));
      assert.isTrue(shouldSkipItemContextMenuTarget(textarea));
      assert.isTrue(shouldSkipItemContextMenuTarget(iframe));
      assert.isFalse(shouldSkipItemContextMenuTarget(div));
      assert.isFalse(shouldSkipItemContextMenuTarget(null));
    });
  });

  describe("itemContextMenuScreenPoint", function () {
    it("uses mouse screen coordinates when present", function () {
      const point = itemContextMenuScreenPoint(mouseEvent(120, 340));
      assert.deepEqual(point, { x: 120, y: 340 });
    });

    it("falls back to the target box when screen coordinates are 0", function () {
      const doc = Zotero.getMainWindow().document;
      const el = doc.createElement("div");
      el.getBoundingClientRect = () =>
        ({
          left: 10,
          top: 20,
          right: 90,
          bottom: 60,
          width: 80,
          height: 40,
          x: 10,
          y: 20,
          toJSON: () => ({}),
        }) as DOMRect;
      const win = {
        screenX: 5,
        screenY: 7,
      } as Window;
      const point = itemContextMenuScreenPoint(
        { screenX: 0, screenY: 0, view: win },
        el,
      );
      assert.deepEqual(point, { x: 5 + 10 + 50, y: 7 + 60 });
    });
  });

  describe("openZoteroItemContextMenu", function () {
    it("does not open the item menu for input targets", async function () {
      const doc = Zotero.getMainWindow().document;
      const input = doc.createElement("input");
      const selectCalls: number[] = [];
      const openCalls: Array<{ x?: number; y?: number }> = [];
      const event = mouseEvent(40, 50, input);
      await openZoteroItemContextMenu(
        fakeItem(42),
        event,
        null,
        fakePane({ selectCalls, openCalls }),
      );
      assert.isFalse(event.defaultPrevented);
      assert.deepEqual(selectCalls, []);
      assert.deepEqual(openCalls, []);
    });

    it("temporarily selects an unselected item, opens the menu, then restores", async function () {
      const selectCalls: number[] = [];
      const selectItemsCalls: number[][] = [];
      const selectOptions: Array<{ noTabSwitch?: boolean } | undefined> = [];
      const openCalls: Array<{ x?: number; y?: number }> = [];
      const event = mouseEvent(80, 90);
      await openZoteroItemContextMenu(
        fakeItem(42),
        event,
        null,
        fakePane({
          selected: [7],
          selectCalls,
          selectItemsCalls,
          selectOptions,
          openCalls,
        }),
      );
      assert.isTrue(event.defaultPrevented);
      assert.deepEqual(selectCalls, [42]);
      assert.deepEqual(selectItemsCalls, [[7]]);
      assert.deepEqual(selectOptions, [
        { noTabSwitch: true },
        { noTabSwitch: true },
      ]);
      assert.deepEqual(openCalls, [{ x: 80, y: 90 }]);
    });

    it("clears selection after the menu when nothing was selected", async function () {
      const selectCalls: number[] = [];
      const clearCalls: number[] = [];
      const openCalls: Array<{ x?: number; y?: number }> = [];
      await openZoteroItemContextMenu(
        fakeItem(42),
        mouseEvent(1, 2),
        null,
        fakePane({ selected: [], selectCalls, clearCalls, openCalls }),
      );
      assert.deepEqual(selectCalls, [42]);
      assert.deepEqual(clearCalls, [1]);
      assert.deepEqual(openCalls, [{ x: 1, y: 2 }]);
    });

    it("keeps a multi-selection when the clicked item is already selected", async function () {
      const selectCalls: number[] = [];
      const selectItemsCalls: number[][] = [];
      const openCalls: Array<{ x?: number; y?: number }> = [];
      await openZoteroItemContextMenu(
        fakeItem(42),
        mouseEvent(11, 22),
        null,
        fakePane({
          selected: [42, 99],
          selectCalls,
          selectItemsCalls,
          openCalls,
        }),
      );
      assert.deepEqual(selectCalls, []);
      assert.deepEqual(selectItemsCalls, []);
      assert.deepEqual(openCalls, [{ x: 11, y: 22 }]);
    });
  });
});
