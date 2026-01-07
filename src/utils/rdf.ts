// import { GetByLibraryAndKeyArgs } from "../modules/syllabus";

const RDF_EXPORT_TRANSLATOR_ID = "14763d24-8ba0-45df-8f52-b8d1108e7ac9";

export function getRDFStringForCollection(collection: Zotero.Collection) {
  return new Promise((resolve, reject) => {
    // const zotero = ztoolkit.getGlobal("zotero")
    // const translator = new zotero.Translate('export');
    // translator.setTranslator(RDF_TRANSLATOR_ID)
    // translator.setCollection(collection);
    // translator.translate()
    const translation = new Zotero.Translate.Export();
    const items = collection.getChildItems();
    ztoolkit.log("getRDFStringForCollection: items count:", items.length);

    translation.setItems(items);
    const translatorSet = translation.setTranslator(RDF_EXPORT_TRANSLATOR_ID); // Zotero RDF
    ztoolkit.log("getRDFStringForCollection: translator set:", translatorSet);

    if (!translatorSet) {
      reject(new Error("Failed to set RDF translator"));
      return;
    }

    // Add timeout to prevent hanging forever
    const TIMEOUT_MS = 10000;
    const timeout = setTimeout(() => {
      ztoolkit.log(`getRDFStringForCollection: timeout after ${TIMEOUT_MS}ms`);
      reject(new Error(`RDF export timed out after ${TIMEOUT_MS}ms`));
    }, TIMEOUT_MS);

    let handlerCalled = false;

    // Set error handler first to catch any errors
    translation.setHandler("error", (translate: any, error: Error | string) => {
      if (handlerCalled) return;
      handlerCalled = true;
      clearTimeout(timeout);
      ztoolkit.log("getRDFStringForCollection: error handler called:", error);
      reject(error instanceof Error ? error : new Error(String(error)));
    });

    // The "done" handler signature is (translate, success), not (obj, success)
    translation.setHandler("done", (translate: any, success: boolean) => {
      if (handlerCalled) return;
      handlerCalled = true;
      clearTimeout(timeout);
      ztoolkit.log(
        "getRDFStringForCollection: done handler called, success:",
        success,
      );
      ztoolkit.log(
        "getRDFStringForCollection: translate object keys:",
        Object.keys(translate || {}),
      );

      if (success) {
        // Access the string from the translate object
        // The translate object should have a 'string' property for Export translations
        const translateObj = translate as any;
        const rdfXml: string = translateObj.string;
        ztoolkit.log(
          "getRDFStringForCollection: rdfXml length:",
          rdfXml?.length || 0,
        );
        if (rdfXml && typeof rdfXml === "string") {
          resolve(rdfXml);
        } else {
          ztoolkit.log(
            "getRDFStringForCollection: rdfXml is not a valid string:",
            rdfXml,
          );
          reject(new Error("RDF export did not return a valid string"));
        }
      } else {
        ztoolkit.log("getRDFStringForCollection: translation failed");
        reject(new Error("RDF export failed"));
      }
    });

    ztoolkit.log("getRDFStringForCollection: starting translation");
    try {
      translation.translate();
      ztoolkit.log("getRDFStringForCollection: translate() called");
    } catch (error) {
      clearTimeout(timeout);
      ztoolkit.log(
        "getRDFStringForCollection: error calling translate():",
        error,
      );
      reject(error);
    }
  });
}

/**
 * Import RDF items into the library
 * @param rdfString - The RDF XML string to import
 * @returns Promise that resolves with the imported Zotero.Item objects
 */
export function importRDF(rdfString: string): Promise<Zotero.Item[]> {
  return new Promise((resolve, reject) => {
    try {
      // Use Zotero's Translate API to import RDF
      // Zotero will auto-detect RDF format from the string content
      const translation = new Zotero.Translate.Import();
      translation.setString(rdfString);
      // Don't set translator - let Zotero auto-detect the format

      translation.setHandler("done", (obj: any, success: boolean) => {
        if (success) {
          // For imports, items are available in the translation object's newItems array
          // These are Zotero.Item objects that have been created
          const translationObj = obj as any;
          const newItems = translationObj.newItems || [];

          if (newItems.length > 0) {
            // Filter to only valid items
            const validItems = newItems.filter(
              (item: Zotero.Item) => item && item.id,
            );

            if (validItems.length > 0) {
              ztoolkit.log(
                `Imported ${validItems.length} items from RDF into library`,
              );
              resolve(validItems);
            } else {
              ztoolkit.log("No valid items found in imported RDF");
              resolve([]);
            }
          } else {
            ztoolkit.log("No items were imported from RDF");
            resolve([]);
          }
        } else {
          reject(new Error("RDF import failed"));
        }
      });

      translation.setHandler("error", (obj: any, error: Error) => {
        ztoolkit.log("RDF import error:", error);
        reject(error);
      });

      translation.translate();
    } catch (error) {
      ztoolkit.log("Error importing RDF:", error);
      reject(error);
    }
  });
}
