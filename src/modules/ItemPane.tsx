// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h, Fragment } from "preact";
import { useState, useCallback, useRef, useMemo } from "preact/hooks";
import { SyllabusManager, SyllabusPriority, ItemSyllabusAssignment } from "./syllabus";
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
  onPriorityChange: (assignmentId: string, priority: SyllabusPriority | "") => void;
  onClassNumberChange: (assignmentId: string, classNumber: number | undefined) => void;
  onInstructionChange: (assignmentId: string, instruction: string) => void;
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
  const instructionTimeouts = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

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
      const assignmentToDuplicate = assignments.find((a) => a.id === assignmentId);
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

  const priorityOptions = SyllabusManager.getPriorityOptions();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {assignments.length === 0 ? (
        <div style={{ padding: "10px", color: "var(--fill-secondary)", fontSize: "13px" }}>
          No assignments for this item in this collection.
        </div>
      ) : (
        assignments.map((assignment) => {
          // REQUIRE assignment ID - if missing, skip this assignment
          if (!assignment.id) {
            ztoolkit.log("Warning: Assignment missing ID, skipping render", assignment);
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
            padding: "8px 16px",
            minHeight: "32px",
            fontSize: "13px",
            color: "var(--fill-primary)",
            backgroundColor: "transparent",
            border: "1px solid var(--fill-primary)",
            borderRadius: "4px",
            cursor: isSaving ? "not-allowed" : "pointer",
            fontWeight: "500",
            opacity: isSaving ? 0.5 : 1,
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
  onDelete,
  onDuplicate,
}: AssignmentEditorProps) {
  if (!assignment.id) {
    return null;
  }

  const classTitle =
    assignment.classNumber !== undefined
      ? SyllabusManager.getClassTitle(
        collectionId,
        assignment.classNumber,
      )
      : "";

  let legendText = "Syllabus item";
  if (assignment.classNumber !== undefined) {
    legendText = classTitle
      ? `Class ${assignment.classNumber}: ${classTitle}`
      : `Class ${assignment.classNumber}`;
  }

  return (
    <fieldset
      style={{
        border: "1px solid var(--fill-quinary)",
        borderRadius: "4px",
        padding: "12px",
        margin: "0",
      }}
    >
      <legend
        style={{
          padding: "0 8px",
          fontSize: "13px",
          fontWeight: "500",
        }}
      >
        {legendText}
      </legend>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        }}
      >

        {/* Class Number */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "max-content 1fr",
            columnGap: "18px",
            rowGap: "10px",
            alignItems: "center",
          }}
        >
          <label
            style={{
              fontWeight: "normal",
              textAlign: "end",
              color: "var(--fill-secondary)",
            }}
          >
            Class Number
          </label>
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
              textAlign: "start",
              border: "none",
              fontSize: "13px",
              width: "100%",
              margin: "0",
            }}
          />
        </div>

        {/* Priority */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "max-content 1fr",
            columnGap: "18px",
            rowGap: "10px",
            alignItems: "center",
          }}
        >
          <label
            style={{
              fontWeight: "normal",
              textAlign: "end",
              color: "var(--fill-secondary)",
            }}
          >
            Priority
          </label>
          <select
            disabled={!editable || isSaving}
            value={assignment.priority || ""}
            onChange={(e) => {
              const target = e.target as HTMLSelectElement;
              onPriorityChange(assignment.id!, target.value as any);
            }}
            style={{
              padding: "5px",
              fontSize: "13px",
              width: "100%",
              margin: "0",
            }}
          >
            {priorityOptions.map((opt) => (
              <option
                key={opt.value}
                value={opt.value}
                style={
                  opt.color
                    ? {
                      color: opt.color,
                      fontWeight: "500",
                    }
                    : undefined
                }
              >
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Instructions */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "max-content 1fr",
            columnGap: "18px",
            rowGap: "10px",
            alignItems: "center",
          }}
        >
          <label
            style={{
              fontWeight: "normal",
              textAlign: "end",
              color: "var(--fill-secondary)",
            }}
          >
            Instructions
          </label>
          <textarea
            disabled={!editable || isSaving}
            rows={4}
            value={assignment.classInstruction || ""}
            onChange={(e) => {
              const target = e.target as HTMLTextAreaElement;
              onInstructionChange(assignment.id!, target.value);
            }}
            style={{
              padding: "0",
              margin: "0",
              border: "none",
              fontSize: "13px",
              width: "100%",
              resize: "vertical",
              fontFamily: "inherit",
            }}
          />
        </div>

        {/* Action Buttons */}
        {editable && (
          <div style={{ display: "flex", gap: "8px", alignSelf: "flex-start" }}>
            <button
              onClick={() => onDuplicate(assignment.id!)}
              disabled={isSaving}
              style={{
                padding: "6px 12px",
                minHeight: 32,
                fontSize: "12px",
                color: "var(--fill-primary)",
                backgroundColor: "transparent",
                border: "1px solid var(--fill-primary)",
                borderRadius: "4px",
                cursor: isSaving ? "not-allowed" : "pointer",
                opacity: isSaving ? 0.5 : 1,
              }}
              title="Duplicate"
            >
              Duplicate
            </button>
            <button
              onClick={() => onDelete(assignment.id!)}
              disabled={isSaving}
              style={{
                padding: "6px 12px",
                minHeight: 32,
                fontSize: "12px",
                color: "var(--fill-error)",
                backgroundColor: "transparent",
                border: "1px solid var(--fill-error)",
                borderRadius: "4px",
                cursor: isSaving ? "not-allowed" : "pointer",
                opacity: isSaving ? 0.5 : 1,
              }}
              title="Delete"
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </fieldset>
  );
}

