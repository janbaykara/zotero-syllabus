/** Publish API target: syllabus collection prefix or shared item prefix. */

export type PublishTarget =
  | { kind: "syllabus"; libraryId: string; collectionKey: string }
  | { kind: "item"; libraryId: string; itemKey: string };

export function publishTargetHeaders(
  target: PublishTarget,
): Record<string, string> {
  const headers: Record<string, string> = {
    "X-Syllabus-Library-Id": target.libraryId,
  };
  if (target.kind === "syllabus") {
    headers["X-Syllabus-Collection-Key"] = target.collectionKey;
  } else {
    headers["X-Syllabus-Item-Key"] = target.itemKey;
  }
  return headers;
}

/** Absolute same-origin path to a shared item attachment file. */
export function absoluteItemFileHref(
  userId: string,
  libraryId: string,
  itemKey: string,
  attachmentRelPath: string,
): string {
  const rel = attachmentRelPath.replace(/^\/+/, "");
  return `/u/${userId}/${libraryId}/item/${itemKey}/${rel}`;
}
