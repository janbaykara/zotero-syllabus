import {
  BasicTool,
  ManagerTool,
  UITool,
  type BasicOptions,
  type TagElementProps,
} from "zotero-plugin-toolkit";
import { setXulBooleanAttribute, xulBooleanAttributeEntries } from "./zotero";

/**
 * Local copy of toolkit MenuManager (removed in zotero-plugin-toolkit 5.1.1+).
 * Kept for Zotero 7 context menus; Zotero 8+ also still works via DOM insertion.
 */
export class MenuManager extends ManagerTool {
  private ui: UITool;
  constructor(base?: BasicTool | BasicOptions) {
    super(base);
    this.ui = new UITool(this);
  }

  register(
    menuPopup: XUL.MenuPopup | keyof typeof MenuSelector,
    options: MenuitemOptions,
    insertPosition: "before" | "after" = "after",
    anchorElement?: XUL.Element,
  ) {
    let popup: XUL.MenuPopup | null;
    if (typeof menuPopup === "string") {
      popup = this.getGlobal("document").querySelector(MenuSelector[menuPopup]);
    } else {
      popup = menuPopup;
    }
    if (!popup) {
      return false;
    }
    const doc: Document = popup.ownerDocument;
    const genMenuElement = (menuitemOption: MenuitemOptions) => {
      const attributes: Record<string, string> = {
        label: menuitemOption.label || "",
        class: menuitemOption.class || "",
        ...xulBooleanAttributeEntries({
          hidden: Boolean(menuitemOption.hidden),
          disabled: Boolean(menuitemOption.disabled),
        }),
      };
      // Omit empty oncommand: Zotero 11 treats `.oncommand = "…"` as a WebIDL
      // handler; keep attribute writes intentional only.
      if (menuitemOption.oncommand) {
        attributes.oncommand = menuitemOption.oncommand;
      }
      const elementOption: TagElementProps = {
        tag: menuitemOption.tag,
        id: menuitemOption.id,
        namespace: "xul",
        attributes,
        classList: menuitemOption.classList,
        styles: menuitemOption.styles || {},
        listeners: [],
        children: [],
      };
      if (menuitemOption.icon) {
        if (!this.getGlobal("Zotero").isMac) {
          if (menuitemOption.tag === "menu") {
            elementOption.attributes!.class += " menu-iconic";
          } else {
            elementOption.attributes!.class += " menuitem-iconic";
          }
        }
        const iconUrl = `url("${menuitemOption.icon}")`;
        elementOption.styles!["list-style-image" as any] = iconUrl;
        // Zotero 11: menuitem icon is an HTML <img> using --menuitem-icon.
        elementOption.styles!["--menuitem-icon" as any] = iconUrl;
      }
      if (menuitemOption.commandListener) {
        elementOption.listeners?.push({
          type: "command",
          listener: menuitemOption.commandListener!,
        });
      }
      if (menuitemOption.tag === "menuitem") {
        if (menuitemOption.type) {
          elementOption.attributes!.type = menuitemOption.type;
        }
        Object.assign(
          elementOption.attributes!,
          xulBooleanAttributeEntries({ checked: !!menuitemOption.checked }),
        );
      }
      const menuItem = this.ui.createElement(
        doc,
        menuitemOption.tag,
        elementOption,
      ) as XUL.MenuItem | XUL.Menu | XUL.MenuSeparator;
      if (menuitemOption.isHidden || menuitemOption.getVisibility) {
        popup?.addEventListener("popupshowing", async (ev: Event) => {
          let hidden: boolean | undefined;
          if (menuitemOption.isHidden) {
            hidden = await menuitemOption.isHidden(menuItem as any, ev);
          } else if (menuitemOption.getVisibility) {
            const visible = await menuitemOption.getVisibility(
              menuItem as any,
              ev,
            );
            hidden = typeof visible === "undefined" ? undefined : !visible;
          }
          if (typeof hidden === "undefined") {
            return;
          }
          setXulBooleanAttribute(menuItem, "hidden", hidden);
        });
      }
      if (menuitemOption.isDisabled) {
        popup?.addEventListener("popupshowing", async (ev: Event) => {
          const disabled = await menuitemOption.isDisabled!(
            menuItem as any,
            ev,
          );
          if (typeof disabled === "undefined") {
            return;
          }
          setXulBooleanAttribute(menuItem, "disabled", disabled);
        });
      }
      if (
        (menuitemOption.tag === "menuitem" ||
          menuitemOption.tag === "menuseparator") &&
        menuitemOption.onShowing
      ) {
        popup?.addEventListener("popupshowing", async (ev: Event) => {
          await menuitemOption.onShowing!(menuItem as any, ev);
        });
      }
      if (menuitemOption.tag === "menu") {
        const subPopup = this.ui.createElement(doc, "menupopup", {
          id: menuitemOption.popupId,
          attributes: { onpopupshowing: menuitemOption.onpopupshowing || "" },
        });
        const children =
          menuitemOption.children || menuitemOption.subElementOptions || [];
        children.forEach((childOption) => {
          subPopup.append(genMenuElement(childOption));
        });
        menuItem.append(subPopup);
      }
      return menuItem;
    };
    const topMenuItem = genMenuElement(options);
    if (popup.childElementCount) {
      if (!anchorElement) {
        anchorElement = (
          insertPosition === "after"
            ? popup.lastElementChild
            : popup.firstElementChild
        ) as XUL.Element;
      }
      anchorElement[insertPosition](topMenuItem);
    } else {
      popup.appendChild(topMenuItem);
    }
  }

