/**
 * Installs the Talis Aspire translator into Zotero's data directory.
 * This allows the translator to be used via Zotero.Translators.get() like any other translator.
 */

export async function installTalisAspireTranslator(): Promise<void> {
  try {
    const code = await getFileByPath(
      `content/translators/tails-aspire-custom.js`,
    );

    const translatorID = "f16931f0-372e-4197-8927-05d2ba7599d8";
    const metadata = {
      translatorID: translatorID,
      label: "Talis Aspire for Zotero Syllabus",
      creator: "Jan Baykara",
      // target:
      // "^https?://([^/]+\\.)?(((my)?reading|resource|lib|cyprus|)lists|aspire\\.surrey|rl\\.talis)\\..+/(lists|items)/",
      // https://rl.talis.com/3/ucl/lists/99449747-A091-3F6D-E08A-965F4A5C3149.html?lang=en-GB
      // target: "^https?://([^/]+\\.)?rl\\.talis\\..+/(lists|items)/",
      target: "",
      minVersion: "7.0",
      maxVersion: "",
      priority: 320,
      inRepository: false,
      translatorType: 4,
      browserSupport: "gcsibv",
      lastUpdated: "2026-01-04 12:00:00",
    };

    ztoolkit.log("Saving translator", metadata, code);
    await Zotero.Translators.save(metadata, code);
    await Zotero.Translators.reinit();
    ztoolkit.log("Talis Aspire translator installed successfully");
  } catch (error) {
    ztoolkit.log(`Error installing Talis Aspire translator: ${error}`);
    // Don't throw - allow plugin to continue even if translator install fails
  }
}

async function getFileByPath(path: string) {
  // Convert rootURI to a file path using Services.io
  const sourceURI = (Services.io as any).newURI(`${rootURI}${path}`);
  const fileHandler = (Services.io as any)
    .getProtocolHandler("file")
    .QueryInterface((Components.interfaces as any).nsIFileProtocolHandler);
  const sourceFile = fileHandler.getFileFromURLSpec(sourceURI.spec);

  if (!sourceFile.exists()) {
    ztoolkit.log(
      `Talis Aspire translator source file not found at: ${sourceFile.path}`,
    );
    return;
  }

  // Read file contents using Zotero.File API
  const fileObj = Zotero.File.pathToFile(sourceFile.path);
  const code = await Zotero.File.getContentsAsync(fileObj, "utf-8");

  return code;
}
