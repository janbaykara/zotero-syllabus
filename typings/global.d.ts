declare const _globalThis: {
  [key: string]: any;
  Zotero: _ZoteroTypes.Zotero;
  ztoolkit: ZToolkit;
  addon: typeof addon;
};

declare type ZToolkit = ReturnType<
  typeof import("../src/utils/ztoolkit").createZToolkit
>;

declare const ztoolkit: ZToolkit;

declare const rootURI: string;

declare const addon: import("../src/addon").default;

declare const __env__: "production" | "development";

// Firefox/XUL Components API for file picker and other system services
declare const Components: {
  classes: {
    [key: string]: {
      createInstance: (interfaceName: any) => any;
    };
  };
  interfaces: {
    nsIFilePicker: any;
  };
  utils: {
    isDeadWrapper: (obj: any) => boolean;
  };
};

// Services API for accessing system services
declare const Services: {
  wm?: {
    getMostRecentWindow: (windowType: string) => Window | null;
  };
  scriptloader?: any;
  io?: any;
  dirsvc: {
    get: (key: string, iface: any) => any;
  };
  prompt: {
    confirm: (
      parent: Window | null,
      dialogTitle: string,
      text: string,
    ) => boolean;
    alert: (parent: Window | null, dialogTitle: string, text: string) => void;
  };
};

declare const Ci: {
  nsIFile: any;
  [key: string]: any;
};

declare const ChromeUtils: {
  importESModule: (
    path: string,
    options?: { global?: string },
  ) => Record<string, any>;
};

declare const PathUtils: {
  join: (...parts: string[]) => string;
};

declare const IOUtils: {
  exists: (path: string) => Promise<boolean>;
  makeDirectory: (
    path: string,
    options?: { createAncestors?: boolean; ignoreExisting?: boolean },
  ) => Promise<void>;
  read: (
    path: string,
    options?: { maxBytes?: number },
  ) => Promise<Uint8Array>;
  write: (
    path: string,
    data: Uint8Array,
    options?: { tmpPath?: string },
  ) => Promise<void>;
  stat: (path: string) => Promise<{ lastModified: number; size: number }>;
};
