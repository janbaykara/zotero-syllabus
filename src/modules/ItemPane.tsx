// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h, Fragment } from "preact";
import {
  useState,
  useCallback,
  useRef,
  useMemo,
} from "preact/hooks";
import {
  SyllabusManager,
  SyllabusPriority,
  ItemSyllabusAssignment,
} from "./syllabus";
import { Square, SquareCheck } from "lucide-preact";
import { twMerge } from "tailwind-merge";
import { useZoteroItem } from "./react-zotero-sync/item";
import { useZoteroSelectedItemIds } from "./react-zotero-sync/selectedItem";
import { useSelectedCollectionId } from "./react-zotero-sync/collection";

interface ItemPaneProps {
  editable: boolean;
}

interface AssignmentEditorProps {
  assignment: ItemSyllabusAssignment;
  collectionId: number;
  assignmentIndex: number;
  editable: boolean;
  isSaving: boolean;
  priorityOptions: Array<{ value: string; label: string; color?: string }>;
  onPriorityChange: (
    assignmentId: string,
    collectionId: number,
    priority: SyllabusPriority | "",
  ) => void;
  onClassNumberChange: (
    assignmentId: string,
    collectionId: number,
    classNumber: number | undefined,
  ) => void;
  onInstructionChange: (
    assignmentId: string,
    collectionId: number,
    instruction: string,
  ) => void;
  onStatusChange: (
    assignmentId: string,
    collectionId: number,
    status: "done" | null,
  ) => void;
  onDelete: (assignmentId: string, collectionId: number) => void;
  onDuplicate: (
    assignmentId: string,
    collectionId: number,
    assignment: ItemSyllabusAssignment,
  ) => void;
}

export function ItemPane({
  editable,
}: ItemPaneProps) {
  const selectedItemIds = useZoteroSelectedItemIds();

  // If item doesn't exist or was deleted, don't render anything
  if (!selectedItemIds) {
    return <div>Item not found</div>;
  }

  if (selectedItemIds.length === 0) {
    return <div>No items selected</div>;
  }

  if (selectedItemIds.length > 1) {
    return <div>{selectedItemIds.length} items selected</div>;
  }

  // Render assignments for each selected item
  return (
    <ItemPaneData
      itemId={selectedItemIds[0]}
      editable={editable}
    />
  );
}

function ItemPaneData({
  itemId,
  editable,
}: {
  itemId: number;
  editable: boolean;
}) {

  const item = useZoteroItem(itemId);

  if (!item || !item.item || item.version === undefined || item.version === null) {
    return <div>Item not found</div>;
  }

  return <ItemPaneContent
    itemVersion={item as { item: Zotero.Item, version: number }}
    editable={editable}
  />;
}

