// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h, Fragment } from "preact";
import { useState, useMemo, useEffect, useCallback } from "preact/hooks";
import type { JSX } from "preact";
import { twMerge } from "tailwind-merge";
import { SyllabusManager, ItemSyllabusAssignment } from "./syllabus";
import type { Priority } from "../utils/schemas";
import { getCachedItem } from "../utils/cache";
import { getPref } from "../utils/prefs";
import { generateBibliographicReference } from "../utils/cite";
import { isZotero8OrLater } from "../utils/zotero";
import { useZoteroSyllabusMetadata } from "./react-zotero-sync/syllabusMetadata";
import { ProseText } from "./ProseText";
import {
  getItemReadStatusName,
  getReadStatusMetadata,
} from "../zotero-reading-list/compat";
import { getReadingTimeSync, formatReadingTime } from "../utils/readingTime";
import { getItemCreatorLine, getItemField, getItemTitle } from "../utils/items";
import { GalleryCover } from "./GalleryCover";
import { getString } from "../utils/locale";
import { isOsFileDrag } from "../utils/nativeFileDrop";
import type { ItemDensity } from "./react-zotero-sync/itemDensity";
import { openGalleryNoteByCollectionId } from "./galleryNote";
import { useGalleryNoteText } from "./useGalleryNoteText";

