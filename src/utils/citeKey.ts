import { ExtraFieldTool } from "zotero-plugin-toolkit";

const extraFieldTool = new ExtraFieldTool();

type BetterBibTeXKeyManager = {
  get?: (itemID: number) => { citationKey?: string } | undefined;
};

/**
 * Resolve a BibTeX / Pandoc citation key for a regular item.
 * Prefers Better BibTeX, then the native Citation Key field, then Extra.
 */
export function getItemCitationKey(
  item: Zotero.Item | null | undefined,
): string | null {
  if (!item) {
    return null;
  }
  try {
    if (!item.isRegularItem?.()) {
      return null;
    }
  } catch {
    return null;
  }

  try {
    const bbt = (
      Zotero as typeof Zotero & {
        BetterBibTeX?: { KeyManager?: BetterBibTeXKeyManager };
      }
    ).BetterBibTeX?.KeyManager;
    const fromBbt = bbt?.get?.(item.id)?.citationKey?.trim();
    if (fromBbt) {
      return fromBbt;
    }
  } catch {
    // Better BibTeX may be absent or not ready.
  }

  try {
    const fromField = String(item.getField?.("citationKey") || "").trim();
    if (fromField) {
      return fromField;
    }
  } catch {
    // Field may not exist without BBT / Zotero support.
  }

  try {
    const fromExtra =
      extraFieldTool.getExtraField(item, "Citation Key")?.trim() ||
      extraFieldTool.getExtraField(item, "Citation key")?.trim();
    if (fromExtra) {
      return fromExtra;
    }
  } catch {
    // Extra parse failures are non-fatal.
  }

  return null;
}