  unregister(menuId: string) {
    this.getGlobal("document").querySelector(`#${menuId}`)?.remove();
  }

  unregisterAll(): void {
    this.ui.unregisterAll();
  }
}

enum MenuSelector {
  menuFile = "#menu_FilePopup",
  menuEdit = "#menu_EditPopup",
  menuView = "#menu_viewPopup",
  menuGo = "#menu_goPopup",
  menuTools = "#menu_ToolsPopup",
  menuHelp = "#menu_HelpPopup",
  collection = "#zotero-collectionmenu",
  item = "#zotero-itemmenu",
}

type MenuitemTagDependentOptions =
  | {
      tag: "menuitem";
      getVisibility?: (
        elem: XUL.MenuItem,
        ev: Event,
      ) => boolean | undefined | Promise<boolean | undefined>;
      isHidden?: (
        elem: XUL.MenuItem,
        ev: Event,
      ) => boolean | undefined | Promise<boolean | undefined>;
      isDisabled?: (
        elem: XUL.MenuItem,
        ev: Event,
      ) => boolean | undefined | Promise<boolean | undefined>;
      onShowing?: (
        elem: XUL.MenuItem,
        event: Event,
      ) => unknown | Promise<unknown>;
      type?: "" | "checkbox" | "radio";
      checked?: boolean;
    }
  | {
      tag: "menu";
      getVisibility?: (
        elem: XUL.Menu,
        ev: Event,
      ) => boolean | undefined | Promise<boolean | undefined>;
      isHidden?: (
        elem: XUL.Menu,
        ev: Event,
      ) => boolean | undefined | Promise<boolean | undefined>;
      isDisabled?: (
        elem: XUL.Menu,
        ev: Event,
      ) => boolean | undefined | Promise<boolean | undefined>;
      popupId?: string;
      onpopupshowing?: string;
      children?: MenuitemOptions[];
      subElementOptions?: MenuitemOptions[];
    }
  | {
      tag: "menuseparator";
      getVisibility?: (
        elem: XUL.MenuSeparator,
        ev: Event,
      ) => boolean | undefined | Promise<boolean | undefined>;
      isHidden?: (
        elem: XUL.MenuSeparator,
        ev: Event,
      ) => boolean | undefined | Promise<boolean | undefined>;
      isDisabled?: (
        elem: XUL.MenuSeparator,
        ev: Event,
      ) => boolean | undefined | Promise<boolean | undefined>;
      onShowing?: (
        elem: XUL.MenuSeparator,
        event: Event,
      ) => unknown | Promise<unknown>;
    };

interface MenuitemCommonOptions {
  id?: string;
  label?: string;
  icon?: string;
  classList?: string[];
  class?: string;
  styles?: { [key: string]: string };
  hidden?: boolean;
  disabled?: boolean;
  oncommand?: string;
  commandListener?:
    EventListenerOrEventListenerObject | ((event: Event) => unknown);
}

export type MenuitemOptions = MenuitemTagDependentOptions &
  MenuitemCommonOptions;
