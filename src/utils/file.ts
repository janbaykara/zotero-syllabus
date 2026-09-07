import { FilePickerHelper } from "zotero-plugin-toolkit";
import { isZotero8OrLater } from "./zotero";
import { getString } from "./locale";

function defaultSaveFileTitle(): string {
  try {
    if (addon.data.locale) {
      return getString("dialog-save-file");
    }
  } catch {
    // Locale not initialized yet (default params can run before startup).
  }
  return "Save File";
}

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
 * Opens a save file picker and returns the chosen path, or null if cancelled.
 * Defaults to the user's Downloads folder on Mac and Windows.
 */
export async function pickSavePath(
  filename: string,
  dialogTitle?: string,
  filters?: [string, string][],
): Promise<string | null> {
  const title = dialogTitle ?? defaultSaveFileTitle();
  if (!isZotero8OrLater()) {
    const tempDir = Zotero.getTempDirectory();
    const tempFile = tempDir.clone();
    tempFile.append(filename);
    tempFile.createUnique(0, 0o666);
    return tempFile.path;
  }

  const defaultPath = getDefaultDownloadPath();
  const filePath = await new FilePickerHelper(
    title,
    "save",
    filters,
    filename,
    Zotero.getMainWindow(),
    filters?.length ? undefined : "all",
    defaultPath ?? undefined,
  ).open();

  if (!filePath || typeof filePath !== "string") {
    ztoolkit.log("File save cancelled by user");
    return null;
  }

  return filePath;
}

async function writeTextAtPath(
  filePath: string,
  textContent: string,
  reveal: boolean,
): Promise<boolean> {
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
}

async function writeBytesAtPath(
  filePath: string,
  data: Uint8Array,
  reveal: boolean,
): Promise<boolean> {
  ztoolkit.log(`Saving binary to path: ${filePath}`);
  if (typeof IOUtils !== "undefined" && typeof IOUtils.write === "function") {
    await IOUtils.write(filePath, data);
  } else {
    const fileObj = Zotero.File.pathToFile(filePath);
    const copy = new Uint8Array(data.byteLength);
    copy.set(data);
    await Zotero.File.putContentsAsync(fileObj, copy.buffer);
  }

  const fileObj = Zotero.File.pathToFile(filePath);
  if (fileObj.exists()) {
    ztoolkit.log(`File saved successfully to: ${filePath}`);
    if (reveal) {
      fileObj.reveal();
    }
    return true;
  }

  ztoolkit.log(`Warning: File may not have been created at: ${filePath}`);
  return false;
}

/**
 * Opens a file picker dialog to let the user select where to save a file,
 * then saves the provided text content to that location.
 * Defaults to the user's Downloads folder on Mac and Windows.
 *
 * @param filename - The default filename to suggest (e.g., "my-file.txt")
 * @param textContent - The text content to write to the file
 * @param dialogTitle - Optional title for the file picker dialog
 * @param reveal - Whether to reveal the file in the OS after saving
 * @param filters - Optional file-type filters for the picker
 * @returns Promise that resolves to true if file was saved, false if user cancelled
 * @throws Error if file saving fails
 */
export async function saveToFile(
  filename: string,
  textContent: string,
  dialogTitle?: string,
  reveal: boolean = true,
  filters?: [string, string][],
): Promise<boolean> {
  try {
    const filePath = await pickSavePath(filename, dialogTitle, filters);
    if (!filePath) {
      return false;
    }
    return await writeTextAtPath(filePath, textContent, reveal);
  } catch (err) {
    ztoolkit.log("Error saving file:", err);
    throw err;
  }
}

/**
 * Opens a save picker, then writes binary bytes (e.g. a .docx) to the chosen path.
 */
export async function saveBinaryToFile(
  filename: string,
  data: Uint8Array,
  dialogTitle?: string,
  filters?: [string, string][],
  reveal: boolean = true,
): Promise<boolean> {
  try {
    const filePath = await pickSavePath(filename, dialogTitle, filters);
    if (!filePath) {
      return false;
    }
    return await writeBytesAtPath(filePath, data, reveal);
  } catch (err) {
    ztoolkit.log("Error saving binary file:", err);
    throw err;
  }
}
