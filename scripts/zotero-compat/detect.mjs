#!/usr/bin/env node

/**
 * Compare the latest Zotero release major against addon/manifest.json
 * strict_max_version, fetch the developer changelog, and skip if a
 * zotero-compat PR is already open for that major.
 *
 * Env:
 *   GITHUB_OUTPUT, GITHUB_TOKEN, GITHUB_REPOSITORY
 *   FORCE=true          launch even if already compatible
 *   MAJOR=11            override the target major
 *   CHANGELOG_PATH      where to write changelog text
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL(".", import.meta.url)), "../..");
const VERSION_API =
  "https://www.zotero.org/download/client/version?channel=release";
const USER_AGENT = "zotero-syllabus-compat (GitHub Action)";
const CHANGELOG_MAX_CHARS = 80_000;

function parseMajor(version) {
  const match = String(version).match(/^(\d+)/);
  if (!match) {
    throw new Error(`Could not parse major version from "${version}"`);
  }
  return Number.parseInt(match[1], 10);
}

function setOutput(outputs) {
  const lines = Object.entries(outputs).map(
    ([key, value]) => `${key}=${value}`,
  );
  const text = `${lines.join("\n")}\n`;
  if (process.env.GITHUB_OUTPUT) {
    return writeFile(process.env.GITHUB_OUTPUT, text, { flag: "a" });
  }
  process.stdout.write(text);
  return Promise.resolve();
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "text/plain, text/html, */*" },
    redirect: "follow",
  });
  const body = await response.text();
  return { ok: response.ok, status: response.status, body, url: response.url };
}

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+\n/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function extractArticleText(html, major) {
  const article = html.match(/<h1[\s\S]+?<div class="zotero-docs-page-meta"/i);
  const source = article ? article[0] : html;
  const text = stripHtml(source);
  const heading = new RegExp(`Zotero\\s+${major}\\s+for\\s+Developers`, "i");
  if (!heading.test(text)) return "";
  return text;
}

async function fetchChangelog(major) {
  const page = `https://www.zotero.org/support/dev/zotero_${major}_for_developers`;
  try {
    const result = await fetchText(page);
    if (result.ok) {
      const text = extractArticleText(result.body, major);
      if (text.length >= 80) {
        const clipped =
          text.length > CHANGELOG_MAX_CHARS
            ? `${text.slice(0, CHANGELOG_MAX_CHARS)}\n\n[truncated]`
            : text;
        return {
          url: page,
          text: clipped,
          fetchedFrom: result.url,
          missing: false,
        };
      }
    }
  } catch (error) {
    console.warn(`Changelog fetch failed for ${page}:`, error);
  }

  return {
    url: page,
    text: `Developer changelog page was not available at ${page}. Search zotero-dev and the Zotero ${major} blog/wiki for plugin-facing API changes.`,
    fetchedFrom: "",
    missing: true,
  };
}

async function listOpenCompatPrs(repo, token) {
  if (!repo || !token) return [];
  const url = `https://api.github.com/repos/${repo}/issues?state=open&labels=zotero-compat&per_page=50`;
  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "User-Agent": USER_AGENT,
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (response.status === 404) return [];
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GitHub issues API ${response.status}: ${body}`);
  }
  const items = await response.json();
  return Array.isArray(items) ? items : [];
}

function prMentionsMajor(pr, major) {
  const haystack = `${pr.title ?? ""}\n${pr.body ?? ""}`;
  const patterns = [
    new RegExp(`major=${major}\\b`),
    new RegExp(`Zotero ${major}\\b`, "i"),
    new RegExp(`zotero[_ -]${major}\\b`, "i"),
  ];
  return patterns.some((pattern) => pattern.test(haystack));
}

async function main() {
  const force = /^(1|true|yes)$/i.test(process.env.FORCE ?? "");
  const majorOverride = process.env.MAJOR?.trim();
  const changelogPath = resolve(
    process.env.CHANGELOG_PATH ||
      `${process.env.RUNNER_TEMP || ROOT}/zotero-changelog.md`,
  );
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";
  const repo = process.env.GITHUB_REPOSITORY || "";

  const manifestPath = resolve(ROOT, "addon/manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const currentMax = manifest.applications?.zotero?.strict_max_version ?? "";
  const currentMaxMajor = parseMajor(currentMax);

  const versionResponse = await fetch(VERSION_API, {
    headers: { "User-Agent": USER_AGENT, Accept: "*/*" },
  });
  if (!versionResponse.ok) {
    throw new Error(
      `Zotero version API ${versionResponse.status} ${versionResponse.statusText}`,
    );
  }
  const versionText = await versionResponse.text();
  let versions;
  try {
    versions = JSON.parse(versionText);
  } catch {
    throw new Error(
      `Zotero version API returned non-JSON: ${versionText.slice(0, 200)}`,
    );
  }
  const releaseVersion =
    versions["linux-x86_64"] ||
    versions.mac ||
    Object.values(versions).find((value) => typeof value === "string");
  if (!releaseVersion) {
    throw new Error(`No platform version in ${JSON.stringify(versions)}`);
  }
  const releaseMajor = parseMajor(releaseVersion);

  const targetMajor = majorOverride ? parseMajor(majorOverride) : releaseMajor;
  const reportedVersion =
    targetMajor === releaseMajor ? releaseVersion : `${targetMajor}.0.0`;

  let shouldRun = true;
  let skipReason = "";

  if (targetMajor <= currentMaxMajor && !force) {
    shouldRun = false;
    skipReason = `Already compatible with Zotero ${currentMaxMajor} (strict_max_version ${currentMax}; release ${releaseVersion}).`;
  }

  if (shouldRun) {
    const prs = await listOpenCompatPrs(repo, token);
    const existing = prs.find((pr) => prMentionsMajor(pr, targetMajor));
    if (existing) {
      shouldRun = false;
      skipReason = `Open PR #${existing.number} already tracks Zotero ${targetMajor}.`;
    }
  }

  const changelog = await fetchChangelog(targetMajor);
  await mkdir(dirname(changelogPath), { recursive: true });
  await writeFile(changelogPath, changelog.text, "utf8");

  console.log(
    JSON.stringify(
      {
        currentMax,
        currentMaxMajor,
        releaseVersion,
        releaseMajor,
        targetMajor,
        shouldRun,
        skipReason,
        changelogUrl: changelog.url,
        changelogMissing: changelog.missing,
        changelogPath,
      },
      null,
      2,
    ),
  );

  await setOutput({
    should_run: shouldRun ? "true" : "false",
    major: String(targetMajor),
    release_version: reportedVersion,
    current_max: currentMax,
    skip_reason: skipReason.replace(/\n/g, " "),
    changelog_path: changelogPath,
    changelog_url: changelog.url,
    changelog_missing: changelog.missing ? "true" : "false",
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
