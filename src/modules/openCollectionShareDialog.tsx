// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h } from "preact";
import { getString } from "../utils/locale";
import { isTestEnv } from "../utils/env";
import {
  openPreactDialog,
  type PreactDialogHandle,
} from "../utils/preactDialog";
import {
  CollectionShareWizard,
  type CollectionShareWizardResult,
} from "./CollectionShareWizard";
import type { ShareKind } from "../utils/sharePayload";

let openHandle: PreactDialogHandle | null = null;

export function closeCollectionShareDialog(): void {
  if (openHandle?.window && !openHandle.window.closed) {
    openHandle.close();
  }
  openHandle = null;
}

/**
 * Open the unified collection share wizard.
 * Resolves with options on Publish, or null if cancelled.
 */
export function openCollectionShareDialog(opts: {
  collectionId: number;
  initialKind?: ShareKind;
}): Promise<CollectionShareWizardResult | null> {
  if (isTestEnv()) {
    return Promise.resolve(null);
  }

  closeCollectionShareDialog();

  return new Promise((resolve) => {
    let settled = false;
    const finish = (result: CollectionShareWizardResult | null) => {
      if (settled) return;
      settled = true;
      closeCollectionShareDialog();
      resolve(result);
    };

    openHandle = openPreactDialog({
      title: getString("share-wizard-title"),
      rootId: "collection-share-root",
      singleton: false,
      content: () => (
        <CollectionShareWizard
          collectionId={opts.collectionId}
          initialKind={opts.initialKind}
          onCancel={() => finish(null)}
          onConfirm={(options) => finish(options)}
        />
      ),
      features: {
        width: 480,
        height: 560,
        noDialogMode: true,
        fitContent: false,
        resizable: true,
      },
      onUnload: () => {
        openHandle = null;
        if (!settled) {
          settled = true;
          resolve(null);
        }
      },
    });
  });
}
