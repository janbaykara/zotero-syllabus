// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h, Fragment } from "preact";
import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "preact/hooks";
import type { ComponentChildren, JSX } from "preact";
import { twMerge } from "tailwind-merge";
import { formatDate } from "date-fns";
import slugify from "slugify";
import { Download, Upload } from "lucide-preact";
import { isZotero8OrLater } from "../utils/zotero";
import { getString, getUiDir } from "../utils/locale";
import { saveToFile } from "../utils/file";
import { confirmPrompt } from "../utils/window";
import { SyllabusManager } from "./syllabus";
import pluralize from "pluralize";
import { useZoteroSyllabusMetadata } from "./react-zotero-sync/syllabusMetadata";
import { useZoteroCollectionTitle } from "./react-zotero-sync/collectionTitle";
import { useDebouncedEffect } from "../utils/react/useDebouncedEffect";
import {
  getAvailableStyles,
  getStyleName,
  getQuickCopyStyle,
} from "../utils/cite";
import { PrioritiesEditor } from "./PrioritiesEditor";
import { Priority } from "../utils/schemas";
import {
  clonePriorities,
  getGlobalDefaultPriorities,
  setGlobalDefaultPriorities,
} from "./defaultPriorities";
import { openGlobalPrioritiesDialog } from "./openGlobalPrioritiesDialog";
import { openDeletePriorityDialog } from "./openDeletePriorityDialog";

interface SettingsPageProps {
  collectionId: number;
  /** `window` = popout DialogHelper chrome (no Zotero tab-bar padding). */
  presentation?: "page" | "window";
}

async function importSyllabusMetadataFromFile(
  collectionId: number,
  file: File,
): Promise<void> {
  try {
    const fileContents = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result;
        if (typeof content === "string") {
          resolve(content);
        } else if (content instanceof ArrayBuffer) {
          resolve(new TextDecoder("utf-8").decode(content));
        } else {
          reject(new Error("Failed to read file contents"));
        }
      };
      reader.onerror = () => reject(new Error("Error reading file"));
      reader.readAsText(file);
    });

    await SyllabusManager.importSyllabusMetadata(
      collectionId,
      fileContents,
      "page",
    );

    ztoolkit.log("Successfully imported and merged syllabus metadata");

    new ztoolkit.ProgressWindow(getString("progress-import-success-title"), {
      closeOnClick: true,
      closeTime: 3000,
    })
      .createLine({
        text: getString("progress-import-success-text"),
        type: "success",
      })
      .show();
  } catch (error) {
    new ztoolkit.ProgressWindow(getString("progress-import-error-title"), {
      closeOnClick: true,
      closeTime: 5000,
    })
      .createLine({
        text: error instanceof Error ? error.message : String(error),
        type: "fail",
      })
      .show();
    ztoolkit.log("Import processing error:", error);
  }
}

