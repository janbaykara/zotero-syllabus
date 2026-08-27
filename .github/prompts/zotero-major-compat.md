You are updating the Zotero Syllabus plugin (`{{REPO}}`) for **Zotero {{MAJOR}}** (release `{{RELEASE_VERSION}}`).

Work on a new branch from `main`. Do **not** tag, do **not** run `pnpm release`, and do **not** merge to `main`.

Your Cursor agent id is `{{AGENT_ID}}`. You must include this HTML comment unchanged in the pull request body:

```
<!-- zotero-compat major={{MAJOR}} agent={{AGENT_ID}} -->
```

## Required code changes

1. In `addon/manifest.json`, set `applications.zotero.strict_max_version` to `{{MAJOR}}.0.*`.
2. Patch-bump the plugin version in `package.json` (for example `1.3.2` → `1.3.3`). This is required so a GitHub release can be published after merge. Do not bump major/minor unless behavior changes.
3. Update user-facing Zotero version strings in `README.md` only:
   - The badge on line 3 (`Zotero-7%2F8%2F9%2F10` → include `{{MAJOR}}`)
   - The install note (“Zotero 8, 9, or 10”)
   - Requirements (“8–10 recommended”)
   - Leave `doc/README-zhCN.md` and `doc/README-frFR.md` alone.
4. Read the developer changelog below. Grep this plugin’s Zotero API usage (`src/utils/zotero.ts` collection APIs, `src/hooks.ts` `Zotero.Server.Endpoints`, translators, file picker, notes, `src/modules/`). Patch **only** APIs this plugin actually calls.
5. Add Mocha tests under `test/` for changelog APIs this plugin uses. Follow `test/startup.test.ts` (chai `assert`, live Zotero via zotero-plugin-scaffold).
6. Do not drop Zotero 7 or change the esbuild `firefox115` target in `zotero-plugin.config.ts` unless the changelog forces it.
7. Do not bump `zotero-plugin-toolkit` or `zotero-types` unless the plugin cannot run without it (Renovate handles routine upgrades).

## Hard gate: local CI rehearsal (must pass before any PR)

After your code changes, loop this trio until **all three** succeed:

```sh
pnpm lint:fix
pnpm build
export CI=true
pnpm test
```

`pnpm test` downloads headless Zotero Linux beta the same way GitHub Actions does. Set `CI=true` before it.

If a step fails: read the output, fix, commit if needed, and re-run the **full** trio. Do **not** open a pull request while lint, build, or test is red. Pushing the branch without a PR is acceptable if you are stuck after several genuine fix attempts.

## Open the PR only after the trio is green

```sh
gh pr create --base main --title "chore(compat): support Zotero {{MAJOR}}" --body "$(cat <<'EOF'
<!-- zotero-compat major={{MAJOR}} agent={{AGENT_ID}} -->

Support Zotero {{MAJOR}} (`{{RELEASE_VERSION}}`).

- Bump `strict_max_version` to `{{MAJOR}}.0.*`
- Patch-bump plugin version
- Adapt plugin APIs from the Zotero {{MAJOR}} developer changelog
- Local `pnpm lint:fix`, `pnpm build`, and `pnpm test` passed

Developer notes: https://www.zotero.org/support/dev/zotero_{{MAJOR}}_for_developers
EOF
)"
```

Use a conventional commit such as `chore(compat): support Zotero {{MAJOR}}`.

## Developer changelog for Zotero {{MAJOR}}

{{CHANGELOG}}
