// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h } from "preact";
import { useMemo, useRef, useEffect } from "preact/hooks";
import { SyllabusManager, type OutlineNode } from "./syllabus";
import { useZoteroSyllabusMetadata } from "./react-zotero-sync/syllabusMetadata";
import { formatReadingDate } from "../utils/dates";
import { useSyllabusClassGroups } from "./classGroups";
import { classByNumber } from "../utils/schemas";

interface TableOfContentsProps {
  collectionId: number;
  classGroups: ReturnType<typeof useSyllabusClassGroups>["classGroups"];
  isOpen: boolean;
  onClose: () => void;
}

type TocEntry =
  | {
      kind: "section";
      id: string;
      label: string;
      depth: number;
    }
  | {
      kind: "class";
      id: string;
      label: string;
      depth: number;
      readingDate?: string | null;
    };

function buildTocEntries(
  nodes: OutlineNode[],
  collectionId: number,
  sections: Record<string, { title?: string | null } | undefined>,
  depth: number,
): TocEntry[] {
  const entries: TocEntry[] = [];
  for (const node of nodes) {
    if (node.type === "section") {
      const title = (sections[node.sectionId]?.title || "").trim();
      entries.push({
        kind: "section",
        id: `toc-section-${node.sectionId}`,
        label: title || "Untitled section",
        depth,
      });
      entries.push(
        ...buildTocEntries(node.children, collectionId, sections, depth + 1),
      );
      continue;
    }
    const classNumber = SyllabusManager.getClassNumber(
      collectionId,
      node.classId,
    );
    if (!classNumber) {
      continue;
    }
    const label = SyllabusManager.getClassTitle(collectionId, classNumber, true);
    const meta = classByNumber(
      SyllabusManager.getSyllabusMetadata(collectionId),
      classNumber,
    );
    entries.push({
      kind: "class",
      id: `toc-class-${classNumber}`,
      label,
      depth,
      readingDate: meta?.readingDate,
    });
  }
  return entries;
}

export function TableOfContents({
  collectionId,
  classGroups,
  isOpen,
  onClose,
}: TableOfContentsProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [syllabusMetadata] = useZoteroSyllabusMetadata(collectionId);

  const tocEntries = useMemo(() => {
    const outline = syllabusMetadata.outline || [];
    if (outline.length > 0) {
      return buildTocEntries(
        outline,
        collectionId,
        syllabusMetadata.sections || {},
        0,
      );
    }
    // Fallback for documents without outline yet
    return classGroups
      .filter(({ classNumber }) => !!classNumber)
      .map(({ classNumber, syllabusMetadata: classMeta }) => ({
        kind: "class" as const,
        id: `toc-class-${classNumber}`,
        label: SyllabusManager.getClassTitle(
          collectionId,
          Number(classNumber),
          true,
        ),
        depth: 0,
        readingDate: classMeta?.readingDate,
      }));
  }, [classGroups, collectionId, syllabusMetadata]);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const tocButton = document.querySelector('[data-toc-button="true"]');

      if (
        tocButton?.contains(target) ||
        dropdownRef.current?.contains(target)
      ) {
        return;
      }

      onClose();
    };

    const timeoutId = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 10);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleClick = (id: string) => {
    const element = document.getElementById(id);
    if (!element) {
      onClose();
      return;
    }

    // Find the scrollable container (.syllabus-page)
    const scrollContainer = element.closest(".syllabus-page") as HTMLElement;

    if (!scrollContainer) {
      // Fallback: use scrollIntoView if container not found
      element.scrollIntoView({ behavior: "smooth", block: "start" });
      onClose();
      return;
    }

    // Use a small delay to ensure DOM is ready
    setTimeout(() => {
      // Calculate total height of all sticky headers
      let stickyOffset = 0;

      // Find the main sticky title container within the scroll container
      const titleContainer = scrollContainer.querySelector(
        "[syllabus-view-title-container]",
      ) as HTMLElement;
      if (titleContainer) {
        const rect = titleContainer.getBoundingClientRect();
        stickyOffset += rect.height;
      }

      // Add some padding for visual spacing
      const padding = 16;
      const totalOffset = stickyOffset + padding;

      // Calculate positions relative to the scroll container
      const containerRect = scrollContainer.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();

      // Calculate the target scroll position within the container
      const elementTopRelative =
        elementRect.top - containerRect.top + scrollContainer.scrollTop;
      const targetScroll = elementTopRelative - totalOffset;

      // Scroll the container to the calculated position
      scrollContainer.scrollTo({
        top: Math.max(0, targetScroll),
        behavior: "smooth",
      });
    }, 10);

    onClose();
  };

  return (
    <div
      ref={dropdownRef}
      className="absolute left-0 top-full mt-2 bg-background border border-quinary rounded-lg shadow-lg z-50 max-h-[80vh] overflow-y-auto min-w-[300px] max-w-[400px]"
    >
      <div className="p-4">
        <div className="text-sm font-semibold mb-3 text-secondary">
          Table of Contents
        </div>
        <nav className="space-y-1">
          {tocEntries.length === 0 ? (
            <div className="text-sm text-secondary py-2">
              No classes available
            </div>
          ) : (
            tocEntries.map((entry) => (
              <a
                key={entry.id}
                href={`#${entry.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  handleClick(entry.id);
                }}
                className={
                  entry.kind === "section"
                    ? "block font-semibold decoration-none! text-secondary! hover:text-accent-blue hover:bg-quinary rounded-md px-1 hover:underline cursor-pointer py-1"
                    : "block font-medium decoration-none! text-primary! hover:text-accent-blue hover:bg-quinary rounded-md px-1 hover:underline cursor-pointer py-1"
                }
                style={{ paddingLeft: `${4 + entry.depth * 12}px` }}
              >
                {entry.label}
                {entry.kind === "class" && entry.readingDate ? (
                  <span className="ml-2 text-secondary">
                    {formatReadingDate(entry.readingDate)}
                  </span>
                ) : null}
              </a>
            ))
          )}
        </nav>
      </div>
    </div>
  );
}
