// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h, Fragment } from "preact";
import { useState, useCallback, useRef, useMemo } from "preact/hooks";
import {
  SyllabusManager,
  SyllabusPriority,
  ItemSyllabusAssignment,
} from "./syllabus";
import { useZoteroItemAssignments } from "./react-zotero-sync/itemAssignments";
import { Square, SquareCheck } from "lucide-preact";
import { twMerge } from 'tailwind-merge';

interface ItemPaneProps {
  item: Zotero.Item;
  collectionId: number;
  editable: boolean;
}

interface AssignmentEditorProps {
  assignment: ItemSyllabusAssignment;
  assignmentIndex: number;
  collectionId: number;
  editable: boolean;
  isSaving: boolean;
  priorityOptions: Array<{ value: string; label: string; color?: string }>;
  onPriorityChange: (
    assignmentId: string,
    priority: SyllabusPriority | "",
  ) => void;
  onClassNumberChange: (
    assignmentId: string,
    classNumber: number | undefined,
  ) => void;
  onInstructionChange: (assignmentId: string, instruction: string) => void;
  onStatusChange: (assignmentId: string, status: "done" | null) => void;
  onDelete: (assignmentId: string) => void;
  onDuplicate: (assignmentId: string) => void;
}

export function ItemPane({ item, collectionId, editable }: ItemPaneProps) {
  const assignmentsRaw = useZoteroItemAssignments(item.id, collectionId);

  // Sort assignments by class number, then priority
  const assignments = useMemo(() => {
    return [...assignmentsRaw].sort(SyllabusManager.compareAssignments);
  }, [assignmentsRaw]);

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      // Invalidate cache before saving
      SyllabusManager.invalidateSyllabusDataCache(item);
      await item.saveTx();
      // Trigger a notifier event to update stores
      // The store will pick this up via item modify events
    } finally {
      setIsSaving(false);
    }
  }, [item]);

  const handlePriorityChange = useCallback(
    async (assignmentId: string, priority: SyllabusPriority | "") => {
      if (!assignmentId) {
        ztoolkit.log("Error: Assignment ID missing");
        return;
      }

      await SyllabusManager.updateClassAssignment(
        item,
        collectionId,
        assignmentId,
        { priority: priority || undefined },
        "item-pane",
      );
      await handleSave();
    },
    [item, collectionId, handleSave],
  );

  const handleClassNumberChange = useCallback(
    async (assignmentId: string, classNumber: number | undefined) => {
      if (!assignmentId) {
        ztoolkit.log("Error: Assignment ID missing");
        return;
      }

      await SyllabusManager.updateClassAssignment(
        item,
        collectionId,
        assignmentId,
        { classNumber },
        "item-pane",
      );
      await handleSave();
    },
    [item, collectionId, handleSave],
  );

  // Store debounce timeouts per assignment ID
  const instructionTimeouts = useRef<
    Map<string, ReturnType<typeof setTimeout>>
  >(new Map());

  const handleInstructionChange = useCallback(
    (assignmentId: string, instruction: string) => {
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
          item,
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
    [item, collectionId, handleSave],
  );

  const handleDeleteAssignment = useCallback(
    async (assignmentId: string) => {
      if (!assignmentId) {
        ztoolkit.log("Error: Assignment ID missing");
        return;
      }

      await SyllabusManager.removeAssignmentById(
        item,
        collectionId,
        assignmentId,
        "item-pane",
      );
      await handleSave();
    },
    [item, collectionId, handleSave],
  );

  const handleDuplicateAssignment = useCallback(
    async (assignmentId: string) => {
      if (!assignmentId) {
        ztoolkit.log("Error: Assignment ID missing");
        return;
      }

      // Find the assignment to duplicate
      const assignmentToDuplicate = assignments.find(
        (a) => a.id === assignmentId,
      );
      if (!assignmentToDuplicate) {
        ztoolkit.log("Error: Assignment not found for duplication");
        return;
      }

      // Create duplicate with same metadata but new ID
      const duplicateMetadata: Partial<ItemSyllabusAssignment> = {
        classNumber: assignmentToDuplicate.classNumber,
        priority: assignmentToDuplicate.priority,
        classInstruction: assignmentToDuplicate.classInstruction,
      };

      await SyllabusManager.addClassAssignment(
        item,
        collectionId,
        duplicateMetadata.classNumber,
        duplicateMetadata,
        "item-pane",
      );
      await handleSave();
    },
    [item, collectionId, assignments, handleSave],
  );

  const handleStatusChange = useCallback(
    async (assignmentId: string, status: "done" | null) => {
      if (!assignmentId) {
        ztoolkit.log("Error: Assignment ID missing");
        return;
      }

      await SyllabusManager.updateClassAssignment(
        item,
        collectionId,
        assignmentId,
        { status },
        "item-pane",
      );
      await handleSave();
    },
    [item, collectionId, handleSave],
  );

  const handleCreateAssignment = useCallback(async () => {
    await SyllabusManager.addClassAssignment(
      item,
      collectionId,
      undefined,
      {},
      "item-pane",
    );
    await handleSave();
  }, [item, collectionId, handleSave]);

  // Get collection-specific priority options
  const priorityOptions = useMemo(() => {
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
  }, [collectionId]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        padding: "8px 0",
      }}
    >
      {assignments.length === 0 ? (
        <div
          style={{
            padding: "16px",
            color: "var(--fill-secondary)",
            fontSize: "13px",
            textAlign: "center",
            borderRadius: "4px",
            backgroundColor: "var(--fill-quinary)",
          }}
        >
          No assignments for this item in this collection.
        </div>
      ) : (
        assignments.map((assignment, index) => {
          // REQUIRE assignment ID - if missing, skip this assignment
          if (!assignment.id) {
            ztoolkit.log(
              "Warning: Assignment missing ID, skipping render",
              assignment,
            );
            return null;
          }

          return (
            <AssignmentEditor
              key={assignment.id}
              assignment={assignment}
              assignmentIndex={index}
              collectionId={collectionId}
              editable={editable}
              isSaving={isSaving}
              priorityOptions={priorityOptions}
              onPriorityChange={handlePriorityChange}
              onClassNumberChange={handleClassNumberChange}
              onInstructionChange={handleInstructionChange}
              onStatusChange={handleStatusChange}
              onDelete={handleDeleteAssignment}
              onDuplicate={handleDuplicateAssignment}
            />
          );
        })
      )}

      {/* Create New Assignment Button */}
      {editable && (
        <button
          onClick={handleCreateAssignment}
          disabled={isSaving}
          style={{
            padding: "8px 12px",
            minHeight: "32px",
            fontSize: "13px",
            color: "var(--fill-primary)",
            backgroundColor: "transparent",
            border: "none",
            borderRadius: "4px",
            cursor: isSaving ? "not-allowed" : "pointer",
            fontWeight: "500",
            opacity: isSaving ? 0.5 : 1,
            textAlign: "left",
            transition: "background-color 0.15s ease",
          }}
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
          + Create New Assignment
        </button>
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
    <div className="border border-quinary rounded-md p-3 m-0 flex flex-col opacity-100 transition-opacity duration-200 bg-background divide-y-2 divide-quinary space-y-3 *:not-last:pb-3"
    >
      {/* Header with class info and status */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          {assignment.classNumber !== undefined ? (
            <div>
              Assignment #{assignmentIndex + 1} {classTitle ? <span>for <span>{classTitle}</span></span> : null}
            </div>
          ) : (
            <div
              className="text-sm font-medium text-secondary"
            >
              Unassigned
            </div>
          )}
        </div>
        {editable && (
          <button
            type="button"
            onClick={() =>
              onStatusChange(assignment.id!, isDone ? null : "done")
            }
            disabled={isSaving}
            className={twMerge(
              "px-2 py-1 text-xs font-medium",
              isDone ? "bg-quinary" : "bg-transparent",
              isDone ? "border-quinary" : "border-transparent",
              isDone ? "text-primary" : "text-secondary",
              isSaving ? "opacity-30 cursor-not-allowed" : "opacity-100 cursor-pointer",
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
            {isDone ? <span className="flex items-center gap-2">Done<SquareCheck className="w-5 h-5" /></span> : <span className="flex items-center gap-2">Mark done <Square className="w-5 h-5" /></span>}
          </button>
        )}
      </div>

      {/* Class Number */}
      <div className="flex items-center gap-3 justify-between">
        <label>
          {singularCapitalized}
        </label>
        <div className="text-center text-2xl font-bold box-border ml-auto">
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
              onClassNumberChange(assignment.id!, classNum);
            }}
            className="border border-quinary rounded-md p-2 mr-0! w-auto"
            onFocus={(e) => {
              if (editable && !isSaving) {
                (e.currentTarget as HTMLElement).style.borderColor =
                  "var(--color-accent-blue)";
              }
            }}
            onBlur={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor =
                "transparent";
            }}
          />
        </div>
      </div>

      {/* Priority - Dropdown and Quick Buttons */}
      <div className="flex flex-col gap-3"
      >
        <label className="text-xs font-medium text-secondary uppercase tracking-wide">
          Priority
        </label>
        <div className="flex flex-col gap-2">
          {/* Quick Priority Buttons */}
          {editable && (
            <div className="flex flex-wrap gap-2">
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
                          isSelected ? ("" as any) : (opt.value as any),
                        )
                      }
                      disabled={isSaving}
                      className={twMerge(
                        "px-2 py-1 text-xs font-medium inline-flex flex-row gap-2 items-center flex-nowrap",
                        "hover:bg-quinary hover:border-quinary hover:text-primary rounded-md",
                        isSelected ? "bg-quinary" : "bg-transparent",
                        isSelected ? "border-quinary" : "border-transparent",
                        isSelected ? "text-primary" : "text-secondary",
                        isSaving ? "opacity-30 cursor-not-allowed" : "opacity-100 cursor-pointer",
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
                onClick={() => onPriorityChange(assignment.id!, "" as any)}
                disabled={isSaving || !assignment.priority}
                className={twMerge(
                  "px-2 py-1 text-xs font-medium text-secondary bg-transparent border border-transparent rounded-md cursor-pointer transition-all duration-150 opacity-30 hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-50",
                  isSaving || !assignment.priority ? "opacity-30 cursor-not-allowed" : "opacity-100 cursor-pointer",
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
      <div
        className="flex flex-col gap-1"
      >
        <label
          className="text-xs font-medium text-secondary uppercase tracking-wide"
        >
          Instructions
        </label>
        <textarea
          disabled={!editable || isSaving}
          rows={3}
          value={assignment.classInstruction || ""}
          onChange={(e) => {
            const target = e.target as HTMLTextAreaElement;
            onInstructionChange(assignment.id!, target.value);
          }}
          placeholder="Add instructions for this assignment..."
          className="p-2 w-full border border-transparent rounded-md bg-background text-primary resize-vertical font-inherit min-h-15 transition-border-color duration-150"
        />
      </div>

      {/* Action Buttons */}
      {editable && (
        <div
          className="flex justify-between relative flex-0"
        >
          <button
            type="button"
            onClick={() => onDuplicate(assignment.id!)}
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
            onClick={() => onDelete(assignment.id!)}
            disabled={isSaving}
            className={twMerge(
              "px-2 py-1 text-xs font-medium transition-all duration-150 opacity-30 hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-50",
              "inline-flex flex-row gap-2 items-center flex-nowrap",
              isSaving ? "opacity-30 cursor-not-allowed" : "opacity-100 cursor-pointer",
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
