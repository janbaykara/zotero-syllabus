import { isZotero8OrLater } from "../utils/zotero";

export const FEATURE_FLAG = {
  READING_SCHEDULE: isZotero8OrLater(),
  TALIS_METADATA: isZotero8OrLater(),
};
