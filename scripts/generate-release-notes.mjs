#!/usr/bin/env node
/**
 * Build (and optionally publish) GitHub release notes for a tag:
 * - XPI attachment size and delta vs the previous release
 * - AI summary of key changes (OpenAI / Anthropic / Cursor, with commit fallback)
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
      return {
        full,
        short,
        subject: rest.join("\t").trim(),
      };
    })
    .filter((c) => c.full && c.subject && !PUBLISH_COMMIT_RE.test(c.subject));
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

function fallbackHighlights(commits) {
  const picks = commits
    .map((c) => c.subject)
    .filter((s) => !SKIP_HIGHLIGHT_RE.test(s))
    .slice(0, 8);
  if (picks.length === 0) {
    return commits.slice(0, 5).map((c) => `- ${c.subject}`);
  }
  return picks.map((s) => `- ${s}`);
}

function cleanAiBullets(text) {
  const lines = String(text || "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^#{1,6}\s/.test(line))
    .filter((line) => !/^(here('|’)s|summary|highlights)\b/i.test(line));
  const bullets = lines
    .map((line) => line.replace(/^[-*•]\s+/, "").replace(/^\d+\.\s+/, ""))
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 8)
    .map((line) => `- ${line}`);
  return bullets.length ? bullets.join("\n") : "";
}

async function summarizeWithOpenAI(commits) {
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
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You write concise GitHub release notes for Zotero Syllabus, a Zotero plugin. Reply with 3–6 markdown bullets only. User-facing language. No preamble, no commit hashes, no section headings.",
        },
        {
          role: "user",
          content: `Summarize the key changes in this release:\n\n${commits
            .map((c) => `- ${c.subject}`)
            .join("\n")}`,
        },
      ],
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      `OpenAI ${response.status}: ${data?.error?.message || "request failed"}`,
    );
  }
  return cleanAiBullets(data?.choices?.[0]?.message?.content);
}

async function summarizeWithAnthropic(commits) {
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
      temperature: 0.2,
      system:
        "You write concise GitHub release notes for Zotero Syllabus, a Zotero plugin. Reply with 3–6 markdown bullets only. User-facing language. No preamble, no commit hashes, no section headings.",
      messages: [
        {
          role: "user",
          content: `Summarize the key changes in this release:\n\n${commits
            .map((c) => `- ${c.subject}`)
            .join("\n")}`,
        },
      ],
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
  return cleanAiBullets(text);
}

async function summarizeWithCursor(commits) {
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
      "Reply with 3–6 markdown bullets only summarizing these commits for Zotero Syllabus end users.",
      "No preamble, hashes, or headings.",
      "",
      ...commits.map((c) => `- ${c.subject}`),
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
  return cleanAiBullets(result.result);
}

async function buildHighlights(commits) {
  if (commits.length === 0)
    return "_No code changes since the previous release._";

  const providers = [
    ["OpenAI", summarizeWithOpenAI],
    ["Anthropic", summarizeWithAnthropic],
    ["Cursor", summarizeWithCursor],
  ];
  for (const [name, fn] of providers) {
    try {
      const summary = await fn(commits);
      if (summary) {
        console.error(`AI summary via ${name}`);
        return summary;
      }
    } catch (error) {
      console.warn(`${name} summary failed: ${error.message}`);
    }
  }
  console.error("AI summary unavailable; using commit subjects");
  return fallbackHighlights(commits).join("\n");
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

  const highlights = await buildHighlights(commits);
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
