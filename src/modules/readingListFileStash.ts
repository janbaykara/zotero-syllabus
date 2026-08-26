/**
 * PDFs downloaded by the Connector translator (with the user's browser
 * session) and imported onto items after Extra absorb.
 */

const STASH_TTL_MS = 15 * 60 * 1000;
const MAX_STASH_BYTES = 40 * 1024 * 1024;

export type StashedReadingListFile = {
  citationId: string;
  title: string;
  contentType: string;
  filename: string;
  bytes: Uint8Array;
  savedAt: number;
};

const stash = new Map<string, StashedReadingListFile[]>();

function pruneStash(): void {
  const cutoff = Date.now() - STASH_TTL_MS;
  for (const [citationId, files] of stash) {
    const fresh = files.filter((file) => file.savedAt >= cutoff);
    if (fresh.length) {
      stash.set(citationId, fresh);
    } else {
      stash.delete(citationId);
    }
  }
}

function decodeBase64(data: string): Uint8Array {
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function looksLikePdf(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 4 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46
  );
}

function sanitizeFilename(name: string, contentType: string): string {
  const fallback = contentType.includes("epub") ? "reading.epub" : "reading.pdf";
  const cleaned = name.replace(/[^A-Za-z0-9._-]+/g, "_").slice(0, 80);
  return cleaned || fallback;
}

export function stashReadingListFile(input: {
  citationId: string;
  title?: string;
  contentType?: string;
  filename?: string;
  data: string;
}): { ok: true; size: number } | { ok: false; error: string } {
  const citationId = String(input.citationId || "").trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,80}$/.test(citationId)) {
    return { ok: false, error: "Invalid citationId" };
  }
  if (!input.data || typeof input.data !== "string") {
    return { ok: false, error: "Missing file data" };
  }
  let bytes: Uint8Array;
  try {
    bytes = decodeBase64(input.data);
  } catch {
    return { ok: false, error: "Invalid base64 data" };
  }
  if (!bytes.length) {
    return { ok: false, error: "Empty file" };
  }
  if (bytes.length > MAX_STASH_BYTES) {
    return { ok: false, error: "File too large" };
  }
  const contentType = (input.contentType || "application/pdf").toLowerCase();
  if (
    !contentType.includes("pdf") &&
    !contentType.includes("epub") &&
    !looksLikePdf(bytes)
  ) {
    return { ok: false, error: "Not a PDF or EPUB" };
  }
  pruneStash();
  const file: StashedReadingListFile = {
    citationId,
    title: input.title?.trim() || "Full Text PDF",
    contentType: looksLikePdf(bytes) ? "application/pdf" : contentType,
    filename: sanitizeFilename(
      input.filename || `${citationId}.pdf`,
      contentType,
    ),
    bytes,
    savedAt: Date.now(),
  };
  const existing = stash.get(citationId) || [];
  if (existing.length >= 3) {
    return { ok: false, error: "Too many files for this citation" };
  }
  existing.push(file);
  stash.set(citationId, existing);
  ztoolkit.log("Stashed reading-list file", {
    citationId,
    size: bytes.length,
    contentType: file.contentType,
  });
  return { ok: true, size: bytes.length };
}

export function takeStashedReadingListFiles(
  citationId: string,
): StashedReadingListFile[] {
  pruneStash();
  const keys = new Set([citationId]);
  keys.add(citationId.toLowerCase());
  keys.add(citationId.toUpperCase());
  const files: StashedReadingListFile[] = [];
  for (const key of keys) {
    const found = stash.get(key);
    if (!found?.length) {
      continue;
    }
    files.push(...found);
    stash.delete(key);
  }
  return files;
}

function citationIdsFromItem(item: Zotero.Item, extraIds: string[]): string[] {
  const ids = new Set(extraIds.filter(Boolean));
  try {
    const url = String(item.getField("url") || "");
    const match = url.match(/citation(?:Id)?[=/](\d+)/i);
    if (match) {
      ids.add(match[1]);
    }
  } catch {
    // Ignore items that cannot expose a URL yet.
  }
  return Array.from(ids);
}

async function writeTempFile(
  filename: string,
  bytes: Uint8Array,
): Promise<string> {
  const tempDir = Zotero.getTempDirectory().path;
  const path =
    typeof PathUtils !== "undefined" && PathUtils.join
      ? PathUtils.join(tempDir, filename)
      : `${tempDir}/${filename}`;
  if (typeof IOUtils !== "undefined" && typeof IOUtils.write === "function") {
    await IOUtils.write(path, bytes);
    return path;
  }
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  await Zotero.File.putContentsAsync(path, copy.buffer);
  return path;
}

async function removeTempFile(path: string): Promise<void> {
  try {
    if (typeof IOUtils !== "undefined" && typeof IOUtils.remove === "function") {
      await IOUtils.remove(path, { ignoreAbsent: true });
    }
  } catch {
    // Temp cleanup is best-effort.
  }
}

async function removePlaceholderUrlAttachments(item: Zotero.Item): Promise<void> {
  const linked = Zotero.Attachments.LINK_MODE_LINKED_URL;
  for (const attId of item.getAttachments()) {
    const att = Zotero.Items.get(attId);
    if (!att?.isAttachment()) {
      continue;
    }
    const linkMode = att.attachmentLinkMode;
    if (linkMode !== linked) {
      continue;
    }
    const url = String(att.getField("url") || "");
    if (
      /contentstore\.cla\.co\.uk|\/link-shib\b|\.pdf(\?|$)/i.test(url) ||
      /\/(file|files|download)\b/i.test(url)
    ) {
      try {
        await att.eraseTx();
      } catch (error) {
        ztoolkit.log("Error removing linked URL placeholder:", error);
      }
    }
  }
}

export async function attachStashedReadingListFiles(
  item: Zotero.Item,
  extraCitationIds: string[],
): Promise<boolean> {
  const citationIds = citationIdsFromItem(item, extraCitationIds);
  const files = citationIds.flatMap((id) => takeStashedReadingListFiles(id));
  if (!files.length) {
    return false;
  }
  let attached = false;
  for (const file of files) {
    const path = await writeTempFile(
      `${Date.now()}-${file.filename}`,
      file.bytes,
    );
    try {
      await Zotero.Attachments.importFromFile({
        file: path,
        parentItemID: item.id,
        title: file.title,
        contentType: file.contentType,
        saveOptions: { skipSelect: true },
      });
      attached = true;
    } catch (error) {
      ztoolkit.log("Error importing stashed reading-list file:", error);
    } finally {
      await removeTempFile(path);
    }
  }
  if (attached) {
    await removePlaceholderUrlAttachments(item);
  }
  return attached;
}
