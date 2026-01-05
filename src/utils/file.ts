// Import FilePicker for file downloads
const { FilePicker } = ChromeUtils.import(
  "chrome://zotero/content/modules/filePicker.jsm",
);

/**
 * Gets the default download directory (Downloads folder on Mac/Windows)
 * @returns The path to the Downloads folder, or home directory if Downloads doesn't exist, or null on error
 */
function getDefaultDownloadPath(): string | null {
  try {
    const { Services } = ChromeUtils.import(
      "resource://gre/modules/Services.jsm",
    );
    const homeDir = Services.dirsvc.get("Home", Ci.nsIFile);
    if (!homeDir) return null;

    const downloadsDir = homeDir.clone();
    downloadsDir.append("Downloads");

    // Check if Downloads directory exists, if not return home directory
    if (downloadsDir.exists() && downloadsDir.isDirectory()) {
      return downloadsDir.path;
    }
    return homeDir.path;
  } catch (err) {
    ztoolkit.log("Error getting default download path:", err);
    return null;
  }
}

/**
 * Opens a file picker dialog to let the user select where to save a file,
 * then saves the provided text content to that location.
 * Defaults to the user's Downloads folder on Mac and Windows.
 *
 * @param filename - The default filename to suggest (e.g., "my-file.txt")
 * @param textContent - The text content to write to the file
 * @param dialogTitle - Optional title for the file picker dialog (default: "Save File")
 * @returns Promise that resolves to true if file was saved, false if user cancelled
 * @throws Error if file saving fails
 */
export async function saveToFile(
  filename: string,
  textContent: string,
  dialogTitle: string = "Save File",
  reveal: boolean = true,
): Promise<boolean> {
  try {
    // Use FilePicker to select download location
    const fp = new FilePicker();
    const defaultPath = getDefaultDownloadPath();
    if (defaultPath) {
      fp.displayDirectory = defaultPath;
    }
    fp.init(Zotero.getMainWindow(), dialogTitle, fp.modeSave);
    fp.defaultString = filename;
    fp.appendFilters(fp.filterAll);
    const rv = await fp.show();

    if (rv === fp.returnOK) {
      // fp.file is a string path, not an nsIFile object
      const filePath = fp.file;

      if (!filePath || typeof filePath !== "string") {
        ztoolkit.log("Error: File path is invalid:", filePath);
        throw new Error("File path is invalid");
      }

      ztoolkit.log(`Saving to path: ${filePath}`);

      // Create file object and write content
      const fileObj = Zotero.File.pathToFile(filePath);
      await Zotero.File.putContentsAsync(fileObj, textContent, "utf-8");

      // Verify file was created
      if (fileObj.exists()) {
        ztoolkit.log(`File saved successfully to: ${filePath}`);
        if (reveal) {
          fileObj.reveal();
        }
        return true;
      } else {
        ztoolkit.log(`Warning: File may not have been created at: ${filePath}`);
        return false;
      }
    } else {
      ztoolkit.log("File save cancelled by user");
      return false;
    }
  } catch (err) {
    ztoolkit.log("Error saving file:", err);
    throw err;
  }
}

