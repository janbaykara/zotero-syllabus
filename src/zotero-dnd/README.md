# zotero-dnd

Chrome-safe drag-and-drop for Preact, built on [`@dnd-kit/abstract`](https://dndkit.com/) + [`@dnd-kit/helpers`](https://dndkit.com/). Use this instead of `@dnd-kit/dom` / `@dnd-kit/react` inside Zotero (those assume a normal browser document / React).

**Reference implementation:** [`PersonalOrderGallery.tsx`](../modules/PersonalOrderGallery.tsx) (blue-line, multi-list).

---

## Quick start

```tsx
import {
  DndProvider,
  useSortable,
  useDroppable,
  RestrictToVerticalAxis,
} from "../zotero-dnd";

function Tile({ id, index, group }) {
  const { ref, isDragSource } = useSortable({ id, index, group, type: "item" });
  return (
    <div ref={ref} className={isDragSource ? "is-dragging" : undefined}>
      …
    </div>
  );
}

function List() {
  return (
    <DndProvider
      modifiers={[RestrictToVerticalAxis]}
      dropIndicator // or sortableTransition — see below
      onDragEnd={(event, manager) => {
        /* commit order */
      }}
    >
      …tiles + droppable zones…
    </DndProvider>
  );
}
```

`DndProvider` creates a manager (sensors, feedback, abort safety). Pass a stable `modifiers` / `dropIndicator` options object from **module scope** — a new object every render remounts the manager and breaks dragging.

---

## Two reorder styles

Pick one per surface. They solve the same problem differently.

| | **Blue-line** (`dropIndicator`) | **FLIP** (`sortableTransition`) |
| --- | --- | --- |
| During drag | Lists stay put; a line shows insert edge | Lists update live via `move()` on `dragover` |
| On drop | Apply order once from the indicator | Order already applied; persist if needed |
| Feel | Stable layout, explicit target | Items shuffle under the pointer |
| Gallery | ✅ used | available if you want it |

### Blue-line (recommended for gallery-like UIs)

1. Enable the plugin:

```tsx
const DROP_INDICATOR = {
  axis: (el) =>
    el.closest(".syllabus-gallery-grid") ? "horizontal" : "vertical",
  canIndicate: ({ source, target }) => {
    // return false to skip painting (e.g. block rest→rest)
    return true;
  },
};

<DndProvider dropIndicator={DROP_INDICATOR} … />
```

Or `dropIndicator={true}` for defaults (`axis: "vertical"`, classes `is-drop-before` / `is-drop-after`).

2. **Do not** call `move()` / `setState` on every `dragover` — only paint happens.

3. On `dragend`, read the indicator and commit:

```tsx
import {
  getDropIndicator,
  applyDropIndicatorMove,
  moveToContainerEnd,
  isChromeSortable,
} from "../zotero-dnd";

onDragEnd={(event, manager) => {
  if (event.canceled) { /* revert snapshot */ return; }
  const { source, target } = event.operation;
  if (!source || !target) return;

  if (target.id === "ordered" || target.id === "rest") {
    // Dropped on a zone container (empty list / sink)
    const next = moveToContainerEnd(prev, source.id, String(target.id));
    setContainers(next);
    commit(next);
    return;
  }

  if (!isChromeSortable(target)) return;
  const indicator = getDropIndicator(manager);
  if (!indicator) return;

  const next = applyDropIndicatorMove(
    prev,
    source.id,
    indicator.targetId,
    indicator.edge, // "before" | "after"
  );
  setContainers(next);
  commit(next);
}}
```

4. **CSS** on the sortable host (the element `useSortable`’s `ref` attaches to):

```css
.my-tile {
  position: relative;
}
.my-tile.is-drop-before::before,
.my-tile.is-drop-after::after {
  content: "";
  position: absolute;
  /* line styles — see zoteroPane.css personal-order / item-card rules */
}
```

Constants: `DROP_INDICATOR_BEFORE_CLASS`, `DROP_INDICATOR_AFTER_CLASS`.

**Helpers**

| Export | Use |
| --- | --- |
| `getDropIndicator(manager)` | `{ targetId, edge }` from the last drag (valid through `dragend`) |
| `applyDropIndicatorMove(containers, sourceId, targetId, edge)` | Single-item multi-list reorder |
| `applyMultiDropIndicatorMove(containers, movingIds, targetId, edge)` | Move a block (selection) as one unit |
| `moveToContainerEnd` / `moveMultipleToContainerEnd` | Into an empty / zone droppable id |
| `resolveDragIds(containers, sourceId, selectedIds)` | Selection → ordered id list for the drag |
| `idsInContainerOrder(containers, candidates)` | Stable relative order across lists |
| `dropEdgeForPointer(pointer, rect, axis)` | Edge math if you roll your own |

**Multi-select:** when the dragged id is in `selectedIds` and that set has 2+, `resolveDragIds` returns every selected id in container order; commit with the `*Multi*` helpers so the block keeps its internal order.

On `dragstart`, pass those tile elements to `setCoDragElements(manager, elements)` so `ChromeFeedbackPlugin` translates the whole selection with the pointer (clear with `clearCoDragElements` on `dragend`).

### FLIP (live reorder)

1. Enable: `<DndProvider sortableTransition … />` (or `createZoteroDndManager({ sortableTransition: true })`).
2. On `dragover`, update React state with `@dnd-kit/helpers` `move()`:

```tsx
import { move } from "../zotero-dnd";

onDragOver={(event) => {
  setContainers((items) => {
    const next = move(items, event);
    return next === items ? items : next;
  });
}}
```

3. On `dragend`, persist if not canceled (and revert from a `dragstart` snapshot if canceled).

Sibling tiles animate via `captureRect` / `animate` on sortables. Use this when you want the list to reshuffle under the cursor; prefer blue-line when that feels jumpy.

---

## Always-on plugins (no flags)

These register with every `createZoteroDndManager` / `DndProvider` manager:

| Plugin | What you get |
| --- | --- |
| **ChromeFeedbackPlugin** | Dragged item follows the pointer (`translate` + dim). Honors `modifiers`. |
| **ChromeDragAbortPlugin** | Force-stops a stuck drag if pointer listeners were lost (status returns to idle). |
| **ChromePointerSensor** | Pointer/mouse activation (default sensor). |

You normally never configure these.

---

## Opt-in / advanced plugins

| Plugin | Enable | When to use |
| --- | --- | --- |
| **DropIndicatorPlugin** | `dropIndicator` on provider/manager | Blue-line UIs (see above) |
| **SortableTransitionPlugin** | `sortableTransition` | Live `move()` + FLIP |
| **OptimisticSortingPlugin** | `plugins={[OptimisticSortingPlugin]}` | Uncontrolled DOM reorder (rare). Gallery does **not** use this — React state is the source of truth. |

Extra plugins:

```tsx
<DndProvider plugins={[OptimisticSortingPlugin]} … />
// or
createZoteroDndManager({ plugins: [OptimisticSortingPlugin] })
```

---

## Hooks

### `useSortable({ id, index, group, type, accept?, … })`

Sortable item in a controlled list. Returns `{ ref, isDragging, isDragSource }`.

- Put `ref` on the **host** that should show the blue line / grab cursor.
- `group` must match a key in your containers map when using `move` / `applyDropIndicatorMove` (e.g. `"ordered"` | `"rest"`).
- Instances are **pooled by id** across remounts so cross-list moves don’t kill the active drag.

### `useDroppable({ id, accept?, disabled?, collisionPriority? })`

Zone target (empty list, “drop here to unorder”, …). Returns `{ ref, isDropTarget }`.

- Mid-drag highlight is applied imperatively as `is-drop-target` / `is-drop-highlight` on the element (avoid `setState` in `dragover` for highlight).
- Use the same `id` as the containers map key so `moveToContainerEnd` / helpers resolve the zone.

### `useDndManager()`

Access the manager from a child of `DndProvider` (e.g. custom listeners).

---

## Multi-list pattern

Same idea as [dnd-kit multiple sortable lists](https://dndkit.com/react/guides/multiple-sortable-lists):

```ts
type Containers = { ordered: string[]; rest: string[] };
```

1. `useSortable({ id, index, group: "ordered" | "rest", type: ITEM_TYPE })` per item.
2. `useDroppable({ id: "ordered" | "rest", accept: … })` on each zone (keep registered even when empty).
3. Snapshot containers on `dragstart`; revert on canceled `dragend`.
4. Blue-line: commit with `applyDropIndicatorMove` / `moveToContainerEnd` on `dragend`.  
   FLIP: `setContainers(move(…))` on `dragover`, persist on `dragend`.

Block illegal moves with `event.preventDefault()` on `dragover` and/or `canIndicate` / droppable `accept`.

---

## Modifiers

Re-exported from `@dnd-kit/abstract/modifiers`:

- `RestrictToVerticalAxis` — card/list reorder
- `RestrictToHorizontalAxis`
- `SnapModifier`, `AxisModifier`

```tsx
<DndProvider modifiers={[RestrictToVerticalAxis]} … />
```

---

## Checklist for a new surface

1. Wrap in `DndProvider` (stable `modifiers` / `dropIndicator` options).
2. Choose **blue-line** or **FLIP**; don’t enable both unless you know you need them.
3. `useSortable` hosts + CSS for `is-drop-before` / `is-drop-after` (blue-line) or rely on FLIP transforms.
4. Zone `useDroppable`s with ids aligned to your containers keys.
5. Snapshot on start; commit or revert on end.
6. Style `.is-dragging` / zone `.is-drop-highlight` as needed (see `zoteroPane.css`).
