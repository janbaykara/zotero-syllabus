#!/usr/bin/env node
/**
 * Build (and optionally publish) GitHub release notes for a tag:
 * - XPI attachment size and delta vs the previous release
 * - Synthesized end-user prose (1–3 sentences) on what changed
 *   (OpenAI / Anthropic / Cursor, with thematic fallback — not a commit-subject dump)
 * - Commit list since the previous release
 *
 * Usage:
 *   node scripts/generate-release-notes.mjs [--tag v1.9.1] [--update]
 *
 * Env:
 *   GITHUB_TOKEN / GH_TOKEN  — required for --update and size delta
 *   GITHUB_REPOSITORY        — owner/repo (default: from git remote)
 *   OPENAI_API_KEY           — preferred for AI summary
 *   ANTHROPIC_API_KEY        — alternative for AI summary
 *   CURSOR_API_KEY           — fallback AI via @cursor/sdk Agent.prompt
 */

import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const XPI_NAME = "zotero-syllabus.xpi";
const PUBLISH_COMMIT_RE = /^chore\(publish\):\s*release\b/i;
const SKIP_HIGHLIGHT_RE =
  /^(lint|chore(\(.*\))?|ci(\(.*\))?|build(\(.*\))?|style(\(.*\))?|test(\(.*\))?|docs(\(.*\))?)\b/i;
const SKIP_PATH_RE =
  /^(addon\/content\/tailwind(-hash)?\.css|package\.json|pnpm-lock\.yaml|.*\.(test|spec)\.[jt]sx?$)/i;

/** Map changed paths → end-user product areas (order = priority). */
const AREA_RULES = [
  {
    id: "syllabus-page",
    label: "Syllabus page",
    re: /(SyllabusPage|SyllabusItemCard|ClassGroup|PinnedSection|syllabusNote|syllabus\.ts)/i,
  },
  {
    id: "reading-schedule",
    label: "Reading Schedule",
    re: /(ReadingSchedule|ClassReadingBlock|readingItemsLayout|readingAssignment|galleryLayout)/i,
  },
  {
    id: "explorer",
    label: "Explorer",
    re: /ExplorerPage|explorerQueries/i,
  },
  {
    id: "annotations",
    label: "My Annotations",
    re: /MyAnnotations|myAnnotations|itemHighlights/i,
  },
  {
    id: "export-import",
    label: "export and import",
    re: /export|import|remapDocument/i,
  },
  {
    id: "settings",
    label: "settings",
    re: /SettingsPage|preferences|prefs\.(js|ts|d\.ts)|optionalFeatures/i,
  },
  {
    id: "guide",
    label: "user guide",
    re: /userGuide|UserGuide/i,
  },
  {
    id: "localization",
    label: "translations",
    re: /locale\/|i10n\.d\.ts/i,
  },
  {
    id: "styles",
    label: "layout and styling",
    re: /\.(css|tsx)$|zoteroPane/i,
  },
];

function parseArgs(argv) {
  let tag = "";
  let update = false;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--update") update = true;
    else if (arg === "--tag") tag = argv[++i] || "";
    else if (arg.startsWith("--tag=")) tag = arg.slice("--tag=".length);
  }
  return { tag, update };
}

