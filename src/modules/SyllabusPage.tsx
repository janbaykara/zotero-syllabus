// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h, Fragment } from "preact";
import { useState, useEffect, useMemo, useRef } from "preact/hooks";
import type { JSX } from "preact";
import { generateBibliographicReference } from "../utils/cite";
import { getPref } from "../utils/prefs";
import { SyllabusManager } from "./syllabus";
import { renderComponent } from "../utils/react";
import { useZoteroCollectionTitle } from "./react-zotero-sync/collectionTitle";
import { useZoteroSyllabusMetadata } from "./react-zotero-sync/syllabusMetadata";
import { useZoteroCollectionItems } from "./react-zotero-sync/collectionItems";

// Define priority type for use in this file
// These values match SyllabusPriority enum in syllabus.ts
type SyllabusPriorityType = "course-info" | "essential" | "recommended" | "optional";

interface SyllabusPageProps {
  collectionId: number;
}

export function SyllabusPage({ collectionId }: SyllabusPageProps) {
  // Sync with external Zotero stores using hooks
  const [title, setTitle] = useZoteroCollectionTitle(collectionId);
  const [syllabusMetadata, setDescription, setClassDescription, setClassTitle] = useZoteroSyllabusMetadata(collectionId);
  const items = useZoteroCollectionItems(collectionId);

  // Compute class groups and further reading items from synced items
  // Re-compute when items change
  const { classGroups, furtherReadingItems } = useMemo(() => {
    const furtherReading: Zotero.Item[] = [];
    const itemsByClass: Map<number | null, Zotero.Item[]> = new Map();

    for (const item of items) {
      if (!item.isRegularItem()) continue;

      const classNumber = SyllabusManager.getSyllabusClassNumber(
        item,
        collectionId,
      );
      const priority = SyllabusManager.getSyllabusPriority(
        item,
        collectionId,
      );

      if (priority === "" && classNumber === undefined) {
        furtherReading.push(item);
        continue;
      }

      const normalizedClassNumber =
        classNumber === undefined ? null : classNumber;
      if (!itemsByClass.has(normalizedClassNumber)) {
        itemsByClass.set(normalizedClassNumber, []);
      }
      itemsByClass.get(normalizedClassNumber)!.push(item);
    }

    // Sort class numbers
    const sortedClassNumbers = Array.from(itemsByClass.keys()).sort(
      (a, b) => {
        if (a === null && b === null) return 0;
        if (a === null) return -1;
        if (b === null) return 1;
        return a - b;
      },
    );

    // Sort items within each class by priority
    for (const classNumber of sortedClassNumbers) {
      const classItems = itemsByClass.get(classNumber)!;
      classItems.sort((a, b) => {
        const priorityA = SyllabusManager.getSyllabusPriority(
          a,
          collectionId,
        );
        const priorityB = SyllabusManager.getSyllabusPriority(
          b,
          collectionId,
        );
        const getPriorityOrder = (
          priority: SyllabusPriorityType | "" | undefined,
        ): number => {
          if (priority === "course-info") return 0;
          if (priority === "essential") return 1;
          if (priority === "recommended") return 2;
          if (priority === "optional") return 3;
          return 4;
        };
        return getPriorityOrder(priorityA) - getPriorityOrder(priorityB);
      });
    }

    // Sort further reading by title
    furtherReading.sort((a, b) => {
      const titleA = a.getField("title") || "";
      const titleB = b.getField("title") || "";
      return titleA.localeCompare(titleB);
    });

    return {
      classGroups: sortedClassNumbers.map((classNumber) => ({
        classNumber,
        items: itemsByClass.get(classNumber)!,
      })),
      furtherReadingItems: furtherReading,
    };
  }, [items, collectionId]);

  const handleDrop = async (
    e: JSX.TargetedDragEvent<HTMLElement>,
    targetClassNumber: number | null,
  ) => {
    e.preventDefault();
    e.stopPropagation();

    // Remove the dropzone active class after drop
    e.currentTarget.classList.remove("syllabus-dropzone-active");

    if (!e.dataTransfer) return;
    const itemIdStr = e.dataTransfer.getData("text/plain");
    if (!itemIdStr) return;

    const itemId = parseInt(itemIdStr, 10);
    if (isNaN(itemId)) return;

    try {
      const draggedItem = Zotero.Items.get(itemId);
      if (!draggedItem || !draggedItem.isRegularItem()) return;

      const targetClassNumberValue =
        targetClassNumber === null ? undefined : targetClassNumber;

      await SyllabusManager.setSyllabusClassNumber(
        draggedItem,
        collectionId,
        targetClassNumberValue,
        "page",
      );
      await draggedItem.saveTx();
    } catch (err) {
      ztoolkit.log("Error handling drop:", err);
    }
  };

  const handleDragOver = (e: JSX.TargetedDragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = "move";
    }
    e.currentTarget.classList.add("syllabus-dropzone-active");
  };

  const handleDragLeave = (e: JSX.TargetedDragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    // Only remove the class if we're actually leaving the drop zone
    // (not just moving to a child element)
    if (
      x < rect.left ||
      x > rect.right ||
      y < rect.top ||
      y > rect.bottom
    ) {
      e.currentTarget.classList.remove("syllabus-dropzone-active");
    }
  };

  return (
    <div className="syllabus-page">
      <div className="syllabus-view-title-container">
        <EditableTitle
          initialValue={title || ""}
          onSave={setTitle}
          className="syllabus-view-title"
          emptyBehavior="reset"
          placeholder="Add a title..."
        />
      </div>

      <EditableDescription
        initialValue={syllabusMetadata.description || ""}
        onSave={setDescription}
        className="syllabus-collection-description"
        placeholder="Add a description..."
        emptyBehavior="delete"
      />

      {classGroups.map((group: { classNumber: number | null; items: Zotero.Item[] }) => (
        <ClassGroupComponent
          key={group.classNumber ?? "null"}
          classNumber={group.classNumber}
          items={group.items}
          collectionId={collectionId}
          syllabusMetadata={syllabusMetadata}
          onClassTitleSave={setClassTitle}
          onClassDescriptionSave={setClassDescription}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        />
      ))}

      {furtherReadingItems.length > 0 && (
        <div className="syllabus-class-group">
          <div className="syllabus-class-header">Further reading</div>
          <div
            className="syllabus-class-items syllabus-further-reading-items"
            onDrop={(e) => handleDrop(e, null)}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            {furtherReadingItems.map((item: Zotero.Item) => (
              <SyllabusItemCardSlim
                key={item.id}
                item={item}
                collectionId={collectionId}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface ClassGroupComponentProps {
  classNumber: number | null;
  items: Zotero.Item[];
  collectionId: number;
  syllabusMetadata: { classes?: { [key: string]: { title?: string; description?: string } } };
  onClassTitleSave: (classNumber: number, title: string) => void;
  onClassDescriptionSave: (classNumber: number, description: string) => void;
  onDrop: (e: JSX.TargetedDragEvent<HTMLElement>, classNumber: number | null) => Promise<void>;
  onDragOver: (e: JSX.TargetedDragEvent<HTMLElement>) => void;
  onDragLeave: (e: JSX.TargetedDragEvent<HTMLElement>) => void;
}

function ClassGroupComponent({
  classNumber,
  items,
  collectionId,
  syllabusMetadata,
  onClassTitleSave,
  onClassDescriptionSave,
  onDrop,
  onDragOver,
  onDragLeave,
}: ClassGroupComponentProps) {
  // Get class title and description from metadata
  const classTitle = classNumber !== null ? (syllabusMetadata.classes?.[classNumber]?.title || "") : "";
  const classDescription = classNumber !== null ? (syllabusMetadata.classes?.[classNumber]?.description || "") : "";

  return (
    <div className="syllabus-class-group">
      {classNumber !== null && (
        <>
          <div className="syllabus-class-header-container">
            <div className="syllabus-class-header">Class {classNumber}</div>
            <EditableTitle
              initialValue={classTitle}
              onSave={(title) => onClassTitleSave(classNumber, title)}
              className="syllabus-class-title"
              placeholder="Add a title..."
              emptyBehavior="delete"
            />
          </div>
          <EditableDescription
            initialValue={classDescription}
            onSave={(desc) => onClassDescriptionSave(classNumber, desc)}
            className="syllabus-class-description"
            placeholder="Add a description..."
            emptyBehavior="delete"
          />
        </>
      )}
      <div
        className="syllabus-class-items"
        onDrop={(e) => onDrop(e, classNumber)}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
      >
        {items.map((item) => {
          const priority = SyllabusManager.getSyllabusPriority(
            item,
            collectionId,
          );
          return priority ? (
            <SyllabusItemCard
              key={item.id}
              item={item}
              collectionId={collectionId}
            />
          ) : (
            <SyllabusItemCardSlim
              key={item.id}
              item={item}
              collectionId={collectionId}
            />
          );
        })}
      </div>
    </div>
  );
}

interface EditableTitleProps {
  initialValue: string;
  onSave: (value: string) => void | Promise<void>;
  className: string;
  placeholder?: string;
  emptyBehavior?: "reset" | "delete";
}

function EditableTitle({
  initialValue,
  onSave,
  className,
  placeholder,
  emptyBehavior = "reset",
}: EditableTitleProps) {
  const [value, setValue] = useState(initialValue);
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleBlur = async (_e: JSX.TargetedFocusEvent<HTMLInputElement>) => {
    // Use setTimeout to ensure blur completes before we check what was clicked
    setTimeout(async () => {
      if (value.trim() === "" && emptyBehavior === "delete") {
        setValue(initialValue);
      } else if (value.trim() === "" && emptyBehavior === "reset") {
        setValue(initialValue);
      } else if (value !== initialValue) {
        try {
          await onSave(value);
        } catch (err) {
          ztoolkit.log("Error saving title:", err);
          // Revert on error
          setValue(initialValue);
        }
      }
      setIsEditing(false);
    }, 0);
  };

  const handleKeyDown = (e: JSX.TargetedKeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      inputRef.current?.blur();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setValue(initialValue);
      setIsEditing(false);
    }
  };

  const handleMouseDown = (e: JSX.TargetedMouseEvent<HTMLInputElement>) => {
    // Prevent blur when clicking on the input itself
    e.stopPropagation();
  };

  if (!isEditing) {
    return (
      <div
        className={className}
        onClick={() => setIsEditing(true)}
        onMouseDown={(e) => e.stopPropagation()}
        style={{ cursor: "text" }}
      >
        {value || placeholder || "Click to edit"}
      </div>
    );
  }

  return (
    <input
      ref={inputRef}
      type="text"
      className={className}
      value={value}
      onChange={(e) => setValue((e.target as HTMLInputElement).value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      onMouseDown={handleMouseDown}
      placeholder={placeholder}
      autoFocus
    />
  );
}

interface EditableDescriptionProps {
  initialValue: string;
  onSave: (value: string) => void | Promise<void>;
  className: string;
  placeholder?: string;
  emptyBehavior?: "reset" | "delete";
}

function EditableDescription({
  initialValue,
  onSave,
  className,
  placeholder,
  emptyBehavior = "delete",
}: EditableDescriptionProps) {
  const [value, setValue] = useState(initialValue);
  const [isEditing, setIsEditing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(
        textareaRef.current.value.length,
        textareaRef.current.value.length,
      );
    }
  }, [isEditing]);

  const handleBlur = async (_e: JSX.TargetedFocusEvent<HTMLTextAreaElement>) => {
    // Use setTimeout to ensure blur completes before we check what was clicked
    setTimeout(async () => {
      if (value.trim() === "" && emptyBehavior === "delete") {
        // Don't save empty description
        setValue(initialValue);
      } else if (value.trim() === "" && emptyBehavior === "reset") {
        setValue(initialValue);
      } else if (value !== initialValue) {
        try {
          await onSave(value);
        } catch (err) {
          ztoolkit.log("Error saving description:", err);
          // Revert on error
          setValue(initialValue);
        }
      }
      setIsEditing(false);
    }, 0);
  };

  const handleKeyDown = (e: JSX.TargetedKeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      setValue(initialValue);
      setIsEditing(false);
    }
  };

  const handleMouseDown = (e: JSX.TargetedMouseEvent<HTMLTextAreaElement>) => {
    // Prevent blur when clicking on the textarea itself
    e.stopPropagation();
  };

  if (!isEditing) {
    if (!value && !placeholder) return null;
    return (
      <div
        className={className}
        onClick={() => setIsEditing(true)}
        onMouseDown={(e) => e.stopPropagation()}
        style={{ cursor: "text", minHeight: "1.5em" }}
      >
        {value || (
          <span style={{ color: "#999", fontStyle: "italic" }}>
            {placeholder}
          </span>
        )}
      </div>
    );
  }

  return (
    <textarea
      ref={textareaRef}
      className={className}
      value={value}
      onChange={(e) => setValue((e.target as HTMLTextAreaElement).value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      onMouseDown={handleMouseDown}
      placeholder={placeholder}
      rows={3}
      autoFocus
    />
  );
}

interface SyllabusItemCardProps {
  item: Zotero.Item;
  collectionId: number;
}

function SyllabusItemCard({
  item,
  collectionId,
}: SyllabusItemCardProps) {
  // Get priority and class instruction from item
  const priority = SyllabusManager.getSyllabusPriority(item, collectionId);
  const classInstruction = SyllabusManager.getSyllabusClassInstruction(item, collectionId);
  const title = item.getField("title") || "Untitled";
  const itemTypeLabel = Zotero.ItemTypes.getLocalizedString(item.itemType);
  const creator = item.getCreators().length > 0 ? item.getCreator(0) : null;
  const author =
    item.firstCreator ||
    (creator && typeof creator !== "boolean"
      ? `${creator.firstName || ""} ${creator.lastName || ""}`.trim()
      : "");
  const date = item.getField("date") || "";
  const publicationName =
    item.getField("publicationTitle") ||
    item.getField("bookTitle") ||
    "";
  const url = item.getField("url") || "";

  const [bibliographicReference, setBibliographicReference] = useState("");
  const [viewableAttachment, setViewableAttachment] = useState<{
    item: Zotero.Item;
    type: "pdf" | "snapshot" | "epub";
  } | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (getPref("showBibliography")) {
        const ref = await generateBibliographicReference(item);
        setBibliographicReference(ref || "");
      }

      const attachments = item.getAttachments();
      for (const attId of attachments) {
        try {
          const att = Zotero.Items.get(attId);
          if (att && att.isAttachment()) {
            const contentType = att.attachmentContentType || "";
            const linkMode = att.attachmentLinkMode;
            const path = att.attachmentPath?.toLowerCase() || "";
            if (contentType === "application/pdf" || path.endsWith(".pdf")) {
              setViewableAttachment({ item: att, type: "pdf" });
              break;
            }
            if (linkMode === 3) {
              setViewableAttachment({ item: att, type: "snapshot" });
              break;
            }
            if (
              contentType === "application/epub+zip" ||
              contentType === "application/epub" ||
              path.endsWith(".epub")
            ) {
              setViewableAttachment({ item: att, type: "epub" });
              break;
            }
          }
        } catch {
          // Continue
        }
      }
    };
    loadData();
  }, [item.id]);

  const priorityColor =
    priority && priority in SyllabusManager.PRIORITY_COLORS
      ? (SyllabusManager.PRIORITY_COLORS as any)[priority]
      : null;
  const priorityStyle = priorityColor
    ? (() => {
      const r = parseInt(priorityColor.slice(1, 3), 16);
      const g = parseInt(priorityColor.slice(3, 5), 16);
      const b = parseInt(priorityColor.slice(5, 7), 16);
      return {
        backgroundColor: `rgba(${r}, ${g}, ${b}, 0.05)`,
        borderColor: `rgba(${r}, ${g}, ${b}, 0.2)`,
      };
    })()
    : {};

  const metadataParts = [itemTypeLabel, author, date].filter(Boolean);

  const handleClick = (e: JSX.TargetedMouseEvent<HTMLElement>) => {
    const target = e.target as HTMLElement;
    if (
      target.closest(".syllabus-item-actions") ||
      target.closest("button")
    ) {
      return;
    }
    const pane = ztoolkit.getGlobal("ZoteroPane");
    pane.selectItem(item.id);
  };

  const handleDragStart = (e: JSX.TargetedDragEvent<HTMLElement>) => {
    e.stopPropagation();
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", String(item.id));
    }
    (e.currentTarget as HTMLElement).classList.add("syllabus-item-dragging");
  };

  const handleDragEnd = (e: JSX.TargetedDragEvent<HTMLElement>) => {
    (e.currentTarget as HTMLElement).classList.remove("syllabus-item-dragging");
  };

  const handleUrlClick = (e: JSX.TargetedMouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    Zotero.launchURL(url);
  };

  const handleAttachmentClick = async (e: JSX.TargetedMouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (!viewableAttachment) return;

    try {
      const pane = ztoolkit.getGlobal("ZoteroPane");
      await pane.viewPDF(viewableAttachment.item.id, { page: 1 } as any);
    } catch {
      try {
        const file = viewableAttachment.item.getFilePath();
        if (file) {
          Zotero.File.pathToFile(file).reveal();
        } else {
          if (viewableAttachment.type === "snapshot") {
            const snapshotUrl = viewableAttachment.item.getField("url");
            if (snapshotUrl) {
              Zotero.launchURL(snapshotUrl);
            }
          }
        }
      } catch (fileErr) {
        ztoolkit.log("Error opening attachment:", fileErr);
      }
    }
  };

  const attachmentLabel =
    viewableAttachment?.type === "pdf"
      ? "PDF"
      : viewableAttachment?.type === "snapshot"
        ? "Snapshot"
        : viewableAttachment?.type === "epub"
          ? "EPUB"
          : "View";

  return (
    <div
      className="syllabus-item"
      data-item-id={item.id}
      draggable
      style={priorityStyle}
      onClick={handleClick}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="syllabus-item-content">
        <div className="syllabus-item-main-content">
          <div className="syllabus-item-thumbnail">
            <span
              className="icon icon-css icon-item-type cell-icon"
              data-item-type={item.itemType}
              style={{
                width: "100%",
                height: "100%",
                backgroundOrigin: "padding-box, padding-box, padding-box, padding-box",
                backgroundPositionX: "50%, 50%, 50%, 50%",
                backgroundPositionY: "50%, 50%, 50%, 50%",
                backgroundRepeat: "no-repeat, repeat, repeat, repeat",
                backgroundSize: "contain, 0px, 0px, 0px",
              }}
            />
          </div>
          <div className="syllabus-item-text">
            <div className="syllabus-item-title-row">
              <div className="syllabus-item-title">{title}</div>
            </div>
            {publicationName && (
              <div className="syllabus-item-publication">
                In {publicationName}
              </div>
            )}
            {(priority || metadataParts.length > 0) && (
              <div className="syllabus-item-metadata">
                {priority &&
                  priority in SyllabusManager.PRIORITY_LABELS && (
                    <span className="syllabus-item-priority-inline">
                      <span
                        className="syllabus-priority-icon"
                        style={{
                          backgroundColor:
                            (SyllabusManager.PRIORITY_COLORS as any)[priority],
                        }}
                      />
                      <span
                        className="syllabus-priority-label"
                        style={{
                          color:
                            (SyllabusManager.PRIORITY_COLORS as any)[priority],
                        }}
                      >
                        {
                          (SyllabusManager.PRIORITY_LABELS as any)[priority]
                        }
                      </span>
                    </span>
                  )}
                {metadataParts.length > 0 && (
                  <span>{metadataParts.join(" • ")}</span>
                )}
              </div>
            )}
            {bibliographicReference && (
              <div className="syllabus-item-reference">
                {bibliographicReference}
              </div>
            )}
            {classInstruction && (
              <div className="syllabus-item-description">
                {classInstruction}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="syllabus-item-right-side" draggable={false}>
        <div className="syllabus-item-actions" draggable={false}>
          {url && (
            <button
              className="toolbarbutton-1 syllabus-action-button"
              onClick={handleUrlClick}
              title="Open URL"
            >
              URL
            </button>
          )}
          {viewableAttachment && (
            <button
              className="toolbarbutton-1 syllabus-action-button"
              onClick={handleAttachmentClick}
              title={`Open ${attachmentLabel}`}
            >
              {attachmentLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

interface SyllabusItemCardSlimProps {
  item: Zotero.Item;
  collectionId: number;
}

function SyllabusItemCardSlim({
  item,
}: SyllabusItemCardSlimProps) {
  const title = item.getField("title") || "Untitled";
  const itemTypeLabel = Zotero.ItemTypes.getLocalizedString(item.itemType);
  const creator = item.getCreators().length > 0 ? item.getCreator(0) : null;
  const author =
    item.firstCreator ||
    (creator && typeof creator !== "boolean"
      ? `${creator.firstName || ""} ${creator.lastName || ""}`.trim()
      : "");
  const date = item.getField("date") || "";
  const metadataParts = [itemTypeLabel, author, date].filter(Boolean);

  const handleClick = () => {
    const pane = ztoolkit.getGlobal("ZoteroPane");
    pane.selectItem(item.id);
  };

  const handleDragStart = (e: JSX.TargetedDragEvent<HTMLElement>) => {
    e.stopPropagation();
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", String(item.id));
    }
    (e.currentTarget as HTMLElement).classList.add("syllabus-item-dragging");
  };

  const handleDragEnd = (e: JSX.TargetedDragEvent<HTMLElement>) => {
    (e.currentTarget as HTMLElement).classList.remove("syllabus-item-dragging");
  };

  return (
    <div
      className="syllabus-item syllabus-item-slim"
      data-item-id={item.id}
      draggable
      onClick={handleClick}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="syllabus-item-content">
        <div className="syllabus-item-main-content">
          <div className="syllabus-item-thumbnail">
            <span
              className="icon icon-css icon-item-type cell-icon"
              data-item-type={item.itemType}
              style={{
                width: "100%",
                height: "100%",
                backgroundOrigin: "padding-box, padding-box, padding-box, padding-box",
                backgroundPositionX: "50%, 50%, 50%, 50%",
                backgroundPositionY: "50%, 50%, 50%, 50%",
                backgroundRepeat: "no-repeat, repeat, repeat, repeat",
                backgroundSize: "contain, 0px, 0px, 0px",
              }}
            />
          </div>
          <div className="syllabus-item-text">
            <div className="syllabus-item-title-row">
              <div className="syllabus-item-title">{title}</div>
            </div>
            {metadataParts.length > 0 && (
              <div className="syllabus-item-metadata">
                <span>{metadataParts.join(" • ")}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function renderSyllabusPage(
  win: _ZoteroTypes.MainWindow,
  rootElement: HTMLElement,
  collectionId: number,
) {
  renderComponent(win, rootElement, <SyllabusPage collectionId={collectionId} />);
}

