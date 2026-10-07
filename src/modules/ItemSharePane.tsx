// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h, Fragment } from "preact";
import { useCallback, useState } from "preact/hooks";
import {
  Copy,
  ExternalLink,
  Link,
  LoaderCircle,
  Trash2,
  Upload,
} from "lucide-preact";
import { twMerge } from "tailwind-merge";
import { useZoteroItem } from "./react-zotero-sync/item";
import { useZoteroSelectedItemIds } from "./react-zotero-sync/selectedItem";
import { getString, getUiDir } from "../utils/locale";
import { copyStringToClipboard } from "../utils/clipboard";
import { isPublishApiConfigured } from "../utils/publishAuth";
import {
  canShareItemViaUrl,
  getItemSharePublicUrl,
  shareItemViaUrl,
  unpublishItemViaUrl,
} from "../utils/shareItemViaUrl";

interface ItemSharePaneProps {
  editable: boolean;
}

export function ItemSharePane({ editable }: ItemSharePaneProps) {
  const selectedItemIds = useZoteroSelectedItemIds();

  if (!selectedItemIds || selectedItemIds.length === 0) {
    return <div>{getString("item-pane-none-selected")}</div>;
  }

  if (selectedItemIds.length > 1) {
    return (
      <div className="pb-2 text-sm" dir={getUiDir()}>
        {getString("item-share-pane-multi-selected")}
      </div>
    );
  }

  return <ItemSharePaneData itemId={selectedItemIds[0]} editable={editable} />;
}

function ItemSharePaneData({
  itemId,
  editable,
}: {
  itemId: number;
  editable: boolean;
}) {
  const itemVersion = useZoteroItem(itemId);
  if (!itemVersion?.item) {
    return <div>{getString("item-pane-not-found")}</div>;
  }
  return (
    <ItemSharePaneContent
      item={itemVersion.item}
      version={itemVersion.version}
      editable={editable}
    />
  );
}

function ItemSharePaneContent({
  item,
  version,
  editable,
}: {
  item: Zotero.Item;
  version: number;
  editable: boolean;
}) {
  void version; // re-render when Extra / item changes
  const [busy, setBusy] = useState(false);
  const configured = isPublishApiConfigured();
  const shareable = canShareItemViaUrl(item);
  const url = getItemSharePublicUrl(item);

  const runShare = useCallback(
    async (skipConfirm: boolean) => {
      if (!editable || busy) return;
      setBusy(true);
      try {
        await shareItemViaUrl(item, { skipConfirm });
      } finally {
        setBusy(false);
      }
    },
    [busy, editable, item],
  );

  const runUnpublish = useCallback(async () => {
    if (!editable || busy) return;
    setBusy(true);
    try {
      await unpublishItemViaUrl(item);
    } finally {
      setBusy(false);
    }
  }, [busy, editable, item]);

  if (!configured) {
    return (
      <div className="flex flex-col gap-2 pb-2 text-sm" dir={getUiDir()}>
        <p className="m-0 text-xs text-secondary">
          {getString("progress-publish-unconfigured")}
        </p>
      </div>
    );
  }

  if (!shareable && !url) {
    return (
      <div className="flex flex-col gap-2 pb-2 text-sm" dir={getUiDir()}>
        <p className="m-0 text-xs text-secondary">
          {getString("item-share-pane-unsupported")}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 pb-2" dir={getUiDir()}>
      {url ? (
        <>
          <div className="flex flex-row items-center gap-1 min-w-0">
            <span className="shrink-0 text-xs font-medium text-secondary">
              {getString("publish-status-url-label")}
            </span>
            <button
              type="button"
              className="min-w-0 flex-1 truncate text-left text-xs underline bg-transparent border-none p-0 cursor-pointer font-inherit text-primary"
              onClick={() => Zotero.launchURL(url)}
              title={getString("publish-status-open")}
            >
              {url}
            </button>
            <button
              type="button"
              className="p-1 rounded border-0 bg-transparent cursor-pointer shrink-0 text-secondary hover:bg-quinary"
              title={getString("publish-status-copy")}
              aria-label={getString("publish-status-copy")}
              onClick={() => {
                copyStringToClipboard(url);
                new ztoolkit.ProgressWindow(getString("app-name"), {
                  closeOnClick: true,
                  closeTime: 2000,
                })
                  .createLine({
                    text: getString("publish-status-copied"),
                    type: "success",
                  })
                  .show();
              }}
            >
              <Copy size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="p-1 rounded border-0 bg-transparent cursor-pointer shrink-0 text-secondary hover:bg-quinary"
              title={getString("publish-status-open")}
              aria-label={getString("publish-status-open")}
              onClick={() => Zotero.launchURL(url)}
            >
              <ExternalLink size={16} aria-hidden="true" />
            </button>
          </div>
          {editable ? (
            <div className="flex flex-row flex-wrap gap-2">
              <button
                type="button"
                className={twMerge(
                  "inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-md cursor-pointer border-0 bg-transparent text-secondary hover:bg-quinary",
                  busy && "opacity-60 pointer-events-none",
                )}
                disabled={busy}
                onClick={() => void runShare(true)}
                title={getString("publish-status-sync")}
              >
                {busy ? (
                  <LoaderCircle
                    size={14}
                    className="animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <Upload size={14} aria-hidden="true" />
                )}
                <span>{getString("publish-status-sync")}</span>
              </button>
              <button
                type="button"
                className={twMerge(
                  "inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-md cursor-pointer border-0 bg-transparent text-secondary hover:bg-quinary",
                  busy && "opacity-60 pointer-events-none",
                )}
                disabled={busy}
                onClick={() => void runUnpublish()}
                title={getString("publish-status-unpublish")}
              >
                <Trash2 size={14} aria-hidden="true" />
                <span>{getString("publish-status-unpublish")}</span>
              </button>
            </div>
          ) : null}
        </>
      ) : editable ? (
        <button
          type="button"
          className={twMerge(
            "inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-md cursor-pointer border-0 bg-transparent text-secondary hover:bg-quinary self-start",
            busy && "opacity-60 pointer-events-none",
          )}
          disabled={busy}
          onClick={() => void runShare(false)}
          title={getString("item-share-via-url")}
        >
          {busy ? (
            <LoaderCircle
              size={14}
              className="animate-spin"
              aria-hidden="true"
            />
          ) : (
            <Link size={14} aria-hidden="true" />
          )}
          <span>{getString("item-share-via-url")}</span>
        </button>
      ) : (
        <p className="m-0 text-xs text-secondary">
          {getString("item-share-pane-not-shared")}
        </p>
      )}
    </div>
  );
}
