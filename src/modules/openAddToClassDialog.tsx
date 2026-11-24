// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h } from "preact";
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { twMerge } from "tailwind-merge";
import { ChevronLeft } from "lucide-preact";
import { getString, getUiDir } from "../utils/locale";
import { getSelectedCollection } from "../utils/zotero";
import { isTestEnv } from "../utils/env";
import {
  openPreactDialog,
  type PreactDialogHandle,
} from "@janbaykara/zotero-preact";
import {
  addItemsToClass,
  buildAddToClassGroups,
  filterAddToClassGroups,
  libraryIDsForAddToClass,
  selectedAssignableItems,
  type AddToClassGroup,
  type AddToClassRow,
} from "./addToClass";

function rowLabel(row: AddToClassRow): string {
  if (row.kind === "further-reading") {
    return getString("further-reading-heading");
  }
  if (row.kind === "new-class") {
    return getString("menu-add-to-new-class", {
      args: {
        nomenclature: row.nomenclature,
        number: row.classNumber,
      },
    });
  }
  if (row.classTitle.trim()) {
    return getString("item-pane-class-named", {
      args: {
        nomenclature: row.nomenclature,
        number: row.classNumber,
        title: row.classTitle,
      },
    });
  }
  return getString("menu-class-label", {
    args: {
      nomenclature: row.nomenclature,
      number: row.classNumber,
    },
  });
}

function ClassRowList({
  rows,
  onPick,
  listLabel,
}: {
  rows: AddToClassRow[];
  onPick: (row: AddToClassRow) => void;
  listLabel: string;
}) {
  return (
    <div
      role="listbox"
      aria-label={listLabel}
      className="rounded-md border border-quinary overflow-hidden bg-background"
    >
      {rows.map((row) => (
        <button
          key={`${row.kind}-${row.classNumber ?? "none"}`}
          type="button"
          role="option"
          onClick={() => onPick(row)}
          className={twMerge(
            "flex w-full items-center px-3 py-2 text-left text-sm border-0 cursor-pointer bg-transparent text-primary hover:bg-quinary/40",
            row.kind !== "class" && "text-secondary",
          )}
        >
          <span className="min-w-0 flex-1 truncate">{rowLabel(row)}</span>
        </button>
      ))}
    </div>
  );
}

function ClassGroupList({
  group,
  onPick,
}: {
  group: AddToClassGroup;
  onPick: (row: AddToClassRow) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="text-xs font-semibold uppercase tracking-wide text-secondary px-1">
        {group.libraryName
          ? getString("add-to-class-syllabus-in-library", {
              args: {
                syllabus: group.collectionName,
                library: group.libraryName,
              },
            })
          : group.collectionName}
      </div>
      <ClassRowList
        rows={group.rows}
        onPick={onPick}
        listLabel={group.collectionName}
      />
    </div>
  );
}