function SettingsSection({
  title,
  description,
  children,
  "data-tour": dataTour,
}: {
  title: string;
  description?: string;
  children: ComponentChildren;
  "data-tour"?: string;
}) {
  return (
    <section className="space-y-2" data-tour={dataTour}>
      <div>
        {/* Use a div — Zotero chrome styles beat Tailwind on heading tags. */}
        <div className="text-xl font-semibold text-primary">{title}</div>
        {description ? (
          <p className="mt-1 text-base leading-snug text-secondary">
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function SettingsPage({
  collectionId,
  presentation = "page",
}: SettingsPageProps) {
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
  const [title] = useZoteroCollectionTitle(collectionId);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const collectionPriorities =
    metadata.priorities && metadata.priorities.length > 0
      ? metadata.priorities
      : SyllabusManager.getDefaultPriorities();
  const nomenclature = metadata.nomenclature || "class";

  const [localNomenclature, setLocalNomenclature] = useState(nomenclature);

  useEffect(() => {
    setLocalNomenclature(metadata.nomenclature || "class");
  }, [metadata.nomenclature]);

  useDebouncedEffect(
    () => {
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

  const handleCollectionPrioritiesChange = useCallback(
    (next: Priority[]) => {
      setPriorities(next);
    },
    [setPriorities],
  );

  const handleRequestDeletePriority = useCallback(
    async (priorityId: string) => {
      const remaining = collectionPriorities.filter((p) => p.id !== priorityId);
      if (remaining.length < 1) return;

      const doomed = collectionPriorities.find((p) => p.id === priorityId);
      if (!doomed) return;

      const usedCount = SyllabusManager.countAssignmentsWithPriority(
        collectionId,
        priorityId,
      );

      if (usedCount <= 0) {
        setPriorities(
          remaining.map((p, index) => ({ ...p, order: index + 1 })),
        );
        return;
      }

      const result = await openDeletePriorityDialog({
        priority: doomed,
        remaining,
        assignmentCount: usedCount,
      });
      if (result.action === "cancel") return;

      try {
        await SyllabusManager.deletePriorityAndRemap(
          collectionId,
          priorityId,
          result.action === "migrate" ? result.targetId : null,
        );
      } catch (error) {
        ztoolkit.log("Error deleting priority:", error);
      }
    },
    [collectionId, collectionPriorities, setPriorities],
  );

  const handleSetAsGlobalDefaults = useCallback(() => {
    const confirmed = confirmPrompt(
      getString("settings-priorities-set-global-confirm-title"),
      getString("settings-priorities-set-global-confirm-message"),
    );
    if (!confirmed) return;

    setGlobalDefaultPriorities(clonePriorities(collectionPriorities));
    new ztoolkit.ProgressWindow(getString("app-name"), {
      closeOnClick: true,
      closeTime: 2500,
    })
      .createLine({
        text: getString("settings-priorities-set-global-done"),
        type: "success",
      })
      .show();
  }, [collectionPriorities]);

  const handleResetToGlobalDefaults = useCallback(async () => {
    const confirmed = confirmPrompt(
      getString("settings-priorities-reset-global-confirm-title"),
      getString("settings-priorities-reset-global-confirm-message"),
    );
    if (!confirmed) return;

    const globals = clonePriorities(getGlobalDefaultPriorities());
    if (!globals.length) return;

    const globalIds = new Set(globals.map((p) => p.id));
    const orphaned = collectionPriorities.filter((p) => !globalIds.has(p.id));
    const remaps = new Map<string, string | null>();

    for (const orphan of orphaned) {
      const usedCount = SyllabusManager.countAssignmentsWithPriority(
        collectionId,
        orphan.id,
      );
      if (usedCount <= 0) continue;

      const result = await openDeletePriorityDialog({
        priority: orphan,
        remaining: globals,
        assignmentCount: usedCount,
      });
      if (result.action === "cancel") return;

      remaps.set(
        orphan.id,
        result.action === "migrate" ? result.targetId : null,
      );
    }

    try {
      await SyllabusManager.replacePrioritiesAndRemap(
        collectionId,
        globals,
        remaps,
      );
      new ztoolkit.ProgressWindow(getString("app-name"), {
        closeOnClick: true,
        closeTime: 2500,
      })
        .createLine({
          text: getString("settings-priorities-reset-global-done"),
          type: "success",
        })
        .show();
    } catch (error) {
      ztoolkit.log("Error resetting priorities to global defaults:", error);
    }
  }, [collectionId, collectionPriorities]);

  const pluralNomenclature = useMemo(
    () => pluralize(localNomenclature),
    [localNomenclature],
  );

  const availableStyles = useMemo(() => getAvailableStyles(), []);
  const quickCopyStyleUrl = useMemo(() => getQuickCopyStyle(), []);
  const defaultStyleName = useMemo(
    () => getStyleName(quickCopyStyleUrl),
    [quickCopyStyleUrl],
  );
  const currentStyle = metadata.cslStyle || null;

  const defaultStyleLabel = defaultStyleName
    ? getString("settings-user-default-named", {
        args: { name: defaultStyleName },
      })
    : getString("settings-user-default");

  const currentStyleLabel = useMemo(() => {
    if (!currentStyle) return defaultStyleLabel;
    return (
      availableStyles.find((s) => s.url === currentStyle)?.name || currentStyle
    );
  }, [availableStyles, currentStyle, defaultStyleLabel]);

  const [stylePickerOpen, setStylePickerOpen] = useState(false);

  const handleCslStyleChange = useCallback(
    (value: string) => {
      setCslStyle(value === "" ? null : value);
      setStylePickerOpen(false);
    },
    [setCslStyle],
  );

  const handleExport = async () => {
    try {
      const rdf = await SyllabusManager.prepareExportData(collectionId);
      const dateStr = formatDate(new Date(), "yyyy-MM-dd");
      const titleSlug = slugify(title || "syllabus", {
        lower: true,
        strict: true,
      });
      const filename = `${titleSlug}-${dateStr}.syllabus`;
      await saveToFile(filename, rdf, getString("dialog-save-export"));
    } catch (err) {
      ztoolkit.log("Error exporting syllabus metadata:", err);
    }
  };

  const handleFileInputChange = async (
    e: JSX.TargetedEvent<HTMLInputElement>,
  ) => {
    const target = e.target as HTMLInputElement;
    const selectedFile = target.files?.[0];
    target.value = "";
    if (!selectedFile) {
      return;
    }
    await importSyllabusMetadataFromFile(collectionId, selectedFile);
  };

  const actionButtonClass =
    "inline-flex items-center gap-2 px-3 py-2 rounded-md border border-quinary bg-background text-primary hover:bg-quinary cursor-pointer";

  const linkButtonClass =
    "text-base text-accent-blue hover:underline cursor-pointer bg-transparent border-0 p-0";

  return (
    <div
      className="syllabus-page overflow-y-auto overflow-x-hidden h-full bg-background-sidepane"
      dir={getUiDir()}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".syllabus"
        style={{ display: "none" }}
        onChange={handleFileInputChange}
      />
      <div className="pb-12">
        <div
          className={twMerge(
            "sticky top-0 z-10 bg-background-sidepane py-1",
            presentation === "window"
              ? "pt-4"
              : isZotero8OrLater()
                ? "md:pt-8"
                : "pt-8",
          )}
        >
          <div className="container-padded bg-background-sidepane">
            <div className="flex-1 text-3xl font-semibold">
              {getString("settings-title")}
            </div>
          </div>
        </div>

        <div className="container-padded mt-8 space-y-10">
          <SettingsSection
            title={getString("settings-nomenclature")}
            description={getString("settings-nomenclature-desc")}
          >
            <div className="flex flex-col gap-2 max-w-md">
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
                className="px-3 py-2 border border-quinary rounded-md bg-background text-primary focus:outline-3 focus:outline-accent-blue focus:outline-offset-2"
              />
              <p className="text-sm text-secondary">
                {getString("settings-plural-label")}{" "}
                <strong>{pluralNomenclature}</strong>
              </p>
            </div>
          </SettingsSection>

          <SettingsSection
            title={getString("settings-subcollections")}
            description={getString("settings-subcollections-desc")}
            data-tour="syllabus-class-subcollections"
          >
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
          </SettingsSection>

          <SettingsSection
            title={getString("settings-bib-style")}
            description={getString("settings-bib-style-desc")}
          >
            <div className="flex flex-col gap-2 max-w-md">
              <label className="text-sm font-medium text-secondary">
                {getString("settings-citation-style")}
              </label>
              {/* Native <select> does not open in DialogHelper windows
                  (body overflow:hidden). Use an in-flow picker instead. */}
              <div className="relative">
                <button
                  type="button"
                  className="w-full flex items-center justify-between gap-2 px-3 py-2 border border-quinary rounded-md bg-background text-primary text-left cursor-pointer focus:outline-3 focus:outline-accent-blue focus:outline-offset-2"
                  aria-haspopup="listbox"
                  aria-expanded={stylePickerOpen}
                  aria-label={getString("settings-citation-style")}
                  onClick={() => setStylePickerOpen((open) => !open)}
                >
                  <span className="min-w-0 truncate">{currentStyleLabel}</span>
                  <span className="text-tertiary shrink-0" aria-hidden="true">
                    ▾
                  </span>
                </button>
                {stylePickerOpen ? (
                  <div
                    role="listbox"
                    aria-label={getString("settings-citation-style")}
                    className="mt-1 max-h-64 overflow-y-auto rounded-md border border-quinary bg-background"
                  >
                    <button
                      type="button"
                      role="option"
                      aria-selected={!currentStyle}
                      onClick={() => handleCslStyleChange("")}
                      className={twMerge(
                        "flex w-full items-center px-3 py-2 text-left text-sm border-0 cursor-pointer",
                        !currentStyle
                          ? "bg-accent-blue10 text-primary"
                          : "bg-transparent text-primary hover:bg-quinary/40",
                      )}
                    >
                      <span className="min-w-0 flex-1 truncate">
                        {defaultStyleLabel}
                      </span>
                    </button>
                    {availableStyles.map((style) => {
                      const selected = style.url === currentStyle;
                      return (
                        <button
                          key={style.url}
                          type="button"
                          role="option"
                          aria-selected={selected}
                          onClick={() => handleCslStyleChange(style.url)}
                          className={twMerge(
                            "flex w-full items-center px-3 py-2 text-left text-sm border-0 cursor-pointer",
                            selected
                              ? "bg-accent-blue10 text-primary"
                              : "bg-transparent text-primary hover:bg-quinary/40",
                          )}
                        >
                          <span className="min-w-0 flex-1 truncate">
                            {style.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            </div>
          </SettingsSection>

          <SettingsSection
            title={getString("settings-priorities")}
            description={getString("settings-priorities-desc")}
          >
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <button
                type="button"
                className={linkButtonClass}
                onClick={() => void handleResetToGlobalDefaults()}
              >
                {getString("settings-priorities-reset-global")}
              </button>
              <span className="text-tertiary" aria-hidden="true">
                ·
              </span>
              <button
                type="button"
                className={linkButtonClass}
                onClick={() => openGlobalPrioritiesDialog()}
              >
                {getString("settings-priorities-global-link")}
              </button>
              <span className="text-tertiary" aria-hidden="true">
                ·
              </span>
              <button
                type="button"
                className={linkButtonClass}
                onClick={handleSetAsGlobalDefaults}
              >
                {getString("settings-priorities-set-global")}
              </button>
            </div>
            <PrioritiesEditor
              priorities={collectionPriorities}
              onChange={handleCollectionPrioritiesChange}
              onRequestDelete={handleRequestDeletePriority}
            />
          </SettingsSection>

          <SettingsSection
            title={getString("settings-file")}
            description={getString("settings-file-desc")}
          >
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className={actionButtonClass}
                title={getString("page-export")}
                aria-label={getString("page-export")}
                onClick={() => void handleExport()}
              >
                <Upload size={18} aria-hidden="true" />
                <span>{getString("page-export")}</span>
              </button>
              <button
                type="button"
                className={actionButtonClass}
                title={getString("page-import")}
                aria-label={getString("page-import")}
                onClick={() => fileInputRef.current?.click()}
              >
                <Download size={18} aria-hidden="true" />
                <span>{getString("page-import")}</span>
              </button>
            </div>
          </SettingsSection>
        </div>
      </div>
    </div>
  );
}
