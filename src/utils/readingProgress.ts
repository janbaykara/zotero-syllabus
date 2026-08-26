import { getCachedItem } from "./cache";
import { getPageCount } from "./readingTime";

export type AttachmentReadingProgress = {
  percent: number;
  page: number;
  total: number;
};

const progressMemo = new Map<
  number,
  { stamp: string; promise: Promise<AttachmentReadingProgress | null> }
>();

export function getPrimaryAttachmentProgress(
  item: Zotero.Item,
): Promise<AttachmentReadingProgress | null> {
  const pdf = findPdfAttachment(item);
  let last = "";
  try {
    last = pdf ? String(pdf.getAttachmentLastPageIndex() ?? "") : "";
  } catch {
    last = "";
  }
  const stamp = `${item.id}:${item.dateModified || ""}:${last}`;
  const cached = progressMemo.get(item.id);
  if (cached && cached.stamp === stamp) {
    return cached.promise;
  }
  const promise = resolveProgress(item).catch((error) => {
    ztoolkit.log("Reading progress failed:", error);
    return null;
  });
  progressMemo.set(item.id, { stamp, promise });
  return promise;
}

async function resolveProgress(
  item: Zotero.Item,
): Promise<AttachmentReadingProgress | null> {
  const attachment = await getPrimaryPdfAttachment(item);
  if (!attachment) {
    return null;
  }

  let lastIndex: unknown;
  try {
    lastIndex = attachment.getAttachmentLastPageIndex();
  } catch {
    return null;
  }

  if (typeof lastIndex !== "number") {
    return null;
  }

  const total = await getAttachmentPageTotal(item, attachment);
  if (!total || total < 1) {
    return null;
  }

  const page = Math.min(total, Math.max(1, lastIndex + 1));
  const percent = Math.min(100, Math.max(0, Math.round((page / total) * 100)));
  return { percent, page, total };
}

async function getPrimaryPdfAttachment(
  item: Zotero.Item,
): Promise<Zotero.Item | null> {
  let best: Zotero.Item | false | undefined;
  try {
    best = await item.getBestAttachment();
  } catch {
    best = false;
  }
  if (best && best.isPDFAttachment?.()) {
    return best;
  }
  return findPdfAttachment(item);
}

function findPdfAttachment(item: Zotero.Item): Zotero.Item | null {
  for (const attId of item.getAttachments()) {
    const att = getCachedItem(attId);
    if (att?.isPDFAttachment?.()) {
      return att;
    }
  }
  return null;
}

async function getAttachmentPageTotal(
  item: Zotero.Item,
  attachment: Zotero.Item,
): Promise<number | null> {
  try {
    const fulltext = (Zotero as any).Fulltext || (Zotero as any).FullText;
    if (!fulltext?.getPages) {
      return getPageCount(item);
    }
    const row = await Promise.race([
      fulltext.getPages(attachment.id),
      new Promise<null>((resolve) => {
        setTimeout(() => resolve(null), 600);
      }),
    ]);
    const total = Number(
      (row as { total?: number; totalPages?: number } | null)?.total ??
        (row as { totalPages?: number } | null)?.totalPages ??
        0,
    );
    if (total > 0) {
      return total;
    }
  } catch {
    // Fall through to bibliographic page count.
  }
  return getPageCount(item);
}
