import React, { useState, useEffect, useCallback } from "react";
import ReactDOM from "react-dom/client";
import { generateBibliographicReference } from "../utils/cite";
import { getPref } from "../utils/prefs";
import { SyllabusManager } from "./syllabus";

// Define priority type for use in this file
// These values match SyllabusPriority enum in syllabus.ts
type SyllabusPriorityType = "course-info" | "essential" | "recommended" | "optional";

interface SyllabusPageProps {
  collection: Zotero.Collection;
  onRefresh: () => void;
}

interface ClassGroup {
  classNumber: number | null;
  items: Zotero.Item[];
}

export function SyllabusPage({ collection, onRefresh }: SyllabusPageProps) {
  const [classGroups, setClassGroups] = useState<ClassGroup[]>([]);
  const [furtherReadingItems, setFurtherReadingItems] = useState<Zotero.Item[]>(
    [],
  );
  const [collectionTitle, setCollectionTitle] = useState(collection.name || "");
  const [collectionDescription, setCollectionDescription] = useState("");

  // Load data
  useEffect(() => {
    loadSyllabusData();
  }, [collection.id]);

  const loadSyllabusData = useCallback(() => {
    const items = collection.getChildItems();
    const furtherReading: Zotero.Item[] = [];
    const itemsByClass: Map<number | null, Zotero.Item[]> = new Map();

    for (const item of items) {
      if (!item.isRegularItem()) continue;

      const classNumber = SyllabusManager.getSyllabusClassNumber(
        item,
        collection.id,
      );
      const priority = SyllabusManager.getSyllabusPriority(
        item,
        collection.id,
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
          collection.id,
        );
        const priorityB = SyllabusManager.getSyllabusPriority(
          b,
          collection.id,
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

    setClassGroups(
      sortedClassNumbers.map((classNumber) => ({
        classNumber,
        items: itemsByClass.get(classNumber)!,
      })),
    );
    setFurtherReadingItems(furtherReading);
    setCollectionTitle(collection.name || "");
    setCollectionDescription(
      SyllabusManager.getCollectionDescription(collection.id),
    );
  }, [collection.id]);

  const handleCollectionTitleSave = async (newTitle: string) => {
    collection.name = newTitle;
    await collection.saveTx();
    setCollectionTitle(newTitle);
  };

  const handleCollectionDescriptionSave = async (newDescription: string) => {
    await SyllabusManager.setCollectionDescription(
      collection.id,
      newDescription,
      "page",
    );
    setCollectionDescription(newDescription);
  };

  const handleClassTitleSave = async (
    classNumber: number,
    newTitle: string,
  ) => {
    await SyllabusManager.setClassTitle(
      collection.id,
      classNumber,
      newTitle,
      "page",
    );
    onRefresh();
  };

  const handleClassDescriptionSave = async (
    classNumber: number,
    newDescription: string,
  ) => {
    await SyllabusManager.setClassDescription(
      collection.id,
      classNumber,
      newDescription,
      "page",
    );
    onRefresh();
  };

  const handleDrop = async (
    e: React.DragEvent,
    targetClassNumber: number | null,
  ) => {
    e.preventDefault();
    e.stopPropagation();

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
        collection.id,
        targetClassNumberValue,
        "page",
      );
      await draggedItem.saveTx();

      onRefresh();
    } catch (err) {
      ztoolkit.log("Error handling drop:", err);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = "move";
    }
    e.currentTarget.classList.add("syllabus-dropzone-active");
  };

  return (
    <div className="syllabus-page">
      <div className="syllabus-view-title-container">
        <EditableTitle
          initialValue={collectionTitle}
          onSave={handleCollectionTitleSave}
          className="syllabus-view-title"
          emptyBehavior="reset"
        />
      </div>

      <EditableDescription
        initialValue={collectionDescription}
        onSave={handleCollectionDescriptionSave}
        className="syllabus-collection-description"
        placeholder="Add a description..."
        emptyBehavior="delete"
      />

      {classGroups.map((group) => (
        <ClassGroupComponent
          key={group.classNumber ?? "null"}
          classNumber={group.classNumber}
          items={group.items}
          collectionId={collection.id}
          onClassTitleSave={handleClassTitleSave}
          onClassDescriptionSave={handleClassDescriptionSave}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onRefresh={onRefresh}
        />
      ))}

      {furtherReadingItems.length > 0 && (
        <div className="syllabus-class-group">
          <div className="syllabus-class-header">Further reading</div>
          <div
            className="syllabus-class-items syllabus-further-reading-items"
            onDrop={(e) => handleDrop(e, null)}
            onDragOver={handleDragOver}
            onDragLeave={() => {
              // Handled by CSS
            }}
          >
            {furtherReadingItems.map((item) => (
              <SyllabusItemCardSlim
                key={item.id}
                item={item}
                collectionId={collection.id}
                onRefresh={onRefresh}
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
  onClassTitleSave: (classNumber: number, title: string) => Promise<void>;
  onClassDescriptionSave: (
    classNumber: number,
    description: string,
  ) => Promise<void>;
  onDrop: (e: React.DragEvent, classNumber: number | null) => Promise<void>;
  onDragOver: (e: React.DragEvent) => void;
  onRefresh: () => void;
}

function ClassGroupComponent({
  classNumber,
  items,
  collectionId,
  onClassTitleSave,
  onClassDescriptionSave,
  onDrop,
  onDragOver,
  onRefresh,
}: ClassGroupComponentProps) {
  const classTitle = SyllabusManager.getClassTitle(collectionId, classNumber!);
  const classDescription = SyllabusManager.getClassDescription(
    collectionId,
    classNumber!,
  );

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
        onDragLeave={() => {
          // Handled by CSS
        }}
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
              onRefresh={onRefresh}
            />
          ) : (
            <SyllabusItemCardSlim
              key={item.id}
              item={item}
              collectionId={collectionId}
              onRefresh={onRefresh}
            />
          );
        })}
      </div>
    </div>
  );
}

interface EditableTitleProps {
  initialValue: string;
  onSave: (value: string) => Promise<void>;
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
  const inputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleBlur = async () => {
    if (value.trim() === "" && emptyBehavior === "delete") {
      setValue(initialValue);
    } else if (value.trim() === "" && emptyBehavior === "reset") {
      setValue(initialValue);
    } else if (value !== initialValue) {
      await onSave(value);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      inputRef.current?.blur();
    } else if (e.key === "Escape") {
      setValue(initialValue);
      setIsEditing(false);
    }
  };

  if (!isEditing) {
    return (
      <div
        className={className}
        onClick={() => setIsEditing(true)}
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
      onChange={(e) => setValue(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
    />
  );
}

interface EditableDescriptionProps {
  initialValue: string;
  onSave: (value: string) => Promise<void>;
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
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

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

  const handleBlur = async () => {
    if (value.trim() === "" && emptyBehavior === "delete") {
      // Don't save empty description
      setValue(initialValue);
    } else if (value.trim() === "" && emptyBehavior === "reset") {
      setValue(initialValue);
    } else if (value !== initialValue) {
      await onSave(value);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setValue(initialValue);
      setIsEditing(false);
    }
  };

  if (!isEditing) {
    if (!value && !placeholder) return null;
    return (
      <div
        className={className}
        onClick={() => setIsEditing(true)}
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
      onChange={(e) => setValue(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      rows={3}
    />
  );
}

interface SyllabusItemCardProps {
  item: Zotero.Item;
  collectionId: number;
  onRefresh: () => void;
}

function SyllabusItemCard({
  item,
  collectionId,
}: SyllabusItemCardProps) {
  const priority = SyllabusManager.getSyllabusPriority(item, collectionId);
  const classInstruction = SyllabusManager.getSyllabusClassInstruction(
    item,
    collectionId,
  );
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

  const handleClick = (e: React.MouseEvent) => {
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

  const handleDragStart = (e: React.DragEvent) => {
    e.stopPropagation();
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", String(item.id));
    }
    e.currentTarget.classList.add("syllabus-item-dragging");
  };

  const handleDragEnd = (e: React.DragEvent) => {
    e.currentTarget.classList.remove("syllabus-item-dragging");
  };

  const handleUrlClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    Zotero.launchURL(url);
  };

  const handleAttachmentClick = async (e: React.MouseEvent) => {
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
  onRefresh: () => void;
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

  const handleDragStart = (e: React.DragEvent) => {
    e.stopPropagation();
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", String(item.id));
    }
    e.currentTarget.classList.add("syllabus-item-dragging");
  };

  const handleDragEnd = (e: React.DragEvent) => {
    e.currentTarget.classList.remove("syllabus-item-dragging");
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
  collection: Zotero.Collection,
) {
  // Ensure window is available for React
  if (typeof (globalThis as any).window === "undefined" && win) {
    (globalThis as any).window = win;
  }

  // Unmount existing root if it exists
  if (win.myPluginUnmount) {
    try {
      if (rootElement.isConnected || rootElement.parentNode) {
        win.myPluginUnmount();
      }
    } catch (e) {
      ztoolkit.log("Error during unmount:", e);
    }
    delete win.myPluginUnmount;
  }

  // Create new React root and render
  const root = ReactDOM.createRoot(rootElement);

  const handleRefresh = () => {
    // Re-render the component
    root.render(
      <SyllabusPage
        collection={collection}
        onRefresh={handleRefresh}
      />,
    );
  };

  root.render(<SyllabusPage collection={collection} onRefresh={handleRefresh} />);

  // Store teardown function
  win.myPluginUnmount = () => {
    try {
      if (rootElement.isConnected || rootElement.parentNode) {
        root.unmount();
      }
    } catch (e) {
      ztoolkit.log("Error during React unmount:", e);
    }
  };
}

