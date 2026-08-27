#!/usr/bin/env node

/**
 * If the failed CI run belongs to a zotero-compat PR, resume the Cursor
 * agent once with the failed logs.
 *
 * Env:
 *   CURSOR_API_KEY, GITHUB_TOKEN, GITHUB_REPOSITORY
 *   HEAD_SHA, RUN_ID
 */

import { execFileSync } from "node:child_process";

import { createRun } from "./cursor-api.mjs";

const USER_AGENT = "zotero-syllabus-compat (GitHub Action)";
const RETRY_MARKER = "<!-- compat-ci-retry -->";
const AGENT_COMMENT_RE =
  /<!--\s*zotero-compat\s+major=\d+\s+agent=(bc-[0-9a-fA-F-]+)\s*-->/;
const LOG_LIMIT = 32_000;

function gh(args, { allowFail = false } = {}) {
  try {
    return execFileSync("gh", args, {
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024,
      env: { ...process.env, GH_TOKEN: process.env.GITHUB_TOKEN },
    });
  } catch (error) {
    if (allowFail) {
      return `${error.stdout ?? ""}${error.stderr ?? ""}`;
    }
    throw error;
  }
}

async function githubJson(path) {
  const response = await fetch(`https://api.github.com${path}`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      "User-Agent": USER_AGENT,
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!response.ok) {
    throw new Error(
      `GitHub ${path} ${response.status}: ${await response.text()}`,
    );
  }
  return response.json();
}

function isCompatPr(pr) {
  const labels = (pr.labels ?? []).map((label) =>
    typeof label === "string" ? label : label.name,
  );
  if (labels.includes("zotero-compat")) return true;
  return /zotero-compat/.test(`${pr.title ?? ""}\n${pr.body ?? ""}`);
}

async function main() {
  const repo = process.env.GITHUB_REPOSITORY;
  const sha = process.env.HEAD_SHA;
  const runId = process.env.RUN_ID;
  const apiKey = process.env.CURSOR_API_KEY;

  if (!repo || !sha || !runId) {
    throw new Error("GITHUB_REPOSITORY, HEAD_SHA, and RUN_ID are required");
  }
  if (!apiKey) {
    console.log("CURSOR_API_KEY is not set; skipping CI retry.");
    return;
  }

  let pulls = [];
  try {
    pulls = await githubJson(`/repos/${repo}/commits/${sha}/pulls`);
  } catch (error) {
    console.warn(`commits/${sha}/pulls failed:`, error);
  }
  let pr = (Array.isArray(pulls) ? pulls : []).find(isCompatPr);
  if (!pr) {
    const listed = JSON.parse(
      gh([
        "pr",
        "list",
        "--repo",
        repo,
        "--state",
        "open",
        "--json",
        "number,title,body,labels,headRefOid",
      ]),
    );
    pr = listed.find(
      (candidate) => candidate.headRefOid === sha && isCompatPr(candidate),
    );
  }
  if (!pr) {
    console.log(`No zotero-compat PR for ${sha}; skipping.`);
    return;
  }

  const body = pr.body ?? "";
  const agentMatch = body.match(AGENT_COMMENT_RE);
  if (!agentMatch) {
    console.log(
      `PR #${pr.number} has no cursor agent id in the body; skipping.`,
    );
    return;
  }
  const agentId = agentMatch[1];

  const comments = await githubJson(
    `/repos/${repo}/issues/${pr.number}/comments`,
  );
  if (
    Array.isArray(comments) &&
    comments.some((comment) => (comment.body ?? "").includes(RETRY_MARKER))
  ) {
    console.log(`PR #${pr.number} already has a compat-ci-retry; skipping.`);
    return;
  }

  let logs = gh(
    ["run", "view", String(runId), "--repo", repo, "--log-failed"],
    { allowFail: true },
  );
  if (logs.length > LOG_LIMIT) {
    logs = `${logs.slice(-LOG_LIMIT)}\n\n[truncated to last ${LOG_LIMIT} chars]`;
  }

  const prompt = [
    `GitHub Actions CI failed on PR https://github.com/${repo}/pull/${pr.number} (run ${runId}).`,
    "Fix the failures, then re-run this loop until all three succeed:",
    "1. pnpm lint:fix",
    "2. pnpm build",
    "3. export CI=true && pnpm test",
    "Do not open another PR. Push onto the existing branch.",
    "Do not tag or run pnpm release.",
    "",
    "Failed CI logs:",
    "```",
    logs || "(no failed-job logs available)",
    "```",
  ].join("\n");

  const result = await createRun(apiKey, agentId, prompt);
  const runUrl = `https://cursor.com/agents/${agentId}`;

  const comment = [
    RETRY_MARKER,
    `Resumed Cursor agent [\`${agentId}\`](${runUrl}) with the failed CI logs.`,
    "This Action retries once per compatibility PR.",
  ].join("\n");

  gh(["pr", "comment", String(pr.number), "--repo", repo, "--body", comment]);
  console.log(
    `Resumed ${agentId} for PR #${pr.number} (${result.run?.id ?? "run started"})`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
