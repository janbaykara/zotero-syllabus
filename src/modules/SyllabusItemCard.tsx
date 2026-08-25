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
import {
  youtubeStartSeconds,
  youtubeUrlFromItem,
  youtubeVideoIdFromUrl,
} from "../utils/youtube";
import {
  getItemReadStatusName,
  getReadStatusMetadata,
} from "../zotero-reading-list/compat";
import { getReadingTimeSync, formatReadingTime } from "../utils/readingTime";
import { YoutubePlayer } from "./YoutubePlayer";

export function SyllabusItemCard({
  className,
  item,
  collectionId,
  classNumber,
  assignment,
  slim = false,
  compactMode = false,
  readerMode = false,
  isLocked = false,
  onDrop,
  onDragOver,
  onClick: customOnClick,
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
  compactMode?: boolean;
  readerMode?: boolean;
  isLocked?: boolean;
  onDrop?: (
    e: JSX.TargetedDragEvent<HTMLElement>,
    insertBefore: boolean,
  ) => void;
  onDragOver?: (e: JSX.TargetedDragEvent<HTMLElement>) => void;
  onClick?: (
    item: Zotero.Item,
    e?: JSX.TargetedMouseEvent<HTMLElement>,
  ) => void; // Optional custom click handler
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
    item.getField("publicationTitle") || item.getField("bookTitle") || "";
  const url = item.getField("url") || "";
  const youtubeSourceUrl = useMemo(() => youtubeUrlFromItem(item), [item]);
  const youtubeVideoId = youtubeVideoIdFromUrl(youtubeSourceUrl);
  const showYoutubeEmbed = !compactMode && Boolean(youtubeVideoId);
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
      if (slim) return;
      if (getPref("showBibliography")) {
        const cslStyle = syllabusMetadata.cslStyle || null;
        const ref = await generateBibliographicReference(item, true, cslStyle);
        setBibliographicReference(ref || "");
      }
    })();
  }, [item, slim, syllabusMetadata.cslStyle]);

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
        | "pdf"
        | "snapshot"
        | "epub"
        | "html"
        | "doc"
        | "txt"
        | "zip"
        | "file";
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
    publicationName ? `in ${publicationName}` : undefined,
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
          label: "URL",
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
          label: "URL",
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
      pane.viewPDF(viewableAttachment, { page: 1 } as any);
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
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = "move";
    }
    if (onDragOver) {
      onDragOver(e);
    }
  };

  const handleItemDrop = (e: JSX.TargetedDragEvent<HTMLElement>) => {
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
    if (!assignment?.id) return;

    try {
      const newStatus = assignmentStatus === "done" ? null : "done";
      await SyllabusManager.updateClassAssignment(
        item,
        collectionId,
        assignment.id,
        { status: newStatus },
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
        "in-[.print]:scheme-light",
        "rounded-lg flex shrink-0",
        showYoutubeEmbed ? "flex-col" : "flex-row items-start justify-between",
        "bg-background-sidepane text-primary",
        "relative",
        isLocked || showYoutubeEmbed ? "cursor-default" : "cursor-grab",
        // For hovering contextual btns
        "group relative",
        compactMode
          ? "px-4 py-1.5 gap-3"
          : slim
            ? "px-4 py-2.5 gap-4"
            : "px-4 py-4 gap-4",
        isZoteroSelected &&
          !isIdentifierSelected &&
          "not-in-[.print]:outline-2! not-in-[.print]:outline-accent-blue",
        isIdentifierSelected && "not-in-[.print]:bg-accent-blue! scheme-dark",
        // isZoteroSelected && isIdentifierSelected && "outline-none!",
        // assignmentStatus === "done" ? "opacity-40" : "",
        className,
      )}
      data-item-id={item.id}
      data-syllabus-identifier={identifier}
      draggable={!isLocked && !showYoutubeEmbed}
      onClick={(e) => {
        if (customOnClick) {
          customOnClick(item, e);
        } else if (onIdentifierClick) {
          onIdentifierClick(item, assignment?.id, e);
        } else {
          onClick(item, e);
        }
      }}
      onDblClick={(e) => onDoubleClick(item, e)}
      onDragStart={isLocked || showYoutubeEmbed ? undefined : handleDragStart}
      onDragEnd={isLocked || showYoutubeEmbed ? undefined : handleDragEnd}
      onDragOver={isLocked ? undefined : handleItemDragOver}
      onDrop={isLocked ? undefined : handleItemDrop}
    >
      {readerMode && (
        <input
          type="checkbox"
          checked={assignmentStatus === "done"}
          onChange={handleAssignmentStatusToggle}
          className={twMerge(
            "absolute right-full mr-1 w-4 h-4 cursor-pointer shrink-0 self-center in-[.print]:hidden",
            isZotero8OrLater() ? "md:mr-2!" : "mr-2!",
          )}
          title={
            assignmentStatus === "done" ? "Mark as not done" : "Mark as done"
          }
          aria-label={
            assignmentStatus === "done" ? "Mark as not done" : "Mark as done"
          }
          onClick={(e) => e.stopPropagation()}
        />
      )}
      <div
        className={
          showYoutubeEmbed
            ? twMerge(
                "flex w-full flex-row items-start justify-between gap-4",
                isLocked ? "cursor-default" : "cursor-grab",
              )
            : "contents"
        }
        draggable={!isLocked && showYoutubeEmbed}
        onDragStart={
          !isLocked && showYoutubeEmbed ? handleDragStart : undefined
        }
        onDragEnd={!isLocked && showYoutubeEmbed ? handleDragEnd : undefined}
      >
        <div
          className={twMerge(
            "syllabus-item-thumbnail grow-0 shrink-0 in-[.print]:hidden",
            compactMode ? "size-6" : slim ? "size-10" : "size-20",
            // !compactMode ? "self-center" : "mt-0.5"
            "self-center",
          )}
        >
          <span
            className="icon icon-css icon-item-type cell-icon"
            data-item-type={item.itemType}
            style={{
              width: "100%",
              height: "100%",
              backgroundOrigin:
                "padding-box, padding-box, padding-box, padding-box",
              backgroundPositionX: "50%, 50%, 50%, 50%",
              backgroundPositionY: "50%, 50%, 50%, 50%",
              backgroundRepeat: "no-repeat, repeat, repeat, repeat",
              backgroundSize: "contain, 0px, 0px, 0px",
              filter: isIdentifierSelected
                ? "invert(0.85) brightness(2.5) contrast(1) hue-rotate(175deg)"
                : undefined,
            }}
          />
        </div>
        <div
          className={twMerge(
            "syllabus-item-text grow flex flex-col",
            compactMode ? "gap-0.5" : !slim ? "gap-1" : "gap-0.25",
          )}
        >
          {compactMode ? (
            <>
              <div className="syllabus-item-title-row flex flex-row gap-2 items-baseline justify-between">
                <div
                  className={twMerge(
                    "text-base font-medium grow wrap-break-word",
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
                  {publicationName && <span>in {publicationName}</span>}
                  {readingTime && <span>{formatReadingTime(readingTime)}</span>}
                </span>
              </div>
              {classInstruction && (
                <div className="syllabus-item-description">
                  {classInstruction}
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
              {classInstruction && (
                <div className="syllabus-item-description">
                  {classInstruction}
                </div>
              )}
            </>
          )}
        </div>
        {(!!viewableAttachments?.length || uniqueUrls.length > 0) && (
          <div
            className="syllabus-item-actions shrink-0 inline-flex flex-row gap-1 in-[.print]:hidden"
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
                    return "PDF";
                  case "snapshot":
                    return "Snapshot";
                  case "epub":
                    return "EPUB";
                  case "html":
                    return "HTML";
                  case "doc":
                    return "DOC";
                  case "txt":
                    return "TXT";
                  case "zip":
                    return "ZIP";
                  case "file":
                    return "File";
                  default:
                    return "View";
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
                    title={`Open ${attachmentLabel}`}
                    aria-label={`Open ${attachmentLabel}`}
                  >
                    <span
                      className="syllabus-action-icon icon icon-css icon-attachment-type"
                      data-item-type={iconType}
                      aria-label={`Open ${attachmentLabel}`}
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
                  title={`Open ${urlInfo.label}`}
                  aria-label={`Open ${urlInfo.label}`}
                >
                  <span
                    className="syllabus-action-icon icon icon-css icon-attachment-type"
                    data-item-type="attachmentLink"
                    aria-label={`Open ${urlInfo.label}`}
                  />
                  <span className="syllabus-action-label">{urlInfo.label}</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      {showYoutubeEmbed && youtubeVideoId ? (
        <YoutubePlayer
          videoId={youtubeVideoId}
          startSeconds={youtubeStartSeconds(youtubeSourceUrl)}
          title={title}
        />
      ) : null}
      {!isLocked && (
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
                    title="Create duplicate assignment"
                    aria-label="Create duplicate assignment"
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
                    <span className="syllabus-action-label">Duplicate</span>
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
                        ? "Remove from class"
                        : "Remove from syllabus"
                    }
                    aria-label={
                      classNumber !== null && classNumber !== undefined
                        ? "Remove from class"
                        : "Remove from syllabus"
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
                    <span className="syllabus-action-label">Unassign</span>
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
                        title={`Set priority to ${priorityOption.name}`}
                        aria-label={`Set priority to ${priorityOption.name}`}
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
                    title="Clear priority"
                    aria-label="Clear priority"
                  >
                    <span className="syllabus-action-label">(None)</span>
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
        "uppercase font-semibold tracking-wide flex flex-row gap-1.5 items-baseline",
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
        className="rounded-md px-1 py-0.25"
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
    <span className="uppercase font-semibold tracking-wide flex flex-row gap-2 items-baseline rounded-md px-1 py-0.25 in-[.print]:hidden">
      <span className="w-3 h-3 rounded-full inline-block">
        {readStatus.icon}
      </span>
      <span>{readStatus.name}</span>
    </span>
  );
}
