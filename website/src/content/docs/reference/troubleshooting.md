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

## Publish failed or link missing files

- Only publish what you have rights to share.
- Attachment availability follows Zotero/group rules; public groups still do not expose attachment files the same way.
- Storage quotas apply on the publish Worker. See [Print, export, and publish](/zotero-syllabus/how-to/print-export-publish/).

## Styling looks off on Zotero 7

Minor styling issues are expected on Zotero 7. Prefer Zotero 8, 9, or 10.

## Still stuck?

Collect steps to reproduce and ask on [Discord](https://discord.gg/PtEY5DxCea) or open a [GitHub issue](https://github.com/janbaykara/zotero-syllabus/issues).
