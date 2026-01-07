import { config } from "../package.json";
import { ColumnOptions, DialogHelper } from "zotero-plugin-toolkit";
import hooks from "./hooks";
import { createZToolkit } from "./utils/ztoolkit";
import { SyllabusManager } from "./modules/syllabus";
import { FEATURE_FLAG } from "./modules/featureFlags";

class Addon {
  public data: {
    alive: boolean;
    config: typeof config;
    // Env type, see build.js
    env: "development" | "production";
    initialized?: boolean;
    ztoolkit: ZToolkit;
    locale?: {
      current: any;
    };
    prefs?: {
      window: Window;
      columns: Array<ColumnOptions>;
      rows: Array<{ [dataKey: string]: string }>;
    };
    dialog?: DialogHelper;
  };
  // Lifecycle hooks
  public hooks: typeof hooks;
  // APIs
  public api: {
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

  constructor() {
    this.data = {
      alive: true,
      config,
      env: __env__,
      initialized: false,
      ztoolkit: createZToolkit(),
    };
    this.hooks = hooks;
    this.api = {
      setTalisSyllabusMetadata: async (collectionId, metadata) => {
        // Only allow when feature flag is enabled
        if (!FEATURE_FLAG.TALIS_METADATA) {
          ztoolkit.log(
            "setTalisSyllabusMetadata called but feature flag is disabled",
            { version: Zotero.version },
          );
          return;
        }
        try {
          if (metadata.description) {
            await SyllabusManager.setCollectionDescription(
              collectionId,
              metadata.description,
              "page",
            );
          }
          if (metadata.priorities && metadata.priorities.length > 0) {
            await SyllabusManager.setPriorities(
              collectionId,
              metadata.priorities,
              "page",
            );
          }
          if (metadata.nomenclature) {
            await SyllabusManager.setNomenclature(
              collectionId,
              metadata.nomenclature,
              "page",
            );
          }
          ztoolkit.log(
            "Talis syllabus metadata set for collection",
            collectionId,
          );
        } catch (error) {
          ztoolkit.log("Error setting Talis syllabus metadata:", error);
        }
      },
    };
  }
}

export default Addon;
