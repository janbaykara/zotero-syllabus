// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h, Fragment } from "preact";
import { twMerge } from "tailwind-merge";
import {
  Copy,
  ExternalLink,
  LoaderCircle,
  Trash2,
  Upload,
  X,
} from "lucide-preact";
import { getString } from "../utils/locale";
import type { CollectionPublishUiStatus } from "../utils/runCollectionPublish";

export function PublishStatusBanner({
  status,
  publishedUrl,
  onOpen,
  onCopy,
  onSync,
  onUnpublish,
  onDismissStatus,
}: {
  status: CollectionPublishUiStatus;
  publishedUrl: string | null;
  onOpen: (url: string) => void;
  onCopy: (url: string) => void;
  onSync: () => void;
  onUnpublish: () => void;
  onDismissStatus: () => void;
}) {
  const busy =
    status.kind === "auth" ||
    status.kind === "preparing" ||
    status.kind === "unpublishing" ||
    status.kind === "uploading";
  const showUrl =
    (status.kind === "done" && status.url) ||
    (status.kind === "idle" && publishedUrl) ||
    (status.kind === "error" && publishedUrl);

  const statusText =
    status.kind === "auth"
      ? getString("publish-status-auth")
      : status.kind === "preparing"
        ? getString("publish-status-preparing")
        : status.kind === "unpublishing"
          ? getString("publish-status-unpublishing")
          : status.kind === "uploading"
            ? getString("publish-status-uploading", {
                args: { current: status.current, total: status.total },
              })
            : status.kind === "done"
              ? getString("publish-status-done")
              : status.kind === "error"
                ? status.message
                : null;

  if (!busy && !showUrl && status.kind !== "error") {
    return null;
  }

  const url =
    status.kind === "done"
      ? status.url
      : publishedUrl && (status.kind === "idle" || status.kind === "error")
        ? publishedUrl
        : null;

  const canSync = Boolean(url) && !busy;
  const isError = status.kind === "error";
  const actionHover = isError
    ? "hover:bg-publish-error-hover"
    : "hover:bg-publish-hover";
  const actionColor = isError ? "text-publish-error-fg" : "text-publish-fg";
  const busyHeading =
    status.kind === "unpublishing"
      ? getString("publish-status-heading-unpublishing")
      : getString("publish-status-heading-busy");

  return (
    <div
      className={twMerge(
        "syllabus-publish-banner in-[.print]:hidden box-border! w-full max-w-full min-w-0 rounded border px-3 py-2 text-base",
        isError
          ? "border-publish-error-border bg-publish-error text-publish-error-fg"
          : "border-publish-border bg-publish text-publish-fg",
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-row items-center gap-2 w-full min-w-0">
        <div className="flex flex-row items-center gap-2 min-w-0 flex-1">
          {busy ? (
            <LoaderCircle
              size={18}
              className="animate-spin shrink-0"
              aria-hidden="true"
            />
          ) : null}
          {statusText && (busy || isError || !url) ? (
            <span className="font-medium truncate min-w-0">
              {busy ? busyHeading : null}
              {busy && statusText ? " — " : null}
              {statusText}
            </span>
          ) : null}
          {url ? (
            <>
              <span className="shrink-0 font-medium">
                {getString("publish-status-url-label")}
              </span>
              <button
                type="button"
                className={twMerge(
                  "min-w-0 flex-1 truncate text-left underline bg-transparent border-none p-0 cursor-pointer font-inherit",
                  actionColor,
                )}
                onClick={() => onOpen(url)}
                title={getString("publish-status-open")}
              >
                {url}
              </button>
              <button
                type="button"
                className={twMerge(
                  "p-1.5 rounded border-none bg-transparent cursor-pointer shrink-0",
                  actionHover,
                  actionColor,
                )}
                title={getString("publish-status-copy")}
                aria-label={getString("publish-status-copy")}
                onClick={() => onCopy(url)}
              >
                <Copy size={18} />
              </button>
              <button
                type="button"
                className={twMerge(
                  "p-1.5 rounded border-none bg-transparent cursor-pointer shrink-0",
                  actionHover,
                  actionColor,
                )}
                title={getString("publish-status-open")}
                aria-label={getString("publish-status-open")}
                onClick={() => onOpen(url)}
              >
                <ExternalLink size={18} />
              </button>
            </>
          ) : null}
          {(status.kind === "done" || isError) && (
            <button
              type="button"
              className={twMerge(
                "p-1.5 rounded border-none bg-transparent cursor-pointer shrink-0",
                actionHover,
                actionColor,
              )}
              title={getString("publish-status-dismiss")}
              aria-label={getString("publish-status-dismiss")}
              onClick={onDismissStatus}
            >
              <X size={18} />
            </button>
          )}
        </div>
        {canSync ? (
          <div className="inline-flex items-center gap-1 shrink-0 ml-auto">
            <button
              type="button"
              className={twMerge(
                "inline-flex items-center gap-1.5 px-2 py-1 rounded border-none bg-transparent cursor-pointer font-medium",
                actionHover,
                actionColor,
              )}
              title={getString("publish-status-sync")}
              aria-label={getString("publish-status-sync")}
              onClick={onSync}
            >
              <Upload size={16} aria-hidden="true" />
              <span>{getString("publish-status-sync")}</span>
            </button>
            <button
              type="button"
              className={twMerge(
                "inline-flex items-center gap-1.5 px-2 py-1 rounded border-none bg-transparent cursor-pointer font-medium",
                actionHover,
                actionColor,
              )}
              title={getString("publish-status-unpublish")}
              aria-label={getString("publish-status-unpublish")}
              onClick={onUnpublish}
            >
              <Trash2 size={16} aria-hidden="true" />
              <span>{getString("publish-status-unpublish")}</span>
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
