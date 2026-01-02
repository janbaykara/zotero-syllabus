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
