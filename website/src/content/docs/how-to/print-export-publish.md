---
title: Print, export, and publish
description: Save a syllabus as PDF, Word, Markdown, or HTML, or publish a public link.
---

On a syllabus, the printer icon in the header opens a format menu.

## Save locally

**Save as PDF, Word, Markdown, or HTML** — including a bibliography if that option is on in Syllabus Settings / Preferences.

Use this for handouts, VLE uploads, or offline copies.

## Publish online

**Publish online** creates a public URL (HTML + attachments) on Cloudflare-hosted storage. You may be asked to authorize with your Zotero account.

:::caution[Sharing rights]
Anyone with the link can open the page and files. Only publish materials you have the right to share. Per-user storage quotas apply. Zotero public groups still do not expose attachment files.
:::

The operator must deploy the Worker in the repo’s `cloud/` folder (see [`cloud/README.md`](https://github.com/janbaykara/zotero-syllabus/blob/main/cloud/README.md) on GitHub).

## Share an item via URL

From an item’s context menu or the item pane **Share online** section, **Share via URL** publishes that item’s bibliographic details and attached files to a public link (same Cloudflare storage as syllabus publish).

When you share or **Sync changes**, a checkbox lets you **Include annotations**. If you do, the public page shows highlights and notes in [Annotation Feed](/zotero-syllabus/how-to/annotation-feed/) style — ordered by location in the document, with **Copy** and **Copy all** (using your Annotation Feed copy preferences at publish time).

:::caution[Sharing rights]
Anyone with the link can open the page, files, and any annotations you included. Only share materials you have the right to share.
:::

## What is excluded

[Class notes](/zotero-syllabus/concepts/class-notes/) stay private: they do not appear on print or publish.