function SearchAddToClassBody({
  items,
  currentCollectionId,
  onPick,
}: {
  items: Zotero.Item[];
  currentCollectionId: number | null;
  onPick: (row: AddToClassRow) => void;
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const groups = useMemo(
    () =>
      buildAddToClassGroups({
        libraryIDs: libraryIDsForAddToClass(items),
        currentCollectionId,
      }),
    [items, currentCollectionId],
  );
  const filtered = useMemo(
    () => filterAddToClassGroups(groups, query),
    [groups, query],
  );

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const pickFirst = () => {
    const first =
      filtered[0]?.rows.find((row) => row.kind === "class") ??
      filtered[0]?.rows[0];
    if (first) {
      onPick(first);
    }
  };

  return (
    <div className="p-4 space-y-3" dir={getUiDir()} style={{ minWidth: 380 }}>
      <input
        ref={inputRef}
        type="search"
        value={query}
        onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            pickFirst();
          }
        }}
        placeholder={getString("add-to-class-search")}
        aria-label={getString("add-to-class-search")}
        className="w-full box-border px-2.5 py-2 text-sm rounded-md border border-quinary bg-background text-primary"
      />
      {groups.length === 0 ? (
        <p className="text-sm text-secondary m-0">
          {getString("add-to-class-no-syllabi")}
        </p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-secondary m-0">
          {getString("add-to-class-empty")}
        </p>
      ) : (
        <div className="flex flex-col gap-3 max-h-96 overflow-auto">
          {filtered.map((group) => (
            <ClassGroupList
              key={group.collectionId}
              group={group}
              onPick={onPick}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Two-step picker: syllabus list → class list (with Search… fallback).
 */
function SteppedAddToClassBody({
  items,
  currentCollectionId,
  onPick,
  onOpenSearch,
}: {
  items: Zotero.Item[];
  currentCollectionId: number | null;
  onPick: (row: AddToClassRow) => void;
  onOpenSearch: () => void;
}) {
  const [selectedGroup, setSelectedGroup] = useState<AddToClassGroup | null>(
    null,
  );
  const groups = useMemo(
    () =>
      buildAddToClassGroups({
        libraryIDs: libraryIDsForAddToClass(items),
        currentCollectionId,
      }),
    [items, currentCollectionId],
  );

  if (groups.length === 0) {
    return (
      <div className="p-4 space-y-3" dir={getUiDir()} style={{ minWidth: 380 }}>
        <p className="text-sm text-secondary m-0">
          {getString("add-to-class-no-syllabi")}
        </p>
      </div>
    );
  }

  if (!selectedGroup) {
    return (
      <div className="p-4 space-y-3" dir={getUiDir()} style={{ minWidth: 380 }}>
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-secondary m-0">
            {getString("add-to-class-choose-syllabus")}
          </p>
          <button
            type="button"
            className="text-sm text-accent-blue border-0 bg-transparent cursor-pointer p-0 hover:underline"
            onClick={onOpenSearch}
          >
            {getString("add-to-class-search-link")}
          </button>
        </div>
        <div
          role="listbox"
          aria-label={getString("add-to-class-choose-syllabus")}
          className="rounded-md border border-quinary overflow-hidden bg-background max-h-96 overflow-auto"
        >
          {groups.map((group) => (
            <button
              key={group.collectionId}
              type="button"
              role="option"
              onClick={() => setSelectedGroup(group)}
              className="flex w-full items-center px-3 py-2 text-left text-sm border-0 cursor-pointer bg-transparent text-primary hover:bg-quinary/40"
            >
              <span className="min-w-0 flex-1 truncate">
                {group.libraryName
                  ? getString("add-to-class-syllabus-in-library", {
                      args: {
                        syllabus: group.collectionName,
                        library: group.libraryName,
                      },
                    })
                  : group.collectionName}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3" dir={getUiDir()} style={{ minWidth: 380 }}>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="inline-flex items-center gap-1 text-sm text-secondary border-0 bg-transparent cursor-pointer p-0 hover:text-primary"
          onClick={() => setSelectedGroup(null)}
          title={getString("add-to-class-back")}
          aria-label={getString("add-to-class-back")}
        >
          <ChevronLeft size={16} aria-hidden="true" />
          {getString("add-to-class-back")}
        </button>
        <span className="text-sm text-secondary truncate min-w-0 flex-1">
          {selectedGroup.libraryName
            ? getString("add-to-class-syllabus-in-library", {
                args: {
                  syllabus: selectedGroup.collectionName,
                  library: selectedGroup.libraryName,
                },
              })
            : selectedGroup.collectionName}
        </span>
        <button
          type="button"
          className="text-sm text-accent-blue border-0 bg-transparent cursor-pointer p-0 hover:underline shrink-0"
          onClick={onOpenSearch}
        >
          {getString("add-to-class-search-link")}
        </button>
      </div>
      <p className="text-sm text-secondary m-0">
        {getString("add-to-class-choose-class")}
      </p>
      <div className="max-h-96 overflow-auto">
        <ClassRowList
          rows={selectedGroup.rows}
          onPick={onPick}
          listLabel={selectedGroup.collectionName}
        />
      </div>
    </div>
  );
}

export type OpenAddToClassDialogOptions = {
  items?: Zotero.Item[];
  /** Default `stepped` for Item Pane; `search` keeps the flat searchable list. */
  mode?: "stepped" | "search";
};

/** Picker: add the selected items to any class on any syllabus. */
export function openAddToClassDialog(
  options?: OpenAddToClassDialogOptions,
): void {
  if (isTestEnv()) {
    return;
  }

  const items = selectedAssignableItems(options?.items);
  const currentCollectionId = getSelectedCollection()?.id ?? null;
  const mode = options?.mode ?? "stepped";

  const handleRef: { current: PreactDialogHandle | null } = { current: null };

  const pick = (row: AddToClassRow) => {
    void addItemsToClass({
      items,
      collectionId: row.collectionId,
      classNumber: row.classNumber,
    });
    handleRef.current?.close();
  };

  const openSearch = () => {
    handleRef.current?.close();
    openAddToClassDialog({ items, mode: "search" });
  };

  handleRef.current = openPreactDialog({
    title: getString("add-to-class-window-title"),
    rootId: "syllabus-add-to-class-root",
    singleton: false,
    content: (handle) => {
      handleRef.current = handle;
      if (mode === "search") {
        return (
          <SearchAddToClassBody
            items={items}
            currentCollectionId={currentCollectionId}
            onPick={pick}
          />
        );
      }
      return (
        <SteppedAddToClassBody
          items={items}
          currentCollectionId={currentCollectionId}
          onPick={pick}
          onOpenSearch={openSearch}
        />
      );
    },
    buttons: [
      {
        id: "cancel",
        label: getString("add-to-class-cancel"),
      },
    ],
    features: {
      width: 460,
      height: 520,
      fitContent: true,
      resizable: true,
    },
  });
}
