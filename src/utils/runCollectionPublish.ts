/** Shared progress UI + auth for collection publish / unpublish. */

import { getString } from "./locale";
import {
  getPublishSession,
  isPublishApiConfigured,
  signInWithZoteroForPublish,
} from "./publishAuth";
import {
  publishCollectionToCloud,
  unpublishCollectionFromCloud,
} from "./publishCollection";
import { setPublishedSyllabusUrl } from "./publishUrls";
import { getPublishedShareOptions } from "./publishShareOptions";
import { openCollectionShareDialog } from "../modules/openCollectionShareDialog";
import type { CollectionShareOptions, ShareKind } from "./sharePayload";
import { confirmPrompt } from "./window";

export type CollectionPublishUiStatus =
  | { kind: "idle" }
  | { kind: "auth" }
  | { kind: "preparing" }
  | { kind: "unpublishing" }
  | { kind: "uploading"; current: number; total: number }
  | { kind: "done"; url: string }
  | { kind: "error"; message: string };

async function ensurePublishSignedIn(
  setStatus: (s: CollectionPublishUiStatus) => void,
): Promise<boolean> {
  if (getPublishSession()) return true;
  setStatus({ kind: "auth" });
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
    progress.changeLine({
      text: getString("progress-publish-preparing"),
      type: "default",
    });
    progress.close();
    return true;
  } catch (err) {
    ztoolkit.log("Publish sign-in failed:", err);
    progress.changeLine({
      text: getString("progress-publish-auth-failed"),
      type: "fail",
    });
    progress.close();
    setStatus({
      kind: "error",
      message: getString("progress-publish-auth-failed"),
    });
    return false;
  }
}

export async function runCollectionPublish(opts: {
  collectionId: number;
  items: Zotero.Item[];
  initialKind?: ShareKind;
  /** Sync: skip wizard when stored options match `initialKind`. */
  sync?: boolean;
  title?: string;
  courseCode?: string | null;
  institution?: string | null;
  cslStyle?: string | null;
  setStatus: (s: CollectionPublishUiStatus) => void;
  onPublishedUrl: (url: string) => void;
}): Promise<boolean> {
  if (!isPublishApiConfigured()) {
    const message = getString("progress-publish-unconfigured");
    opts.setStatus({ kind: "error", message });
    new ztoolkit.ProgressWindow(getString("app-name"), {
      closeOnClick: true,
      closeTime: 5000,
    })
      .createLine({ text: message, type: "fail" })
      .show();
    return false;
  }

  const stored = getPublishedShareOptions(opts.collectionId);
  // Sync may skip the wizard only when reusing the same share kind as the
  // page the user is on. Gallery ↔ Syllabus mismatches open the wizard.
  const canSkipWizard =
    !!opts.sync &&
    !!stored &&
    (!opts.initialKind || stored.kind === opts.initialKind);

  const shareOptions: CollectionShareOptions | null = canSkipWizard
    ? stored
    : await openCollectionShareDialog({
        collectionId: opts.collectionId,
        initialKind: opts.initialKind,
      });

  if (!shareOptions) {
    return false;
  }

  // Rights copy is on wizard step 3 — do not show a second confirm dialog.

  if (!(await ensurePublishSignedIn(opts.setStatus))) {
    return false;
  }

  opts.setStatus({ kind: "preparing" });
  const progress = new ztoolkit.ProgressWindow(getString("app-name"), {
    closeOnClick: false,
    closeTime: -1,
  })
    .createLine({
      text: getString("progress-publish-preparing"),
      type: "default",
    })
    .show();

  try {
    const { publicUrl } = await publishCollectionToCloud({
      collectionId: opts.collectionId,
      items: opts.items,
      shareOptions,
      title: opts.title,
      courseCode: opts.courseCode,
      institution: opts.institution,
      cslStyle: opts.cslStyle,
      onProgress: (phase, current, total) => {
        if (phase === "upload" && current != null && total != null) {
          opts.setStatus({ kind: "uploading", current, total });
          progress.changeLine({
            text: getString("progress-publish-uploading", {
              args: { current, total },
            }),
            type: "default",
          });
        } else {
          opts.setStatus({ kind: "preparing" });
          progress.changeLine({
            text: getString("progress-publish-preparing"),
            type: "default",
          });
        }
      },
    });

    setPublishedSyllabusUrl(opts.collectionId, publicUrl);
    opts.onPublishedUrl(publicUrl);
    opts.setStatus({ kind: "done", url: publicUrl });

    try {
      await new ztoolkit.Clipboard().addText(publicUrl, "text/unicode").copy();
    } catch {
      // ignore
    }
    try {
      Zotero.launchURL(publicUrl);
    } catch {
      // ignore
    }

    progress.changeLine({
      text: getString("progress-publish-done"),
      type: "success",
    });
    progress.startCloseTimer(3000);
    return true;
  } catch (err) {
    ztoolkit.log("Collection publish failed:", err);
    const message = getString("progress-publish-failed");
    opts.setStatus({ kind: "error", message });
    progress.changeLine({ text: message, type: "fail" });
    progress.startCloseTimer(5000);
    return false;
  }
}

export async function runCollectionUnpublish(opts: {
  collectionId: number;
  setStatus: (s: CollectionPublishUiStatus) => void;
  onCleared: () => void;
}): Promise<boolean> {
  const ok = confirmPrompt(
    getString("dialog-publish-unpublish-title"),
    getString("publish-unpublish-confirm"),
  );
  if (!ok) return false;

  if (!(await ensurePublishSignedIn(opts.setStatus))) {
    return false;
  }

  opts.setStatus({ kind: "unpublishing" });
  try {
    await unpublishCollectionFromCloud({ collectionId: opts.collectionId });
    opts.onCleared();
    opts.setStatus({ kind: "idle" });
    new ztoolkit.ProgressWindow(getString("app-name"), {
      closeOnClick: true,
      closeTime: 3000,
    })
      .createLine({
        text: getString("publish-status-unpublished"),
        type: "success",
      })
      .show();
    return true;
  } catch (err) {
    ztoolkit.log("Unpublish failed:", err);
    opts.setStatus({
      kind: "error",
      message: getString("progress-publish-unpublish-failed"),
    });
    return false;
  }
}
