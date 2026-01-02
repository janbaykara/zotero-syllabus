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
    translation.setItems(collection.getChildItems());
    translation.setTranslator(RDF_EXPORT_TRANSLATOR_ID); // Zotero RDF

    translation.setHandler("done", (obj: { string: string }, success: any) => {
      if (success) {
        const rdfXml: string = obj.string; // <- your RDF/XML string
        // do something with rdfXml (upload, parse, etc.)
        return resolve(rdfXml);
      }
      reject(success);
    });

    translation.translate();
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
