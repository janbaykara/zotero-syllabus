import { ZoteroToolkit } from "zotero-plugin-toolkit/ztoolkit";
import { BasicTool, unregister, UITool } from "zotero-plugin-toolkit";
import { config } from "../../package.json";
import { MenuManager } from "./menuManager";

export { createZToolkit };

/** Toolkit instance with MenuManager restored for Zotero 7+ context menus. */
export type SyllabusToolkit = ZoteroToolkit & { Menu: MenuManager };

function createZToolkit(): SyllabusToolkit {
  const _ztoolkit = new ZoteroToolkit() as SyllabusToolkit;
  _ztoolkit.Menu = new MenuManager(_ztoolkit);
  const baseUnregisterAll = _ztoolkit.unregisterAll.bind(_ztoolkit);
  _ztoolkit.unregisterAll = () => {
    _ztoolkit.Menu.unregisterAll();
    baseUnregisterAll();
  };
  initZToolkit(_ztoolkit);
  return _ztoolkit;
}

function initZToolkit(_ztoolkit: SyllabusToolkit) {
  const env = __env__;
  _ztoolkit.basicOptions.log.prefix = `[${config.addonName}]`;
  _ztoolkit.basicOptions.log.disableConsole = env === "production";
  _ztoolkit.UI.basicOptions.ui.enableElementJSONLog = __env__ === "development";
  _ztoolkit.UI.basicOptions.ui.enableElementDOMLog = __env__ === "development";
  _ztoolkit.basicOptions.api.pluginID = config.addonID;
  _ztoolkit.ProgressWindow.setIconURI(
    "default",
    `chrome://${config.addonRef}/content/icons/favicon.png`,
  );
}

class MyToolkit extends BasicTool {
  UI: UITool;

  constructor() {
    super();
    this.UI = new UITool(this);
  }

  unregisterAll() {
    unregister(this);
  }
}