function git(args, { allowFail = false } = {}) {
  try {
    return execFileSync("git", args, {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch (error) {
    if (allowFail) return "";
    throw error;
  }
}

function githubToken() {
  return process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";
}

function resolveRepository() {
  if (process.env.GITHUB_REPOSITORY) return process.env.GITHUB_REPOSITORY;
  const remote = git(["remote", "get-url", "origin"], { allowFail: true });
  const match = remote.match(/github\.com[:/](.+?)(?:\.git)?$/i);
  if (!match) throw new Error("Could not determine GITHUB_REPOSITORY");
  return match[1];
}

function listVersionTags() {
  return git(["tag", "-l", "v*", "--sort=v:refname"])
    .split("\n")
    .map((t) => t.trim())
    .filter(Boolean);
}

function previousReleaseTag(tag, tags) {
  const index = tags.indexOf(tag);
  if (index <= 0) return "";
  const isPre = tag.includes("-");
  for (let i = index - 1; i >= 0; i--) {
    if (isPre || !tags[i].includes("-")) return tags[i];
  }
  return "";
}

function commitFiles(fullHash) {
  const raw = git(
    ["show", "--pretty=format:", "--name-only", "--diff-filter=ACMR", fullHash],
    { allowFail: true },
  );
  if (!raw) return [];
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function commitBody(fullHash) {
  return git(["log", "-1", "--pretty=format:%b", fullHash], {
    allowFail: true,
  })
    .replace(/\r\n/g, "\n")
    .trim();
}

function listCommits(previousTag, tag) {
  const range = previousTag ? `${previousTag}..${tag}` : tag;
  const raw = git(["log", range, "--pretty=format:%H\t%h\t%s", "--no-merges"], {
    allowFail: true,
  });
  if (!raw) return [];
  return raw
    .split("\n")
    .map((line) => {
      const [full, short, ...rest] = line.split("\t");
      const subject = rest.join("\t").trim();
      if (!full || !subject || PUBLISH_COMMIT_RE.test(subject)) return null;
      const body = commitBody(full);
      const files = commitFiles(full);
      return { full, short, subject, body, files };
    })
    .filter(Boolean);
}

function rangeDiffStat(previousTag, tag) {
  const range = previousTag ? `${previousTag}..${tag}` : tag;
  return git(["diff", "--stat", range], { allowFail: true });
}

function areasFromPaths(paths) {
  const found = [];
  const seen = new Set();
  for (const rule of AREA_RULES) {
    const hits = paths.filter((p) => rule.re.test(p) && !SKIP_PATH_RE.test(p));
    if (hits.length === 0 || seen.has(rule.id)) continue;
    seen.add(rule.id);
    found.push({ id: rule.id, label: rule.label, files: hits.slice(0, 8) });
  }
  return found;
}

function buildChangeBrief(commits, previousTag, tag) {
  const noteworthy = commits.filter((c) => !SKIP_HIGHLIGHT_RE.test(c.subject));
  // Prefer paths from user-facing commits so lint/chore noise doesn't invent themes.
  const pathSource = noteworthy.length > 0 ? noteworthy : [];
  const paths = [
    ...new Set(
      pathSource.flatMap((c) => c.files).filter((p) => !SKIP_PATH_RE.test(p)),
    ),
  ];
  const areas = areasFromPaths(paths);
  const diffstat = rangeDiffStat(previousTag, tag)
    .split("\n")
    .filter(
      (line) =>
        line.trim() && !SKIP_PATH_RE.test(line.split("|")[0]?.trim() || ""),
    )
    .slice(0, 40)
    .join("\n");

  return { paths, areas, noteworthy, diffstat };
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return "unknown";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const digits = value >= 100 ? 0 : value >= 10 ? 1 : 2;
  return `${value.toFixed(digits)} ${units[unit]}`;
}

function formatDelta(current, previous) {
  if (!Number.isFinite(previous)) return "";
  const delta = current - previous;
  if (delta === 0) return "no change";
  const sign = delta > 0 ? "+" : "−";
  return `${sign}${formatBytes(Math.abs(delta))}`;
}

async function githubRequest(path, { method = "GET", body } = {}) {
  const token = githubToken();
  if (!token && method !== "GET") {
    throw new Error("GITHUB_TOKEN is required");
  }
  const response = await fetch(`https://api.github.com${path}`, {
    method,
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "zotero-syllabus-release-notes",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!response.ok) {
    const message =
      data?.message || text.slice(0, 500) || `HTTP ${response.status}`;
    const error = new Error(`GitHub API ${method} ${path}: ${message}`);
    error.status = response.status;
    throw error;
  }
  return data;
}

async function getReleaseByTag(repo, tag) {
  try {
    return await githubRequest(`/repos/${repo}/releases/tags/${tag}`);
  } catch (error) {
    if (error.status === 404) return null;
    throw error;
  }
}

function xpiSizeFromRelease(release) {
  const asset = release?.assets?.find((a) => a.name === XPI_NAME);
  return asset?.size;
}

function ensureSentence(text) {
  const s = String(text || "").trim();
  if (!s) return "";
  return /[.!?]$/.test(s) ? s : `${s}.`;
}

function joinLabels(labels) {
  const parts = labels.map((s) => String(s).trim()).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")}, and ${parts.at(-1)}`;
}

function stripIssueTrailer(subject) {
  return subject
    .replace(/,?\s*(closes|fixes|resolves)\s+#\d+\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function softenSubject(subject) {
  let s = stripIssueTrailer(subject);
  s = s.replace(
    /^(feat|fix|chore|improve|update|add|allow|support)(\([^)]*\))?:\s*/i,
    "",
  );
  s = s.replace(/^(fix|improve|update|add|allow|support|tweak)\s+/i, "");
  if (/^[A-Z]/.test(s) && !/^(Syllabus|Reading|Explorer|Zotero|My)\b/.test(s)) {
    s = s.charAt(0).toLowerCase() + s.slice(1);
  }
  return s;
}

function releaseLeadIn(noteworthy) {
  const subjects = noteworthy.map((c) => c.subject);
  if (subjects.some((s) => /^(fix|bugfix)\b/i.test(s))) {
    return "Fixes and polish for";
  }
  if (subjects.some((s) => /^(feat(\(.*\))?:|add|allow|support)\b/i.test(s))) {
    return "Adds";
  }
  return "Improves";
}

/**
 * Thematic fallback when no AI key is available: group by product area from
 * changed files, never dump a comma-joined list of commit subjects.
 */
function fallbackHighlights(commits, brief) {
  const { areas, noteworthy } = brief;

  if (noteworthy.length === 0) {
    return "Maintenance and tooling updates.";
  }

  // One user-facing commit → rewrite that change; don't invent a multi-area catalogue.
  if (noteworthy.length === 1) {
    const detail = softenSubject(noteworthy[0].subject);
    if (areas[0]) {
      return ensureSentence(`${areas[0].label}: ${detail}`);
    }
    return ensureSentence(`This release ${detail}`);
  }

  if (areas.length > 0) {
    const top = areas
      .filter((a) => a.id !== "styles" || areas.length === 1)
      .slice(0, 3)
      .map((a) => a.label);
    const labels = top.length > 0 ? top : areas.slice(0, 3).map((a) => a.label);
    return ensureSentence(`${releaseLeadIn(noteworthy)} ${joinLabels(labels)}`);
  }

  const themes = noteworthy
    .slice(0, 4)
    .map((c) => softenSubject(c.subject))
    .filter(Boolean);
  return ensureSentence(`Notable changes cover ${joinLabels(themes)}`);
}

/** Normalize model output to 1–3 sentences of plain prose. */
function cleanAiProse(text) {
  const lines = String(text || "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^#{1,6}\s/.test(line))
    .filter((line) => !/^(here('|’)s|summary|highlights)\b/i.test(line));
  if (lines.length === 0) return "";

  const bulletLines = lines.filter((line) => /^[-*•]\s+|^\d+\.\s+/.test(line));
  if (
    bulletLines.length > 0 &&
    bulletLines.length >= Math.ceil(lines.length / 2)
  ) {
    const items = bulletLines
      .map((line) => line.replace(/^[-*•]\s+/, "").replace(/^\d+\.\s+/, ""))
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 3);
    return items.map(ensureSentence).join(" ");
  }

  const prose = lines.join(" ").replace(/\s+/g, " ").trim();
  const sentences = prose.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [prose];
  return sentences
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 3)
    .map(ensureSentence)
    .join(" ");
}

/** Reject AI output that merely echoes commit subjects. */
function looksLikeSubjectDump(prose, commits) {
  const text = String(prose || "").toLowerCase();
  const subjects = commits
    .map((c) => stripIssueTrailer(c.subject).toLowerCase())
    .filter((s) => s.length >= 12);
  if (subjects.length === 0) return false;
  const echoed = subjects.filter((s) => text.includes(s)).length;
  return (
    echoed >= Math.min(2, subjects.length) && echoed / subjects.length >= 0.5
  );
}

function formatCommitsForPrompt(commits) {
  return commits
    .map((c) => {
      const lines = [`- ${c.subject}`];
      if (c.body) {
        const body = c.body
          .split("\n")
          .slice(0, 6)
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();
        if (body && body.length < 400) lines.push(`  notes: ${body}`);
      }
      const files = c.files.filter((p) => !SKIP_PATH_RE.test(p)).slice(0, 10);
      if (files.length) lines.push(`  files: ${files.join(", ")}`);
      return lines.join("\n");
    })
    .join("\n");
}

function buildAiUserPrompt(commits, brief) {
  const areaLines =
    brief.areas.length > 0
      ? brief.areas
          .map((a) => `- ${a.label} (${a.files.slice(0, 4).join(", ")})`)
          .join("\n")
      : "- (unclear from paths)";

  return [
    "Synthesize this Zotero Syllabus release for end users.",
    "",
    "Requirements:",
    "- Write 1–3 short sentences of fresh prose.",
    "- Group related commits into themes; describe user-visible outcomes.",
    "- Do NOT quote, list, or lightly rephrase commit subjects.",
    "- Skip chores, CI, lint, docs, dependency bumps, and internal refactors unless they change behavior users notice.",
    "- No bullets, preamble, commit hashes, or section headings.",
    "",
    "Changed product areas (from file paths):",
    areaLines,
    "",
    "Commits (context only — synthesize, do not echo):",
    formatCommitsForPrompt(commits),
    brief.diffstat
      ? `\nDiffstat (trimmed):\n${brief.diffstat.slice(0, 1500)}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}

const AI_PROSE_SYSTEM =
  "You write concise GitHub release-note highlights for Zotero Syllabus, a Zotero plugin. Synthesize themes into 1–3 short sentences of plain end-user prose. Never dump or lightly rephrase a list of commit subjects. Skip routine chores, CI, docs, lint, and internal refactors. No bullets, preamble, commit hashes, or section headings.";

async function summarizeWithOpenAI(commits, brief) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return "";
  const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.35,
      messages: [
        { role: "system", content: AI_PROSE_SYSTEM },
        { role: "user", content: buildAiUserPrompt(commits, brief) },
      ],
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      `OpenAI ${response.status}: ${data?.error?.message || "request failed"}`,
    );
  }
  return cleanAiProse(data?.choices?.[0]?.message?.content);
}

async function summarizeWithAnthropic(commits, brief) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return "";
  const model = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 400,
      temperature: 0.35,
      system: AI_PROSE_SYSTEM,
      messages: [{ role: "user", content: buildAiUserPrompt(commits, brief) }],
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      `Anthropic ${response.status}: ${data?.error?.message || "request failed"}`,
    );
  }
  const text = (data?.content || [])
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n");
  return cleanAiProse(text);
}

async function summarizeWithCursor(commits, brief) {
  const key = process.env.CURSOR_API_KEY;
  if (!key) return "";
  let Agent;
  try {
    const require = createRequire(import.meta.url);
    ({ Agent } = await import(require.resolve("@cursor/sdk")));
  } catch {
    console.warn(
      "CURSOR_API_KEY is set but @cursor/sdk is not installed; skipping Cursor summary.",
    );
    return "";
  }
  const result = await Agent.prompt(
    [
      "Do not use tools, read files, or edit anything.",
      AI_PROSE_SYSTEM,
      "",
      buildAiUserPrompt(commits, brief),
    ].join("\n"),
    {
      apiKey: key,
      model: { id: process.env.CURSOR_MODEL || "composer-2.5-fast" },
      local: { cwd: ROOT },
    },
  );
  if (result.status !== "finished") {
    throw new Error(
      `Cursor agent ${result.status}: ${result.error?.message || "no result"}`,
    );
  }
  return cleanAiProse(result.result);
}

async function buildHighlights(commits, brief) {
  if (commits.length === 0)
    return "_No code changes since the previous release._";

  const providers = [
    ["OpenAI", summarizeWithOpenAI],
    ["Anthropic", summarizeWithAnthropic],
    ["Cursor", summarizeWithCursor],
  ];
  for (const [name, fn] of providers) {
    try {
      const summary = await fn(commits, brief);
      if (!summary) continue;
      if (looksLikeSubjectDump(summary, commits)) {
        console.warn(
          `${name} summary echoed commit subjects; trying next provider / fallback`,
        );
        continue;
      }
      console.error(`AI summary via ${name}`);
      return summary;
    } catch (error) {
      console.warn(`${name} summary failed: ${error.message}`);
    }
  }
  console.error("AI summary unavailable; using thematic fallback");
  return fallbackHighlights(commits, brief);
}

function commitListMarkdown(repo, commits) {
  if (commits.length === 0) return "_None._";
  return commits
    .map(
      (c) =>
        `- [\`${c.short}\`](https://github.com/${repo}/commit/${c.full}) ${c.subject}`,
    )
    .join("\n");
}

function packageSection(tag, previousTag, currentSize, previousSize) {
  const sizeText = Number.isFinite(currentSize)
    ? `**${formatBytes(currentSize)}**`
    : "_pending upload_";
  let deltaText = "";
  if (
    Number.isFinite(currentSize) &&
    Number.isFinite(previousSize) &&
    previousTag
  ) {
    const delta = formatDelta(currentSize, previousSize);
    deltaText = delta ? ` (${delta} vs ${previousTag})` : "";
  } else if (previousTag && !Number.isFinite(previousSize)) {
    deltaText = ` (previous ${previousTag} size unavailable)`;
  }
  return `\`${XPI_NAME}\` — ${sizeText}${deltaText}`;
}

function renderNotes({
  tag,
  repo,
  previousTag,
  commits,
  currentSize,
  previousSize,
  highlights,
}) {
  return [
    "## Package",
    "",
    packageSection(tag, previousTag, currentSize, previousSize),
    "",
    "## Highlights",
    "",
    highlights,
    "",
    "## Commits",
    "",
    commitListMarkdown(repo, commits),
    "",
  ].join("\n");
}

async function main() {
  const { tag: tagArg, update } = parseArgs(process.argv.slice(2));
  const tags = listVersionTags();
  const tag =
    tagArg ||
    process.env.RELEASE_TAG ||
    (process.env.GITHUB_REF_TYPE === "tag"
      ? process.env.GITHUB_REF_NAME
      : "") ||
    tags.at(-1);
  if (!tag) throw new Error("No release tag found (pass --tag vX.Y.Z)");
  if (!tags.includes(tag)) {
    throw new Error(`Tag ${tag} not found locally. Fetch tags first.`);
  }

  const repo = resolveRepository();
  const previousTag = previousReleaseTag(tag, tags);
  const commits = listCommits(previousTag, tag);
  const brief = buildChangeBrief(commits, previousTag, tag);

  let currentSize;
  let previousSize;
  let release = null;

  try {
    release = await getReleaseByTag(repo, tag);
    currentSize = xpiSizeFromRelease(release);
    if (previousTag) {
      const previousRelease = await getReleaseByTag(repo, previousTag);
      previousSize = xpiSizeFromRelease(previousRelease);
    }
  } catch (error) {
    console.warn(`Could not load release assets: ${error.message}`);
  }

  if (update) {
    if (!release) release = await getReleaseByTag(repo, tag);
    if (!release) {
      throw new Error(
        `Release for ${tag} not found yet. Wait for the release job to finish uploading assets.`,
      );
    }
    currentSize = xpiSizeFromRelease(release) ?? currentSize;
  }

  const highlights = await buildHighlights(commits, brief);
  const body = renderNotes({
    tag,
    repo,
    previousTag,
    commits,
    currentSize,
    previousSize,
    highlights,
  });

  if (!update) {
    process.stdout.write(body);
    return;
  }

  await githubRequest(`/repos/${repo}/releases/${release.id}`, {
    method: "PATCH",
    body: { body },
  });
  console.error(`Updated release notes for ${tag}`);
  process.stdout.write(body);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
