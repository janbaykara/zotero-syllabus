// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h } from "preact";
import { useState } from "preact/hooks";
import { twMerge } from "tailwind-merge";
import { getString, getUiDir } from "../utils/locale";
import { Priority } from "../utils/schemas";
import { openPreactDialogAsync } from "../utils/preactDialog";

export type DeletePriorityDialogResult =
  | { action: "migrate"; targetId: string }
  | { action: "clear" }
  | { action: "cancel" };

function DeletePriorityDialogBody({
  priorityName,
  assignmentCount,
  remaining,
  selection,
}: {
  priorityName: string;
  assignmentCount: number;
  remaining: Priority[];
  selection: { id: string };
}) {
  const [selectedId, setSelectedId] = useState(selection.id);

  return (
    <div className="p-5 space-y-4" dir={getUiDir()} style={{ minWidth: 360 }}>
      <p className="text-base leading-snug text-primary m-0">
        {getString("settings-priority-delete-message", {
          args: { count: assignmentCount, name: priorityName },
        })}
      </p>
      <div className="flex flex-col gap-1.5">
        <div className="text-sm font-medium text-secondary">
          {getString("settings-priority-delete-migrate-label")}
        </div>
        {/* Native <select> does not open in DialogHelper windows (body
            overflow:hidden). Use an explicit option list instead. */}
        <div
          role="listbox"
          aria-label={getString("settings-priority-delete-migrate-label")}
          className="rounded-md border border-quinary overflow-hidden bg-background"
        >
          {remaining.map((p) => {
            const selected = p.id === selectedId;
            const color = p.color || "#AAA";
            return (
              <button
                key={p.id}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  selection.id = p.id;
                  setSelectedId(p.id);
                }}
                className={twMerge(
                  "flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm border-0 cursor-pointer",
                  selected
                    ? "bg-accent-blue10 text-primary"
                    : "bg-transparent text-primary hover:bg-quinary/40",
                )}
              >
                <span
                  className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: color }}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1 truncate">{p.name}</span>
                {selected ? (
                  <span className="text-accent-blue text-xs font-medium shrink-0">
                    ✓
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * Ask how to handle assignments that used a priority about to be deleted.
 * Resolves with migrate / clear / cancel.
 */
export function openDeletePriorityDialog(options: {
  priority: Priority;
  remaining: Priority[];
  assignmentCount: number;
}): Promise<DeletePriorityDialogResult> {
  const { priority, remaining, assignmentCount } = options;

  if (!remaining.length) {
    return Promise.resolve({ action: "clear" });
  }

  const selection = { id: remaining[0].id };

  return openPreactDialogAsync({
    title: getString("settings-priority-delete-title"),
    rootId: "syllabus-delete-priority-root",
    content: () => (
      <DeletePriorityDialogBody
        priorityName={priority.name}
        assignmentCount={assignmentCount}
        remaining={remaining}
        selection={selection}
      />
    ),
    buttons: [
      {
        id: "migrate",
        label: getString("settings-priority-delete-migrate"),
      },
      {
        id: "clear",
        label: getString("settings-priority-delete-clear"),
      },
      {
        id: "cancel",
        label: getString("settings-priority-delete-cancel"),
      },
    ],
    features: {
      width: 440,
      height: Math.min(420, 220 + remaining.length * 40),
      fitContent: true,
      resizable: true,
    },
    mapResult: (buttonId): DeletePriorityDialogResult => {
      if (buttonId === "migrate" && selection.id) {
        return { action: "migrate", targetId: selection.id };
      }
      if (buttonId === "clear") {
        return { action: "clear" };
      }
      return { action: "cancel" };
    },
  });
}
