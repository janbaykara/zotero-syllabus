// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h, Fragment } from "preact";
import { useState, useCallback, useRef, useMemo } from "preact/hooks";
import {
  SyllabusManager,
  SyllabusPriority,
  ItemSyllabusAssignment,
} from "./syllabus";
import { useZoteroItemAssignments } from "./react-zotero-sync/itemAssignments";

interface ItemPaneProps {
  item: Zotero.Item;
  collectionId: number;
  editable: boolean;
}

interface AssignmentEditorProps {
  assignment: ItemSyllabusAssignment;
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
        assignments.map((assignment) => {
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
    <div
      style={{
        border: "1px solid var(--fill-quinary)",
        borderRadius: "6px",
        padding: "16px",
        margin: "0",
        display: "flex",
        flexDirection: "column",
        opacity: isDone ? 0.6 : 1,
        transition: "opacity 0.2s ease",
      }}
      className='bg-quinary/50'
    >
      {/* Header with class info and status */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          {assignment.classNumber !== undefined ? (
            <div
              style={{
                fontSize: "13px",
                fontWeight: "600",
                color: "var(--fill-primary)",
                marginBottom: "2px",
              }}
            >
              {classTitle}
            </div>
          ) : (
            <div
              style={{
                fontSize: "13px",
                fontWeight: "600",
                color: "var(--fill-secondary)",
              }}
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
            style={{
              padding: "4px 8px",
              fontSize: "12px",
              fontWeight: "500",
              color: isDone
                ? "var(--fill-primary)"
                : "var(--fill-secondary)",
              backgroundColor: isDone
                ? "var(--fill-quinary)"
                : "transparent",
              border: "none",
              borderRadius: "4px",
              cursor: isSaving ? "not-allowed" : "pointer",
              opacity: isSaving ? 0.5 : 1,
              transition: "all 0.15s ease",
            }}
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
            {isDone ? "✓ Done" : "Mark done"}
          </button>
        )}
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        {/* Class Number */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "2px",
          }}
        >
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
            style={{
              padding: "3px 8px 18px",
              fontSize: "28px",
              fontWeight: "600",
              border: "1px solid transparent",
              borderRadius: "4px",
              backgroundColor: "var(--color-background)",
              color: "var(--fill-primary)",
              width: "36%",
              textAlign: "center",
              transition: "border-color 0.15s ease",
              margin: "0 auto",
              boxSizing: "border-box",
            }}
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
          <label
            style={{
              fontSize: "11px",
              fontWeight: "500",
              color: "var(--fill-secondary)",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              textAlign: "center",
              marginTop: "-20px",
            }}
          >
            {singularCapitalized} Number
          </label>
        </div>

        {/* Priority - Dropdown and Quick Buttons */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "4px",
          }}
        >
          <label
            style={{
              fontSize: "11px",
              fontWeight: "500",
              color: "var(--fill-secondary)",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            Priority
          </label>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            {/* Quick Priority Buttons */}
            {editable && (
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "6px",
                }}
              >
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
                        style={{
                          padding: "4px 8px",
                          fontSize: "11px",
                          fontWeight: "500",
                          color: isSelected
                            ? opt.color || "var(--fill-primary)"
                            : "var(--fill-secondary)",
                          backgroundColor: isSelected
                            ? opt.color
                              ? `${opt.color}15`
                              : "var(--fill-quinary)"
                            : "transparent",
                          border: isSelected
                            ? `1px solid ${opt.color || "var(--fill-quinary)"}`
                            : "1px solid transparent",
                          borderRadius: "4px",
                          cursor: isSaving ? "not-allowed" : "pointer",
                          opacity: isSaving ? 0.5 : 1,
                          transition: "all 0.15s ease",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                        onMouseEnter={(e) => {
                          if (!isSaving && !isSelected) {
                            (e.currentTarget as HTMLElement).style.backgroundColor =
                              "var(--fill-quinary)";
                            (e.currentTarget as HTMLElement).style.borderColor =
                              "var(--fill-quinary)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) {
                            (e.currentTarget as HTMLElement).style.backgroundColor =
                              "transparent";
                            (e.currentTarget as HTMLElement).style.borderColor =
                              "transparent";
                          }
                        }}
                        title={opt.label}
                      >
                        {opt.color && (
                          <span
                            style={{
                              width: "8px",
                              height: "8px",
                              borderRadius: "50%",
                              backgroundColor: opt.color,
                              display: "inline-block",
                            }}
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
                  style={{
                    padding: "4px 8px",
                    fontSize: "11px",
                    fontWeight: "500",
                    color: "var(--fill-secondary)",
                    backgroundColor: "transparent",
                    border: "1px solid transparent",
                    borderRadius: "4px",
                    cursor: isSaving || !assignment.priority ? "not-allowed" : "pointer",
                    opacity: isSaving || !assignment.priority ? 0.3 : 1,
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (!isSaving && assignment.priority) {
                      (e.currentTarget as HTMLElement).style.backgroundColor =
                        "var(--fill-quinary)";
                      (e.currentTarget as HTMLElement).style.borderColor =
                        "var(--fill-quinary)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor =
                      "transparent";
                    (e.currentTarget as HTMLElement).style.borderColor =
                      "transparent";
                  }}
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
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "4px",
          }}
        >
          <label
            style={{
              fontSize: "11px",
              fontWeight: "500",
              color: "var(--fill-secondary)",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
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
            style={{
              padding: "6px 8px",
              fontSize: "13px",
              width: "100%",
              border: "1px solid transparent",
              boxSizing: "border-box",
              borderRadius: "5px",
              backgroundColor: "var(--color-background)",
              color: "var(--fill-primary)",
              resize: "vertical",
              fontFamily: "inherit",
              minHeight: "60px",
              transition: "border-color 0.15s ease",
            }}
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

        {/* Action Buttons */}
        {editable && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              paddingTop: "4px",
              position: "relative",
            }}
          >
            <button
              type="button"
              onClick={() => onDuplicate(assignment.id!)}
              disabled={isSaving}
              style={{
                padding: "6px 10px",
                fontSize: "10px",
                fontWeight: "500",
                color: "var(--fill-primary)",
                backgroundColor: "transparent",
                border: "none",
                borderRadius: "5px",
                boxSizing: "border-box",
                cursor: isSaving ? "not-allowed" : "pointer",
                opacity: isSaving ? 0.5 : 1,
                transition: "background-color 0.15s ease",
                display: "flex",
                alignItems: "center",
                gap: "4px",
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
              title="Duplicate assignment"
            >
              <span style={{ fontSize: "18px", lineHeight: "1" }}>⧉</span>
              <span style={{ fontSize: "12px" }}>Duplicate</span>
            </button>
            <button
              type="button"
              onClick={() => onDelete(assignment.id!)}
              disabled={isSaving}
              style={{
                padding: "6px 10px",
                fontSize: "16px",
                fontWeight: "500",
                color: "var(--fill-error)",
                backgroundColor: "transparent",
                border: "none",
                borderRadius: "4px",
                cursor: isSaving ? "not-allowed" : "pointer",
                opacity: isSaving ? 0.5 : 1,
                transition: "background-color 0.15s ease",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
              onMouseEnter={(e) => {
                if (!isSaving) {
                  (e.currentTarget as HTMLElement).style.backgroundColor =
                    "var(--fill-error)15";
                }
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor =
                  "transparent";
              }}
              title="Delete assignment"
            >
              <span style={{ fontSize: "18px", lineHeight: "1" }}>×</span>
              <span style={{ fontSize: "12px" }}>Delete</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
