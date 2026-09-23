# Display preferences

Chrome is **per view**. Unset values fall back to a global default. The globe button copies the current value to that default.

Implementation: `[src/utils/viewPref.ts](../src/utils/viewPref.ts)`. View keys live in `[src/utils/viewScope.ts](../src/utils/viewScope.ts)`.

## View keys

| Surface              | Key                   |
| -------------------- | --------------------- |
| Gallery collection   | numeric collection id |
| Gallery special rows | `S123`, `U1`, `T1`, … |
| Syllabus page        | `syllabus:{id}`       |
| Reading Schedule     | `reading-schedule`    |

Gallery and syllabus on the same collection are independent slots. Class-folder syllabus pages use the parent’s `syllabus:{id}`.

## Per-view (Save as default)

- **Pane shown** (`collectionViewModes`) — per collection / special row. No globe (no global default pane). Class folders with no saved mode inherit the parent.
- **Gallery:** layout, sort, group, magazine packing, card density, quote order, colour filter, show items without annotations
- **Syllabus / Reading Schedule:** layout, magazine packing, density, reader-mode checkboxes, quote order, colour filter, show items without annotations, further-reading sort

Layout has two defaults because the surfaces start from different presets: `defaultGalleryLayout` (`cover`) vs `defaultSyllabusLayout` (`card`). Other shared controls use one default.

## Global only (prefs pane)

- `showBibliography`
- `shouldColourSyllabusRows`

## Out of scope

Feature flags, My Annotations page prefs, Explorer shelves, WPM, publish, **Generate Reading Schedule collection**.

My Annotations / Explorer colour filters use named keys (`feed`, `explorer`, `explorer-pinned`) and do **not** inherit the gallery/syllabus colour-filter default.
