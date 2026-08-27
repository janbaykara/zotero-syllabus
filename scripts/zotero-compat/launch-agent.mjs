#!/usr/bin/env node

/**
 * Substitute the Zotero compat prompt and create a Cursor cloud agent.
 *
 * Env:
 *   CURSOR_API_KEY, GITHUB_REPOSITORY, GITHUB_OUTPUT, GITHUB_STEP_SUMMARY
 *   MAJOR, RELEASE_VERSION, AGENT_PROMPT, CHANGELOG_PATH
 *   STARTING_REF (default main)
 */

import { randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createAgent, createRun } from "./cursor-api.mjs";

const ROOT = resolve(fileURLToPath(new URL(".", import.meta.url)), "../..");

async function appendOutput(outputs) {
  const text = `${Object.entries(outputs)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n")}\n`;
  if (process.env.GITHUB_OUTPUT) {
    await writeFile(process.env.GITHUB_OUTPUT, text, { flag: "a" });
  }
  process.stdout.write(text);
}

async function appendSummary(markdown) {
  if (!process.env.GITHUB_STEP_SUMMARY) {
    process.stdout.write(markdown);
    return;
  }
  await writeFile(process.env.GITHUB_STEP_SUMMARY, markdown, { flag: "a" });
}

async function main() {
  const apiKey = process.env.CURSOR_API_KEY;
  const major = process.env.MAJOR;
  const releaseVersion = process.env.RELEASE_VERSION || `${major}.0.0`;
  const repo = process.env.GITHUB_REPOSITORY;
  const startingRef = process.env.STARTING_REF || "main";
  const promptPath = resolve(
    process.env.AGENT_PROMPT ||
      `${ROOT}/.github/prompts/zotero-major-compat.md`,
  );
  const changelogPath = process.env.CHANGELOG_PATH;

  if (!major) throw new Error("MAJOR is required");
  if (!repo) throw new Error("GITHUB_REPOSITORY is required");
  if (!changelogPath) throw new Error("CHANGELOG_PATH is required");

  const [template, changelog] = await Promise.all([
    readFile(promptPath, "utf8"),
    readFile(resolve(changelogPath), "utf8"),
  ]);

  const agentId = `bc-${randomUUID()}`;
  const prompt = template
    .replaceAll("{{MAJOR}}", major)
    .replaceAll("{{RELEASE_VERSION}}", releaseVersion)
    .replaceAll("{{AGENT_ID}}", agentId)
    .replaceAll("{{REPO}}", repo)
    .replaceAll("{{CHANGELOG}}", changelog);

  const payload = {
    name: `Zotero ${major} compat`,
    prompt: { text: prompt },
    repos: [
      {
        url: `https://github.com/${repo}`,
        startingRef,
      },
    ],
    autoCreatePR: false,
  };

  let result;
  try {
    result = await createAgent(apiKey, { ...payload, agentId });
  } catch (error) {
    console.warn(
      "Create with client-supplied agentId failed; retrying without it.",
      error,
    );
    result = await createAgent(apiKey, {
      ...payload,
      envVars: { CI: "true" },
    });
    const minted = result.agent?.id;
    if (minted) {
      await createRun(
        apiKey,
        minted,
        `Your Cursor agent id is ${minted}. When you open the PR, the HTML comment must be exactly: <!-- zotero-compat major=${major} agent=${minted} -->`,
      );
    }
  }

  const id = result.agent?.id || agentId;
  const url = result.agent?.url || `https://cursor.com/agents/${id}`;

  await appendOutput({
    agent_id: id,
    agent_url: url,
    run_id: result.run?.id ?? "",
  });

  await appendSummary(
    [
      `## Zotero ${major} compatibility agent`,
      "",
      `- Release: \`${releaseVersion}\``,
      `- Agent: [${id}](${url})`,
      `- autoCreatePR: false (agent opens the PR only after \`pnpm lint:fix\`, \`pnpm build\`, and \`pnpm test\` pass)`,
      "",
    ].join("\n"),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
