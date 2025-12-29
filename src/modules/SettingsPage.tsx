// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h, Fragment } from "preact";
import { useState, useEffect, useCallback, useMemo } from "preact/hooks";
import type { JSX } from "preact";
import { twMerge } from "tailwind-merge";
import {
  SyllabusManager,
  CustomPriority,
  CollectionSettings,
} from "./syllabus";
import pluralize from "pluralize";

interface SettingsPageProps {
  collectionId: number;
  onBack: () => void;
}

export function SettingsPage({ collectionId, onBack }: SettingsPageProps) {
  const [settings, setSettings] = useState<CollectionSettings>(() =>
    SyllabusManager.getCollectionSettings(collectionId),
  );
  const [isSaving, setIsSaving] = useState(false);

  // Initialize with defaults if empty
  useEffect(() => {
    if (!settings.nomenclature && !settings.priorities) {
      const defaultPriorities = SyllabusManager.getDefaultPriorities();
      setSettings({
        nomenclature: "class",
        priorities: defaultPriorities,
      });
    } else if (!settings.priorities) {
      setSettings({
        ...settings,
        priorities: SyllabusManager.getDefaultPriorities(),
      });
    } else if (!settings.nomenclature) {
      setSettings({
        ...settings,
        nomenclature: "class",
      });
    }
  }, []);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      await SyllabusManager.setCollectionSettings(collectionId, settings, "page");
    } catch (err) {
      ztoolkit.log("Error saving settings:", err);
    } finally {
      setIsSaving(false);
    }
  }, [collectionId, settings]);

  const handleNomenclatureChange = useCallback(
    (value: string) => {
      setSettings({ ...settings, nomenclature: value.trim().toLowerCase() });
    },
    [settings],
  );

  const handlePriorityChange = useCallback(
    (priorityId: string, updates: Partial<CustomPriority>) => {
      if (!settings.priorities) return;
      const updated = settings.priorities.map((p) =>
        p.id === priorityId ? { ...p, ...updates } : p,
      );
      setSettings({ ...settings, priorities: updated });
    },
    [settings],
  );

  const handlePriorityOrderChange = useCallback(
    (priorityId: string, direction: "up" | "down") => {
      if (!settings.priorities) return;
      const index = settings.priorities.findIndex((p) => p.id === priorityId);
      if (index === -1) return;

      const newPriorities = [...settings.priorities];
      if (direction === "up" && index > 0) {
        [newPriorities[index - 1], newPriorities[index]] = [
          newPriorities[index],
          newPriorities[index - 1],
        ];
        // Update order values
        newPriorities[index - 1].order = index;
        newPriorities[index].order = index + 1;
      } else if (direction === "down" && index < newPriorities.length - 1) {
        [newPriorities[index], newPriorities[index + 1]] = [
          newPriorities[index + 1],
          newPriorities[index],
        ];
        // Update order values
        newPriorities[index].order = index + 1;
        newPriorities[index + 1].order = index + 2;
      }
      setSettings({ ...settings, priorities: newPriorities });
    },
    [settings],
  );

  const handleAddPriority = useCallback(() => {
    if (!settings.priorities) return;
    const newPriority: CustomPriority = {
      id: `custom-${Date.now()}`,
      name: "New Priority",
      color: "#808080",
      order: settings.priorities.length + 1,
    };
    setSettings({
      ...settings,
      priorities: [...settings.priorities, newPriority],
    });
  }, [settings]);

  const handleDeletePriority = useCallback(
    (priorityId: string) => {
      if (!settings.priorities) return;
      // Don't allow deleting if only one priority remains
      if (settings.priorities.length <= 1) return;
      const updated = settings.priorities
        .filter((p) => p.id !== priorityId)
        .map((p, index) => ({ ...p, order: index + 1 }));
      setSettings({ ...settings, priorities: updated });
    },
    [settings],
  );

  const nomenclature = settings.nomenclature || "class";
  const pluralNomenclature = useMemo(
    () => pluralize(nomenclature),
    [nomenclature],
  );

  return (
    <div className="syllabus-page overflow-y-auto overflow-x-hidden h-full">
      <div className="pb-12">
        <div className="sticky top-0 z-10 bg-background py-1 md:pt-8">
          <div className="container-padded bg-background">
            <div className="flex flex-row items-center gap-4 justify-between">
              <div className="flex-1 text-3xl font-semibold">
                Syllabus Settings
              </div>
              <div className="inline-flex items-center gap-2">
                <button
                  onClick={onBack}
                  className="grow-0 shrink-0 cursor-pointer flex items-center gap-2"
                  title="Back to syllabus view"
                  aria-label="Back to syllabus view"
                >
                  <span>← Back</span>
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className={twMerge(
                    "grow-0 shrink-0 cursor-pointer flex items-center gap-2 px-4 py-2 rounded-md",
                    isSaving
                      ? "bg-secondary text-tertiary cursor-not-allowed"
                      : "bg-accent-blue text-white hover:bg-accent-blue/90",
                  )}
                  title="Save settings"
                  aria-label="Save settings"
                >
                  <span>{isSaving ? "Saving..." : "Save"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="container-padded mt-8 space-y-8">
          {/* Nomenclature Section */}
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">Nomenclature</h2>
            <p className="text-secondary">
              Choose the term used to refer to individual sessions (e.g., "week",
              "class", "session", "section").
            </p>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-secondary">
                Singular form
              </label>
              <input
                type="text"
                value={nomenclature}
                onChange={(e) =>
                  handleNomenclatureChange(e.currentTarget.value)
                }
                placeholder="e.g., week, class, session, section"
                className="px-4 py-2 border border-quinary rounded-md bg-background text-primary focus:outline-3 focus:outline-accent-blue focus:outline-offset-2"
              />
              <p className="text-sm text-secondary">
                Plural form: <strong>{pluralNomenclature}</strong>
              </p>
            </div>
          </section>

          {/* Priorities Section */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold">Priorities</h2>
                <p className="text-secondary mt-1">
                  Customize priority names, colors, and sort order.
                </p>
              </div>
              <button
                onClick={handleAddPriority}
                className="px-4 py-2 bg-quinary text-primary rounded-md hover:bg-quaternary transition-colors"
                title="Add new priority"
                aria-label="Add new priority"
              >
                + Add Priority
              </button>
            </div>

            <div className="space-y-4">
              {settings.priorities
                ?.sort((a, b) => a.order - b.order)
                .map((priority, index) => (
                  <PriorityEditor
                    key={priority.id}
                    priority={priority}
                    isFirst={index === 0}
                    isLast={index === settings.priorities!.length - 1}
                    onUpdate={(updates) =>
                      handlePriorityChange(priority.id, updates)
                    }
                    onMove={(direction) =>
                      handlePriorityOrderChange(priority.id, direction)
                    }
                    onDelete={() => handleDeletePriority(priority.id)}
                    canDelete={settings.priorities!.length > 1}
                  />
                ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

interface PriorityEditorProps {
  priority: CustomPriority;
  isFirst: boolean;
  isLast: boolean;
  onUpdate: (updates: Partial<CustomPriority>) => void;
  onMove: (direction: "up" | "down") => void;
  onDelete: () => void;
  canDelete: boolean;
}

function PriorityEditor({
  priority,
  isFirst,
  isLast,
  onUpdate,
  onMove,
  onDelete,
  canDelete,
}: PriorityEditorProps) {
  return (
    <div className="border border-quinary rounded-md p-4 bg-quinary/30">
      <div className="flex items-start gap-4">
        {/* Order Controls */}
        <div className="flex flex-col gap-1">
          <button
            onClick={() => onMove("up")}
            disabled={isFirst}
            className={twMerge(
              "px-2 py-1 rounded text-sm",
              isFirst
                ? "text-tertiary cursor-not-allowed"
                : "text-primary hover:bg-quaternary",
            )}
            title="Move up"
            aria-label="Move up"
          >
            ↑
          </button>
          <button
            onClick={() => onMove("down")}
            disabled={isLast}
            className={twMerge(
              "px-2 py-1 rounded text-sm",
              isLast
                ? "text-tertiary cursor-not-allowed"
                : "text-primary hover:bg-quaternary",
            )}
            title="Move down"
            aria-label="Move down"
          >
            ↓
          </button>
        </div>

        {/* Color Picker */}
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={priority.color}
            onChange={(e) => onUpdate({ color: e.currentTarget.value })}
            className="w-12 h-12 rounded border border-quinary cursor-pointer"
            title="Priority color"
            aria-label="Priority color"
          />
        </div>

        {/* Name Input */}
        <div className="flex-1">
          <label className="text-sm font-medium text-secondary block mb-1">
            Name
          </label>
          <input
            type="text"
            value={priority.name}
            onChange={(e) => onUpdate({ name: e.currentTarget.value })}
            className="w-full px-3 py-2 border border-quinary rounded-md bg-background text-primary focus:outline-3 focus:outline-accent-blue focus:outline-offset-2"
            placeholder="Priority name"
          />
        </div>

        {/* Delete Button */}
        {canDelete && (
          <button
            onClick={onDelete}
            className="px-4 py-2 text-red-400 hover:bg-red-500/15 rounded-md transition-colors"
            title="Delete priority"
            aria-label="Delete priority"
          >
            Delete
          </button>
        )}
      </div>

      {/* Preview */}
      <div className="mt-4 pt-4 border-t border-quinary">
        <div className="flex items-center gap-2">
          <span className="text-sm text-secondary">Preview:</span>
          <span
            className="uppercase font-semibold tracking-wide flex flex-row gap-1.5 items-baseline"
          >
            <span
              className="w-3 h-3 rounded-full inline-block"
              style={{ backgroundColor: priority.color }}
            />
            <span
              className="rounded-md px-1 py-0.25"
              style={{
                backgroundColor: priority.color + "15",
                color: priority.color,
              }}
            >
              {priority.name}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}

