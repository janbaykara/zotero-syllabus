// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h } from "preact";
import { getString } from "../utils/locale";
import { getCachedCollectionById } from "../utils/cache";
import {
  openPreactDialog,
  type PreactDialogHandle,
} from "../utils/preactDialog";
import { SettingsPage } from "./SettingsPage";

let openHandle: PreactDialogHandle | null = null;
let openCollectionId: number | null = null;

/** Close the syllabus settings popout if open. */
export function closeSyllabusSettingsDialog(): void {
  if (openHandle?.window && !openHandle.window.closed) {
    openHandle.close();
  }
  openHandle = null;
  openCollectionId = null;
}

function collectionTitle(collectionId: number): string {
  const cached = getCachedCollectionById(collectionId);
  const collection = cached || Zotero.Collections.get(collectionId) || null;
  if (!collection) {
    return getString("settings-title");
  }
  return collection.name?.trim() || getString("settings-title");
}

/**
 * Open (or focus) syllabus settings in a separate window.
 * Reuses the window when the same collection is already open.
 */
export function openSyllabusSettingsDialog(collectionId: number): void {
  if ((__env__ as string) === "test") {
    return;
  }

  if (openHandle?.window && !openHandle.window.closed) {
    if (openCollectionId === collectionId) {
      openHandle.window.focus();
      return;
    }
    openHandle.close();
    openHandle = null;
    openCollectionId = null;
  }

  const name = collectionTitle(collectionId);
  openCollectionId = collectionId;
  openHandle = openPreactDialog({
    title: getString("settings-window-title", { args: { name } }),
    rootId: "syllabus-settings-root",
    // Own module-level singleton — do not use addon.data.dialog (shared with
    // the global-priorities window).
    singleton: false,
    content: () => (
      <SettingsPage collectionId={collectionId} presentation="window" />
    ),
    features: {
      width: 640,
      height: 720,
      noDialogMode: true,
      fitContent: false,
      resizable: true,
    },
    onUnload: () => {
      openHandle = null;
      openCollectionId = null;
    },
  });
}
