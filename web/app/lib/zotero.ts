import api from "zotero-api-client";

export const zoteroAPIClient = api(process.env.ZOTERO_API_KEY).library(
  "user",
  parseInt(process.env.ZOTERO_USER_ID!),
);
