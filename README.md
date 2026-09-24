# Zotero Syllabus

[![zotero target version](https://img.shields.io/badge/Zotero-7%2F8%2F9%2F10-green?style=flat-square&logo=zotero&logoColor=CC2936)](https://www.zotero.org)

A Zotero add-on / plugin that turns your collections into syllabi and course reading lists. Order items by class, browse them in Gallery, keep a Home of what to open next, follow due dates on Reading Schedule, and review highlights in Annotation Feed.

Changing the plugin? Architecture, storage, and local development are in **[doc/TECHNICAL.md](doc/TECHNICAL.md)**. UI strings must go through Fluent (`addon/locale/`); see the [localization](doc/TECHNICAL.md#localization) section.

## How to install

1. [Download the extension file (.xpi)](https://github.com/janbaykara/zotero-syllabus/releases/latest/download/zotero-syllabus.xpi).
2. In the Zotero menu bar, go to `Tools` → `Plugins` (or `Add-ons`)
3. Click the gear icon in the top right corner and select `Install Plugin From File...`
4. Select the downloaded `.xpi` file
5. (Ensure auto-updating is enabled for this add-on too!)
6. Restart Zotero!

> [!NOTE]
> For best results, use [Zotero 8, 9, or 10](https://www.zotero.org/download/). Zotero 7 works but has some minor styling issues.

The plugin UI follows **Zotero’s language** (Settings → General → Language). Besides English and Simplified Chinese, that includes Brazilian and European Portuguese, German, Spanish, French, Italian, Japanese, Korean, Traditional Chinese, Dutch, Polish, Turkish, Arabic, Indonesian, Russian, Ukrainian, and Vietnamese.

![Syllabus view](doc/images/Aug-31-2026%2014-56-18.gif)

![Reading schedule view](doc/images/reading.png)

![Gallery view](doc/images/gallery.png)

## Can YOU spare 15 minutes to tell me how you're using the tool?

A message from Jan, the software developer:

> Hey all! According to Github over 350+ people have downloaded the extension so far. Great!
>
> To help improve the plugin for students, would you be up for a quick 15 min Zoom call? ([Here's the booking link.](https://calendly.com/janbaykara-pm/30min)) We'd talk through how you're using the tool, how you found getting started, and what could be improved to improve studying with Zotero.
>
> I'm particularly interested to improve the onboarding / documentation / accessibility of the tool, but your thoughts might also help shape new features! I'll be listening as a software developer, as a fellow student, and as student of pedagogy in particular!
>
> If you can spare 15 minutes, here's a booking link: https://calendly.com/janbaykara-pm/30min - Pick a slot and I look forward to chatting!
>
> — Jan :)

## Discussion

- For **bug reports** and **feature requests**, please use the [GitHub Issues](https://github.com/janbaykara/zotero-syllabus/issues) page.
- For **general discussion**, please use the [Zotero Forum Thread](https://forums.zotero.org/discussion/128688/zotero-syllabus-a-plugin-for-managing-your-uni-course-reading-lists) or [Reddit Thread](https://www.reddit.com/r/zotero/comments/1puxigg/zotero_syllabus_a_plugin_for_managing_your_uni/).

## Show your thanks by donating 🙏🇵🇸🕊️

If this project is useful to you, [Buy Me a Coffee](https://buymeacoffee.com/janbaykara) and I will regularly donate proceeds to third party funds, including those that help keep **Gaza's universities, students, and academic life alive** during reconstruction, following the genocide of the Palestinian people by the Israeli-American occupation:

- **ISNAD — Emergency Fund for Gaza’s Universities (via Taawon / Welfare Association)**  
  Primary Palestinian-led programme supporting scholarships, staff, and core university operations.  
  https://taawon.org/en/isnad

- **BRISMES Fund for Higher Education in Gaza**  
  A UK academic-society fund that channels small donations in line with the priorities of Gaza’s Emergency Committee of Universities.  
  https://www.gofundme.com/f/brismes-fund-for-higher-education-in-gaza

- **Friends of Palestinian Universities (FoPU / Fobzu)**  
  Long-standing UK charity supporting Palestinian universities, including emergency work for Gaza.  
  https://fobzu.org

- **BuildPalestine — Gaza Education & Community Projects**  
  Palestinian-run crowdfunding platform that vets and supports grassroots education initiatives.  
  https://buildpalestine.com

Supporting these funds helps sustain students, staff, research, and educational infrastructure — the foundations for rebuilding Gaza’s higher-education system.

_Thank you for contributing in solidarity._

## User manual

In Zotero, open this page anytime from **Help → Zotero Syllabus Documentation**. For a short walkthrough in the app, use **Help → Open Zotero Syllabus User Guide**.

The plugin has five surfaces. Turn each on or off in **Preferences → Zotero Syllabus → Views**.

1. [Syllabus](#syllabus) — structure a collection by class.
2. [Reading Schedule](#reading-schedule) — due dates across all your syllabi.
3. [Gallery](#gallery) — browse a collection as covers, cards, or a magazine.
4. [Home](#home) — library shelves for what to open next.
5. [Annotation Feed](#annotation-feed) — your highlights in one timeline.

Shared tools that show up on more than one surface: [Pinning](#pinning), [Gallery notes](#gallery-notes). You can also [import a reading list](#import-a-reading-list) from the browser.

### Getting around

- On a **collection**, the items toolbar switches **Table / Gallery / Syllabus**. A new collection says **Turn into Syllabus** until you create one. Auto-managed folders (Reading Schedule, class folders) use **Checklist** instead of Syllabus.
- On the **library root**, the same control switches **Table / Home**.
- **Reading Schedule** and **Annotation Feed** open as their own tabs (toolbar buttons, or **Go to…** from Home shelves).
- Settings that apply everywhere live in **Preferences → Zotero Syllabus** (default density, default Gallery layout, quote-copy options, and more).

### Syllabus

Structure a collection by class (or week / session — you choose the word). Assign readings, set priorities and instructions, drag items into place, and export or publish the list.

![Syllabus module interface showing class organization](doc/images/classes.png)

#### Open a syllabus

1. Select the collection.
2. Click **Turn into Syllabus** (first time) or **Syllabus** in the items toolbar.

#### Classes and assignments

Add classes with **Add Class**, or right-click an item → **Assign to class** → **Add to new class**.

Then assign readings by:

- Dragging an item onto a class in Syllabus view.
- Right-click → **Assign to class** and picking the class.

An item can be assigned more than once (useful for breaking a long reading into chunks). Hover an item in Syllabus view and use **Duplicate**. If you merge duplicate items in Zotero, the surviving item keeps its class assignment.

Unassigned items stay under **Further reading**.

Give each class a title, description, and optional [reading date](#reading-schedule). Mark a class or an item **done** to track what you have already read.

![Reading schedule view with reading status](doc/images/checkboxes.png)

#### Course documents

Give items the **Course Information** priority (or your own top priority) so handouts and links stay at the top of the syllabus. This is not the same as [pinning](#pinning) an item to Home or Reading Schedule.

![Syllabus module interface showing class organization](doc/images/module.png)

#### Reading instructions, priority, and done

Use the **Reading assignments** section in the item pane to set class, instruction, priority, and done status.

![Editing pane showing class number, instruction, and priority](doc/images/editing.png)

Right-click an item to change class or priority without opening the pane.

![Context menu showing syllabus operations](doc/images/right-click.png)

Default priorities are Essential, Recommended, Optional, and Course Information. Edit names, colors, and order in Syllabus **Settings**, or set library-wide defaults in Preferences.

#### Reorder and move

![Manual reordering demonstration](doc/images/reorder.gif)

Drag to reorder within a class, or reset to natural order. Drag between classes to move an assignment.

![Drag and drop functionality demonstration](doc/images/drag-drop.gif)

In **Table** view, a sortable **Syllabus Class / Assignment** column summarises class, priority, and status. Sort by it to see readings in syllabus order.

![Standard Zotero list view](doc/images/list.png)

#### Settings, lock, and class folders

The header has **Settings** (nomenclature such as week / class / session, priorities, bibliography, class subcollections), **Lock** (read-only for studying), **Print**, and [Pin collection](#pinning).

**Class subcollections** is off by default. When on, the plugin creates a child folder per class and keeps membership in sync. Do not add or remove items in those folders by hand. Leave this off unless you want folder mirrors.

If the [Zotero Reading List](https://github.com/Dominic-DallOsto/zotero-reading-list) plugin is installed, its reading status appears in Syllabus view.

#### Save, print, and publish

The printer icon opens a format menu:

- **Save as PDF, Word, Markdown, or HTML** — including a bibliography if that option is on.
- **Publish online** — a public URL (HTML + attachments) on Cloudflare-hosted storage. You may be asked to authorize with your Zotero account. Anyone with the link can open the page and files; only publish materials you have the right to share. The operator must deploy the Worker in [`cloud/`](cloud/) (see [`cloud/README.md`](cloud/README.md)). Per-user storage quotas apply. Zotero public groups still do not expose attachment files.

You can also [import a reading list](#import-a-reading-list) from Talis, Leganto, and other platforms.

### Reading Schedule

A calendar of class due dates across your syllabi, so you can see what is due this week and next.

Enable it in **Preferences → Zotero Syllabus → Views**, then open the **Reading Schedule** tab (or **Go to Reading Schedule** from the Home deadlines shelf).

![Reading schedule](doc/images/reading.png)

1. In Syllabus view, set a **reading date** on a class.

   ![Reading schedule view with due date](doc/images/scheduling.png)

2. Those classes appear on the schedule, grouped by week and date. Sticky week / date / class headers stay visible as you scroll.
3. The same Card / Cover / Magazine / Annotations layouts as [Gallery](#gallery) are available from the header menu.
4. A **[Pinned](#pinning)** section sits above the calendar.

Optional: **Preferences → Zotero Syllabus → Generate a “Reading Schedule” collection** creates an auto-managed folder tree for upcoming dates (and a `Pinned` child folder). Do not add or remove items there by hand; turn the pref off to delete that collection. Syllabus items stay in place.

### Gallery

Browse one collection as covers, cards, a magazine spread, or an annotation stream. Switch with **Gallery** in the items toolbar.

![Gallery view with book covers and reading progress](doc/images/gallery.png)

Covers come from attached images, EPUB/PDF art, ISBN lookups, or type-specific placeholders. Reading progress shows when available. If Zotero’s **Show Items from Subcollections** is on, those items are included.

Open **View options** from the `(view / sort / group)` control in the header. Choices are stored per collection. The globe button (**Save as default**) copies the current choice to collections that have not set their own. When you group items, a pill strip under the title jumps to each section.

Click a cover or card to select it in Zotero; double-click opens the best attachment.

#### View modes

- **Cover** — artwork in a grid. Best for scanning books, papers, and web pages at a glance.
- **Card** — the same syllabus item cards, in a narrower reading column. **Density** (Row / Standard / Expanded) is available in this mode.
- **Magazine** — mixed-size tiles with titles, blurbs, and [Gallery notes](#gallery-notes). **Packing** chooses the spread:
  - **Vertical** — covers with abstracts in a reading stack (narrow column).
  - **Grid** — equal-size magazine tiles across the pane.
  - **Packed** — mixed-size tiles, like a contents page.
- **Annotations** — covers with every highlight and note on the item. **Quotes** orders those excerpts by location in the document or by date added. Check **Show items with no annotations** to keep items without highlights in the list.

#### Sort

- **Auto** — collection order, or syllabus class order on a syllabus.
- **A–Z** — title.
- **Date** — item date, newest first.
- **Added** — date added, newest first.
- **Last Read** — most recently opened first.

#### Group by

- **None** — one continuous list.
- **Automatic** — Magazine only; builds shelves from classes, child collections, and frequent tags.
- **Type** — books, journal articles, web pages, and so on.
- **Creator**
- **Tags**
- **Collections** — child collections (when this folder has any).
- **Classes** — syllabus collections only.

#### Gallery notes

A Gallery note is a short, collection-specific caption on an item — a reminder, a why-this-matters line, or a quote next to the cover. It is not a normal Zotero note, a [reading instruction](#reading-instructions-priority-and-done), or a pin [intention](#intention-notes).

The note belongs to **this collection**. The same item in another collection can have a different Gallery note, or none.

1. Select the collection (Table or Gallery).
2. Right-click an item → **Add Gallery Note** (or **Edit Gallery Note**).
3. Write in Zotero’s note editor.

Click a Gallery note on a card, cover, or magazine tile to open it. Right-click → **Remove Gallery Note** deletes only this collection’s Gallery note.

How it looks: under the title on **Card** and **Magazine** (a longer note can enlarge a magazine tile); beside the cover in **Cover**; still on the item in **Annotations**.

### Home

At the **library root**, switch to **Home** for shelves of what to open next.

Default shelves: **[Pinned](#pinning)**, **Upcoming reading deadlines**, **Watch now**, **Listen now**, **Recently read**, **Recently added**. You can also add **Recent in feed** and **Recent annotations**, plus any collection or saved search.

- **Configure** (top right) shows, hides, and reorders shelves. Right-click any collection in the sidebar → **Add to Home** to put it on this list (not the same as [pinning](#pinning)).
- Each shelf has its own **Configure** for layout (and sort / group on collection shelves). **Remove shelf** hides it; turn it back on from Home Configure.
- **Go to Reading Schedule** and **Go to Annotation Feed** jump to those tabs from the matching shelves.

### Annotation Feed

A timeline of your highlights and notes across sources, in chronological order. Enable it in Views, then open the **Annotation Feed** tab (toolbar, or **Go to Annotation Feed** from Home).

Open the options menu to:

- **Order** — newest last (oldest at the top) or newest first.
- **Layout** — **Vertical** (stacked covers with quotes underneath) or **Grid** (a wall of covers and quotes).
- **Copy** — when you copy from the feed, optionally prefix Markdown blockquotes (`>`) and append Pandoc cite keys (`[@…]`, from Better BibTeX or the item Citation Key field). The same defaults live in Preferences.

**Load previous** fetches an earlier page. Click a quote to open it in the reader.

Quote order under each item (by location in the document, or by date added) is shared with Gallery Annotations and Home’s recent-annotations shelf.

### Pinning

Keep a short list of items and collections on **Home** (the Pinned shelf) and at the top of **Reading Schedule**. Use it for “read this next,” a course you are in the middle of, or anything you do not want to hunt for.

This is not **Add to Home** (a collection becomes its own shelf) and not the **Course Information** priority (handouts stay at the top of a syllabus).

#### Pin an item

- Right-click one or more items → **Add to Pinned**.
- Or use **Add to Pinned** in the item pane.

#### Pin a collection

- Right-click a collection → **Pin collection**.
- On a syllabus, use the pin button next to Print / Lock / Settings.

Pin the syllabus collection itself, not a class folder or the auto-managed Reading Schedule folder.

A **pinned syllabus** shows **Next up** — the first incomplete reading in class order — plus progress. Marking that reading done advances Next up. A **pinned ordinary collection** shows items from that folder.

#### Intention notes

On a pinned item, **Edit intention** opens a child note for why you pinned it. Unpinning an item that has an intention note asks whether to **Keep** the note, **Delete** it, or **Cancel**.

#### Where pinned things appear

- **Home → Pinned** (on by default; uncheck it in Home **Configure**, or use **Remove shelf**).
- **Reading Schedule → Pinned** at the top of the calendar.
- If the generated Reading Schedule collection is on, pinned _items_ are also mirrored in a `Pinned` folder. That folder is auto-managed.

Drag to reorder on the Pinned shelf. The order is remembered per library.

#### Unpin

- Right-click → **Remove from Pinned** / **Unpin collection**.
- Use the pin button again on the item pane or syllabus.
- On Reading Schedule, the done checkbox on a pinned row asks to unpin.

### Import a reading list

With the [Zotero Connector](https://www.zotero.org/download/connectors) installed, you can save a supported institutional reading list from the browser. The plugin creates a **new top-level collection** named after the list, turns sections into classes, and maps importance tags (essential / required / recommended / optional, and similar labels) onto syllabus priorities. While saving, it tries each View online / file link in your signed-in browser session and stores any PDFs or EPUBs it can actually download. Remaining items are then looked up the same way **Find Available PDFs** does.

This needs **Zotero 8 or later**. You must already be able to view the list in the browser (including SSO-gated lists). After you save, switch the new collection to **View as Syllabus**.

How to import:

1. Install this plugin and the Zotero Connector (Chrome, Firefox, or Edge).
2. Open a supported list in the browser and wait until the readings are visible.
3. Click the Connector button and save the page (choose all items if prompted).
4. In Zotero, open the new top-level collection and switch to syllabus view.

#### Supported platforms

Example lists were last checked in August 2026 — institutions can unpublish them at any time.

| Platform                                                                                                    | Example list                                                                                                                                              | When Connector save works                                                                                                                                                                                                                                                                               |
| ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **[Talis Aspire](https://www.talis.com)**                                                                   | [CPAS0167: Teacher as Author (UCL)](https://rl.talis.com/3/ucl/lists/38afa403-9ebf-4dbe-86b0-a80e564f9777.html)                                           | List pages on `rl.talis.com` (and hosts such as Lincoln and Surrey) whose URL contains `/lists/`. Public lists work without login. Single-item `/items/` pages can also be saved.                                                                                                                       |
| **[Ex Libris Leganto](https://exlibrisgroup.com/products/leganto-reading-list-management-system/)**         | [PI3084: Research Methods in Politics and International Relations (Aberdeen)](https://abdn.leganto.exlibrisgroup.com/leganto/nui/lists/13848239600005941) | Pages under `/leganto/` or `*.leganto.exlibrisgroup.com`. Guest-published lists can be saved without signing in; institution SSO is required when the list is not shared with “Anyone”. Catalogue: [Aberdeen Find Lists](https://abdn.leganto.exlibrisgroup.com/leganto/public/44ABE_INST/searchlists). |
| **[KeyLinks](https://kortext.com/keylinks/)**                                                               | [MDX1234 Example Reading List](https://mdx.keylinks.org/new-ui/hierarchy/list/8875)                                                                       | `*.keylinks.org` list URLs (`/list/{id}` or `/new-ui/hierarchy/list/{id}`). CLA / digitised files and full-text links download when your browser session can fetch them. Notes are skipped.                                                                                                             |
| **[eReserve Plus](https://www.ereserve.com.au/)**                                                           | [MHC6100 Blueprint (Edith Cowan)](https://ereserve.ecu.edu.au/app/public_lists#/unit/4955/list/15619)                                                     | `ereserve` hosts, `/app/public_lists`, or an LMS LTI launch. Full import (including files) is most reliable from the **signed-in** student / LMS reading-list view, not only the public Vue page.                                                                                                       |
| **[BLUEcloud Course Lists](https://www.sirsidynix.com/bluecloud-course-lists/)** (SirsiDynix / CloudSource) | No public permalink — open a student view from Canvas, Blackboard, or Moodle                                                                              | URLs containing `courselists`, `bccl`, or `bluecloudlists`, or a page titled “BLUEcloud Course Lists”. Product overview: [CloudSource Course Lists](https://www.cloudsource.net/course-lists/).                                                                                                         |

## Development

Contributions are welcome — please open a Pull Request.

See **[doc/TECHNICAL.md](doc/TECHNICAL.md)** for how the plugin stores syllabi, handles item merges, class folders, reading-list translators, and the rest of the architecture, as well as build, test, lint, and release commands.

To run locally: clone the repo, `pnpm install`, copy `.env.example` to `.env` (set your Zotero path), then `pnpm start`. Requires Zotero 7+ (8–10 recommended), Node.js LTS, Git, and pnpm.

This plugin is built using the [Zotero Plugin Template](https://github.com/windingwind/zotero-plugin-template).

## Acknowledgements

Thanks to the following:

- The authors of all syllabi everywhere — [Teacher As Author](https://rl.talis.com/3/ucl/lists/38afa403-9ebf-4dbe-86b0-a80e564f9777.html) — including the project author's own lecturers (Community Education faculty at UWS; the Politics department at SOAS), and those who teach outside formal academic institutions.
- Academic institutions for sharing their syllabi, and platforms such as [Talis](https://www.talis.com), [Ex Libris Leganto](https://exlibrisgroup.com/products/leganto-reading-list-management-system/), [KeyLinks](https://kortext.com/keylinks/), [eReserve Plus](https://www.ereserve.com.au/), and [BLUEcloud Course Lists](https://www.sirsidynix.com/bluecloud-course-lists/) that make it possible to download this data easily.
- The [RIS](<https://en.wikipedia.org/wiki/RIS_(file_format)>) (Research Information Systems) format, which makes bibliographic records portable between tools.
- [Zotero](https://www.zotero.org)'s developers, for building an open platform, and for recent developments that have opened plugin development to contemporary web technologies.
- The Zotero plugin toolkit community, including [zotero-plugin-template](https://github.com/windingwind/zotero-plugin-template) and [zotero-plugin-toolkit](https://github.com/windingwind/zotero-plugin-toolkit).
- The authors of the open-source libraries this plugin relies on, among them [Preact](https://preactjs.com), [React](https://react.dev), [Zod](https://zod.dev), [Tailwind CSS](https://tailwindcss.com), and [esbuild](https://esbuild.github.io).
- Early users, for a steer and encouraging words.
