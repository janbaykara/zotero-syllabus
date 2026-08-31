// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h, Fragment } from "preact";
import { useState, useEffect, useCallback, useMemo } from "preact/hooks";
import { twMerge } from "tailwind-merge";
import { isZotero8OrLater } from "../utils/zotero";
import { getString, getUiDir } from "../utils/locale";
import { SyllabusManager } from "./syllabus";
import pluralize from "pluralize";
import { useZoteroSyllabusMetadata } from "./react-zotero-sync/syllabusMetadata";
import { useDebouncedEffect } from "../utils/react/useDebouncedEffect";
import { Priority, PrioritySchema } from "../utils/schemas";
import { uuidv7 } from "uuidv7";
import {
  getAvailableStyles,
  getStyleName,
  getQuickCopyStyle,
} from "../utils/cite";

interface SettingsPageProps {
  collectionId: number;
  onBack: () => void;
}

export function SettingsPage({ collectionId, onBack }: SettingsPageProps) {
  const [
    metadata,
    _setDescription,
    _setClassDescription,
    _setClassTitle,
    setNomenclature,
    setPriorities,
    _setInstitution,
    _setCourseCode,
    _setLocked,
    _setLinks,
    setCslStyle,
    setCreateSubcollections,
  ] = useZoteroSyllabusMetadata(collectionId);

  // Use local state for immediate UI feedback, but save immediately
  const priorities =
    metadata.priorities || SyllabusManager.getDefaultPriorities();
  const nomenclature = metadata.nomenclature || "class";

  // Local state for nomenclature input (for immediate UI feedback)
  const [localNomenclature, setLocalNomenclature] = useState(nomenclature);

  // Update local state when metadata changes externally
  useEffect(() => {
    setLocalNomenclature(metadata.nomenclature || "class");
  }, [metadata.nomenclature]);

  // Debounced save for nomenclature
  useDebouncedEffect(
    () => {
      // Don't update the global API too often
      if (localNomenclature !== nomenclature) {
        setNomenclature(localNomenclature.trim().toLowerCase());
      }
    },
    [nomenclature, localNomenclature],
    500,
  );

  const handleNomenclatureChange = useCallback((value: string) => {
    setLocalNomenclature(value);
  }, []);

  const handlePriorityChange = useCallback(
    (priorityId: string, updates: Partial<Priority>) => {
      if (!priorities) return;
      const updated = priorities.map((p) =>
        p.id === priorityId ? { ...p, ...updates } : p,
      );
      setPriorities(updated);
    },
    [priorities, setPriorities],
  );

  const handlePriorityOrderChange = useCallback(
    (priorityId: string, direction: "up" | "down") => {
      if (!priorities) return;
      const index = priorities.findIndex((p) => p.id === priorityId);
      if (index === -1) return;

      const newPriorities = [...priorities];
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
      setPriorities(newPriorities);
    },
    [priorities, setPriorities],
  );

  const handleAddPriority = useCallback(() => {
    if (!priorities) return;
    const newPriority: Priority = PrioritySchema.parse({
      id: `custom-${uuidv7()}`,
      name: getString("settings-new-priority-name"),
      color: "#808080",
      order: priorities.length + 1,
    });
    setPriorities([...priorities, newPriority]);
  }, [priorities, setPriorities]);

  const handleDeletePriority = useCallback(
    (priorityId: string) => {
      if (!priorities) return;
      // Don't allow deleting if only one priority remains
      if (priorities.length <= 1) return;
      const updated = priorities
        .filter((p) => p.id !== priorityId)
        .map((p, index) => ({ ...p, order: index + 1 }));
      setPriorities(updated);
    },
    [priorities, setPriorities],
  );
  const pluralNomenclature = useMemo(
    () => pluralize(localNomenclature),
    [localNomenclature],
  );

  // CSL Style dropdown
  const availableStyles = useMemo(() => getAvailableStyles(), []);
  const quickCopyStyleUrl = useMemo(() => getQuickCopyStyle(), []);
  const defaultStyleName = useMemo(
    () => getStyleName(quickCopyStyleUrl),
    [quickCopyStyleUrl],
  );
  const currentStyle = metadata.cslStyle || null;

  const handleCslStyleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.currentTarget.value;
      setCslStyle(value === "" ? null : value);
    },
    [setCslStyle],
  );

  return (
    <div
      className="syllabus-page overflow-y-auto overflow-x-hidden h-full"
      dir={getUiDir()}
    >
      <div className="pb-12">
        <div
          className={twMerge(
            "sticky top-0 z-10 bg-background py-1",
            isZotero8OrLater() ? "md:pt-8" : "pt-8",
          )}
        >
          <div className="container-padded bg-background">
            <div className="flex flex-row items-center gap-4 justify-between">
              <div className="flex-1 text-3xl font-semibold">
                {getString("settings-title")}
              </div>
              <div className="inline-flex items-center gap-2 shrink grow-0">
                <button
                  onClick={onBack}
                  title={getString("settings-back")}
                  aria-label={getString("settings-back")}
                >
                  ← {getString("nav-back")}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="container-padded mt-8 space-y-8">
          {/* Nomenclature Section */}
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">
              {getString("settings-nomenclature")}
            </h2>
            <p className="text-secondary">
              {getString("settings-nomenclature-desc")}
            </p>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-secondary">
                {getString("settings-singular")}
              </label>
              <input
                type="text"
                value={localNomenclature}
                onChange={(e) =>
                  handleNomenclatureChange(e.currentTarget.value)
                }
                placeholder={getString("settings-nomenclature-placeholder")}
                className="px-4 py-2 border border-quinary rounded-md bg-background text-primary focus:outline-3 focus:outline-accent-blue focus:outline-offset-2"
              />
              <p className="text-sm text-secondary">
                {getString("settings-plural-label")}{" "}
                <strong>{pluralNomenclature}</strong>
              </p>
            </div>
          </section>

          {/* Class folders */}
          <section
            className="space-y-4"
            data-tour="syllabus-class-subcollections"
          >
            <h2 className="text-2xl font-semibold">
              {getString("settings-subcollections")}
            </h2>
            <p className="text-secondary">
              {getString("settings-subcollections-desc")}
            </p>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={metadata.createSubcollections === true}
                onChange={(e) =>
                  setCreateSubcollections(e.currentTarget.checked)
                }
                className="w-4 h-4 cursor-pointer accent-accent-green!"
              />
              <span className="text-sm font-medium">
                {getString("settings-subcollections-checkbox")}
              </span>
            </label>
          </section>

          {/* CSL Style Section */}
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">
              {getString("settings-bib-style")}
            </h2>
            <p className="text-secondary">
              {getString("settings-bib-style-desc")}
            </p>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-secondary">
                {getString("settings-citation-style")}
              </label>
              <select
                value={currentStyle || ""}
                onChange={handleCslStyleChange}
                className="px-4 py-2 border border-quinary rounded-md bg-background text-primary focus:outline-3 focus:outline-accent-blue focus:outline-offset-2"
              >
                <option value="">
                  {defaultStyleName
                    ? getString("settings-user-default-named", {
                        args: { name: defaultStyleName },
                      })
                    : getString("settings-user-default")}
                </option>
                {availableStyles.map((style) => (
                  <option key={style.url} value={style.url}>
                    {style.name}
                  </option>
                ))}
              </select>
            </div>
          </section>

          {/* Priorities Section */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold">
                  {getString("settings-priorities")}
                </h2>
                <p className="text-secondary mt-1">
                  {getString("settings-priorities-desc")}
                </p>
              </div>
              <button
                onClick={handleAddPriority}
                title={getString("settings-add-priority")}
                aria-label={getString("settings-add-priority")}
              >
                + {getString("settings-add-priority-button")}
              </button>
            </div>

            <div className="space-y-4">
              {priorities
                ?.sort((a, b) => a.order - b.order)
                .map((priority, index) => (
                  <PriorityEditor
                    key={priority.id}
                    priority={priority}
                    isFirst={index === 0}
                    isLast={index === priorities.length - 1}
                    onUpdate={(updates) =>
                      handlePriorityChange(priority.id, updates)
                    }
                    onMove={(direction) =>
                      handlePriorityOrderChange(priority.id, direction)
                    }
                    onDelete={() => handleDeletePriority(priority.id)}
                    canDelete={priorities.length > 1}
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
  priority: Priority;
  isFirst: boolean;
  isLast: boolean;
  onUpdate: (updates: Partial<Priority>) => void;
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
            title={getString("settings-priority-move-up")}
            aria-label={getString("settings-priority-move-up")}
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
            title={getString("settings-priority-move-down")}
            aria-label={getString("settings-priority-move-down")}
          >
            ↓
          </button>
        </div>

        {/* Color Picker */}
        <div className="flex flex-0! items-center gap-2">
          <input
            type="color"
            value={priority.color || "#CCC"}
            onChange={(e) => onUpdate({ color: e.currentTarget.value })}
            className="w-12 h-12 rounded border border-quinary cursor-pointer"
            title={getString("settings-priority-color")}
            aria-label={getString("settings-priority-color")}
          />
        </div>

        {/* Name Input */}
        <div className="flex">
          <label className="text-sm font-medium text-secondary block mb-1">
            {getString("settings-priority-name-label")}
          </label>
          <input
            type="text"
            value={priority.name}
            onChange={(e) => onUpdate({ name: e.currentTarget.value })}
            className="m-0 px-3 py-2 border border-quinary rounded-md bg-background text-primary focus:outline-3 focus:outline-accent-blue focus:outline-offset-2"
            placeholder={getString("settings-priority-name-placeholder")}
          />
        </div>

        {/* Delete Button */}
        {canDelete && (
          <button
            onClick={onDelete}
            className="text-red-500! justify-self-end"
            title={getString("settings-priority-delete")}
            aria-label={getString("settings-priority-delete")}
          >
            {getString("settings-priority-delete")}
          </button>
        )}
      </div>

      {/* Preview */}
      <div className="mt-4 pt-4 border-t border-quinary">
        <div className="flex items-center gap-2">
          <span className="text-sm text-secondary">
            {getString("settings-priority-preview")}
          </span>
          <span className="uppercase font-semibold tracking-wide flex flex-row gap-1.5 items-baseline">
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
