#!/usr/bin/env node
/**
 * Copy `$ROOT_WORKTREE_PATH/.env` into this worktree and expand `~` in
 * Zotero path vars. dotenv/Node do not expand `~`, so a literal `~/...`
 * becomes a cwd-relative folder named `~` (blank profile + real library).
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const dest = ".env";
if (existsSync(dest)) process.exit(0);

const root = process.env.ROOT_WORKTREE_PATH;
if (!root) process.exit(0);

const src = join(root, ".env");
if (!existsSync(src)) process.exit(0);

const keys = "ZOTERO_PLUGIN_(?:ZOTERO_BIN_PATH|PROFILE_PATH|DATA_DIR)";
const pattern = new RegExp(`^(${keys}\\s*=\\s*)("?)([^"\\n]*)\\2`, "gm");

writeFileSync(
  dest,
  readFileSync(src, "utf8").replace(pattern, (_match, prefix, quote, value) => {
    const expanded = expandUserPath(value.trim());
    const q = quote || (expanded.includes(" ") ? '"' : "");
    return `${prefix}${q}${expanded}${q}`;
  }),
);

function expandUserPath(value) {
  if (!value) return value;
  if (value === "~") return homedir();
  if (value.startsWith("~/") || value.startsWith("~\\")) {
    return homedir() + value.slice(1);
  }
  return value;
}
