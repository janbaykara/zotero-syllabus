// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h, Fragment } from "preact";
import { useMemo, useState } from "preact/hooks";
import { twMerge } from "tailwind-merge";
import { getString } from "../utils/locale";
import { isOptionalFeatureEnabled } from "./optionalFeatures";
import { collectionHasSyllabusNote } from "./syllabusNote";
import {
  seedShareOptionsFromView,
  setPublishedShareOptions,
} from "../utils/publishShareOptions";
import type {
  CollectionShareOptions,
  ShareGalleryGroupBy,
  ShareGalleryLayout,
  ShareGallerySortBy,
  ShareItemDensity,
  ShareKind,
  ShareQuoteOrder,
} from "../utils/sharePayload";

export type CollectionShareWizardResult = CollectionShareOptions;

function availableKinds(collectionId: number): ShareKind[] {
  const kinds: ShareKind[] = [];
  if (
    isOptionalFeatureEnabled("syllabus") &&
    collectionHasSyllabusNote(collectionId)
  ) {
    kinds.push("syllabus");
  }
  if (isOptionalFeatureEnabled("gallery")) {
    kinds.push("gallery");
  }
  if (!kinds.length) {
    kinds.push("gallery");
  }
  return kinds;
}

/**
 * In-flow option list. Native `<select>` does not open in DialogHelper
 * windows (body overflow:hidden) — see SettingsPage / TECHNICAL.md.
 */
