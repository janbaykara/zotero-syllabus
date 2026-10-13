import { assert } from "chai";
import {
  setMenuitemIcon,
  setXulBooleanAttribute,
  xulBooleanAttributeEntries,
} from "../src/utils/zotero";

describe("Zotero 11 XUL boolean / menu icon helpers", function () {
  it('xulBooleanAttributeEntries omits false so createElement cannot set hidden="false"', function () {
    assert.deepEqual(
      xulBooleanAttributeEntries({
        hidden: false,
        disabled: true,
        checked: undefined,
      }),
      { disabled: "true" },
    );
  });

  it("setXulBooleanAttribute toggles presence only", function () {
    const doc = Zotero.getMainWindow().document;
    const el = doc.createXULElement("menuitem");
    setXulBooleanAttribute(el, "hidden", true);
    assert.isTrue(el.hasAttribute("hidden"));
    assert.notStrictEqual(el.getAttribute("hidden"), "false");
    setXulBooleanAttribute(el, "hidden", false);
    assert.isFalse(el.hasAttribute("hidden"));
  });

  it("setMenuitemIcon sets list-style-image and --menuitem-icon", function () {
    const doc = Zotero.getMainWindow().document;
    const el = doc.createXULElement("menuitem");
    const url = "chrome://zotero/skin/16/universal/pin.svg";
    setMenuitemIcon(el, url);
    const style = (el as unknown as HTMLElement).style;
    assert.equal(style.getPropertyValue("list-style-image"), `url("${url}")`);
    assert.equal(style.getPropertyValue("--menuitem-icon"), `url("${url}")`);
  });
});
