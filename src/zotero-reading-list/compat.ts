import { ExtraFieldTool } from "zotero-plugin-toolkit";
import { getCachedPref } from "../utils/cache";

const extraFieldTool = new ExtraFieldTool();

// Constants from https://github.com/Dominic-DallOsto/zotero-reading-list/blob/master/src/modules/overlay.ts
const ZOTERO_READING_LIST_PLUGIN_NAMESPACE =
  "extensions.zotero.zotero-reading-list";
const READ_STATUS_EXTRA_FIELD = "Read_Status";
const STATUS_NAME_AND_ICON_LIST_PREF = "statuses-and-icons-list";

export function getItemReadStatusName(item: Zotero.Item) {
  return extraFieldTool.getExtraField(item, READ_STATUS_EXTRA_FIELD);
}

export function getReadStatusMetadata(readStatusName: string) {
  return getReadingListStatusNameAndIconList()?.find(
    (icon) => icon.name === readStatusName,
  );
}

function getReadingListStatusNameAndIconList() {
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

function prefStringToList(prefString: string) {
  const [statusString, iconString] = prefString.split("|");
  return [statusString.split(";"), iconString.split(";")];
}
