/**
 * GalleryCover styles needed for published expanded-mode thumbnails.
 * Sourced from addon/content/zoteroPane.css (cover / journal / placeholder).
 */
export const PUBLISH_COVER_CSS = `
/* Utilities used by GalleryCover / PlaceholderFace (not in print base CSS) */
body.publish-layout .syllabus-item-thumbnail-cover .relative { position: relative; }
body.publish-layout .syllabus-item-thumbnail-cover .absolute { position: absolute; }
body.publish-layout .syllabus-item-thumbnail-cover .inset-0 { inset: 0; }
body.publish-layout .syllabus-item-thumbnail-cover .w-full { width: 100%; }
body.publish-layout .syllabus-item-thumbnail-cover .h-full { height: 100%; }
body.publish-layout .syllabus-item-thumbnail-cover .h-auto { height: auto; }
body.publish-layout .syllabus-item-thumbnail-cover .min-w-0 { min-width: 0; }
body.publish-layout .syllabus-item-thumbnail-cover .flex-1 { flex: 1 1 0%; }
body.publish-layout .syllabus-item-thumbnail-cover .overflow-hidden { overflow: hidden; }
body.publish-layout .syllabus-item-thumbnail-cover .rounded-\\[3px\\],
body.publish-layout .syllabus-item-thumbnail-cover [class*="rounded-[3px]"] { border-radius: 3px; }
body.publish-layout .syllabus-item-thumbnail-cover .bg-quinary { background: #e8e8ea; }
body.publish-layout .syllabus-item-thumbnail-cover .text-white { color: #fff !important; }
body.publish-layout .syllabus-item-thumbnail-cover .text-white * { color: inherit !important; }
body.publish-layout .syllabus-item-thumbnail-cover .font-semibold { font-weight: 600; }
body.publish-layout .syllabus-item-thumbnail-cover .leading-snug { line-height: 1.375; }
body.publish-layout .syllabus-item-thumbnail-cover .drop-shadow-sm {
  filter: drop-shadow(0 1px 1px rgb(0 0 0 / 0.05));
}
body.publish-layout .syllabus-item-thumbnail-cover .opacity-85 { opacity: 0.85; }
body.publish-layout .syllabus-item-thumbnail-cover .p-3 { padding: 0.75rem; }
body.publish-layout .syllabus-item-thumbnail-cover .justify-between { justify-content: space-between; }
body.publish-layout .syllabus-item-thumbnail-cover .object-cover { object-fit: cover; }
body.publish-layout .syllabus-item-thumbnail-cover .object-contain { object-fit: contain; }
body.publish-layout .syllabus-item-thumbnail-cover .bg-white { background: #fff; }
body.publish-layout .syllabus-item-thumbnail-cover .block { display: block; }
body.publish-layout .syllabus-item-thumbnail-cover .shadow-card {
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.08);
}
body.publish-layout .syllabus-item-thumbnail-cover .line-clamp-2,
body.publish-layout .syllabus-item-thumbnail-cover .line-clamp-3,
body.publish-layout .syllabus-item-thumbnail-cover .line-clamp-4 {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
body.publish-layout .syllabus-item-thumbnail-cover .line-clamp-2 { -webkit-line-clamp: 2; }
body.publish-layout .syllabus-item-thumbnail-cover .line-clamp-3 { -webkit-line-clamp: 3; }
body.publish-layout .syllabus-item-thumbnail-cover .line-clamp-4 { -webkit-line-clamp: 4; }
body.publish-layout .syllabus-item-thumbnail-cover .text-\\[11px\\],
body.publish-layout .syllabus-item-thumbnail-cover [class*="text-[11px]"] { font-size: 11px; }
body.publish-layout .syllabus-item-thumbnail-cover .text-\\[12px\\],
body.publish-layout .syllabus-item-thumbnail-cover [class*="text-[12px]"] { font-size: 12px; }
body.publish-layout .syllabus-item-thumbnail-cover .text-\\[13px\\],
body.publish-layout .syllabus-item-thumbnail-cover [class*="text-[13px]"] { font-size: 13px; }

/* Slot sizing inside expanded syllabus cards */
body.publish-layout .syllabus-item-thumbnail-cover {
  width: 6rem;
  flex-shrink: 0;
  align-self: flex-start;
}
/* Print base CSS forces .flex/.h-full to position:static + height:auto — restore cover geometry */
body.publish-layout .syllabus-item-thumbnail-cover .relative {
  position: relative !important;
}
body.publish-layout .syllabus-item-thumbnail-cover .absolute,
body.publish-layout .syllabus-item-thumbnail-cover .syllabus-gallery-journal,
body.publish-layout .syllabus-item-thumbnail-cover .syllabus-gallery-placeholder-face,
body.publish-layout .syllabus-item-thumbnail-cover .syllabus-gallery-book-spine,
body.publish-layout .syllabus-item-thumbnail-cover .syllabus-gallery-page-fold,
body.publish-layout .syllabus-item-thumbnail-cover .syllabus-gallery-play,
body.publish-layout .syllabus-item-thumbnail-cover .syllabus-gallery-web-caption {
  position: absolute !important;
}
body.publish-layout .syllabus-item-thumbnail-cover .h-full {
  height: 100% !important;
}
body.publish-layout .syllabus-item-thumbnail-cover .overflow-hidden {
  overflow: hidden !important;
}
body.publish-layout .syllabus-item-thumbnail-cover .syllabus-gallery-cover-portrait,
body.publish-layout .syllabus-item-thumbnail-cover .syllabus-gallery-cover-video,
body.publish-layout .syllabus-item-thumbnail-cover .syllabus-gallery-cover-web,
body.publish-layout .syllabus-item-thumbnail-cover .syllabus-gallery-cover-square,
body.publish-layout .syllabus-item-thumbnail-cover .syllabus-gallery-cover-natural,
body.publish-layout .syllabus-item-thumbnail-cover .syllabus-gallery-cover-with-binder {
  width: 100%;
  align-self: stretch;
  position: relative !important;
  height: auto !important;
}
/* Expanded cards: square web/OG thumbs (gallery keeps 1.91:1). */
body.publish-layout .syllabus-item-thumbnail-cover .syllabus-gallery-cover-web {
  aspect-ratio: 1 / 1;
}
body.publish-layout .syllabus-item-thumbnail-cover .syllabus-gallery-web-caption {
  display: none;
}
body.publish-layout .syllabus-item-thumbnail-cover .syllabus-gallery-placeholder-face {
  padding: 0.35rem;
}
body.publish-layout .syllabus-item-thumbnail-cover .syllabus-gallery-placeholder-face .font-semibold {
  font-size: 10px;
  line-height: 1.25;
  -webkit-line-clamp: 3;
}
body.publish-layout .syllabus-item-thumbnail-cover .syllabus-gallery-placeholder-face [class*="text-[11px]"] {
  font-size: 9px;
  -webkit-line-clamp: 1;
}
body.publish-layout .syllabus-item-thumbnail-cover .syllabus-gallery-play-btn {
  transform: scale(0.7);
}
body.publish-layout .syllabus-item-thumbnail-cover .syllabus-gallery-duration {
  font-size: 9px;
  padding: 0.1rem 0.25rem;
}

/* Cover shapes */
body.publish-layout .syllabus-gallery-cover-portrait,
body.publish-layout .syllabus-gallery-cover-video,
body.publish-layout .syllabus-gallery-cover-web,
body.publish-layout .syllabus-gallery-cover-square,
body.publish-layout .syllabus-gallery-cover-natural {
  position: relative !important;
  width: 100%;
  overflow: hidden !important;
  border-radius: 3px;
  background: #e8e8ea;
}
body.publish-layout .syllabus-gallery-cover-portrait::after,
body.publish-layout .syllabus-gallery-cover-video::after,
body.publish-layout .syllabus-gallery-cover-web::after,
body.publish-layout .syllabus-gallery-cover-square::after,
body.publish-layout .syllabus-gallery-cover-natural::after {
  content: "";
  position: absolute !important;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  border-radius: inherit;
  box-shadow:
    inset 0 0 0 1px rgba(0, 0, 0, 0.12),
    inset 0 0 0 1px rgba(255, 255, 255, 0.18);
}
body.publish-layout .syllabus-gallery-cover-portrait { aspect-ratio: 2 / 3; }
body.publish-layout .syllabus-gallery-cover-video { aspect-ratio: 16 / 9; }
body.publish-layout .syllabus-gallery-cover-web { aspect-ratio: 1.91 / 1; }
body.publish-layout .syllabus-gallery-cover-square { aspect-ratio: 1 / 1; }
body.publish-layout .syllabus-gallery-cover-natural {
  aspect-ratio: auto;
  height: auto !important;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}

body.publish-layout .syllabus-gallery-play {
  position: absolute !important;
  inset: 0;
  z-index: 2;
  display: flex !important;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}
body.publish-layout .syllabus-gallery-play-btn {
  width: 2.15rem;
  height: 2.15rem;
  border-radius: 50%;
  border: 1.5px solid rgba(255, 255, 255, 0.78);
  background: rgba(255, 255, 255, 0.16);
  box-shadow: 0 1px 10px rgba(0, 0, 0, 0.28);
  position: relative;
}
body.publish-layout .syllabus-gallery-play-btn::after {
  content: "";
  position: absolute;
  top: 50%;
  left: 54%;
  width: 0.62rem;
  height: 0.76rem;
  background: rgba(255, 255, 255, 0.92);
  clip-path: polygon(0 0, 100% 50%, 0 100%);
  transform: translate(-50%, -50%);
}
body.publish-layout .syllabus-gallery-video-site {
  position: absolute;
  top: 0.35rem;
  left: 0.35rem;
  z-index: 2;
  width: 16px;
  height: 16px;
  border-radius: 3px;
  object-fit: contain;
  background: rgba(0, 0, 0, 0.42);
  pointer-events: none;
}
body.publish-layout .syllabus-gallery-duration {
  position: absolute;
  right: 0.35rem;
  bottom: 0.35rem;
  z-index: 3;
  padding: 0.15rem 0.38rem;
  border-radius: 3px;
  background: rgba(0, 0, 0, 0.78);
  color: #fff !important;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  line-height: 1.2;
  pointer-events: none;
}

body.publish-layout .syllabus-gallery-book-spine {
  position: absolute !important;
  inset: 0;
  pointer-events: none;
  z-index: 1;
  background: linear-gradient(
    to right,
    rgba(0, 0, 0, 0.28) 0,
    rgba(0, 0, 0, 0.1) 1px,
    rgba(255, 255, 255, 0.22) 2px,
    rgba(255, 255, 255, 0.06) 5px,
    rgba(0, 0, 0, 0.14) 7px,
    rgba(0, 0, 0, 0.04) 11px,
    transparent 22%
  );
}

/* Journal first-page mockup */
body.publish-layout .syllabus-gallery-journal {
  position: absolute !important;
  inset: 0;
  display: flex !important;
  flex-direction: column !important;
  padding: 0.5rem 1.2rem 0.55rem 0.55rem;
  background: #fff;
  color: #161616 !important;
  z-index: 0;
}
body.publish-layout .syllabus-gallery-journal * {
  color: inherit;
}
body.publish-layout .syllabus-gallery-journal-masthead {
  font-family: Georgia, "Times New Roman", serif;
  font-size: 8.5px;
  font-weight: 700;
  letter-spacing: 0.06em;
  line-height: 1.2;
  text-align: center;
  text-transform: uppercase;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}
body.publish-layout .syllabus-gallery-journal-edition {
  margin-top: 0.18rem;
  font-size: 8px;
  line-height: 1.25;
  letter-spacing: 0.01em;
  text-align: center;
  color: #444 !important;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}
body.publish-layout .syllabus-gallery-journal-rule {
  flex-shrink: 0;
  height: 3px;
  margin: 0.32rem 0 0.4rem;
  border: 0;
  border-top: 1px solid #1a1a1a;
  border-bottom: 0.5px solid #1a1a1a;
}
body.publish-layout .syllabus-gallery-journal-title {
  flex: 0 1 auto;
  min-height: 0;
  font-family: Georgia, "Times New Roman", serif;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.28;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 6;
  overflow: hidden;
}
body.publish-layout .syllabus-gallery-journal-author {
  margin-top: 0.35rem;
  font-size: 10px;
  font-style: italic;
  line-height: 1.25;
  color: #333 !important;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}
body.publish-layout .syllabus-gallery-journal.is-contemporary {
  --journal-ink: #1e3a5f;
  padding: 0;
}
body.publish-layout .syllabus-gallery-journal.is-contemporary::before {
  content: "";
  display: block !important;
  flex-shrink: 0;
  height: 3px;
  background: var(--journal-ink);
}
body.publish-layout .syllabus-gallery-journal-head {
  display: flex !important;
  flex-shrink: 0;
  align-items: flex-start;
  gap: 0.28rem;
  padding: 0.38rem 1.15rem 0.22rem 0.45rem;
}
body.publish-layout .syllabus-gallery-journal-mark {
  flex-shrink: 0;
  box-sizing: border-box;
  width: 1.2rem;
  height: 1.2rem;
  display: flex !important;
  align-items: center;
  justify-content: center;
  background: var(--journal-ink);
  color: #fff !important;
  font-family: -apple-system, "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-size: 6.5px;
  font-weight: 700;
  letter-spacing: 0.02em;
  line-height: 1;
}
body.publish-layout .syllabus-gallery-journal-mark[data-len="1"],
body.publish-layout .syllabus-gallery-journal-mark[data-len="2"] {
  font-size: 8px;
}
body.publish-layout .syllabus-gallery-journal-mark[data-len="4"],
body.publish-layout .syllabus-gallery-journal-mark[data-len="5"] {
  width: 1.45rem;
  font-size: 5.5px;
  letter-spacing: 0.01em;
}
body.publish-layout .syllabus-gallery-journal-head-text {
  min-width: 0;
  flex: 1;
}
body.publish-layout .syllabus-gallery-journal.is-contemporary .syllabus-gallery-journal-name {
  font-family: -apple-system, "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-size: 7.5px;
  font-weight: 600;
  font-style: italic;
  letter-spacing: 0;
  line-height: 1.2;
  text-transform: none;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}
body.publish-layout .syllabus-gallery-journal.is-contemporary .syllabus-gallery-journal-edition {
  margin-top: 0.08rem;
  font-family: -apple-system, "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-size: 7px;
  font-weight: 500;
  text-align: left;
  letter-spacing: 0;
  color: #5a5a5a !important;
  -webkit-line-clamp: 1;
}
body.publish-layout .syllabus-gallery-journal.is-contemporary .syllabus-gallery-journal-title {
  flex: 0 1 auto;
  padding: 0.1rem 1.05rem 0 0.45rem;
  font-family: -apple-system, "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.2;
  -webkit-line-clamp: 5;
}
body.publish-layout .syllabus-gallery-journal.is-contemporary:not(.has-abstract)
  .syllabus-gallery-journal-title {
  -webkit-line-clamp: 8;
}
body.publish-layout .syllabus-gallery-journal.is-contemporary .syllabus-gallery-journal-author {
  margin-top: 0.18rem;
  padding: 0 1.05rem 0.2rem 0.45rem;
  font-family: -apple-system, "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-size: 8px;
  font-style: normal;
  font-weight: 500;
  color: #3a3a3a !important;
}
body.publish-layout .syllabus-gallery-journal-abstract {
  flex: 1;
  min-height: 0;
  margin-top: 0.12rem;
  padding: 0.28rem 1.05rem 0.4rem 0.45rem;
  border-top: 0.5px solid #e2e2e2;
  font-family: Georgia, "Times New Roman", serif;
  font-size: 7px;
  line-height: 1.38;
  color: #4a4a4a !important;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 6;
  overflow: hidden;
}
body.publish-layout .syllabus-gallery-journal-sheet {
  background: #fff;
}
body.publish-layout .syllabus-gallery-page-fold {
  position: absolute !important;
  top: 0;
  right: 0;
  width: 1.35rem;
  height: 1.35rem;
  pointer-events: none;
  z-index: 2;
  background: linear-gradient(
    225deg,
    #e4e4e4 0 40%,
    #cfcfcf 44%,
    rgba(0, 0, 0, 0.16) 49%,
    transparent 55%
  );
  filter: drop-shadow(-1px 1px 1px rgba(0, 0, 0, 0.16));
}

body.publish-layout .syllabus-gallery-placeholder-face {
  position: absolute !important;
  inset: 0;
  display: flex !important;
  flex-direction: column !important;
  justify-content: space-between;
  color: #fff !important;
  z-index: 0;
}
body.publish-layout .syllabus-gallery-placeholder-spine {
  padding: 0.75rem 0.75rem 0.75rem 1.2rem;
}

body.publish-layout .syllabus-gallery-cover-with-binder {
  display: flex !important;
  flex-direction: row !important;
  align-items: stretch;
  width: 100%;
  gap: 0;
  position: relative !important;
}
body.publish-layout .syllabus-gallery-cover-with-binder .syllabus-gallery-cover-face {
  align-self: stretch;
  width: auto;
  min-width: 0;
  flex: 1 1 auto;
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
  position: relative !important;
  overflow: hidden !important;
}
body.publish-layout .syllabus-gallery-binder {
  position: relative;
  flex: 0 0 0.78rem;
  width: 0.78rem;
  align-self: stretch;
  display: flex !important;
  flex-direction: column !important;
  justify-content: space-evenly;
  align-items: center;
  padding: 8% 0;
  pointer-events: none;
  z-index: 1;
  border-radius: 3px 0 0 3px;
  background: linear-gradient(
    to right,
    rgba(42, 44, 52, 0.92),
    rgba(78, 82, 96, 0.9) 42%,
    rgba(36, 38, 46, 0.88)
  );
  box-shadow: 2px 0 5px rgba(0, 0, 0, 0.28);
  border-right: 0.5px solid rgba(255, 255, 255, 0.14);
}
body.publish-layout .syllabus-gallery-binder-ring {
  width: 0.36rem;
  height: 0.36rem;
  border-radius: 50%;
  background: radial-gradient(
    circle at 32% 30%,
    rgba(90, 94, 108, 0.95),
    rgba(14, 14, 18, 0.95) 72%
  );
  box-shadow:
    inset 0 0.5px 0.5px rgba(255, 255, 255, 0.28),
    0 0 0 0.5px rgba(0, 0, 0, 0.45);
}

body.publish-layout .syllabus-gallery-web-caption {
  position: absolute !important;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1;
  padding: 1.75rem 0.55rem 0.5rem;
  background: linear-gradient(
    to top,
    rgba(8, 8, 10, 0.92) 0%,
    rgba(8, 8, 10, 0.78) 55%,
    rgba(8, 8, 10, 0) 100%
  );
  color: #fff !important;
  pointer-events: none;
}
body.publish-layout .syllabus-gallery-web-caption-title {
  font-size: 13px;
  font-weight: 600;
  line-height: 1.25;
  color: #fff !important;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 4;
  overflow: hidden;
}
`;
