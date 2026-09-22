// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h } from "preact";
import type { JSX } from "preact";
import { useCallback } from "preact/hooks";
import { twMerge } from "tailwind-merge";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-preact";
import { uuidv7 } from "uuidv7";
import { getString } from "../utils/locale";
import { Priority, PrioritySchema } from "../utils/schemas";

export interface PrioritiesEditorProps {
  priorities: Priority[];
  onChange: (priorities: Priority[]) => void;
  /**
   * When set, called instead of immediately removing the priority.
   * Use this to confirm remapping of assignments first.
   */
  onRequestDelete?: (priorityId: string) => void | Promise<void>;
  className?: string;
}

/** Shared row grid: color | name (grows) | preview | actions (right edge). */
const ROW_GRID: JSX.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "2rem minmax(0, 1fr) 9.5rem 6.5rem",
  alignItems: "center",
  columnGap: "0.75rem",
  width: "100%",
  boxSizing: "border-box",
  margin: 0,
  padding: "0.625rem 0.75rem",
  listStyle: "none",
};

function sorted(priorities: Priority[]): Priority[] {
  return [...priorities].sort((a, b) => a.order - b.order);
}

function withOrder(priorities: Priority[]): Priority[] {
  return priorities.map((p, index) => ({ ...p, order: index + 1 }));
}

export function PrioritiesEditor({
  priorities,
  onChange,
  onRequestDelete,
  className,
}: PrioritiesEditorProps) {
  const list = sorted(priorities);

  const handleUpdate = useCallback(
    (priorityId: string, updates: Partial<Priority>) => {
      onChange(
        withOrder(
          list.map((p) => (p.id === priorityId ? { ...p, ...updates } : p)),
        ),
      );
    },
    [list, onChange],
  );

  const handleMove = useCallback(
    (priorityId: string, direction: "up" | "down") => {
      const index = list.findIndex((p) => p.id === priorityId);
      if (index === -1) return;
      const next = [...list];
      if (direction === "up" && index > 0) {
        [next[index - 1], next[index]] = [next[index], next[index - 1]];
      } else if (direction === "down" && index < next.length - 1) {
        [next[index], next[index + 1]] = [next[index + 1], next[index]];
      } else {
        return;
      }
      onChange(withOrder(next));
    },
    [list, onChange],
  );

  const handleAdd = useCallback(() => {
    const newPriority: Priority = PrioritySchema.parse({
      id: `custom-${uuidv7()}`,
      name: getString("settings-new-priority-name"),
      color: "#808080",
      order: list.length + 1,
    });
    onChange(withOrder([...list, newPriority]));
  }, [list, onChange]);

  const handleDelete = useCallback(
    (priorityId: string) => {
      if (list.length <= 1) return;
      if (onRequestDelete) {
        void onRequestDelete(priorityId);
        return;
      }
      onChange(withOrder(list.filter((p) => p.id !== priorityId)));
    },
    [list, onChange, onRequestDelete],
  );

  return (
    <div
      className={twMerge(
        "m-0 divide-y divide-quinary rounded-lg border border-quinary overflow-hidden bg-background p-0 w-full",
        className,
      )}
      style={{ width: "100%", boxSizing: "border-box" }}
      role="list"
    >
      {list.map((priority, index) => (
        <PriorityRow
          key={priority.id}
          priority={priority}
          isFirst={index === 0}
          isLast={index === list.length - 1}
          canDelete={list.length > 1}
          onUpdate={(updates) => handleUpdate(priority.id, updates)}
          onMove={(direction) => handleMove(priority.id, direction)}
          onDelete={() => handleDelete(priority.id)}
        />
      ))}
      <div
        style={ROW_GRID}
        className="hover:bg-quinary/25"
        role="listitem"
      >
        <button
          type="button"
          onClick={handleAdd}
          className="flex w-full items-center gap-2.5 m-0 p-0 text-sm text-secondary hover:text-primary cursor-pointer bg-transparent border-0"
          style={{ gridColumn: "1 / -1", minHeight: "2rem" }}
          title={getString("settings-add-priority")}
          aria-label={getString("settings-add-priority")}
        >
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded border border-dashed border-quinary">
            <Plus size={14} aria-hidden="true" />
          </span>
          <span className="font-medium">
            {getString("settings-add-priority-button")}
          </span>
        </button>
      </div>
    </div>
  );
}

interface PriorityRowProps {
  priority: Priority;
  isFirst: boolean;
  isLast: boolean;
  canDelete: boolean;
  onUpdate: (updates: Partial<Priority>) => void;
  onMove: (direction: "up" | "down") => void;
  onDelete: () => void;
}

function PriorityRow({
  priority,
  isFirst,
  isLast,
  canDelete,
  onUpdate,
  onMove,
  onDelete,
}: PriorityRowProps) {
  const color = priority.color || "#AAA";

  return (
    <div style={ROW_GRID} className="hover:bg-quinary/25" role="listitem">
      <input
        type="color"
        value={color}
        onChange={(e) => onUpdate({ color: e.currentTarget.value })}
        className="h-8 w-8 cursor-pointer rounded border border-quinary bg-transparent p-0"
        style={{ width: "2rem", height: "2rem" }}
        title={getString("settings-priority-color")}
        aria-label={getString("settings-priority-color")}
      />

      <input
        type="text"
        value={priority.name}
        onChange={(e) => onUpdate({ name: e.currentTarget.value })}
        className="m-0 rounded-md border border-quinary bg-background px-3 py-1.5 text-sm text-primary focus:outline-2 focus:outline-accent-blue focus:outline-offset-1"
        style={{ width: "100%", minWidth: 0, boxSizing: "border-box" }}
        placeholder={getString("settings-priority-name-placeholder")}
        aria-label={getString("settings-priority-name-label")}
      />

      <span
        className="inline-flex min-w-0 items-center gap-1.5 overflow-hidden rounded px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide"
        style={{
          backgroundColor: `${color}18`,
          color,
          maxWidth: "100%",
        }}
        aria-hidden="true"
      >
        <span
          className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
        />
        <span className="truncate">{priority.name || "—"}</span>
      </span>

      <div
        className="flex items-center justify-end gap-0.5"
        style={{ width: "100%" }}
      >
        <button
          type="button"
          onClick={() => onMove("up")}
          disabled={isFirst}
          className={twMerge(
            "inline-flex h-8 w-8 items-center justify-center rounded",
            isFirst
              ? "text-tertiary cursor-not-allowed"
              : "text-secondary hover:bg-quaternary hover:text-primary cursor-pointer",
          )}
          title={getString("settings-priority-move-up")}
          aria-label={getString("settings-priority-move-up")}
        >
          <ChevronUp size={16} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => onMove("down")}
          disabled={isLast}
          className={twMerge(
            "inline-flex h-8 w-8 items-center justify-center rounded",
            isLast
              ? "text-tertiary cursor-not-allowed"
              : "text-secondary hover:bg-quaternary hover:text-primary cursor-pointer",
          )}
          title={getString("settings-priority-move-down")}
          aria-label={getString("settings-priority-move-down")}
        >
          <ChevronDown size={16} aria-hidden="true" />
        </button>
        {canDelete ? (
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex h-8 w-8 items-center justify-center rounded text-secondary hover:bg-red-500/10 hover:text-red-500 cursor-pointer"
            title={getString("settings-priority-delete")}
            aria-label={getString("settings-priority-delete")}
          >
            <Trash2 size={14} aria-hidden="true" />
          </button>
        ) : (
          <span className="inline-block h-8 w-8" aria-hidden="true" />
        )}
      </div>
    </div>
  );
}
