---
title: For developers
description: Contribute to Zotero Syllabus — architecture docs and local setup.
---

Contributions are welcome via pull request on [GitHub](https://github.com/janbaykara/zotero-syllabus).

## Architecture

End-user behaviour is documented on this site. Storage formats, item merges, class folders, reading-list translators, and release commands live in the repo:

- [`doc/TECHNICAL.md`](https://github.com/janbaykara/zotero-syllabus/blob/main/doc/TECHNICAL.md)

## Local development

1. Clone the repository.
2. `pnpm install`
3. Copy `.env.example` to `.env` and set your Zotero path.
4. `pnpm start`

Requires Zotero 7+ (8–10 recommended), Node.js LTS, Git, and pnpm. The plugin is built with [zotero-plugin-template](https://github.com/windingwind/zotero-plugin-template) / scaffold.

## This documentation site

Sources live in [`website/`](https://github.com/janbaykara/zotero-syllabus/tree/main/website) (Astro Starlight). From the repo root:

```bash
pnpm docs:dev    # local preview
pnpm docs:build  # static build for GitHub Pages
```

After changing docs, open a PR; GitHub Actions deploys from `main`.
