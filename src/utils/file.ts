import { FilePickerHelper } from "zotero-plugin-toolkit";
import { isZotero8OrLater } from "./zotero";

/**
 * Gets the default download directory (Downloads folder on Mac/Windows)
 * @returns The path to the Downloads folder, or home directory if Downloads doesn't exist, or null on error
 */
function getDefaultDownloadPath(): string | null {
  try {
    // Services is a global in Zotero 7+ — do not import Services.jsm/sys.mjs
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
  if (!isZotero8OrLater()) {
    // Zotero 7 doesn't support the modern file picker path used below
    const tempDir = Zotero.getTempDirectory();
    const tempFile = tempDir.clone();
    tempFile.append(filename);
    // NORMAL_FILE_TYPE = 0
    tempFile.createUnique(0, 0o666);

    const fileObj = Zotero.File.pathToFile(tempFile.path);
    await Zotero.File.putContentsAsync(fileObj, textContent, "utf-8");

    fileObj.reveal();
    return true;
  }

  try {
    const defaultPath = getDefaultDownloadPath();
    const filePath = await new FilePickerHelper(
      dialogTitle,
      "save",
      undefined,
      filename,
      Zotero.getMainWindow(),
      "all",
      defaultPath ?? undefined,
    ).open();

    if (!filePath || typeof filePath !== "string") {
      ztoolkit.log("File save cancelled by user");
      return false;
    }

    ztoolkit.log(`Saving to path: ${filePath}`);

    const fileObj = Zotero.File.pathToFile(filePath);
    await Zotero.File.putContentsAsync(fileObj, textContent, "utf-8");

    if (fileObj.exists()) {
      ztoolkit.log(`File saved successfully to: ${filePath}`);
      if (reveal) {
        fileObj.reveal();
      }
      return true;
    }

    ztoolkit.log(`Warning: File may not have been created at: ${filePath}`);
    return false;
  } catch (err) {
    ztoolkit.log("Error saving file:", err);
    throw err;
  }
}
