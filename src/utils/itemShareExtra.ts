/**
 * Persist the public item-share URL on the item Extra field so it syncs
 * with the library (prefs alone are machine-local).
 */

import { ExtraFieldTool } from "zotero-plugin-toolkit";

/**
 * Stored Extra field key — do not rename (see AGENTS.md stored identifiers).
 * Format in Extra: `Zotero Syllabus URL: https://…`
 */
export const ITEM_SHARE_URL_EXTRA_KEY = "Zotero Syllabus URL";

const extraFieldTool = new ExtraFieldTool();

export function getItemShareUrlFromExtra(
  item: Zotero.Item | null | undefined,
): string | null {
  if (!item) return null;
  try {
    const raw = extraFieldTool.getExtraField(item, ITEM_SHARE_URL_EXTRA_KEY);
    const url = String(raw || "").trim();
    return /^https?:\/\//i.test(url) ? url : null;
  } catch {
    return null;
  }
}

export async function setItemShareUrlInExtra(
  item: Zotero.Item,
  url: string,
): Promise<void> {
  const cleaned = String(url || "").trim();
  if (!cleaned || !/^https?:\/\//i.test(cleaned)) {
    await clearItemShareUrlInExtra(item);
    return;
  }
  await extraFieldTool.setExtraField(item, ITEM_SHARE_URL_EXTRA_KEY, cleaned, {
    save: true,
  });
}

export async function clearItemShareUrlInExtra(
  item: Zotero.Item,
): Promise<void> {
  await extraFieldTool.setExtraField(item, ITEM_SHARE_URL_EXTRA_KEY, "", {
    save: true,
  });
}
