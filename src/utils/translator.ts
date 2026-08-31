import { FEATURE_FLAG } from "../modules/featureFlags";
import { getString } from "./locale";

const PROD_PORT = 23119;
const DEV_PORT = 23124;

type ReadingListTranslator = {
  relativePath: string;
  translatorID: string;
  label: string;
  lastUpdated: string;
};

const READING_LIST_TRANSLATORS: ReadingListTranslator[] = [
  {
    relativePath: "translators/tails-aspire-custom.js",
    translatorID: "f16331f0-372e-4197-8927-05d2ba7599d8",
    label: "Talis Aspire for Zotero Syllabus",
    lastUpdated: "2026-08-26 13:45:00",
  },
  {
    relativePath: "translators/leganto-custom.js",
    translatorID: "b3e8c4d1-7a5f-4c2e-9d18-6f0e2a1b8c47",
    label: "Leganto for Zotero Syllabus",
    lastUpdated: "2026-08-26 13:45:00",
  },
  {
    relativePath: "translators/keylinks-custom.js",
    translatorID: "a4f8c2e1-6b39-4d7a-9e21-5c8f0a3b7d14",
    label: "KeyLinks for Zotero Syllabus",
    lastUpdated: "2026-08-26 14:00:00",
  },
  {
    relativePath: "translators/ereserve-plus-custom.js",
    translatorID: "b5e9d3f2-7c4a-4e8b-a032-6d9e1b4c8f25",
    label: "eReserve Plus for Zotero Syllabus",
    lastUpdated: "2026-08-26 14:00:00",
  },
  {
    relativePath: "translators/bluecloud-course-lists-custom.js",
    translatorID: "c6f0e4a3-8d5b-4f9c-b143-7e0f2c5d9a36",
    label: "BLUEcloud Course Lists for Zotero Syllabus",
    lastUpdated: "2026-08-26 14:00:00",
  },
];

/**
 * Installs reading-list translators (Talis Aspire, Leganto, KeyLinks,
 * eReserve Plus, BLUEcloud Course Lists) into Zotero's data directory so the
 * Connector can use them like any other translator.
 */
export async function installReadingListTranslators(
  rootURI: string,
): Promise<void> {
  ztoolkit.log("installReadingListTranslators", { rootURI });

  if (!FEATURE_FLAG.TALIS_METADATA) {
    ztoolkit.log("Reading-list translators skipped - feature flag disabled", {
      version: Zotero.version,
    });
    return;
  }

  const PORT = __env__ === "development" ? DEV_PORT : PROD_PORT;
  const installed: string[] = [];
  const failed: Array<{ label: string; error: string }> = [];

  for (const spec of READING_LIST_TRANSLATORS) {
    try {
      let code = await getPluginFileContent({
        relativePath: spec.relativePath,
      });
      if (!code || typeof code !== "string") {
        throw new Error(`Empty translator code for ${spec.relativePath}`);
      }
      code = code.replaceAll(String(PROD_PORT), String(PORT));
      code = code.replaceAll(String(DEV_PORT), String(PORT));

      const metadata = {
        translatorID: spec.translatorID,
        label: spec.label,
        creator: "Jan Baykara",
        target: "",
        minVersion: "3.0",
        maxVersion: "",
        priority: 320,
        inRepository: false,
        translatorType: 4,
        browserSupport: "gcsibv",
        lastUpdated: spec.lastUpdated,
      };

      ztoolkit.log("Saving translator", metadata);
      await Zotero.Translators.save(metadata, code);
      installed.push(spec.label);
    } catch (error) {
      failed.push({
        label: spec.label,
        error: error instanceof Error ? error.message : String(error),
      });
      ztoolkit.log(`Error installing ${spec.label}: ${error}`);
    }
  }

  if (installed.length > 0) {
    await Zotero.Translators.reinit();
    ztoolkit.log("Reading-list scrapers installed", installed);
  }

  if (failed.length > 0 && installed.length === 0) {
    const popup = new ztoolkit.ProgressWindow(getString("app-name"), {
      closeOnClick: true,
      closeTime: 4000,
    });
    popup.createLine({
      text: getString("progress-translator-install-error"),
      type: "fail",
    });
    for (const item of failed) {
      popup.createLine({
        text: `${item.label}: ${item.error}`,
        type: "fail",
      });
    }
    popup.show();
  }
}

/** @deprecated Use installReadingListTranslators */
export const installTalisAspireTranslator = installReadingListTranslators;

/**
 * Read a file from the plugin's content directory using chrome:// URI
 * @param options - Options object with relativePath and optional encoding
 * @returns Promise resolving to the file contents as a string
 */
async function getPluginFileContent(options: {
  relativePath: string;
  encoding?: string;
}): Promise<string> {
  const { relativePath } = options;

  const chromeUrl = `chrome://${addon.data.config.addonRef}/content/${relativePath}`;
  ztoolkit.log("getPluginFileContent", { chromeUrl, relativePath });

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", chromeUrl, true);
    xhr.onload = () => {
      if (xhr.status === 200 || xhr.status === 0) {
        resolve(xhr.responseText);
      } else {
        const error = new Error(
          `Failed to load file from ${chromeUrl}: HTTP ${xhr.status}`,
        );
        ztoolkit.log(`Failed to load file from ${chromeUrl}:`, xhr.status);
        reject(error);
      }
    };
    xhr.onerror = () => {
      const error = new Error(`Error loading file from ${chromeUrl}`);
      ztoolkit.log(`Error loading file from ${chromeUrl}`);
      reject(error);
    };
    xhr.send();
  });
}