function PickerRow<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value) || options[0];

  return (
    <div className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-secondary">{label}</span>
      <div className="relative">
        <button
          type="button"
          className="w-full flex items-center justify-between gap-2 px-3 py-2 border border-quinary rounded-md bg-background text-primary text-left cursor-pointer"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={label}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="min-w-0 truncate">{current?.label}</span>
          <span className="text-tertiary shrink-0" aria-hidden="true">
            ▾
          </span>
        </button>
        {open ? (
          <div
            role="listbox"
            aria-label={label}
            className="mt-1 max-h-48 overflow-y-auto rounded-md border border-quinary bg-background"
          >
            {options.map((opt) => {
              const selected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={twMerge(
                    "flex w-full items-center px-3 py-2 text-left text-sm border-0 cursor-pointer",
                    selected
                      ? "bg-accent-blue10 text-primary"
                      : "bg-transparent text-primary hover:bg-quinary/40",
                  )}
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                >
                  <span className="min-w-0 flex-1 truncate">{opt.label}</span>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function CheckboxRow({
  label,
  checked,
  onChange,
  title,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  title?: string;
}) {
  return (
    <label
      className="flex items-start gap-2 text-sm cursor-pointer"
      title={title}
    >
      <input
        type="checkbox"
        className="mt-0.5"
        checked={checked}
        onChange={(e) => onChange(e.currentTarget.checked)}
      />
      <span>{label}</span>
    </label>
  );
}

function TextButton({
  children,
  onClick,
  primary,
}: {
  children: preact.ComponentChildren;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      className={twMerge(
        "px-2 py-1 text-sm bg-transparent border-0 cursor-pointer",
        primary
          ? "font-semibold text-accent-blue"
          : "font-normal text-secondary hover:text-primary",
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function CollectionShareWizard({
  collectionId,
  initialKind,
  onCancel,
  onConfirm,
}: {
  collectionId: number;
  /** Prefer this kind from the page the user shared from (Gallery vs Syllabus). */
  initialKind?: ShareKind;
  onCancel: () => void;
  onConfirm: (options: CollectionShareWizardResult) => void;
}) {
  const kinds = useMemo(() => availableKinds(collectionId), [collectionId]);
  // Current page always wins over last-published kind.
  const preferred =
    initialKind && kinds.includes(initialKind) ? initialKind : kinds[0];

  const [step, setStep] = useState(0);
  const [options, setOptions] = useState<CollectionShareOptions>(() =>
    seedShareOptionsFromView({
      collectionId,
      kind: preferred,
      preferPageKind: true,
    }),
  );

  const setKind = (kind: ShareKind) => {
    setOptions(
      seedShareOptionsFromView({
        collectionId,
        kind,
        preferPageKind: true,
      }),
    );
  };

  const patchView = (partial: Partial<CollectionShareOptions["view"]>) => {
    setOptions((prev) => {
      const view = { ...prev.view, ...partial, readerMode: false };
      if (view.sortBy === "personalOrder") {
        view.groupBy = "none";
      }
      if (view.groupBy !== "tags") {
        view.includeAutomaticTags = false;
      }
      return { ...prev, view };
    });
  };

  const layoutOptions: { value: ShareGalleryLayout; label: string }[] = [
    { value: "cover", label: getString("gallery-layout-cover") },
    { value: "card", label: getString("gallery-layout-card") },
    { value: "magazine", label: getString("gallery-layout-magazine") },
    { value: "annotations", label: getString("gallery-layout-annotations") },
  ];

  const sortOptions: { value: ShareGallerySortBy; label: string }[] = [
    { value: "title", label: getString("gallery-sort-az") },
    {
      value: "personalOrder",
      label: getString("gallery-sort-personal-order"),
    },
    { value: "date", label: getString("gallery-sort-date") },
    { value: "dateAdded", label: getString("gallery-sort-date-added") },
  ];

  const groupOptions: { value: ShareGalleryGroupBy; label: string }[] = [
    { value: "none", label: getString("gallery-group-none") },
    { value: "type", label: getString("gallery-group-type") },
    { value: "creator", label: getString("gallery-group-creator") },
    { value: "tags", label: getString("gallery-group-tags") },
  ];

  const densityOptions: { value: ShareItemDensity; label: string }[] = [
    { value: "row", label: getString("page-density-row") },
    { value: "standard", label: getString("page-density-standard") },
    { value: "expanded", label: getString("page-density-expanded") },
  ];

  const quoteOptions: { value: ShareQuoteOrder; label: string }[] = [
    {
      value: "location",
      label: getString("annotations-quote-order-location"),
    },
    {
      value: "dateAdded",
      label: getString("annotations-quote-order-date-added"),
    },
  ];

  const stepTitles = [
    getString("share-wizard-step-kind"),
    getString("share-wizard-step-view"),
  ];
  const lastStep = stepTitles.length - 1;

  const finish = () => {
    const sanitized: CollectionShareOptions = {
      ...options,
      view: {
        ...options.view,
        readerMode: false,
        // Bibliography is always included on the public page.
        showBibliography: true,
      },
    };
    setPublishedShareOptions(collectionId, sanitized);
    onConfirm(sanitized);
  };

  return (
    <div className="flex flex-col gap-4 p-4 min-h-full text-primary">
      <div>
        <h1 className="text-lg font-semibold m-0">
          {getString("share-wizard-title")}
        </h1>
        <p className="text-sm text-secondary m-0 mt-1">
          {getString("share-wizard-step-of", {
            args: {
              step: step + 1,
              total: stepTitles.length,
              label: stepTitles[step],
            },
          })}
        </p>
      </div>

      {step === 0 ? (
        <div className="flex flex-col gap-3 flex-1">
          <p className="text-sm text-secondary m-0">
            {getString("share-wizard-kind-help")}
          </p>
          <div className="flex flex-col gap-2" role="radiogroup">
            {kinds.map((kind) => (
              <label
                key={kind}
                className="flex gap-2 items-start rounded border border-quinary p-3 cursor-pointer"
              >
                <input
                  type="radio"
                  name="share-kind"
                  className="mt-1"
                  checked={options.kind === kind}
                  onChange={() => setKind(kind)}
                />
                <span className="flex flex-col gap-0.5">
                  <strong>
                    {kind === "syllabus"
                      ? getString("share-wizard-kind-syllabus")
                      : getString("share-wizard-kind-gallery")}
                  </strong>
                  <span className="text-sm text-secondary">
                    {kind === "syllabus"
                      ? getString("share-wizard-kind-syllabus-desc")
                      : getString("share-wizard-kind-gallery-desc")}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="flex flex-col gap-4 flex-1 overflow-auto">
          <p className="text-sm text-secondary m-0">
            {getString("share-wizard-view-help")}
          </p>

          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold m-0 text-primary">
              {getString("share-wizard-section-view")}
            </h2>
            {options.kind === "gallery" ? (
              <>
                <PickerRow
                  label={getString("gallery-menu-view")}
                  value={options.view.layout}
                  options={layoutOptions}
                  onChange={(layout) => patchView({ layout })}
                />
                <PickerRow
                  label={getString("gallery-menu-sort")}
                  value={options.view.sortBy}
                  options={sortOptions}
                  onChange={(sortBy) => patchView({ sortBy })}
                />
                {options.view.sortBy !== "personalOrder" ? (
                  <PickerRow
                    label={getString("gallery-menu-group")}
                    value={options.view.groupBy}
                    options={groupOptions}
                    onChange={(groupBy) =>
                      patchView({ groupBy, includeAutomaticTags: false })
                    }
                  />
                ) : null}
                {options.view.layout === "card" ? (
                  <PickerRow
                    label={getString("settings-density")}
                    value={options.view.density}
                    options={densityOptions}
                    onChange={(density) => patchView({ density })}
                  />
                ) : null}
                {options.view.layout === "annotations" ? (
                  <>
                    <PickerRow
                      label={getString("annotations-quote-order-menu")}
                      value={options.view.quoteOrder}
                      options={quoteOptions}
                      onChange={(quoteOrder) => patchView({ quoteOrder })}
                    />
                    <CheckboxRow
                      label={getString("gallery-annotations-show-empty")}
                      checked={options.view.showItemsWithoutAnnotations}
                      onChange={(showItemsWithoutAnnotations) =>
                        patchView({ showItemsWithoutAnnotations })
                      }
                    />
                  </>
                ) : null}
              </>
            ) : (
              <>
                <PickerRow
                  label={getString("gallery-menu-view")}
                  value={options.view.layout}
                  options={layoutOptions}
                  onChange={(layout) => patchView({ layout })}
                />
                {options.view.layout === "card" ? (
                  <PickerRow
                    label={getString("settings-density")}
                    value={options.view.density}
                    options={densityOptions}
                    onChange={(density) => patchView({ density })}
                  />
                ) : null}
                {options.view.layout === "annotations" ? (
                  <>
                    <PickerRow
                      label={getString("annotations-quote-order-menu")}
                      value={options.view.quoteOrder}
                      options={quoteOptions}
                      onChange={(quoteOrder) => patchView({ quoteOrder })}
                    />
                    <CheckboxRow
                      label={getString("gallery-annotations-show-empty")}
                      checked={options.view.showItemsWithoutAnnotations}
                      onChange={(showItemsWithoutAnnotations) =>
                        patchView({ showItemsWithoutAnnotations })
                      }
                    />
                  </>
                ) : null}
              </>
            )}
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold m-0 text-primary">
              {getString("share-wizard-section-data")}
            </h2>
            <CheckboxRow
              label={getString("share-wizard-include-attachments")}
              title={getString("share-wizard-include-attachments-title")}
              checked={options.includeAttachments}
              onChange={(includeAttachments) =>
                setOptions((prev) => ({ ...prev, includeAttachments }))
              }
            />
            <CheckboxRow
              label={getString("share-wizard-include-annotations")}
              title={getString("share-wizard-include-annotations-title")}
              checked={options.includeAnnotations}
              onChange={(includeAnnotations) =>
                setOptions((prev) => ({ ...prev, includeAnnotations }))
              }
            />
            {options.kind === "gallery" && options.view.groupBy === "tags" ? (
              <CheckboxRow
                label={getString("gallery-include-automatic-tags")}
                title={getString("gallery-include-automatic-tags-title")}
                checked={options.view.includeAutomaticTags}
                onChange={(includeAutomaticTags) =>
                  patchView({ includeAutomaticTags })
                }
              />
            ) : null}
            <p className="text-sm text-secondary m-0">
              {getString(
                options.includeAnnotations && options.includeAttachments
                  ? "share-wizard-confirm-with-annotations"
                  : options.includeAnnotations
                    ? "share-wizard-confirm-annotations-only"
                    : options.includeAttachments
                      ? "share-wizard-confirm"
                      : "share-wizard-confirm-no-files",
              )}
            </p>
          </section>
        </div>
      ) : null}

      <div className="flex justify-end gap-3 pt-2 border-t border-quinary">
        <TextButton onClick={onCancel}>
          {getString("share-wizard-cancel")}
        </TextButton>
        {step > 0 ? (
          <TextButton onClick={() => setStep((s) => s - 1)}>
            {getString("share-wizard-back")}
          </TextButton>
        ) : null}
        {step < lastStep ? (
          <TextButton primary onClick={() => setStep((s) => s + 1)}>
            {getString("share-wizard-next")}
          </TextButton>
        ) : (
          <TextButton primary onClick={finish}>
            {getString("share-wizard-publish")}
          </TextButton>
        )}
      </div>
    </div>
  );
}
