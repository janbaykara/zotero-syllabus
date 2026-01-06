import { ExtraFieldTool } from "zotero-plugin-toolkit";
import SuperJSON from "superjson";
import { getCachedPref } from "../utils/cache";

const extraFieldTool = new ExtraFieldTool();

// Constants from https://github.com/Dominic-DallOsto/zotero-reading-list/blob/master/src/modules/overlay.ts
const ZOTERO_READING_LIST_PLUGIN_NAMESPACE =
  "extensions.zotero.zotero-reading-list";
const READ_STATUS_COLUMN_ID = "readstatus";
const READ_STATUS_EXTRA_FIELD = "Read_Status";
const READ_DATE_EXTRA_FIELD = "Read_Status_Date";
export const DEFAULT_STATUS_ICONS = ["⭐", "📙", "📖", "📗", "📕"];
export const DEFAULT_STATUS_CHANGE_FROM = ["New", "To Read"];
export const DEFAULT_STATUS_CHANGE_TO = ["In Progress", "In Progress"];
export const SHOW_ICONS_PREF = "show-icons"; // deprecated
export const READ_STATUS_FORMAT_PREF = "read-status-format";
export const READ_STATUS_FORMAT_HEADER_SHOW_ICON =
  "readstatuscolumn-format-header-showicon";
export const LABEL_NEW_ITEMS_PREF = "label-new-items";
export const LABEL_NEW_ITEMS_PREF_DISABLED = "|none|";
export const LABEL_ITEMS_WHEN_OPENING_FILE_PREF =
  "label-items-when-opening-file";
export const ENABLE_KEYBOARD_SHORTCUTS_PREF = "enable-keyboard-shortcuts";
export const STATUS_NAME_AND_ICON_LIST_PREF = "statuses-and-icons-list";
export const STATUS_CHANGE_ON_OPEN_ITEM_LIST_PREF =
  "status-change-on-open-item-list";
//////////////////////////////////////////////////////////

export function getItemReadStatusName(item: Zotero.Item) {
  return extraFieldTool.getExtraField(item, READ_STATUS_EXTRA_FIELD);
}

export function getItemReadStatus(item: Zotero.Item) {
  const name = getItemReadStatusName(item);
  if (!name) return undefined;
  return getReadStatusMetadata(name);
}

export function getReadStatusMetadata(readStatusName: string) {
  return getReadingListStatusNameAndIconList()?.find(
    (icon) => icon.name === readStatusName,
  );
}

export function getReadingListStatusNameAndIconList() {
  const readStatusPluginSettings = getZoteroPref(
    ZOTERO_READING_LIST_PLUGIN_NAMESPACE,
    STATUS_NAME_AND_ICON_LIST_PREF,
  );
  if (readStatusPluginSettings) {
    const [statusNames, statusIcons] = prefStringToList(
      String(readStatusPluginSettings),
    );
    return statusNames.map((name, index) => ({
      name,
      icon: statusIcons[index],
    }));
  }
}

function getZoteroPref(ns: string, key: string) {
  return getCachedPref(`${ns}.${key}`);
}

export function prefStringToList(prefString: string) {
  const [statusString, iconString] = prefString.split("|");
  return [statusString.split(";"), iconString.split(";")];
}
