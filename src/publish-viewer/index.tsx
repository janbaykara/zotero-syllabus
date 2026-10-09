// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h, render } from "preact";
import { App } from "./App";
import type { CollectionShareDocument } from "./types";

declare global {
  interface Window {
    __SYLLABUS_SHARE_JSON__?: string;
  }
}

async function loadDocument(): Promise<CollectionShareDocument> {
  const path = window.__SYLLABUS_SHARE_JSON__ || "share.json";
  const res = await fetch(path);
  if (!res.ok) {
    throw new Error(`Failed to load ${path}: ${res.status}`);
  }
  return (await res.json()) as unknown as CollectionShareDocument;
}

/** Ask the Zotero Connector to re-scan after SPA metadata appears. */
function notifyZoteroItemUpdated(): void {
  try {
    document.dispatchEvent(
      new Event("ZoteroItemUpdated", { bubbles: true, cancelable: true }),
    );
  } catch {
    // ignore
  }
}

async function main(): Promise<void> {
  const root = document.getElementById("root");
  if (!root) {
    throw new Error("Missing #root");
  }
  try {
    const doc = await loadDocument();
    render(<App doc={doc} />, root);
    // COinS also live in the static #zotero-coins shell; this covers SPA bib.
    notifyZoteroItemUpdated();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    root.textContent = message;
  }
}

void main();
