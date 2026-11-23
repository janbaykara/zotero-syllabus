---
title: Troubleshooting
description: Common problems and how to fix them.
---

## I do not see Syllabus / Gallery / Home

1. Confirm the plugin is enabled under **Tools → Plugins**.
2. Open **Preferences → Zotero Syllabus → Views** and ensure the surface is on.
3. **Syllabus** and **Gallery** appear on a **collection**; **Home** appears on the **library root**.
4. Restart Zotero after installing or updating.

## Reading-list import did nothing / incomplete

- Requires **Zotero 8+** and the **Zotero Connector**.
- Wait until the list is fully visible in the browser (SSO finished).
- Confirm the platform is [supported](/zotero-syllabus/reference/import-platforms/).
- File downloads only work for links your signed-in browser session can open.

## Class folders look wrong

If **Class subcollections** is on, do not edit those child folders by hand. Re-assign in Syllabus view, or turn the setting off. See [Auto-managed folders](/zotero-syllabus/concepts/auto-managed-folders/).

## Moving a syllabus between libraries

Do **not** use a bespoke `.syllabus` file from Settings. Export the collection with Zotero’s built-in **Zotero RDF** (collection or library export), then **File → Import…** in the destination library. The Syllabus note travels with the collection.

## Obsidian / iframe embed shows “site unreachable”

Published pages allow framing (`frame-ancestors *`). If Obsidian’s **Create embed** still fails while the same URL opens in Obsidian’s web viewer:

1. Confirm the publish URL still loads in a normal browser (unpublished or expired shares return 404).
2. Prefer a normal Markdown link; some Obsidian builds cannot iframe third-party Cloudflare Worker hosts even when framing is allowed.
3. Republish after updating the plugin so the public page is current.

## Publish failed or link missing files

- Only publish what you have rights to share.
- Attachment availability follows Zotero/group rules; public groups still do not expose attachment files the same way.
- Storage quotas apply on the publish Worker. See [Print, export, and publish](/zotero-syllabus/how-to/print-export-publish/).

When publish or **Share via URL** fails, Zotero Syllabus shows a concrete reason when it can (for example **storage quota exceeded** with how much you have used, **file too large**, sign-in expired, or a network/HTTP error). If the cause is unknown, the message includes a short technical detail in parentheses — include that text in a [bug report](https://github.com/janbaykara/zotero-syllabus/issues).

Common fixes:

- **Quota exceeded** — unpublish an old share, or turn off **Include attachments** / share fewer PDFs. See current usage under **Preferences → Zotero Syllabus → Publish online**. To request a higher quota, email [zoterosyllabus.deodorant482@passmail.net](mailto:zoterosyllabus.deodorant482@passmail.net).
- **File too large** — skip that attachment or split the share.
- **Sign-in expired / timed out** — try again; complete Zotero authorization in the browser when prompted.
- **Could not reach the publish server** — check your network and try later.

## Styling looks off on Zotero 7

Minor styling issues are expected on Zotero 7. Prefer Zotero 8, 9, or 10.

## Still stuck?

Collect steps to reproduce and ask via [Community](/zotero-syllabus/community/) (Discord or [GitHub Issues](https://github.com/janbaykara/zotero-syllabus/issues)).
