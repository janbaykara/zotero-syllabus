// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h, Fragment } from "preact";
import type { JSX } from "preact";
import { youtubeThumbnailUrl, youtubeWatchUrl } from "../utils/youtube";
import { getString } from "../utils/locale";

export function YoutubePlayer({
  videoId,
  startSeconds,
  title,
}: {
  videoId: string;
  startSeconds?: number;
  title: string;
}) {
  const play = (e: JSX.TargetedMouseEvent<HTMLElement>) => {
    e.stopPropagation();
    e.preventDefault();
    Zotero.launchURL(youtubeWatchUrl(videoId, startSeconds));
  };

  return (
    <div
      className="relative w-full shrink-0 overflow-hidden rounded-md in-[.print]:hidden"
      style={{ aspectRatio: "16 / 9", backgroundColor: "#000" }}
      draggable={false}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <img
        src={youtubeThumbnailUrl(videoId)}
        alt=""
        draggable={false}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      />
      <button
        type="button"
        className="flex items-center justify-center border-0 p-0"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          backgroundColor: "rgba(0, 0, 0, 0.2)",
        }}
        draggable={false}
        onClick={play}
        onDblClick={play}
        title={getString("youtube-play", { args: { title } })}
        aria-label={getString("youtube-play", { args: { title } })}
      >
        <span
          className="flex items-center justify-center text-white shadow-md"
          style={{
            height: "48px",
            width: "68px",
            borderRadius: "12px",
            backgroundColor: "#ff0000",
          }}
        >
          <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
            <path fill="currentColor" d="M8 5v14l11-7z" />
          </svg>
        </span>
      </button>
    </div>
  );
}
