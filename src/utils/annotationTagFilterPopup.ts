import {
  normalizeAnnotationTagFilter,
  readItemAnnotationTags,
} from "./annotationTags";

type TagFilterItem = {
  id: string | number;
  libraryID: number;
  isFeedItem: boolean;
  getTags: () => Array<{ tag: string; type?: number }>;
  addTag: (name: string) => void;
  removeTag: (name: string) => void;
  replaceTag: (oldName: string, newName: string) => void;
  setTags: (tags: Array<{ tag: string; type?: number } | string>) => void;
  saveTx: (options?: unknown) => Promise<void>;
};

type OpenAnnotationTagFilterPopupOptions = {
  libraryID: number;
  selected: readonly string[];
  anchor: Element;
  onChange: (tags: string[]) => void;
  /**
   * When false, `onChange` runs only when the popup closes (batch tag).
   * Default true matches the filter UI (update as tags are edited).
   */
  live?: boolean;
  /** Popup anchor position (default `after_end`). Use `before_start` above a bottom bar. */
  position?: string;
};

function ensurePopupSet(doc: Document): Element {
  const existing = doc.getElementById("syllabus-annotation-tag-popupset");
  if (existing) {
    return existing;
  }
  const createXUL = (
    doc as Document & { createXULElement?: (tag: string) => Element }
  ).createXULElement?.bind(doc);
  const popupset = createXUL
    ? createXUL("popupset")
    : doc.createElementNS(
        "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul",
        "popupset",
      );
  popupset.id = "syllabus-annotation-tag-popupset";
  doc.documentElement.appendChild(popupset);
  return popupset;
}

function createFilterItem(
  libraryID: number,
  selected: readonly string[],
  onChange: (tags: string[]) => void,
  live: boolean,
): TagFilterItem {
  let tags = normalizeAnnotationTagFilter(selected).map((tag) => ({ tag }));
  const emit = () => {
    onChange(tags.map((entry) => entry.tag));
  };
  return {
    id: "",
    libraryID,
    isFeedItem: false,
    getTags() {
      return tags.map((entry) => ({ ...entry }));
    },
    addTag(name: string) {
      const tag = String(name || "").trim();
      if (
        !tag ||
        tags.some((entry) => entry.tag.toLowerCase() === tag.toLowerCase())
      ) {
        return;
      }
      tags = [...tags, { tag }];
    },
    removeTag(name: string) {
      const key = String(name || "")
        .trim()
        .toLowerCase();
      tags = tags.filter((entry) => entry.tag.toLowerCase() !== key);
    },
    replaceTag(oldName: string, newName: string) {
      this.removeTag(oldName);
      this.addTag(newName);
    },
    setTags(list) {
      tags = normalizeAnnotationTagFilter(
        (list || []).map((entry) =>
          typeof entry === "string" ? entry : String(entry?.tag ?? ""),
        ),
      ).map((tag) => ({ tag }));
    },
    async saveTx() {
      if (live) {
        emit();
      }
    },
  };
}

/** Open Zotero's native tags-box panel (same UI as annotation tags in the reader). */
export function openAnnotationTagFilterPopup(
  options: OpenAnnotationTagFilterPopupOptions,
): void {
  const win = Zotero.getMainWindow();
  const doc = win.document;
  const createXUL = (
    doc as Document & { createXULElement?: (tag: string) => Element }
  ).createXULElement?.bind(doc);
  if (!createXUL) {
    return;
  }

  // One filter popup at a time.
  for (const existing of Array.from(
    doc.querySelectorAll(".syllabus-annotation-tag-filter-popup"),
  )) {
    const panel = existing as Element & { hidePopup?: () => void };
    try {
      panel.hidePopup?.();
    } catch {
      // Ignore panels that are already closing.
    }
    panel.remove();
  }

  const popupset = ensurePopupSet(doc);
  const tagsPopup = createXUL("panel") as Element & {
    hidePopup?: () => void;
    openPopup?: (
      target: Element | null,
      position: string,
      x: number,
      y: number,
      isContextMenu?: boolean,
    ) => void;
  };
  tagsPopup.className = "tags-popup syllabus-annotation-tag-filter-popup";
  const tagsbox = createXUL("tags-box") as HTMLElement & {
    editable: boolean;
    item: TagFilterItem;
    render: () => void;
    open: boolean;
    collapsible: boolean;
    count: number;
    newTag: () => void;
  };
  tagsPopup.appendChild(tagsbox);
  tagsbox.setAttribute("flex", "1");
  popupset.appendChild(tagsPopup);

  const live = options.live !== false;
  const item = createFilterItem(
    options.libraryID,
    options.selected,
    options.onChange,
    live,
  );
  tagsbox.editable = true;
  tagsbox.item = item;
  tagsbox.render();
  tagsbox.querySelector(".head")?.removeAttribute("tabindex");

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key !== "Escape") {
      return;
    }
    const focusedTag = tagsPopup.querySelector("editable-text.focused") as {
      value?: string;
      initialValue?: string;
    } | null;
    if (focusedTag) {
      const row = (focusedTag as unknown as Element).closest?.("[isNew]");
      if (row) {
        row.remove();
      } else if (focusedTag.initialValue !== undefined) {
        focusedTag.value = focusedTag.initialValue;
      }
    }
    tagsPopup.hidePopup?.();
  };
  doc.addEventListener("keydown", handleKeyDown, true);

  tagsPopup.addEventListener("popupshown", () => {
    tagsbox.open = true;
    tagsbox.collapsible = false;
    if (tagsbox.count === 0) {
      tagsbox.newTag();
    }
  });

  tagsPopup.addEventListener("popuphidden", (event) => {
    if (event.target !== tagsPopup) {
      return;
    }
    doc.removeEventListener("keydown", handleKeyDown, true);
    options.onChange(readItemAnnotationTags(item));
    tagsPopup.remove();
  });

  tagsPopup.openPopup?.(
    options.anchor,
    options.position || "after_end",
    0,
    0,
    false,
  );
}
