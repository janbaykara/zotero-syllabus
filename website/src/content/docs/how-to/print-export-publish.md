---
title: Print, export, and publish
description: Save a syllabus or reading list as PDF, Word, Markdown, or HTML, or publish a public link.
---

On Syllabus, the printer icon in the header opens a format menu (PDF, Word, Markdown, HTML, or publish online). On Gallery, the globe icon publishes online only. You can also right-click a collection → **Share via URL**. Collection descriptions (Syllabus note blurb, or Gallery’s **Add a description…** on the Personal Reading Order note) appear at the top of the exported or published page.

## Save locally

**Save as PDF, Word, Markdown, or HTML** — including a bibliography if that option is on in Syllabus Settings / Preferences (syllabus exports).

Use this for handouts, VLE uploads, or offline copies.

## Publish online

**Publish online** creates a public URL on Cloudflare-hosted storage. You may be asked to authorize with your Zotero account. Each collection has **one** public link; republishing replaces that page.

A short wizard walks through:

1. **Format** — Syllabus (class-structured) or personal reading list (Gallery), when both apply. Defaults to the view you opened share from.
2. **View options** — under **Default view options**: layout (including Cover), sort, grouping, density, and related settings. Syllabus shares can use Cover, Card, Preview, or Annotations layouts as well as a reading list. Defaults match your current view; change them for the public page only. **Card** layout matches the in-app cards: each density shows title + author · year on one line; **Standard** / **Expanded** also show a citation line below (and Expanded uses cover art). Optional reading instructions and PDF / EPUB / URL icons sit on the card when available. **Preview** uses a vertical cover + blurb list (items without an abstract appear as covers, like Annotations’ empty items). Cover keeps the gallery tile grid. Under **Published data**: optionally **include attachments** (on by default) and **include annotations**. A bibliography is always included at the bottom of the public page. Recipients can still adjust layout and sort from a **⋯** menu next to citation **Downloads** (your library is unchanged). When grouping by tags, **Include automatic tags** is available and defaults off.

:::caution[Sharing rights]
Anyone with the link can open the page and files (and annotations if you included them). Only local file attachments are uploaded — URL-only links (and missing files) are not; those items open the webpage URL instead when available. The [Zotero Connector](https://www.zotero.org/download/connectors) can save the bibliography as multiple items (folder icon) from a published syllabus or gallery, and can save a single shared item page. Only publish materials you have the right to share. Per-user storage quotas apply. Zotero public groups still do not expose attachment files.
:::

After publish, a banner shows the public link with **Sync changes** (re-uploads using your last wizard choices when you are still in the same format — Syllabus or reading list — as last published; otherwise the wizard opens again) and **Unpublish**.

The operator must deploy the Worker in the repo’s `cloud/` folder (see [`cloud/README.md`](https://github.com/janbaykara/zotero-syllabus/blob/main/cloud/README.md) on GitHub).

## Share an item via URL

From an item’s context menu or the item pane **Share online** section, **Share via URL** publishes that item’s bibliographic details and attached files to a public link (same Cloudflare storage as collection publish). The cover uses the same book / document treatments as Gallery and published collections. Pages include citation metadata so the Zotero Connector can save the item.

When you share or **Sync changes**, a checkbox lets you **Include annotations**. If you do, the public page shows highlights and notes in [Annotation Feed](/zotero-syllabus/how-to/annotation-feed/) style — ordered by location in the document, with **Copy** and **Copy all** (using your Annotation Feed copy preferences at publish time).

:::caution[Sharing rights]
Anyone with the link can open the page, files, and any annotations you included. Only share materials you have the right to share.
:::

## What is excluded

These stay private and are never included on print or publish:

- [Class notes](/zotero-syllabus/concepts/class-notes/)
- Reader-mode checkboxes and done / read status
- [Gallery notes](/zotero-syllabus/how-to/gallery/#gallery-notes) on items
