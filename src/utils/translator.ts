/**
 * Installs the Talis Aspire translator into Zotero's data directory.
 * This allows the translator to be used via Zotero.Translators.get() like any other translator.
 */

export async function installTalisAspireTranslator(rootURI: string): Promise<void> {
  ztoolkit.log("installTalisAspireTranslator", { rootURI });
  let path = `${rootURI}/content/translators/tails-aspire-custom.js`
  if (rootURI.startsWith("jar:")) {
    path = `${rootURI}content/translators/tails-aspire-custom.js`
  }
  try {
    let code = await getFileByPath(path);

    if (!code || typeof code !== "string") {
      ztoolkit.log("Error getting translator code");
      return;
    }

    const PROD_PORT = 23119; // default
    const DEV_PORT = 23124;
    const PORT = process.env.NODE_ENV === "development" ? DEV_PORT : PROD_PORT;
    code = code.replace(String(PROD_PORT), String(DEV_PORT));

    const translatorID = "f16331f0-372e-4197-8927-05d2ba7599d8";
    const metadata = {
      translatorID: translatorID,
      label: "Talis Aspire for Zotero Syllabus",
      creator: "Jan Baykara",
      // target:
      // "^https?://([^/]+\\.)?(((my)?reading|resource|lib|cyprus|)lists|aspire\\.surrey|rl\\.talis)\\..+/(lists|items)/",
      // https://rl.talis.com/3/ucl/lists/99449747-A091-3F6D-E08A-965F4A5C3149.html?lang=en-GB
      // target: "^https?://([^/]+\\.)?rl\\.talis\\..+/(lists|items)/",
      target: "",
      minVersion: "3.0",
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

    // Add a progress popup for success
    new ztoolkit.ProgressWindow("Zotero Syllabus", {
      closeOnClick: true,
      closeTime: 6000,
    })
      .createLine({
        text: "✅ Talis syllabus scraper successfully installed",
        type: "success",
      })
      .createLine({
        text: `You can now extract structured syllabi from Talis Aspire collections\n like https://rl.talis.com/3/ucl.\n(Using port ${PORT}.)`,
        type: "default",
      })
      .show();
    ztoolkit.log(" Talis syllabus scraper successfully installed");
  } catch (error) {
    new ztoolkit.ProgressWindow("Zotero Syllabus", {
      closeOnClick: true,
      closeTime: 3000,
    })
      .createLine({
        text: `❌ Error installing Talis syllabus scraper`,
        type: "fail",
      })
      .createLine({
        text: `Tried loading from ${path}`,
        type: "fail",
      })
      .createLine({
        text: error instanceof Error ? error.message : String(error),
        type: "fail",
      })
      .show();
    ztoolkit.log(`Error installing Talis Aspire translator: ${error}`);
    // Don't throw - allow plugin to continue even if translator install fails
  }
}

async function getFileByPath(path: string) {
  // Convert rootURI to a file path using Services.io
  const sourceURI = (Services.io as any).newURI(path)
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