export function SyllabusItemCard({
  className,
  item,
  collectionId,
  classNumber,
  assignment,
  slim = false,
  density = "expanded",
  readerMode = false,
  isLocked = false,
  hideHoverActions = false,
  isFurtherReading = false,
  showGalleryNote = false,
  onDrop,
  onDragOver,
  dropEdge = null,
  onClick: customOnClick,
  onContextMenu: customOnContextMenu,
  onReaderCheck,
  selectedIdentifiers = new Set(),
  onIdentifierClick,
  selectedForDrag = { assignments: [], itemIds: [] },
  onPriorityChange,
  onDelete,
  onDuplicate,
  isZoteroSelected,
  isIdentifierSelected,
}: {
  className?: string;
  item: Zotero.Item;
  collectionId: number;
  classNumber?: number | null; // Specific class number for this rendering
  assignment?: ItemSyllabusAssignment; // Specific assignment for this rendering (to differentiate multiple assignments)
  isZoteroSelected?: boolean;
  isIdentifierSelected?: boolean;
  slim?: boolean;
  density?: ItemDensity;
  readerMode?: boolean;
  isLocked?: boolean;
  /** Hide the group-hover action bar (duplicate / unassign / etc.). */
  hideHoverActions?: boolean;
  /**
   * When set with readerMode, checkbox runs this instead of toggling
   * assignment done status (e.g. confirm + unpin on Reading Schedule).
   */
  onReaderCheck?: () => void | Promise<void>;
  /** True when rendered in the Further reading section (for drag reorder). */
  isFurtherReading?: boolean;
  /** Only Gallery Page should pass true; all other surfaces default off. */
  showGalleryNote?: boolean;
  onDrop?: (
    e: JSX.TargetedDragEvent<HTMLElement>,
    insertBefore: boolean,
  ) => void;
  onDragOver?: (e: JSX.TargetedDragEvent<HTMLElement>) => void;
  /** Visual insert line while another item is dragged over this card. */
  dropEdge?: "before" | "after" | null;
  onClick?: (
    item: Zotero.Item,
    e?: JSX.TargetedMouseEvent<HTMLElement>,
  ) => void; // Optional custom click handler
  onContextMenu?: (
    item: Zotero.Item,
    e: JSX.TargetedMouseEvent<HTMLElement>,
  ) => void;
  // Selection props
  selectedIdentifiers?: Set<string>;
  onIdentifierClick?: (
    item: Zotero.Item,
    assignmentId: string | undefined,
    e?: JSX.TargetedMouseEvent<HTMLElement>,
  ) => void;
  selectedForDrag?: {
    assignments: Array<{ itemId: number; assignmentId: string }>;
    itemIds: number[];
  };
  onPriorityChange?: (
    priority: string | undefined,
    identifier: { assignmentId?: string; itemId?: number },
  ) => Promise<void>;
  onDelete?: (identifier: {
    assignmentId?: string;
    itemId?: number;
  }) => Promise<void>;
  onDuplicate?: (identifier: {
    assignmentId?: string;
    itemId?: number;
  }) => Promise<void>;
}) {
  // Get the currently selected item ID (Zotero selection)
  // const selectedItemIds = useZoteroSelectedItemIds();
  // const isZoteroSelected = selectedItemIds?.includes(item.id) || false;

  // // Check if this identifier is selected
  const identifier = assignment?.id
    ? `assignment:${assignment.id}`
    : `item:${item.id}`;
  // const isSelected = selectedIdentifiers.has(identifier);

  // const is

  const classInstruction = assignment?.classInstruction || "";
  const galleryNote = useGalleryNoteText(
    item,
    showGalleryNote ? collectionId : 0,
  );
  const handleGalleryNoteClick = useCallback(
    (e: JSX.TargetedMouseEvent<HTMLElement>) => {
      e.stopPropagation();
      e.preventDefault();
      void openGalleryNoteByCollectionId(item, collectionId);
    },
    [item, collectionId],
  );
  const title = getItemTitle(item) || getString("untitled");
  const itemTypeLabel = Zotero.ItemTypes.getLocalizedString(item.itemType);
  const author = getItemCreatorLine(item);
  const date = getItemField(item, "date");
  const year = useMemo(() => {
    const match = String(date || "").match(/\b(\d{4})\b/);
    return match ? match[1] : "";
  }, [date]);
  const publicationName = getItemField(item, "publicationTitle");
  const url = item.getField("url") || "";
  const [syllabusMetadata] = useZoteroSyllabusMetadata(collectionId);
  const readingTime = getReadingTimeSync(item, { roundUp: true });

  // Get priority and class instruction from the assignment (if found)
  // When assignmentId is provided, these MUST come from that specific assignment
  const rawPriority = assignment?.priority || "";

  // Validate priority exists in the collection's priorities list
  const priority = useMemo(() => {
    if (!rawPriority) return "";
    const priorities = syllabusMetadata.priorities || [];
    const priorityExists = priorities.some(
      (p: Priority) => p.id === rawPriority,
    );
    return priorityExists ? rawPriority : null;
  }, [rawPriority, syllabusMetadata]);

  const [bibliographicReference, setBibliographicReference] = useState("");
  useEffect(() => {
    (async () => {
      if (slim || density !== "expanded") return;
      if (getPref("showBibliography")) {
        const cslStyle = syllabusMetadata.cslStyle || null;
        const ref = await generateBibliographicReference(item, true, cslStyle);
        setBibliographicReference(ref || "");
      }
    })();
  }, [item, slim, density, syllabusMetadata.cslStyle]);

  const viewableAttachments = useMemo(() => {
    return item
      .getAttachments()
      .map((attId) => {
        try {
          const att = getCachedItem(attId);
          if (att && att.isAttachment()) {
            const contentType = att.attachmentContentType || "";
            const linkMode = att.attachmentLinkMode;
            const path = att.attachmentPath?.toLowerCase() || "";

            // PDF
            if (contentType === "application/pdf" || path.endsWith(".pdf")) {
              return { item: att, type: "pdf" as const };
            }

            // Snapshot (linkMode 3)
            if (linkMode === 3) {
              return { item: att, type: "snapshot" as const };
            }

            // EPUB
            if (
              contentType === "application/epub+zip" ||
              contentType === "application/epub" ||
              path.endsWith(".epub")
            ) {
              return { item: att, type: "epub" as const };
            }

            // HTML
            if (
              contentType === "text/html" ||
              path.endsWith(".html") ||
              path.endsWith(".htm")
            ) {
              return { item: att, type: "html" as const };
            }

            // Other file attachments (not linked files)
            // linkMode 0 = imported file, 1 = linked file, 2 = imported URL, 3 = snapshot
            if (linkMode === 0 || linkMode === 1) {
              // Determine type from extension or content type
              if (path.endsWith(".doc") || path.endsWith(".docx")) {
                return { item: att, type: "doc" as const };
              }
              if (path.endsWith(".txt") || contentType === "text/plain") {
                return { item: att, type: "txt" as const };
              }
              if (path.endsWith(".zip") || contentType === "application/zip") {
                return { item: att, type: "zip" as const };
              }
              // Generic file attachment
              return { item: att, type: "file" as const };
            }
          }
        } catch {
          // Continue
        }
        return null;
      })
      .filter(Boolean) as Array<{
      item: Zotero.Item;
      type:
        "pdf" | "snapshot" | "epub" | "html" | "doc" | "txt" | "zip" | "file";
    }>;
  }, [item, slim]);

  // Find snapshot attachment and get its URL
  const snapshotUrl = useMemo(() => {
    const snapshot = viewableAttachments.find((att) => att.type === "snapshot");
    if (snapshot) {
      return snapshot.item.getField("url") || null;
    }
    return null;
  }, [viewableAttachments]);

  // Normalize URLs for comparison (remove trailing slashes, fragments, etc.)
  const normalizeUrl = (urlString: string | null): string | null => {
    if (!urlString) return null;
    try {
      const url = new URL(urlString);
      // Remove fragment and trailing slash from pathname
      url.hash = "";
      url.pathname = url.pathname.replace(/\/$/, "");
      return url.toString();
    } catch {
      // If URL parsing fails, just trim and lowercase for comparison
      return urlString.trim().toLowerCase().replace(/\/$/, "");
    }
  };

  const metadataParts = [
    author,
    date,
    slim ? itemTypeLabel : undefined,
    publicationName
      ? getString("item-in-publication", { args: { name: publicationName } })
      : undefined,
    readingTime ? formatReadingTime(readingTime) : undefined,
  ].filter(Boolean);

  const handleDragStart = (e: JSX.TargetedDragEvent<HTMLElement>) => {
    e.stopPropagation();
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = "move";

      // Check if this identifier is selected, and if so, drag all selected
      const isThisSelected = selectedIdentifiers.has(identifier);

      if (
        isThisSelected &&
        selectedForDrag.assignments.length + selectedForDrag.itemIds.length > 0
      ) {
        // Drag all selected assignments
        const assignmentIds = selectedForDrag.assignments
          .map((a) => a.assignmentId)
          .join(",");
        if (assignmentIds) {
          e.dataTransfer.setData(
            "application/x-syllabus-assignment-ids",
            assignmentIds,
          );
        }
        // Store all item IDs (from both assignments and items)
        const allItemIds = Array.from(
          new Set([
            ...selectedForDrag.assignments.map((a) => a.itemId),
            ...selectedForDrag.itemIds,
          ]),
        )
          .map(String)
          .join(",");
        e.dataTransfer.setData("text/plain", allItemIds);
      } else {
        // Single drag (original behavior)
        e.dataTransfer.setData("text/plain", String(item.id));
        if (assignment?.id) {
          e.dataTransfer.setData(
            "application/x-syllabus-assignment-id",
            assignment.id,
          );
        }
      }

      // Store source class number for reordering within same class
      if (classNumber !== null && classNumber !== undefined) {
        e.dataTransfer.setData(
          "application/x-syllabus-source-class",
          String(classNumber),
        );
      } else if (isFurtherReading) {
        e.dataTransfer.setData(
          "application/x-syllabus-source-further-reading",
          "1",
        );
      } else {
        // Unnumbered / Course Information section (priority, no class)
        e.dataTransfer.setData("application/x-syllabus-source-unnumbered", "1");
      }
    }
    (e.currentTarget as HTMLElement).classList.add("syllabus-item-dragging");
  };

  const handleDragEnd = (e: JSX.TargetedDragEvent<HTMLElement>) => {
    (e.currentTarget as HTMLElement).classList.remove("syllabus-item-dragging");
  };

  const handleUrlClick = useCallback(
    (e: JSX.TargetedMouseEvent<HTMLElement>) => {
      e.stopPropagation();
      Zotero.launchURL(url);
    },
    [url],
  );

  const handleSnapshotUrlClick = useCallback(
    (e: JSX.TargetedMouseEvent<HTMLElement>) => {
      e.stopPropagation();
      if (snapshotUrl) {
        Zotero.launchURL(snapshotUrl);
      }
    },
    [snapshotUrl],
  );

  // Deduplicate URLs - only show unique URLs
  const uniqueUrls = useMemo(() => {
    const urls: Array<{
      url: string;
      label?: string;
      onClick: (e: JSX.TargetedMouseEvent<HTMLElement>) => void;
    }> = [];
    const normalizedUrls = new Set<string>();

    // Add snapshot URL if it exists and is unique
    if (snapshotUrl) {
      const normalized = normalizeUrl(snapshotUrl);
      if (normalized && !normalizedUrls.has(normalized)) {
        normalizedUrls.add(normalized);
        urls.push({
          url: snapshotUrl,
          label: getString("attachment-url"),
          onClick: handleSnapshotUrlClick,
        });
      }
    }

    // Add item URL if it exists and is unique
    if (url) {
      const normalized = normalizeUrl(url);
      if (normalized && !normalizedUrls.has(normalized)) {
        normalizedUrls.add(normalized);
        urls.push({
          url: url,
          label: getString("attachment-url"),
          onClick: handleUrlClick,
        });
      }
    }

    return urls;
  }, [snapshotUrl, url, handleSnapshotUrlClick, handleUrlClick]);

  function onClick(
    _item: Zotero.Item,
    _e?: JSX.TargetedMouseEvent<HTMLElement>,
  ) {
    // This is now handled by handleAssignmentClick
    // Keep for backwards compatibility with custom onClick handlers
  }

  function onDoubleClick(
    item: Zotero.Item,
    __e?: JSX.TargetedMouseEvent<HTMLElement>,
  ) {
    const url = item.getField("url");
    const attachments = item.getAttachments();
    const viewableAttachment = attachments.find((attId) => {
      const att = getCachedItem(attId);
      if (att && att.isAttachment()) {
        return true;
      }
      return false;
    });
    // If there's an attachment, go to it
    if (viewableAttachment) {
      const pane = ztoolkit.getGlobal("ZoteroPane");
      pane.viewPDF(viewableAttachment);
    } else if (url) {
      Zotero.launchURL(url);
    }
  }

  const handleAttachmentClick = async (viewableAttachment?: {
    item: Zotero.Item;
    type: "pdf" | "snapshot" | "epub" | "html" | "doc" | "txt" | "zip" | "file";
  }) => {
    if (!viewableAttachment) return;

    try {
      const pane = ztoolkit.getGlobal("ZoteroPane");
      await pane.viewPDF(viewableAttachment.item.id);
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

  const readStatusName = useMemo(() => getItemReadStatusName(item), [item]);

  // Check if there's an assignment for this card

  const { color: priorityColor } = syllabusMetadata.priorities?.find(
    (p: Priority) => p.id === priority,
  ) || { color: "#AAA" };

  const assignmentStatus = assignment?.status || null;

  const colors = priority
    ? {
        backgroundColor: priorityColor + "15",
      }
    : {};

  const handleItemDragOver = (e: JSX.TargetedDragEvent<HTMLElement>) => {
    if (isOsFileDrag(e.dataTransfer)) {
      e.preventDefault();
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = "move";
    }
    if (onDragOver) {
      // Parent uses clientY + currentTarget bounds to place the drop line.
      onDragOver(e);
    }
  };

  const handleItemDrop = (e: JSX.TargetedDragEvent<HTMLElement>) => {
    if (isOsFileDrag(e.dataTransfer)) {
      e.preventDefault();
      return;
    }
    e.preventDefault();
    if (!onDrop) return;

    // Determine if drop should insert before or after based on mouse position
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY;
    const midpoint = rect.top + rect.height / 2;
    const insertBefore = y < midpoint;

    // Stop propagation to prevent class container from also handling the drop
    e.stopPropagation();
    onDrop(e, insertBefore);
  };

  const handleAssignmentStatusToggle = async (
    e: JSX.TargetedEvent<HTMLInputElement>,
  ) => {
    e.stopPropagation();

    if (onReaderCheck) {
      try {
        await onReaderCheck();
      } catch (err) {
        ztoolkit.log("Error handling reading checkbox:", err);
      }
      e.currentTarget.checked = false;
      return;
    }

    try {
      const newStatus = assignmentStatus === "done" ? null : "done";
      await SyllabusManager.setReadingStatus(
        item,
        collectionId,
        assignment?.id,
        newStatus,
        "page",
      );
      await item.saveTx();
    } catch (err) {
      ztoolkit.log("Error toggling assignment status:", err);
    }
  };

  return (
    <div
      style={colors}
      className={twMerge(
        "syllabus-item-card in-[.print]:scheme-light",
        "rounded-lg flex shrink-0",
        density === "row"
          ? "flex-row items-start"
          : "flex-row items-start justify-between",
        "bg-background-sidepane text-primary",
        density === "row" && "bg-transparent!",
        "relative",
        isLocked ? "cursor-default" : "cursor-grab",
        // For hovering contextual btns
        "group relative",
        density === "row"
          ? "px-2 py-0.5 gap-2 rounded-sm"
          : density === "standard"
            ? "px-4 py-1.5 gap-3"
            : slim
              ? "px-4 py-2.5 gap-4"
              : "px-4 py-4 gap-4",
        isZoteroSelected &&
          !isIdentifierSelected &&
          "not-in-[.print]:outline-2! not-in-[.print]:outline-accent-blue",
        isIdentifierSelected && "not-in-[.print]:bg-accent-blue! scheme-dark",
        // isZoteroSelected && isIdentifierSelected && "outline-none!",
        readerMode && assignmentStatus === "done" ? "opacity-40" : "",
        dropEdge === "before" && "is-drop-before",
        dropEdge === "after" && "is-drop-after",
        className,
      )}
      data-item-id={item.id}
      data-syllabus-identifier={identifier}
      data-syllabus-class-number={
        isFurtherReading
          ? "further-reading"
          : classNumber != null && classNumber !== undefined
            ? String(classNumber)
            : "unnumbered"
      }
      data-print-url={
        /^https?:\/\//i.test(String(url).trim())
          ? String(url).trim()
          : undefined
      }
      draggable={!isLocked}
      onClick={(e) => {
        if (customOnClick) {
          customOnClick(item, e);
        } else if (onIdentifierClick) {
          onIdentifierClick(item, assignment?.id, e);
        } else {
          onClick(item, e);
        }
      }}
      onContextMenu={
        customOnContextMenu ? (e) => customOnContextMenu(item, e) : undefined
      }
      onDblClick={(e) => onDoubleClick(item, e)}
      onDragStart={isLocked ? undefined : handleDragStart}
      onDragEnd={isLocked ? undefined : handleDragEnd}
      onDragOver={isLocked ? undefined : handleItemDragOver}
      onDrop={isLocked ? undefined : handleItemDrop}
    >
      {readerMode && (
        <input
          type="checkbox"
          checked={onReaderCheck ? false : assignmentStatus === "done"}
          onChange={handleAssignmentStatusToggle}
          className={twMerge(
            "absolute right-full mr-1 w-4 h-4 cursor-pointer shrink-0 in-[.print]:hidden",
            isZotero8OrLater() ? "md:mr-2!" : "mr-2!",
          )}
          // Pin to the title/icon row — avoid top-1/2 which centers on tall cards.
          style={{ top: "0.35rem" }}
          title={
            onReaderCheck
              ? getString("pinned-done-unpin-title")
              : assignmentStatus === "done"
                ? getString("mark-not-done")
                : getString("mark-done")
          }
          aria-label={
            onReaderCheck
              ? getString("pinned-done-unpin-title")
              : assignmentStatus === "done"
                ? getString("mark-not-done")
                : getString("mark-done")
          }
          onClick={(e) => e.stopPropagation()}
        />
      )}
      <div
        className={
          density === "row"
            ? "syllabus-item-row-grid grid w-full min-w-0 items-start gap-x-2"
            : "contents"
        }
        style={
          density === "row"
            ? {
                gridTemplateColumns: "16px minmax(0, 1fr)",
              }
            : undefined
        }
      >
        <div
          className={twMerge(
            "syllabus-item-thumbnail grow-0 shrink-0 in-[.print]:hidden",
            density === "row"
              ? "size-4! min-w-4! max-w-4! h-[1.375rem]! max-h-[1.375rem]! flex items-center justify-center self-start"
              : density === "standard"
                ? "size-6 self-start"
                : twMerge(
                    "syllabus-item-thumbnail-cover self-start min-w-0",
                    slim ? "w-16" : "w-24",
                  ),
          )}
          data-density={density === "row" ? "row" : undefined}
          style={
            density === "row"
              ? {
                  width: 16,
                  height: "1.375rem",
                  minWidth: 16,
                  maxWidth: 16,
                }
              : undefined
          }
        >
          {density === "expanded" ? (
            <GalleryCover item={item} selected={false} visible />
          ) : (
            <span
              className="icon icon-css icon-item-type cell-icon"
              data-item-type={item.itemType}
              style={{
                width: density === "row" ? 16 : "100%",
                height: density === "row" ? 16 : "100%",
                minWidth: density === "row" ? 16 : undefined,
                maxWidth: density === "row" ? 16 : undefined,
                padding: density === "row" ? 0 : undefined,
                margin: density === "row" ? 0 : undefined,
                boxSizing: "border-box",
                display: "block",
                backgroundOrigin:
                  "padding-box, padding-box, padding-box, padding-box",
                backgroundPositionX: "50%, 50%, 50%, 50%",
                backgroundPositionY: "50%, 50%, 50%, 50%",
                backgroundRepeat: "no-repeat, repeat, repeat, repeat",
                backgroundSize:
                  density === "row"
                    ? "16px 16px, 0px, 0px, 0px"
                    : "contain, 0px, 0px, 0px",
                filter: isIdentifierSelected
                  ? "invert(0.85) brightness(2.5) contrast(1) hue-rotate(175deg)"
                  : undefined,
              }}
            />
          )}
        </div>
        {density === "row" ? (
          <div className="syllabus-item-text grow min-w-0 flex flex-col gap-0.5">
            <div className="flex flex-row items-baseline gap-2 min-w-0 w-full">
              <div className="flex flex-row items-baseline gap-2 min-w-0 grow overflow-hidden">
                <div
                  className={twMerge(
                    "syllabus-item-title text-[14px] font-medium truncate min-w-0 grow leading-snug",
                    (author || year) && "min-w-[40%]",
                    readerMode && assignmentStatus === "done"
                      ? "line-through"
                      : "",
                  )}
                >
                  {title}
                </div>
                {(author || year) && (
                  <div className="syllabus-item-metadata text-secondary text-[13px] min-w-0 max-w-[45%] truncate text-right inline-flex flex-row gap-1.5 items-baseline justify-end character-separator [--character-separator:'·'] leading-snug whitespace-nowrap">
                    {author && <span className="truncate">{author}</span>}
                    {year && <span className="shrink-0">{year}</span>}
                  </div>
                )}
              </div>
              {!!priority && (
                <PriorityIcon
                  id={priority}
                  colors={!isIdentifierSelected}
                  className="shrink-0 text-[12px] leading-snug"
                  collectionId={collectionId}
                />
              )}
              {(!!viewableAttachments?.length || uniqueUrls.length > 0) && (
                <div
                  className="syllabus-item-actions shrink-0 inline-flex flex-row gap-1 items-center self-center in-[.print]:hidden [&_.syllabus-action-label]:hidden"
                  draggable={false}
                >
                  {viewableAttachments.map((viewableAttachment) => {
                    const getAttachmentLabel = (
                      type:
                        | "pdf"
                        | "snapshot"
                        | "epub"
                        | "html"
                        | "doc"
                        | "txt"
                        | "zip"
                        | "file",
                    ) => {
                      switch (type) {
                        case "pdf":
                          return getString("attachment-pdf");
                        case "snapshot":
                          return getString("attachment-snapshot");
                        case "epub":
                          return getString("attachment-epub");
                        case "html":
                          return getString("attachment-html");
                        case "doc":
                          return getString("attachment-doc");
                        case "txt":
                          return getString("attachment-txt");
                        case "zip":
                          return getString("attachment-zip");
                        case "file":
                          return getString("attachment-file");
                        default:
                          return getString("attachment-view");
                      }
                    };

                    const getAttachmentIconType = (
                      type:
                        | "pdf"
                        | "snapshot"
                        | "epub"
                        | "html"
                        | "doc"
                        | "txt"
                        | "zip"
                        | "file",
                    ) => {
                      switch (type) {
                        case "pdf":
                          return "attachmentPDF";
                        case "epub":
                          return "attachmentEPUB";
                        case "snapshot":
                        case "html":
                          return "attachmentSnapshot";
                        case "doc":
                          return "attachmentDocument";
                        case "txt":
                          return "attachmentText";
                        case "zip":
                          return "attachmentZIP";
                        case "file":
                          return "attachmentFile";
                        default:
                          return "attachmentFile";
                      }
                    };

                    const attachmentLabel = getAttachmentLabel(
                      viewableAttachment.type,
                    );
                    const iconType = getAttachmentIconType(
                      viewableAttachment.type,
                    );

                    return (
                      <div className="focus-states-target in-[.print]:hidden">
                        <button
                          className="syllabus-action-button row flex flex-row items-center justify-center gap-2"
                          onClick={() =>
                            handleAttachmentClick(viewableAttachment)
                          }
                          title={getString("attachment-open", {
                            args: { label: attachmentLabel },
                          })}
                          aria-label={getString("attachment-open", {
                            args: { label: attachmentLabel },
                          })}
                        >
                          <span
                            className="syllabus-action-icon icon icon-css icon-attachment-type"
                            data-item-type={iconType}
                            aria-label={getString("attachment-open", {
                              args: { label: attachmentLabel },
                            })}
                          />
                          <span className="syllabus-action-label">
                            {attachmentLabel}
                          </span>
                        </button>
                      </div>
                    );
                  })}
                  {uniqueUrls.map((urlInfo, index) => (
                    <div
                      key={`url-${index}`}
                      className="focus-states-target in-[.print]:hidden"
                    >
                      <button
                        className="syllabus-action-button row flex flex-row items-center justify-center gap-2"
                        onClick={urlInfo.onClick}
                        title={getString("attachment-open", {
                          args: { label: urlInfo.label },
                        })}
                        aria-label={getString("attachment-open", {
                          args: { label: urlInfo.label },
                        })}
                      >
                        <span
                          className="syllabus-action-icon icon icon-css icon-attachment-type"
                          data-item-type="attachmentLink"
                          aria-label={getString("attachment-open", {
                            args: { label: urlInfo.label },
                          })}
                        />
                        <span className="syllabus-action-label">
                          {urlInfo.label}
                        </span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {galleryNote ? (
              <div
                className="syllabus-item-description text-secondary text-[12px] leading-snug cursor-pointer"
                role="button"
                tabIndex={0}
                title={getString("gallery-note-edit")}
                aria-label={getString("gallery-note-label")}
                onClick={handleGalleryNoteClick}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleGalleryNoteClick(
                      e as unknown as JSX.TargetedMouseEvent<HTMLElement>,
                    );
                  }
                }}
              >
                <ProseText text={galleryNote} />
              </div>
            ) : null}
            {classInstruction && (
              <div className="syllabus-item-description text-secondary text-[12px] leading-snug">
                <ProseText text={classInstruction} />
              </div>
            )}
          </div>
        ) : (
          <div
            className={twMerge(
              "syllabus-item-text grow min-w-0 flex flex-col",
              density === "standard" ? "gap-0.5" : !slim ? "gap-1" : "gap-0.25",
            )}
          >
            {density === "standard" ? (
              <>
                <div className="syllabus-item-title-row flex flex-row gap-2 items-baseline justify-between">
                  <div
                    className={twMerge(
                      "syllabus-item-title text-base font-medium grow wrap-break-word",
                      readerMode && assignmentStatus === "done"
                        ? "line-through"
                        : "",
                    )}
                  >
                    {title}
                  </div>
                  {!!priority && (
                    <PriorityIcon
                      id={priority}
                      colors={!isIdentifierSelected}
                      className="shrink-0 grow-0 text-right block"
                      collectionId={collectionId}
                    />
                  )}
                </div>
                <div className="syllabus-item-metadata text-secondary flex flex-row gap-4">
                  <span className="flex flex-row gap-1 flex-wrap character-separator [--character-separator:'•']">
                    {author && <span>{author}</span>}
                    {date && <span>{date}</span>}
                    {itemTypeLabel && (
                      <span className="text-secondary">{itemTypeLabel}</span>
                    )}
                    {publicationName && (
                      <span>
                        {getString("item-in-publication", {
                          args: { name: publicationName },
                        })}
                      </span>
                    )}
                    {readingTime && (
                      <span>{formatReadingTime(readingTime)}</span>
                    )}
                  </span>
                </div>
                {galleryNote ? (
                  <div
                    className="syllabus-item-description cursor-pointer"
                    role="button"
                    tabIndex={0}
                    title={getString("gallery-note-edit")}
                    aria-label={getString("gallery-note-label")}
                    onClick={handleGalleryNoteClick}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleGalleryNoteClick(
                          e as unknown as JSX.TargetedMouseEvent<HTMLElement>,
                        );
                      }
                    }}
                  >
                    <ProseText text={galleryNote} />
                  </div>
                ) : null}
                {classInstruction && (
                  <div className="syllabus-item-description">
                    <ProseText text={classInstruction} />
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="flex flex-row gap-3 items-baseline justify-start">
                  {!!priority && (
                    <div className="grow-0 shrink-0">
                      <PriorityIcon
                        id={priority}
                        colors={!isIdentifierSelected}
                        collectionId={collectionId}
                      />
                    </div>
                  )}
                  {!slim && itemTypeLabel && (
                    <div className="grow-0 shrink-0">
                      <span className="text-secondary">{itemTypeLabel}</span>
                    </div>
                  )}
                  {!!readStatusName && (
                    <div className="grow-0 shrink-0">
                      <ReadStatusIcon readStatusName={readStatusName} />
                    </div>
                  )}
                </div>
                <div className="syllabus-item-title-row">
                  <div
                    className={twMerge(
                      "syllabus-item-title",
                      !slim ? "text-xl font-medium" : "text-lg font-medium",
                      readerMode && assignmentStatus === "done"
                        ? "line-through"
                        : "",
                    )}
                  >
                    {title}
                  </div>
                </div>
                <div className="syllabus-item-metadata text-secondary">
                  {metadataParts.length > 0 && (
                    <span>{metadataParts.join(" • ")}</span>
                  )}
                </div>
                {!slim && bibliographicReference && (
                  <div className="syllabus-item-reference">
                    {bibliographicReference}
                  </div>
                )}
                {galleryNote ? (
                  <div
                    className="syllabus-item-description cursor-pointer"
                    role="button"
                    tabIndex={0}
                    title={getString("gallery-note-edit")}
                    aria-label={getString("gallery-note-label")}
                    onClick={handleGalleryNoteClick}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleGalleryNoteClick(
                          e as unknown as JSX.TargetedMouseEvent<HTMLElement>,
                        );
                      }
                    }}
                  >
                    <ProseText text={galleryNote} />
                  </div>
                ) : null}
                {classInstruction && (
                  <div className="syllabus-item-description">
                    <ProseText text={classInstruction} />
                  </div>
                )}
              </>
            )}
          </div>
        )}
        {density !== "row" &&
          (!!viewableAttachments?.length || uniqueUrls.length > 0) && (
            <div
              className="syllabus-item-actions shrink-0 inline-flex flex-row gap-1 items-center in-[.print]:hidden"
              draggable={false}
            >
              {/* Attachment buttons */}
              {viewableAttachments.map((viewableAttachment) => {
                const getAttachmentLabel = (
                  type:
                    | "pdf"
                    | "snapshot"
                    | "epub"
                    | "html"
                    | "doc"
                    | "txt"
                    | "zip"
                    | "file",
                ) => {
                  switch (type) {
                    case "pdf":
                      return getString("attachment-pdf");
                    case "snapshot":
                      return getString("attachment-snapshot");
                    case "epub":
                      return getString("attachment-epub");
                    case "html":
                      return getString("attachment-html");
                    case "doc":
                      return getString("attachment-doc");
                    case "txt":
                      return getString("attachment-txt");
                    case "zip":
                      return getString("attachment-zip");
                    case "file":
                      return getString("attachment-file");
                    default:
                      return getString("attachment-view");
                  }
                };

                const getAttachmentIconType = (
                  type:
                    | "pdf"
                    | "snapshot"
                    | "epub"
                    | "html"
                    | "doc"
                    | "txt"
                    | "zip"
                    | "file",
                ) => {
                  switch (type) {
                    case "pdf":
                      return "attachmentPDF";
                    case "epub":
                      return "attachmentEPUB";
                    case "snapshot":
                    case "html":
                      return "attachmentSnapshot";
                    case "doc":
                      return "attachmentDocument";
                    case "txt":
                      return "attachmentText";
                    case "zip":
                      return "attachmentZIP";
                    case "file":
                      return "attachmentFile";
                    default:
                      return "attachmentFile";
                  }
                };

                const attachmentLabel = getAttachmentLabel(
                  viewableAttachment.type,
                );
                const iconType = getAttachmentIconType(viewableAttachment.type);

                return (
                  <div className="focus-states-target in-[.print]:hidden">
                    <button
                      className="syllabus-action-button row flex flex-row items-center justify-center gap-2"
                      onClick={() => handleAttachmentClick(viewableAttachment)}
                      title={getString("attachment-open", {
                        args: { label: attachmentLabel },
                      })}
                      aria-label={getString("attachment-open", {
                        args: { label: attachmentLabel },
                      })}
                    >
                      <span
                        className="syllabus-action-icon icon icon-css icon-attachment-type"
                        data-item-type={iconType}
                        aria-label={getString("attachment-open", {
                          args: { label: attachmentLabel },
                        })}
                      />
                      <span className="syllabus-action-label">
                        {attachmentLabel}
                      </span>
                    </button>
                  </div>
                );
              })}
              {/* Unique URL link buttons */}
              {uniqueUrls.map((urlInfo, index) => (
                <div
                  key={`url-${index}`}
                  className="focus-states-target in-[.print]:hidden"
                >
                  <button
                    className="syllabus-action-button row flex flex-row items-center justify-center gap-2"
                    onClick={urlInfo.onClick}
                    title={getString("attachment-open", {
                      args: { label: urlInfo.label },
                    })}
                    aria-label={getString("attachment-open", {
                      args: { label: urlInfo.label },
                    })}
                  >
                    <span
                      className="syllabus-action-icon icon icon-css icon-attachment-type"
                      data-item-type="attachmentLink"
                      aria-label={getString("attachment-open", {
                        args: { label: urlInfo.label },
                      })}
                    />
                    <span className="syllabus-action-label">
                      {urlInfo.label}
                    </span>
                  </button>
                </div>
              ))}
            </div>
          )}
      </div>
      {!isLocked && !hideHoverActions && (
        <div
          className={twMerge(
            "hidden group-hover:flex absolute top-full left-1/2 -translate-x-1/2 p-2 pt-0 z-20 in-[.print]:hidden! w-auto",
            "border-background border-6 border-t-0 rounded-b-2xl rounded-t-0!",
            // Background solid colour, so that priority colours can be cast atop with some opacity, without revealing spillover content from other items
            "before:content-[''] before:absolute before:top-0 before:left-0 before:w-full! before:bg-background before:rounded-b-lg rounded-t-0! before:z-20! before:h-full!",
            // Apply the priority colour to the after element, with some opacity
            "after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-full! after:bg-(--after-background-color) after:rounded-b-lg rounded-t-0! after:z-25! after:h-full!",
            // Overrides
            isZoteroSelected &&
              !isIdentifierSelected &&
              "not-in-[.print]:border-accent-blue! not-in-[.print]:border-3! not-in-[.print]:border-t-0!",
            isIdentifierSelected && "not-in-[.print]:after:bg-accent-blue!",
          )}
          style={
            !isIdentifierSelected
              ? {
                  "--after-background-color": priority
                    ? priorityColor + "15"
                    : "var(--material-sidepane)",
                }
              : {}
          }
        >
          <div
            className="relative z-30 flex-row gap-2"
            style={{
              display: "inherit",
            }}
          >
            {!!assignment?.id && (
              <>
                <div className="focus-states-target">
                  <button
                    className="syllabus-action-button row flex flex-row items-center justify-center gap-2"
                    onClick={async (e) => {
                      e.stopPropagation();
                      try {
                        // Always pass identifier - handler will check if it's in selection
                        if (onDuplicate) {
                          const identifier = {
                            assignmentId: assignment.id,
                            itemId: undefined,
                          };
                          await onDuplicate(identifier);
                        }
                      } catch (err) {
                        ztoolkit.log("Error duplicating assignment:", err);
                      }
                    }}
                    title={getString("assignment-duplicate")}
                    aria-label={getString("assignment-duplicate")}
                  >
                    <span
                      className="syllabus-action-icon"
                      style={{
                        fontSize: "16px",
                        lineHeight: "1",
                      }}
                    >
                      ⧉
                    </span>
                    <span className="syllabus-action-label">
                      {getString("assignment-duplicate-label")}
                    </span>
                  </button>
                </div>
                <div className="focus-states-target">
                  <button
                    className="syllabus-action-button row flex flex-row items-center justify-center gap-2"
                    onClick={async (e) => {
                      e.stopPropagation();
                      try {
                        // Always pass identifier - handler will check if it's in selection
                        if (onDelete) {
                          const identifier = {
                            assignmentId: assignment.id,
                            itemId: undefined,
                          };
                          await onDelete(identifier);
                        }
                      } catch (err) {
                        ztoolkit.log("Error deleting assignment:", err);
                      }
                    }}
                    title={
                      classNumber !== null && classNumber !== undefined
                        ? getString("assignment-unassign-class")
                        : getString("assignment-unassign-syllabus")
                    }
                    aria-label={
                      classNumber !== null && classNumber !== undefined
                        ? getString("assignment-unassign-class")
                        : getString("assignment-unassign-syllabus")
                    }
                  >
                    <span
                      className="syllabus-action-icon"
                      style={{
                        fontSize: "18px",
                        lineHeight: "1",
                        fontWeight: "bold",
                      }}
                    >
                      ×
                    </span>
                    <span className="syllabus-action-label">
                      {getString("assignment-unassign-label")}
                    </span>
                  </button>
                </div>
                &middot;
              </>
            )}
            {(() => {
              const priorityOptions = syllabusMetadata.priorities || [];
              return [
                ...priorityOptions.map((priorityOption: Priority) => {
                  return (
                    <div
                      key={priorityOption.id}
                      className="focus-states-target"
                    >
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            // Always pass identifier - handler will check if it's in selection
                            if (onPriorityChange) {
                              const identifier = {
                                assignmentId: assignment?.id,
                                itemId: assignment ? undefined : item.id,
                              };
                              await onPriorityChange(
                                priorityOption.id,
                                identifier,
                              );
                            }
                          } catch (err) {
                            ztoolkit.log("Error setting priority:", err);
                          }
                        }}
                        title={getString("priority-set-to", {
                          args: { name: priorityOption.name },
                        })}
                        aria-label={getString("priority-set-to", {
                          args: { name: priorityOption.name },
                        })}
                      >
                        <span
                          className="syllabus-action-icon inline-block mt-1 -mb-1 w-3 h-3 rounded-full"
                          style={{
                            backgroundColor: priorityOption.color,
                          }}
                        />
                        {/* <span className="syllabus-action-label">
                        {priorityOption.name}
                      </span> */}
                      </button>
                    </div>
                  );
                }),
                <div key="none" className="focus-states-target">
                  <button
                    // className="syllabus-action-button row inline-lex flex-row items-center justify-center gap-2"
                    onClick={async (e) => {
                      e.stopPropagation();
                      try {
                        // Always pass identifier - handler will check if it's in selection
                        if (onPriorityChange) {
                          const identifier = {
                            assignmentId: assignment?.id,
                            itemId: assignment ? undefined : item.id,
                          };
                          await onPriorityChange(undefined, identifier);
                        }
                      } catch (err) {
                        ztoolkit.log("Error clearing priority:", err);
                      }
                    }}
                    title={getString("priority-clear")}
                    aria-label={getString("priority-clear")}
                  >
                    <span className="syllabus-action-label">
                      {getString("menu-none")}
                    </span>
                  </button>
                </div>,
              ];
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

function PriorityIcon({
  id,
  colors = true,
  className,
  collectionId,
}: {
  id: string;
  colors?: boolean;
  className?: string;
  collectionId?: number;
}) {
  if (!id) return null;

  // Use collection-specific colors and labels if collectionId is provided
  const { color: priorityColor, label: priorityLabel } =
    SyllabusManager.getPriorityDisplay(collectionId, id);

  if (!priorityLabel) return null;

  return (
    <span
      className={twMerge(
        // inline-flex: Zotero's `.flex` sets `flex: 1 1 0%` (item grow), not display.
        "uppercase font-semibold tracking-wide inline-flex flex-row gap-1.5 items-baseline",
        className,
      )}
    >
      <span
        className="w-3 h-3 rounded-full inline-block in-[.print]:hidden"
        style={{
          backgroundColor: colors ? priorityColor : "var(--color-primary)",
        }}
      />
      <span
        className="rounded-md px-1 py-0.25 whitespace-nowrap"
        style={{
          backgroundColor: colors ? priorityColor + "15" : undefined,
          color: colors ? priorityColor : undefined,
        }}
      >
        {priorityLabel}
      </span>
    </span>
  );
}

function ReadStatusIcon({ readStatusName }: { readStatusName: string }) {
  const readStatus = useMemo(
    () => getReadStatusMetadata(readStatusName),
    [readStatusName],
  );
  if (!readStatus) return null;
  return (
    <span className="uppercase font-semibold tracking-wide inline-flex flex-row gap-2 items-baseline rounded-md px-1 py-0.25 in-[.print]:hidden">
      <span className="w-3 h-3 rounded-full inline-block">
        {readStatus.icon}
      </span>
      <span>{readStatus.name}</span>
    </span>
  );
}