function ItemPaneContent({
  itemVersion,
  editable,
}: {
  itemVersion: { item: Zotero.Item, version: number };
  currentCollectionId?: number | null;
  editable: boolean;
}) {
  const currentCollectionId = useSelectedCollectionId();

  // Get all assignments across all collections
  const allAssignmentsByCollection = useMemo(() => {
    const currentCollection = currentCollectionId ? Zotero.Collections.get(currentCollectionId) : null;

    const collectionsWithAssignments: Array<{
      collection: Zotero.Collection;
      collectionId: number;
      collectionName: string;
      assignments: ItemSyllabusAssignment[];
    }> = [];

    const syllabusData = SyllabusManager.getItemSyllabusData(itemVersion.item);

    if (syllabusData) {
      // Iterate through all collection keys in the syllabus data
      for (const collectionKeyStr of Object.keys(syllabusData)) {
        const assignments = syllabusData[collectionKeyStr];
        if (!Array.isArray(assignments) || assignments.length === 0) {
          continue;
        }

        // Parse collection key string to get libraryID and key
        // Format: "libraryID:collectionKey"
        const parts = collectionKeyStr.split(":");
        if (parts.length < 2) {
          continue;
        }

        const libraryID = parseInt(parts[0], 10);
        const collectionKey = parts.slice(1).join(":"); // In case key contains colons

        if (isNaN(libraryID) || !collectionKey) {
          continue;
        }

        // Get collection from libraryID and key
        try {
          const collection = Zotero.Collections.getByLibraryAndKey(
            libraryID,
            collectionKey,
          );
          if (!collection) {
            continue;
          }

          // Filter out assignments without IDs
          const validAssignments = assignments.filter((a) => a.id);

          if (validAssignments.length > 0) {
            collectionsWithAssignments.push({
              collection,
              collectionId: collection.id,
              collectionName: collection.name,
              assignments: validAssignments.sort(
                SyllabusManager.compareAssignments,
              ),
            });
          }
        } catch (e) {
          ztoolkit.log("Error getting collection:", e);
          continue;
        }
      }

      if (
        !!currentCollection &&
        // not already in the list
        !collectionsWithAssignments.some(
          (c) => c.collectionId === currentCollection!.id,
        )
      ) {
        // Display this collection so assignments can be added to it
        collectionsWithAssignments.push({
          collection: currentCollection!,
          collectionId: currentCollection.id,
          collectionName: currentCollection.name,
          assignments: [],
        });
      }
    }

    // Sort so current collection is first, then alphabetically by name
    collectionsWithAssignments.sort((a, b) => {
      if (a.collectionId === currentCollectionId) return -1;
      if (b.collectionId === currentCollectionId) return 1;
      return a.collectionName.localeCompare(b.collectionName);
    });

    return collectionsWithAssignments;
  }, [itemVersion, currentCollectionId]);

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      // Invalidate cache before saving
      SyllabusManager.invalidateSyllabusDataCache(itemVersion.item);
      await itemVersion.item.saveTx();
      // The useSelectedItem hook will automatically refresh when the item is modified
    } finally {
      setIsSaving(false);
    }
  }, [itemVersion]);

  const handlePriorityChange = useCallback(
    async (
      assignmentId: string,
      collectionId: number,
      priority: SyllabusPriority | "",
    ) => {
      if (!assignmentId) {
        ztoolkit.log("Error: Assignment ID missing");
        return;
      }

      await SyllabusManager.updateClassAssignment(
        itemVersion.item,
        collectionId,
        assignmentId,
        { priority: priority || undefined },
        "item-pane",
      );
      await handleSave();
    },
    [itemVersion, handleSave],
  );

  const handleClassNumberChange = useCallback(
    async (
      assignmentId: string,
      collectionId: number,
      classNumber: number | undefined,
    ) => {
      if (!assignmentId) {
        ztoolkit.log("Error: Assignment ID missing");
        return;
      }

      await SyllabusManager.updateClassAssignment(
        itemVersion.item,
        collectionId,
        assignmentId,
        { classNumber },
        "item-pane",
      );
      await handleSave();
    },
    [itemVersion, handleSave],
  );

  // Store debounce timeouts per assignment ID
  const instructionTimeouts = useRef<
    Map<string, ReturnType<typeof setTimeout>>
  >(new Map());

  const handleInstructionChange = useCallback(
    (assignmentId: string, collectionId: number, instruction: string) => {
      if (!assignmentId) {
        ztoolkit.log("Error: Assignment ID missing");
        return;
      }

      // Clear existing timeout for this assignment
      const existingTimeout = instructionTimeouts.current.get(assignmentId);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      // Set new timeout
      const timeout = setTimeout(async () => {
        await SyllabusManager.updateClassAssignment(
          itemVersion.item,
          collectionId,
          assignmentId,
          { classInstruction: instruction },
          "item-pane",
        );
        await handleSave();
        instructionTimeouts.current.delete(assignmentId);
      }, 500);

      instructionTimeouts.current.set(assignmentId, timeout);
    },
    [itemVersion, handleSave],
  );

  const handleDeleteAssignment = useCallback(
    async (assignmentId: string, collectionId: number) => {
      if (!assignmentId) {
        ztoolkit.log("Error: Assignment ID missing");
        return;
      }

      await SyllabusManager.removeAssignmentById(
        itemVersion.item,
        collectionId,
        assignmentId,
        "item-pane",
      );
      await handleSave();
    },
    [itemVersion, handleSave],
  );

  const handleDuplicateAssignment = useCallback(
    async (
      assignmentId: string,
      collectionId: number,
      assignmentToDuplicate: ItemSyllabusAssignment,
    ) => {
      if (!assignmentId) {
        ztoolkit.log("Error: Assignment ID missing");
        return;
      }

      // Create duplicate with same metadata but new ID
      const duplicateMetadata: Partial<ItemSyllabusAssignment> = {
        classNumber: assignmentToDuplicate.classNumber,
        priority: assignmentToDuplicate.priority,
        classInstruction: assignmentToDuplicate.classInstruction,
      };

      await SyllabusManager.addClassAssignment(
        itemVersion.item,
        collectionId,
        duplicateMetadata.classNumber,
        duplicateMetadata,
        "item-pane",
      );
      await handleSave();
    },
    [itemVersion, handleSave],
  );

  const handleStatusChange = useCallback(
    async (
      assignmentId: string,
      collectionId: number,
      status: "done" | null,
    ) => {
      if (!assignmentId) {
        ztoolkit.log("Error: Assignment ID missing");
        return;
      }

      await SyllabusManager.updateClassAssignment(
        itemVersion.item,
        collectionId,
        assignmentId,
        { status },
        "item-pane",
      );
      await handleSave();
    },
    [itemVersion, handleSave],
  );

  const handleCreateAssignment = useCallback(async (
    itemVersion: { item: Zotero.Item, version: number },
    collectionId: number,
  ) => {
    await SyllabusManager.addClassAssignment(
      itemVersion.item,
      collectionId,
      undefined,
      {},
      "item-pane",
    );
    await handleSave();
  }, [handleSave]);

  // Get priority options for a specific collection
  const getPriorityOptions = useCallback((collectionId: number) => {
    const customPriorities =
      SyllabusManager.getPrioritiesForCollection(collectionId);
    const options = customPriorities.map((p) => ({
      value: p.id,
      label: p.name,
      color: p.color,
    }));
    // Add "(None)" option
    options.push({ value: "", label: "(None)", color: "" });
    return options;
  }, []);

  const totalAssignments = useMemo(() => {
    return allAssignmentsByCollection.reduce(
      (sum, group) => sum + group.assignments.length,
      0,
    );
  }, [allAssignmentsByCollection]);

  return (
    <div className="flex flex-col gap-2 pb-2">
      {totalAssignments === 0 ? (
        <div className="bg-background/50 rounded-md p-3 m-0 flex flex-col opacity-100 transition-opacity duration-200 space-y-3 *:not-last:pb-3 z-10"
        >
          No assignments for this item in any collection.
        </div>
      ) : (
        allAssignmentsByCollection.map((group) => {
          const isCurrentCollection = group.collectionId === currentCollectionId;
          return (
            <div key={group.collectionId} className="flex flex-col gap-2">
              {/* Collection Heading */}
              <header className={twMerge(
                "sticky top-0 bg-background-sidepane z-20 py-2",
                !isCurrentCollection && "mt-2! border-t-2! border-quinary"
              )}>
                <span className="text-xs font-normal text-secondary uppercase tracking-wide">
                  {isCurrentCollection ? "current view" : "also assigned to"}
                </span>
                <div
                  className={twMerge(
                    "text-primary flex items-center gap-2 hover:cursor-pointer hover:bg-quinary active:bg-quarternary rounded-md p-1 -m-1",
                    isCurrentCollection ? "font-semibold" : "font-medium"
                  )}
                  onClick={() => {
                    const ZoteroPane = ztoolkit.getGlobal("ZoteroPane");
                    const collectionsView = ZoteroPane.collectionsView;
                    if (collectionsView) {
                      collectionsView.selectByID(group.collection.treeViewID);
                      // Do not try to view deleted items in a collection.
                      // They do not appear outside of trash, and selecting a deleted item
                      // will re-open trash in collectionTree.
                      if (!itemVersion.item.deleted) {
                        ZoteroPane.selectItem(itemVersion.item.id);
                      }
                    }
                  }}
                >
                  <span className="icon icon-css icon-collection size-[16px]"></span>
                  <span>{group.collectionName}</span>
                </div>
              </header>

              {/* Assignments for this collection */}
              {group.assignments.map((assignment, index) => {
                if (!assignment.id) {
                  return null;
                }

                return (
                  <AssignmentEditor
                    key={assignment.id}
                    assignment={assignment}
                    assignmentIndex={index}
                    collectionId={group.collectionId}
                    editable={editable}
                    isSaving={isSaving}
                    priorityOptions={getPriorityOptions(group.collectionId)}
                    onPriorityChange={handlePriorityChange}
                    onClassNumberChange={handleClassNumberChange}
                    onInstructionChange={handleInstructionChange}
                    onStatusChange={handleStatusChange}
                    onDelete={handleDeleteAssignment}
                    onDuplicate={handleDuplicateAssignment}
                  />
                );
              })}

              {/* Create New Assignment Button for this collection */}
              {editable && (
                <div>
                  <button
                    onClick={() => handleCreateAssignment(itemVersion, group.collectionId)}
                    disabled={isSaving}
                    className="px-2 py-1 text-xs font-medium"
                    onMouseEnter={(e) => {
                      if (!isSaving) {
                        (e.currentTarget as HTMLElement).style.backgroundColor =
                          "var(--fill-quinary)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.backgroundColor =
                        "transparent";
                    }}
                  >
                    + Create assignment
                  </button>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

function AssignmentEditor({
  assignment,
  assignmentIndex,
  collectionId,
  editable,
  isSaving,
  priorityOptions,
  onPriorityChange,
  onClassNumberChange,
  onInstructionChange,
  onStatusChange,
  onDelete,
  onDuplicate,
}: AssignmentEditorProps) {
  if (!assignment.id) {
    return null;
  }

  const classTitle =
    assignment.classNumber !== undefined
      ? SyllabusManager.getClassTitle(collectionId, assignment.classNumber)
      : "";

  const { singularCapitalized } =
    SyllabusManager.getNomenclatureFormatted(collectionId);

  const assignmentStatus = assignment.status || null;
  const isDone = assignmentStatus === "done";

  return (
    <div className="border border-quinary rounded-md m-0 flex flex-col opacity-100 transition-opacity duration-200 bg-background divide-y divide-quarternary space-y-2.5 *:not-last:pb-2.5 p-2.5 z-10">
      {/* Header with class info and status */}
      <header className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          {assignment.classNumber !== undefined ? (
            <div>
              Assignment #{assignmentIndex + 1}{" "}
              {classTitle ? (
                <span>
                  for <span>{classTitle}</span>
                </span>
              ) : null}
            </div>
          ) : (
            <div>Reference material</div>
          )}
        </div>
        {editable && (
          <button
            type="button"
            onClick={() =>
              onStatusChange(
                assignment.id!,
                collectionId,
                isDone ? null : "done",
              )
            }
            disabled={isSaving}
            className={twMerge(
              "px-2 py-1 text-xs font-medium",
              isDone ? "bg-quinary" : "bg-transparent",
              isDone ? "border-quinary" : "border-transparent",
              isDone ? "text-primary" : "text-secondary",
              isSaving
                ? "opacity-30 cursor-not-allowed"
                : "opacity-100 cursor-pointer",
            )}
            onMouseEnter={(e) => {
              if (!isSaving) {
                (e.currentTarget as HTMLElement).style.backgroundColor =
                  "var(--fill-quinary)";
              }
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = isDone
                ? "var(--fill-quinary)"
                : "transparent";
            }}
            title={isDone ? "Mark as not done" : "Mark as done"}
          >
            {isDone ? (
              <span className="flex items-center gap-2">
                Done
                <SquareCheck className="w-5 h-5" />
              </span>
            ) : (
              <span className="flex items-center gap-2">
                Mark done <Square className="w-5 h-5" />
              </span>
            )}
          </button>
        )}
      </header>

      {/* Class Number */}
      <div className="flex items-center gap-2 justify-between">
        <label className="w-1/4 shrink-0 grow-0">{singularCapitalized}</label>
        <input
          type="number"
          min="1"
          step="1"
          disabled={!editable || isSaving}
          placeholder="e.g., 1, 2, 3..."
          value={assignment.classNumber?.toString() || ""}
          onChange={(e) => {
            const target = e.target as HTMLInputElement;
            const value = target.value.trim();
            const classNum = value ? parseInt(value, 10) : undefined;
            if (value && (isNaN(classNum!) || classNum! < 1)) {
              // Invalid input, reset to current value
              target.value = assignment.classNumber?.toString() || "";
              return;
            }
            onClassNumberChange(assignment.id!, collectionId, classNum);
          }}
          className="w-full border-0 hover:not-focus:bg-quinary hover:not-focus:cursor-pointer px-1.5! m-0! box-border text-2xl! font-bold! text-left! text-secondary -my-1.5!"
        />
      </div>

      {/* Priority - Dropdown and Quick Buttons */}
      <div className="flex flex-row gap-2">
        <label className='w-1/4 shrink-0 grow-0'>
          Priority
        </label>
        <div className="flex flex-col gap-1 -my-1">
          {/* Quick Priority Buttons */}
          {editable && (
            <div className="flex flex-wrap">
              {priorityOptions
                .filter((opt) => opt.value !== "")
                .map((opt) => {
                  const isSelected = opt.value === (assignment.priority || "");
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() =>
                        onPriorityChange(
                          assignment.id!,
                          collectionId,
                          isSelected ? ("" as any) : (opt.value as any),
                        )
                      }
                      disabled={isSaving}
                      className={twMerge(
                        "px-2 py-1 text-xs font-medium inline-flex flex-row gap-2 items-center flex-nowrap",
                        "hover:bg-quinary active:bg-quarternary hover:border-quinary hover:text-primary rounded-md",
                        isSelected ? "bg-quinary" : "bg-transparent",
                        isSelected ? "border-quinary" : "border-transparent",
                        isSelected ? "text-primary" : "text-secondary",
                        isSaving
                          ? "opacity-30 cursor-not-allowed"
                          : "opacity-100 cursor-pointer",
                      )}
                      title={opt.label}
                    >
                      {opt.color && (
                        <span
                          className="w-2 h-2 rounded-full inline-block"
                          style={{ backgroundColor: opt.color }}
                        />
                      )}
                      {opt.label}
                    </button>
                  );
                })}
              <button
                type="button"
                onClick={() =>
                  onPriorityChange(assignment.id!, collectionId, "" as any)
                }
                disabled={isSaving || !assignment.priority}
                className={twMerge(
                  "px-2 py-0.5 text-xs font-medium text-secondary bg-transparent border border-transparent rounded-md cursor-pointer transition-all duration-150 opacity-30 hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-50",
                  isSaving || !assignment.priority
                    ? "opacity-30 cursor-not-allowed"
                    : "opacity-100 cursor-pointer",
                )}
                title="Clear priority"
              >
                Clear
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="flex flex-row gap-2">
        <label className="w-1/4 shrink-0 grow-0">
          Instructions
        </label>
        <textarea
          disabled={!editable || isSaving}
          rows={3}
          value={assignment.classInstruction || ""}
          onChange={(e) => {
            const target = e.target as HTMLTextAreaElement;
            onInstructionChange(assignment.id!, collectionId, target.value);
          }}
          placeholder="Add instructions for this assignment..."
          className="-mt-2 p-2 w-full border border-transparent rounded-md bg-background text-primary resize-vertical font-inherit min-h-15 transition-border-color duration-150 box-border hover:not-focus:bg-quinary hover:not-focus:cursor-pointer"
        />
      </div>

      {/* Action Buttons */}
      {editable && (
        <div className="flex justify-between relative flex-0">
          <button
            type="button"
            onClick={() =>
              onDuplicate(assignment.id!, collectionId, assignment)
            }
            disabled={isSaving}
            className={twMerge(
              "px-2 py-1 text-xs font-medium",
              "inline-flex flex-row gap-2 items-center flex-nowrap",
            )}
            title="Duplicate assignment"
          >
            <span className="text-2xl leading-none">⧉</span>
            <span className="text-sm">Duplicate</span>
          </button>
          <button
            type="button"
            onClick={() => onDelete(assignment.id!, collectionId)}
            disabled={isSaving}
            className={twMerge(
              "px-2 py-1 text-xs font-medium transition-all duration-150 opacity-30 hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-50",
              "inline-flex flex-row gap-2 items-center flex-nowrap",
              isSaving
                ? "opacity-30 cursor-not-allowed"
                : "opacity-100 cursor-pointer",
            )}
            title="Delete assignment"
          >
            <span className="text-2xl leading-none">×</span>
            <span className="text-sm">Delete</span>
          </button>
        </div>
      )}
    </div>
  );
}
