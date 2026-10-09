/** Shared publish credit line (product names stay untranslated). */

import { getString } from "./locale";
import { PLUGIN_REPO_URL } from "../modules/syllabusNoteHtml";

const ZOTERO_HOME_URL = "https://www.zotero.org/";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Credit sentence with linked product names.
 * Links “Zotero Syllabus” → plugin repo and “Zotero” → zotero.org.
 */
export function buildPublishCreditInnerHtml(): string {
  const syllabusMarker = "\uE000";
  const zoteroMarker = "\uE001";
  const label = getString("publish-html-credit", {
    args: { syllabus: syllabusMarker, zotero: zoteroMarker },
  });
  const syllabusLink = `<a href="${escapeHtml(PLUGIN_REPO_URL)}" target="_blank" rel="noopener noreferrer">Zotero Syllabus</a>`;
  const zoteroLink = `<a href="${escapeHtml(ZOTERO_HOME_URL)}" target="_blank" rel="noopener noreferrer">Zotero</a>`;
  return escapeHtml(label)
    .replace(syllabusMarker, syllabusLink)
    .replace(zoteroMarker, zoteroLink);
}

/** Small credit line for hosted HTML (wrapped in `<footer>`). */
export function buildPublishCreditHtml(options?: {
  className?: string;
}): string {
  const className = options?.className || "syllabus-publish-credit";
  return `<footer class="${escapeHtml(className)}">${buildPublishCreditInnerHtml()}</footer>`;
}
