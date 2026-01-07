// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h } from "preact";
import { useMemo, useRef, useEffect } from "preact/hooks";
import { ItemSyllabusAssignment } from "./syllabus";
import { useZoteroSyllabusMetadata } from "./react-zotero-sync/syllabusMetadata";

interface TableOfContentsProps {
  classGroups: Array<{
    classNumber: number | null;
    itemAssignments: Array<{
      item: Zotero.Item;
      assignment: ItemSyllabusAssignment;
    }>;
  }>;
  collectionId: number;
  isOpen: boolean;
  onClose: () => void;
}

export function TableOfContents({
  classGroups,
  collectionId,
  isOpen,
  onClose,
}: TableOfContentsProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [syllabusMetadata] = useZoteroSyllabusMetadata(collectionId);

  const singularCapitalized = useMemo(() => {
    const singular = syllabusMetadata.nomenclature || "class";
    return singular.charAt(0).toUpperCase() + singular.slice(1);
  }, [syllabusMetadata.nomenclature]);

  const tocEntries = useMemo(() => {
    return classGroups
      .filter((g) => g.classNumber !== null && g.itemAssignments.length > 0)
      .map((group) => {
        const classNumber = group.classNumber!;
        const classTitle = syllabusMetadata.classes?.[classNumber]?.title || "";
        const label = classTitle
          ? `${singularCapitalized} ${classNumber}: ${classTitle}`
          : `${singularCapitalized} ${classNumber}`;

        return {
          id: `toc-class-${classNumber}`,
          label,
          classNumber,
        };
      });
  }, [classGroups, syllabusMetadata, singularCapitalized]);

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
                className="block text-sm font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer py-1"
                style={{
                  textDecoration: "underline",
                  color: "var(--color-accent-blue)",
                }}
              >
                {entry.label}
              </a>
            ))
          )}
        </nav>
      </div>
    </div>
  );
}
