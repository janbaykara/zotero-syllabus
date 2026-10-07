/** Context-menu flow: Share via URL / Unpublish item. */

import { getString } from "./locale";
import {
  getPublishSession,
  isPublishApiConfigured,
  signInWithZoteroForPublish,
} from "./publishAuth";
import { resolvePublishedItemUrl } from "./publishItemUrls";
import {
  publishItemToCloud,
  resolveShareItem,
  unpublishItemFromCloud,
} from "./publishItem";
import { copyStringToClipboard } from "./clipboard";
import { confirmPrompt } from "./window";

async function ensurePublishSignedIn(): Promise<boolean> {
  if (getPublishSession()) {
    return true;
  }
  const progress = new ztoolkit.ProgressWindow(getString("app-name"), {
    closeOnClick: false,
    closeTime: -1,
  })
    .createLine({
      text: getString("progress-publish-auth"),
      type: "default",
    })
    .show();
  try {
    await signInWithZoteroForPublish();
    progress.close();
    return !!getPublishSession();
  } catch (err) {
    ztoolkit.log("Item share sign-in failed:", err);
    progress.close();
    const message =
      err instanceof Error && err.message === "publish_oauth_not_configured"
        ? getString("progress-publish-oauth-unconfigured")
        : getString("progress-publish-auth-failed");
    new ztoolkit.ProgressWindow(getString("app-name"), {
      closeOnClick: true,
      closeTime: 5000,
    })
      .createLine({ text: message, type: "fail" })
      .show();
    return false;
  }
}

function showUnconfigured(): void {
  new ztoolkit.ProgressWindow(getString("app-name"), {
    closeOnClick: true,
    closeTime: 5000,
  })
    .createLine({
      text: getString("progress-publish-unconfigured"),
      type: "fail",
    })
    .show();
}

export function canShareItemViaUrl(
  item: Zotero.Item | null | undefined,
): boolean {
  if (!item || !isPublishApiConfigured()) return false;
  try {
    if (item.deleted || item.isFeedItem) return false;
    if (item.isNote?.()) return false;
    return item.isRegularItem?.() || item.isAttachment?.();
  } catch {
    return false;
  }
}

export function itemHasPublishedUrl(item: Zotero.Item): boolean {
  try {
    return !!resolvePublishedItemUrl(resolveShareItem(item));
  } catch {
    return false;
  }
}

/** Current public share URL for the item (Extra, then prefs cache). */
export function getItemSharePublicUrl(item: Zotero.Item): string | null {
  try {
    return resolvePublishedItemUrl(resolveShareItem(item));
  } catch {
    return null;
  }
}

export async function shareItemViaUrl(
  item: Zotero.Item,
  options?: { skipConfirm?: boolean },
): Promise<void> {
  if (!isPublishApiConfigured()) {
    showUnconfigured();
    return;
  }
  if (!canShareItemViaUrl(item)) {
    return;
  }

  if (!options?.skipConfirm) {
    const ok = confirmPrompt(
      getString("dialog-item-share-confirm-title"),
      getString("dialog-item-share-confirm-text"),
    );
    if (!ok) {
      return;
    }
  }

  if (!(await ensurePublishSignedIn())) {
    return;
  }

  const progress = new ztoolkit.ProgressWindow(getString("app-name"), {
    closeOnClick: false,
    closeTime: -1,
  })
    .createLine({
      text: getString("progress-item-share-preparing"),
      type: "default",
    })
    .show();

  try {
    const { publicUrl } = await publishItemToCloud({
      item,
      onProgress: (phase, current, total) => {
        if (phase === "upload" && current != null && total != null) {
          progress.changeLine({
            text: getString("progress-item-share-uploading", {
              args: { current, total },
            }),
            type: "default",
          });
        } else {
          progress.changeLine({
            text: getString("progress-item-share-preparing"),
            type: "default",
          });
        }
      },
    });
    copyStringToClipboard(publicUrl);
    progress.close();
    new ztoolkit.ProgressWindow(getString("app-name"), {
      closeOnClick: true,
      closeTime: 4000,
    })
      .createLine({
        text: getString("progress-item-share-done"),
        type: "success",
      })
      .show();
    Zotero.launchURL(publicUrl);
  } catch (err) {
    ztoolkit.log("shareItemViaUrl failed:", err);
    progress.close();
    new ztoolkit.ProgressWindow(getString("app-name"), {
      closeOnClick: true,
      closeTime: 5000,
    })
      .createLine({
        text: getString("progress-item-share-failed"),
        type: "fail",
      })
      .show();
  }
}

export async function unpublishItemViaUrl(item: Zotero.Item): Promise<void> {
  if (!isPublishApiConfigured()) {
    showUnconfigured();
    return;
  }

  const ok = confirmPrompt(
    getString("dialog-item-unpublish-confirm-title"),
    getString("dialog-item-unpublish-confirm-text"),
  );
  if (!ok) {
    return;
  }

  if (!(await ensurePublishSignedIn())) {
    return;
  }

  const progress = new ztoolkit.ProgressWindow(getString("app-name"), {
    closeOnClick: false,
    closeTime: -1,
  })
    .createLine({
      text: getString("progress-item-unpublish"),
      type: "default",
    })
    .show();

  try {
    await unpublishItemFromCloud({ item });
    progress.close();
    new ztoolkit.ProgressWindow(getString("app-name"), {
      closeOnClick: true,
      closeTime: 4000,
    })
      .createLine({
        text: getString("progress-item-unpublish-done"),
        type: "success",
      })
      .show();
  } catch (err) {
    ztoolkit.log("unpublishItemViaUrl failed:", err);
    progress.close();
    new ztoolkit.ProgressWindow(getString("app-name"), {
      closeOnClick: true,
      closeTime: 5000,
    })
      .createLine({
        text: getString("progress-item-unpublish-failed"),
        type: "fail",
      })
      .show();
  }
}
