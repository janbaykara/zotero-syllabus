# Zotero Syllabus

[![zotero target version](https://img.shields.io/badge/Zotero-7%2F8%2F9%2F10-green?style=flat-square&logo=zotero&logoColor=CC2936)](https://www.zotero.org)

A Zotero add-on / plugin that turns your collections into syllabi and course reading lists. Order your items by class, tag things as required / optional reading and pin course information.

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

## A tour of the features

In Zotero, open this page anytime from **Help → Zotero Syllabus Documentation**. For a short walkthrough in the app, use **Help → Open Zotero Syllabus User Guide**.

Turn individual views on or off in **Preferences → Zotero Syllabus → Views** (Syllabus, Gallery, Home, Reading Schedule, Annotation Feed).

### Add assignments to classes

Items are grouped by class number, and can be given a priority. Assign classes a name and description. Customize the terminology (e.g., "week", "class", "session", "section") and define custom priority levels with your own names and colors.

![Syllabus module interface showing class organization](doc/images/classes.png)

#### How can I assign an item to a class?

1. First, select the collection where the classes will live.
2. Then you'll need to add some classes. You can do this by...

- Clicking "View As Syllabus" and then clicking the "Add Class" button.
- Right-clicking an item within a collection, then selecting "Assign to class" -> "Add to new class".

3. Once you've added some classes, you can assign an item to a class by...

- Right-clicking an item within a collection, then selecting "Assign to class" and then picking the class
- Clicking "View As Syllabus", then dragging the item to the class.

An item can be assigned multiple times to different classes. In "View As Syllabus", you'll find a "duplicate" button when you hover over an item.

If you merge duplicate items in Zotero, the surviving item keeps its class assignment. You do not need to reassign it.

### Course documents

Give items the **Course Information** priority (or your own top priority) so handouts and links stay at the top of the syllabus. This is separate from [pinning](#pinned) an item to Home or Reading Schedule.

![Syllabus module interface showing class organization](doc/images/module.png)

### Order your items in list view

A **sortable "Syllabus Info" column** to your standard list view, to summarise all the key info. Sort by this column if you want to see what order your readings need to be done in.

![Standard Zotero list view](doc/images/list.png)

#### Manually reorder items within a class

![Manual reordering demonstration](doc/images/reorder.gif)

Drag and drop items to reorder them within a class, or reset to natural order.

#### Move items between classes

Drag and drop items between classes.

![Drag and drop functionality demonstration](doc/images/drag-drop.gif)

#### Add reading instructions to assignments

Use the item pane to edit class number, instruction, and priority for an item.

![Editing pane showing class number, instruction, and priority](doc/images/editing.png)

#### Quickly re-assign class number or priority

Right-click an item to re-assign class number or priority.

![Context menu showing syllabus operations](doc/images/right-click.png)

#### Set a due date for a class

![Reading schedule view with due date](doc/images/scheduling.png)

#### Review your reading schedule across all classes

![Reading schedule](doc/images/reading.png)

The top of this view is a **Pinned** section — see [Pinned](#pinned).

#### And keep track of what you've read already

![Reading schedule view with reading status](doc/images/checkboxes.png)

### Gallery view

Browse a collection as covers, cards, a magazine spread, or an annotation stream. Switch with the **Table / Gallery / Syllabus** control in the items toolbar (managed collections use **Checklist** instead of Syllabus).

Covers come from attached images, EPUB/PDF art, ISBN lookups, or type-specific placeholders. Reading progress shows under each item when available. If Zotero’s **Show Items from Subcollections** is on, Gallery includes those items too. You can attach a [Gallery note](#gallery-notes) to an item in this collection.

Open **View options** from the `(view / sort / group)` control in the header. Choices are stored per collection. The globe button (**Save as default**) copies the current choice to every collection that has not set its own.

When you group items, a pill strip under the title jumps to each section.

![Gallery view with book covers and reading progress](doc/images/gallery.png)

#### View modes

- **Cover** — artwork in a grid. Best for scanning books, papers, and web pages at a glance.
- **Card** — the same syllabus item cards, in a narrower reading column. **Density** (Row / Standard / Expanded) is available in this mode.
- **Magazine** — mixed-size tiles with titles, blurbs, and [Gallery notes](#gallery-notes). **Packing** chooses the spread:
  - **Vertical** — covers with abstracts in a reading stack (narrow column).
  - **Grid** — equal-size magazine tiles across the pane.
  - **Packed** — mixed-size tiles, like a contents page.
- **Annotations** — covers with every highlight and note on the item. **Quotes** orders those excerpts by location in the document or by date added. Check **Show items with no annotations** to keep unread items in the list.

Click a cover or card to select it in Zotero; double-click opens the best attachment.

#### Sort

- **Auto** — collection order, or syllabus class order when you are on a syllabus.
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

### Gallery notes

A Gallery note is a short, collection-specific caption on an item — a reminder, a why-this-matters line, or a quote you want next to the cover. It is not the same as a normal Zotero note, a syllabus [reading instruction](#add-reading-instructions-to-assignments), or a pin [intention](#intention-notes).

The note belongs to **this collection**. The same item in another collection can have a different Gallery note, or none.

#### Add or edit

1. Select the collection (Table or Gallery).
2. Right-click an item → **Add Gallery Note** (or **Edit Gallery Note** if one already exists).
3. Write in Zotero’s note editor.

You can also click a Gallery note already shown on a card, cover, or magazine tile to open it.

#### How it looks

- **Card** — under the title, like a reading instruction.
- **Cover** — beside the cover.
- **Magazine** — under the title (above any reading instruction or abstract). A longer note can also give that tile a larger slot in the spread.
- **Annotations** — the same note still shows with the item.

#### Remove

Right-click the item → **Remove Gallery Note**. That deletes only the Gallery note for this collection, not your other notes on the item.

### Home view

At the library root, switch to **Home** for shelves of recent items, upcoming deadlines, and more.

Default shelves include **Pinned**, **Upcoming reading deadlines**, **Watch now**, **Listen now**, **Recently read**, and **Recently added**.

- Use **Configure** at the top of Home to show, hide, and reorder shelves.
- Each shelf has its own **Configure** for layout (and sort / group on collection shelves). **Remove shelf** hides it; turn it back on from the Home Configure list.
- Right-click any collection in the sidebar and choose **Add to Home** to show it as its own shelf (this is not the same as [pinning](#pinned)).
- From the deadlines and annotations shelves you can jump to **Reading Schedule** or **Annotation Feed**.

### Pinned

Keep a short list of items and collections on **Home** (the Pinned shelf) and at the top of **Reading Schedule**. Use it for “read this next,” a course you are in the middle of, or anything you do not want to hunt for.

This is not the same as **Add to Home** (a collection becomes its own shelf) or the **Course Information** priority (handouts stay at the top of a syllabus).

#### Pin an item

- Right-click one or more items → **Add to Pinned**.
- Or open an item and use **Add to Pinned** in the item pane.

#### Pin a collection

- Right-click a collection in the sidebar → **Pin collection**.
- On a syllabus, use the pin button next to Print / Lock / Settings.

Pin the syllabus collection itself, not a class folder or the auto-managed Reading Schedule folder.

A **pinned syllabus** shows **Next up** — the first incomplete reading in class order — plus progress (`done` of `total`). Marking that reading done advances Next up. A **pinned ordinary collection** shows items from that folder.

#### Intention notes

On a pinned item, **Edit intention** opens a child note for why you pinned it (a reminder, a deadline, a quote). Unpinning an item that has an intention note asks whether to **Keep** the note, **Delete** it, or **Cancel**.

#### Where pinned things appear

- **Home → Pinned** (on by default; uncheck it in Home **Configure**, or use **Remove shelf** on the Pinned shelf).
- **Reading Schedule → Pinned** at the top of the calendar.
- If **Preferences → Zotero Syllabus → Generate a “Reading Schedule” collection** is on, pinned *items* are also mirrored in a `Pinned` folder under Reading Schedule. That folder is auto-managed — do not add or remove items there by hand.

Drag to reorder on the Pinned shelf. The order is remembered per library.

#### Unpin

- Right-click → **Remove from Pinned** / **Unpin collection**.
- Use the pin button again on the item pane or syllabus.
- On Reading Schedule, the done checkbox on a pinned row asks to unpin.

### Annotation Feed

A chronological timeline of your highlights and notes across sources. Open it from Home, or from the toolbar when the view is enabled. Use the options menu to change order, layout, and how copied quotes are formatted.

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

### Other features

- **Assign an item multiple times** within a syllabus. Useful for breaking down larger readings into smaller chunks.
- **Save as PDF, Word, Markdown, or HTML** — the printer icon opens a format menu, then asks where to save the syllabus (including a bibliography).
- **Publish online** — from the same menu, publish a public URL (HTML + attachments) to Cloudflare-hosted storage. You are prompted to authorize with your Zotero account if needed. Anyone with the link can open the page and linked files; only publish materials you have the right to share. Requires the operator to deploy the Worker in [`cloud/`](cloud/) (see [`cloud/README.md`](cloud/README.md)). Per-user storage quotas apply; Zotero public groups still do not expose attachment files.
- **Zotero Reading List compatibility**: if you have the [Zotero Reading List](https://github.com/Dominic-DallOsto/zotero-reading-list) plugin installed, reading status will be displayed in the syllabus view
- **Customizable priorities** — Define your own priority levels with custom names and colors, or use the defaults (Essential, Recommended, Optional, Course Information).
- **Customizable nomenclature** — Change the terminology used throughout (e.g., "week", "class", "session", "section") with automatic pluralization.

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
