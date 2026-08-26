import { getCachedItem } from "./cache";

const YOUTUBE_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

function isYoutubeHost(hostname: string): boolean {
  const host = hostname
    .replace(/^www\./i, "")
    .replace(/^m\./i, "")
    .toLowerCase();
  return (
    host === "youtu.be" ||
    host === "youtube.com" ||
    host === "youtube-nocookie.com" ||
    host.endsWith(".youtube.com") ||
    host.endsWith(".youtube-nocookie.com")
  );
}

function validVideoId(value: string | null | undefined): string | null {
  const id = (value || "").trim();
  return YOUTUBE_ID_PATTERN.test(id) ? id : null;
}

function parseTimestamp(value: string): number | undefined {
  const trimmed = value.trim();
  if (/^\d+$/.test(trimmed)) {
    return parseInt(trimmed, 10);
  }
  const match = trimmed.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/i);
  if (!match || !match[0]) {
    return undefined;
  }
  const hours = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2] || "0", 10);
  const seconds = parseInt(match[3] || "0", 10);
  return hours * 3600 + minutes * 60 + seconds;
}

export function youtubeStartSeconds(
  url: string | null | undefined,
): number | undefined {
  if (!url) {
    return undefined;
  }
  try {
    const parsed = new URL(url.trim());
    const start = parsed.searchParams.get("start");
    if (start) {
      const seconds = parseTimestamp(start);
      if (seconds) {
        return seconds;
      }
    }
    const t =
      parsed.searchParams.get("t") ||
      parsed.hash.replace(/^#/, "").match(/(?:^|&)t=([^&]+)/)?.[1];
    if (t) {
      return parseTimestamp(t);
    }
  } catch {
    return undefined;
  }
  return undefined;
}

export function youtubeVideoIdFromUrl(
  url: string | null | undefined,
): string | null {
  if (!url) {
    return null;
  }
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return null;
  }
  if (!isYoutubeHost(parsed.hostname)) {
    return null;
  }
  const host = parsed.hostname.replace(/^www\./i, "").replace(/^m\./i, "");
  const parts = parsed.pathname.split("/").filter(Boolean);
  if (host.toLowerCase() === "youtu.be") {
    return validVideoId(parts[0]);
  }
  if (
    parts[0] === "embed" ||
    parts[0] === "shorts" ||
    parts[0] === "live" ||
    parts[0] === "v" ||
    parts[0] === "e"
  ) {
    return validVideoId(parts[1]);
  }
  return validVideoId(parsed.searchParams.get("v"));
}

export function youtubeWatchUrl(
  videoId: string,
  startSeconds?: number,
): string {
  const params = new URLSearchParams({ v: videoId });
  if (startSeconds && startSeconds > 0) {
    params.set("t", String(startSeconds));
  }
  return `https://www.youtube.com/watch?${params.toString()}`;
}

export function youtubeThumbnailUrl(
  videoId: string,
  size: "hq" | "mq" = "hq",
): string {
  const file = size === "mq" ? "mqdefault.jpg" : "hqdefault.jpg";
  return `https://img.youtube.com/vi/${videoId}/${file}`;
}

export function youtubeUrlFromItem(item: Zotero.Item): string | null {
  const candidates: string[] = [];
  try {
    const url = item.getField("url");
    if (url) {
      candidates.push(url);
    }
  } catch {
    // Item fields may not be loaded.
  }
  try {
    for (const attId of item.getAttachments()) {
      const att = getCachedItem(attId);
      if (!att || !att.isAttachment()) {
        continue;
      }
      const attUrl = att.getField("url");
      if (attUrl) {
        candidates.push(attUrl);
      }
    }
  } catch {
    // Attachments may not be loaded.
  }
  for (const candidate of candidates) {
    if (youtubeVideoIdFromUrl(candidate)) {
      return candidate;
    }
  }
  return null;
}
