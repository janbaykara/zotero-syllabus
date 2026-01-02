// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h, Fragment } from "preact";
import { useState, useEffect, useCallback, useMemo } from "preact/hooks";
import { twMerge } from "tailwind-merge";
import { SyllabusManager, CustomPriority } from "./syllabus";
import pluralize from "pluralize";
import { useZoteroSyllabusMetadata } from "./react-zotero-sync/syllabusMetadata";
import { useDebouncedEffect } from "../utils/react/useDebouncedEffect";
import { CloudSync } from "./cloudSync";
import { ExternalLink, Loader2 } from "lucide-preact";

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
  ] = useZoteroSyllabusMetadata(collectionId);

  // Use local state for immediate UI feedback, but save immediately
  const priorities =
    metadata.priorities || SyllabusManager.getDefaultPriorities();
  const nomenclature = metadata.nomenclature || "class";

  // Local state for nomenclature input (for immediate UI feedback)
  const [localNomenclature, setLocalNomenclature] = useState(nomenclature);

  // Institution and Module Number local state
  const [localInstitution, setLocalInstitution] = useState(
    metadata.institution || "",
  );
  const [localModuleNumber, setLocalModuleNumber] = useState(
    metadata.moduleNumber || "",
  );

  // Import from URL state
  const [importUrl, setImportUrl] = useState("");
  const [isImporting, setIsImporting] = useState(false);

  // Update local state when metadata changes externally
  useEffect(() => {
    setLocalNomenclature(metadata.nomenclature || "class");
  }, [metadata.nomenclature]);

  useEffect(() => {
    setLocalInstitution(metadata.institution || "");
  }, [metadata.institution]);

  useEffect(() => {
    setLocalModuleNumber(metadata.moduleNumber || "");
  }, [metadata.moduleNumber]);

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

  // Debounced save for institution
  useDebouncedEffect(
    () => {
      if (localInstitution !== (metadata.institution || "")) {
        SyllabusManager.setInstitution(
          collectionId,
          localInstitution.trim() || undefined,
          "page",
        );
      }
    },
    [metadata.institution, localInstitution, collectionId],
    500,
  );

  // Debounced save for module number
  useDebouncedEffect(
    () => {
      if (localModuleNumber !== (metadata.moduleNumber || "")) {
        SyllabusManager.setModuleNumber(
          collectionId,
          localModuleNumber.trim() || undefined,
          "page",
        );
      }
    },
    [metadata.moduleNumber, localModuleNumber, collectionId],
    500,
  );

  const handleNomenclatureChange = useCallback((value: string) => {
    setLocalNomenclature(value);
  }, []);

  const handleImportFromUrl = async () => {
    if (!importUrl.trim() || isImporting) return;

    setIsImporting(true);
    try {
      const result = await CloudSync.importFromUrl(collectionId, importUrl.trim());
      if (result.success) {
        setImportUrl("");
        new ztoolkit.ProgressWindow("Import Success", {
          closeOnClick: true,
          closeTime: 3000,
        })
          .createLine({
            text: "Successfully imported syllabus from URL",
            type: "success",
          })
          .show();
      } else {
        new ztoolkit.ProgressWindow("Import Error", {
          closeOnClick: true,
          closeTime: 5000,
        })
          .createLine({
            text: result.error || "Import failed",
            type: "fail",
          })
          .show();
      }
    } catch (err) {
      new ztoolkit.ProgressWindow("Import Error", {
        closeOnClick: true,
        closeTime: 5000,
      })
        .createLine({
          text: err instanceof Error ? err.message : "Import failed",
          type: "fail",
        })
        .show();
    } finally {
      setIsImporting(false);
    }
  };

  const openPublicLibrary = () => {
    Zotero.launchURL(CloudSync.getPublicLibraryUrl());
  };

  const handlePriorityChange = useCallback(
    (priorityId: string, updates: Partial<CustomPriority>) => {
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
    const newPriority: CustomPriority = {
      id: `custom-${Date.now()}`,
      name: "New Priority",
      color: "#808080",
      order: priorities.length + 1,
    };
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

  return (
    <div className="syllabus-page overflow-y-auto overflow-x-hidden h-full">
      <div className="pb-12">
        <div className="sticky top-0 z-10 bg-background py-1 md:pt-8">
          <div className="container-padded bg-background">
            <div className="flex flex-row items-center gap-4 justify-between">
              <div className="flex-1 text-3xl font-semibold">
                Syllabus Settings
              </div>
              <div className="inline-flex items-center gap-2 shrink grow-0">
                <button
                  onClick={onBack}
                  title="Back to syllabus view"
                  aria-label="Back to syllabus view"
                >
                  ← Back
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
              Choose the term used to refer to individual sessions (e.g.,
              "week", "class", "session", "section").
            </p>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-secondary">
                Singular form
              </label>
              <input
                type="text"
                value={localNomenclature}
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
                title="Add new priority"
                aria-label="Add new priority"
              >
                + Add Priority
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

          {/* Course Information Section */}
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">Course Information</h2>
            <p className="text-secondary">
              Add optional metadata about your course or module.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-secondary">
                  Institution
                </label>
                <input
                  type="text"
                  value={localInstitution}
                  onChange={(e) => setLocalInstitution(e.currentTarget.value)}
                  placeholder="e.g., University of Oxford"
                  className="px-4 py-2 border border-quinary rounded-md bg-background text-primary focus:outline-3 focus:outline-accent-blue focus:outline-offset-2"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-secondary">
                  Module / Course Code
                </label>
                <input
                  type="text"
                  value={localModuleNumber}
                  onChange={(e) => setLocalModuleNumber(e.currentTarget.value)}
                  placeholder="e.g., SOC101, HIST-2020"
                  className="px-4 py-2 border border-quinary rounded-md bg-background text-primary focus:outline-3 focus:outline-accent-blue focus:outline-offset-2"
                />
              </div>
            </div>
          </section>

          {/* Cloud Sync Section */}
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">Cloud Sync</h2>
            <p className="text-secondary">
              Share your syllabus on the Public Library or import syllabi from
              others.
            </p>

            <div className="border border-quinary rounded-md p-4 bg-quinary/30 space-y-4">
              {/* API Token Status */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Cloud Sync Status</p>
                  <p className="text-sm text-secondary">
                    {CloudSync.hasApiToken() ? (
                      <span className="text-accent-green">
                        ✓ Connected as {CloudSync.getCloudEmail()}
                      </span>
                    ) : (
                      <span className="text-tertiary">
                        Not connected. Upload a syllabus to register.
                      </span>
                    )}
                  </p>
                </div>
                {CloudSync.hasApiToken() && (
                  <button
                    onClick={() => {
                      CloudSync.clearCredentials();
                      // Force re-render by updating a state
                      setImportUrl("");
                    }}
                    className="text-sm text-secondary hover:text-accent-red"
                  >
                    Disconnect
                  </button>
                )}
              </div>

              {/* Public Library Link */}
              <div className="flex items-center justify-between pt-4 border-t border-quinary">
                <div>
                  <p className="font-medium">Public Library</p>
                  <p className="text-sm text-secondary">
                    Browse and discover syllabi shared by others.
                  </p>
                </div>
                <button
                  onClick={openPublicLibrary}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-accent-blue text-white rounded-md hover:bg-accent-blue/80"
                >
                  <ExternalLink size={16} />
                  Open Library
                </button>
              </div>

              {/* Import from URL */}
              <div className="pt-4 border-t border-quinary">
                <p className="font-medium mb-2">Import from URL</p>
                <p className="text-sm text-secondary mb-3">
                  Paste an export URL from the Public Library to import a
                  syllabus.
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={importUrl}
                    onChange={(e) => setImportUrl(e.currentTarget.value)}
                    placeholder="https://syllabus.zotero.org/api/syllabi/.../export"
                    className="flex-1 px-4 py-2 border border-quinary rounded-md bg-background text-primary focus:outline-3 focus:outline-accent-blue focus:outline-offset-2"
                  />
                  <button
                    onClick={handleImportFromUrl}
                    disabled={!importUrl.trim() || isImporting}
                    className={twMerge(
                      "px-4 py-2 rounded-md inline-flex items-center gap-2",
                      importUrl.trim() && !isImporting
                        ? "bg-accent-blue text-white hover:bg-accent-blue/80"
                        : "bg-quaternary text-tertiary cursor-not-allowed",
                    )}
                  >
                    {isImporting ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Importing...
                      </>
                    ) : (
                      "Import"
                    )}
                  </button>
                </div>
              </div>
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
        <div className="flex flex-0! items-center gap-2">
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
        <div className="flex">
          <label className="text-sm font-medium text-secondary block mb-1">
            Name
          </label>
          <input
            type="text"
            value={priority.name}
            onChange={(e) => onUpdate({ name: e.currentTarget.value })}
            className="m-0 px-3 py-2 border border-quinary rounded-md bg-background text-primary focus:outline-3 focus:outline-accent-blue focus:outline-offset-2"
            placeholder="Priority name"
          />
        </div>

        {/* Delete Button */}
        {canDelete && (
          <button
            onClick={onDelete}
            className="text-red-500! justify-self-end"
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
