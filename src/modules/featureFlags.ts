import { isZotero8OrLater } from "../utils/zotero";

export const FEATURE_FLAG = {
  READING_SCHEDULE: isZotero8OrLater(),
  /** Talis Aspire + Leganto Connector translators and local HTTP ingest. */
  TALIS_METADATA: isZotero8OrLater(),
};
