import type { FluentMessageId } from "../../typings/i10n";
import { zoteroCache } from "../utils/cache";
import { getString } from "../utils/locale";
import { getPref, getPrefKey, setPref } from "../utils/prefs";
import { DEFAULT_PRIORITIES, Priority, PrioritySchema } from "../utils/schemas";
import { z } from "zod";

const BUILTIN_NAMES: Record<string, FluentMessageId> = {
  "course-info": "priority-default-course-info",
  essential: "priority-default-essential",
  recommended: "priority-default-recommended",
  optional: "priority-default-optional",
};

/** Built-in defaults with locale-aware display names. */
export function getBuiltInDefaultPriorities(): Priority[] {
  return DEFAULT_PRIORITIES.map((p) => ({
    ...p,
    name: BUILTIN_NAMES[p.id] ? getString(BUILTIN_NAMES[p.id]) : p.name,
  }));
}

function normalizeOrder(priorities: Priority[]): Priority[] {
  return priorities.map((p, index) => ({ ...p, order: index + 1 }));
}

/** Deep-enough clone for materialising into a syllabus note. */
export function clonePriorities(priorities: Priority[]): Priority[] {
  return priorities.map((p) => ({ ...p }));
}

/**
 * Global default priorities (plugin pref). Empty / invalid pref falls back to
 * built-in localized defaults.
 */
export function getGlobalDefaultPriorities(): Priority[] {
  const raw = getPref("defaultPriorities");
  if (typeof raw === "string" && raw.trim()) {
    try {
      const parsed = z.array(PrioritySchema).safeParse(JSON.parse(raw));
      if (parsed.success && parsed.data.length > 0) {
        return normalizeOrder(
          [...parsed.data].sort((a, b) => a.order - b.order),
        );
      }
    } catch (error) {
      ztoolkit.log("Failed to parse defaultPriorities pref:", error);
    }
  }
  return getBuiltInDefaultPriorities();
}

/** Persist priorities as the global default for new syllabi. */
export function setGlobalDefaultPriorities(priorities: Priority[]): void {
  const normalized = normalizeOrder(
    [...priorities].sort((a, b) => a.order - b.order),
  );
  setPref("defaultPriorities", JSON.stringify(normalized));
  zoteroCache.invalidatePref(getPrefKey("defaultPriorities"));
}
