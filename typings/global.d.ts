declare const _globalThis: {
  [key: string]: any;
  Zotero: _ZoteroTypes.Zotero;
  ztoolkit: ZToolkit;
  addon: typeof addon;
  ZoteroSyllabus?: {
    setTalisSyllabusMetadata: (
      collectionId: number,
      metadata: {
        description?: string;
        priorities?: Array<{
          id: string;
          name: string;
          color: string;
          order: number;
        }>;
        nomenclature?: string;
      },
    ) => Promise<void>;
  };
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
};
