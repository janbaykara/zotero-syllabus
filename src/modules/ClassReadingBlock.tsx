// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h, Fragment } from "preact";
import { useMemo } from "preact/hooks";
import { twMerge } from "tailwind-merge";
import { ChevronLeft } from "lucide-preact";
import { SyllabusManager, ItemSyllabusAssignment } from "./syllabus";
import { SyllabusItemCard } from "./SyllabusItemCard";
import { useZoteroCompactMode } from "./react-zotero-sync/compactMode";
import { useZoteroCollectionTitle } from "./react-zotero-sync/collectionTitle";
import { useZoteroSyllabusMetadata } from "./react-zotero-sync/syllabusMetadata";
import { useZoteroCollectionItems } from "./react-zotero-sync/collectionItems";
import { useSyllabusClassGroups } from "./classGroups";
import { formatReadingDate } from "../utils/dates";
import { isZotero8OrLater, selectZoteroCollection } from "../utils/zotero";
import { getCachedCollectionById } from "../utils/cache";
import { TabManager } from "../utils/tabManager";
import { classByNumber } from "../utils/schemas";

export type ClassReading = {
  collectionId: number;
  collectionName: string;
  classNumber: number;
  classTitle: string;
  classDescription: string;
  readingDate?: string;
  items: Array<{ item: Zotero.Item; assignment: ItemSyllabusAssignment }>;
};

export function selectCollectionInLibrary(collectionId: number): void {
  try {
    if (!selectZoteroCollection(collectionId)) {
      return;
    }
    TabManager.selectLibraryTab();
  } catch (error) {
    ztoolkit.log("Error selecting collection:", error);
  }
}

export function openCollectionSyllabusPage(collectionId: number): void {
  try {
    if (!selectZoteroCollection(collectionId)) {
      return;
    }
    TabManager.selectLibraryTab();
    void SyllabusManager.setCollectionViewMode("syllabus").then(() => {
      SyllabusManager.setupPage();
    });
  } catch (error) {
    ztoolkit.log("Error opening syllabus page:", error);
  }
}

export function selectItemInCollection(
  item: Zotero.Item,
  collectionId: number,
): void {
  try {
    const ZoteroPane = ztoolkit.getGlobal("ZoteroPane");
    const collection = getCachedCollectionById(collectionId);
    if (collection) {
      const collectionsView = ZoteroPane.collectionsView;
      if (collectionsView) {
        collectionsView.selectByID(collection.treeViewID);
        if (!item.deleted) {
          ZoteroPane.selectItem(item.id);
        }
      }
    } else {
      ZoteroPane.selectItem(item.id);
    }
  } catch (error) {
    ztoolkit.log("Error selecting item in collection:", error);
  }
}

export function ClassReadingBlock({
  classReading,
  compactMode,
  showCollectionLink = true,
  onCollectionClick,
  onItemClick,
}: {
  classReading: ClassReading;
  compactMode: boolean;
  showCollectionLink?: boolean;
  onCollectionClick?: () => void;
  onItemClick?: (item: Zotero.Item) => void;
}) {
  const { singularCapitalized, singular } =
    SyllabusManager.getNomenclatureFormatted(classReading.collectionId);
  const classStatus = SyllabusManager.getClassStatus(
    classReading.collectionId,
    classReading.classNumber,
  );

  const handleClassStatusToggle = async () => {
    try {
      const newStatus = classStatus === "done" ? null : "done";
      await SyllabusManager.setClassStatus(
        classReading.collectionId,
        classReading.classNumber,
        newStatus,
        "page",
      );
    } catch (error) {
      ztoolkit.log("Error toggling class status:", error);
    }
  };

  return (
    <div
      className={twMerge(
        "relative",
        classStatus === "done" ? "opacity-40" : "",
      )}
    >
      <div className="flex flex-col gap-2 mb-2">
        <div>
          <input
            type="checkbox"
            checked={classStatus === "done"}
            onChange={handleClassStatusToggle}
            className={twMerge(
              "absolute right-full mr-1 w-4 h-4 cursor-pointer shrink-0 self-center in-[.print]:hidden accent-accent-green!",
              isZotero8OrLater() ? "md:mr-2!" : "mr-2!",
            )}
            title={classStatus === "done" ? "Mark as not done" : "Mark as done"}
            aria-label={
              classStatus === "done" ? "Mark as not done" : "Mark as done"
            }
          />
          <div
            className={twMerge(
              "flex-1",
              showCollectionLink ? "text-xl" : "text-3xl",
              classStatus === "done" ? "line-through" : "",
              onCollectionClick
                ? "hover:cursor-pointer hover:bg-quinary active:bg-quarternary rounded-md px-1 -mx-1 inline-block"
                : "inline-block px-1 -mx-1",
            )}
            onClick={onCollectionClick}
          >
            {classReading.classTitle ? (
              <>
                <span className="font-semibold">{classReading.classTitle}</span>
                <span className="text-secondary">, </span>
              </>
            ) : null}
            <span className="text-secondary">
              {classReading.classTitle ? singular : singularCapitalized}{" "}
              {classReading.classNumber}
            </span>
            {showCollectionLink ? (
              <>
                <span className="text-secondary"> of </span>
                <span className="font-semibold">
                  {classReading.collectionName}
                </span>
              </>
            ) : null}
          </div>
        </div>
        {classReading.classDescription && (
          <div className="text-base mb-1">{classReading.classDescription}</div>
        )}
      </div>
      <div
        className={twMerge(
          "space-y-2",
          compactMode ? "space-y-2" : "space-y-4",
        )}
      >
        {classReading.items.map(({ item, assignment }) => {
          if (!assignment.id) return null;
          const priority = assignment.priority || "";
          const uniqueKey = `${item.id}-assignment-${assignment.id}`;
          return (
            <SyllabusItemCard
              key={uniqueKey}
              item={item}
              collectionId={classReading.collectionId}
              classNumber={classReading.classNumber}
              assignment={assignment}
              slim={compactMode || !priority || priority === "optional"}
              compactMode={compactMode}
              isLocked={true}
              onClick={onItemClick}
              readerMode
              className={onItemClick ? "cursor-pointer" : undefined}
            />
          );
        })}
      </div>
    </div>
  );
}

export function ClassSubcollectionPage({
  parentCollectionId,
  classCollectionId,
  classNumber,
}: {
  parentCollectionId: number;
  classCollectionId: number;
  classNumber: number | null;
}) {
  const [compactMode] = useZoteroCompactMode();
  const [parentTitle] = useZoteroCollectionTitle(parentCollectionId);
  const [syllabusMetadata] = useZoteroSyllabusMetadata(parentCollectionId);
  const syllabusItems = useZoteroCollectionItems(parentCollectionId);
  const { classGroups } = useSyllabusClassGroups(
    parentCollectionId,
    syllabusItems,
    syllabusMetadata,
    0,
  );

  const classGroup = useMemo(() => {
    if (classNumber == null) {
      return undefined;
    }
    return classGroups.find((group) => group.classNumber === classNumber);
  }, [classGroups, classNumber]);

  const classMeta = classByNumber(syllabusMetadata, classNumber);

  const classReading: ClassReading | null =
    classNumber != null
      ? {
          collectionId: parentCollectionId,
          collectionName: parentTitle || "",
          classNumber,
          classTitle: classMeta?.title || "",
          classDescription: classMeta?.description || "",
          readingDate: classMeta?.readingDate || undefined,
          items: classGroup?.itemAssignments || [],
        }
      : null;

  const openParent = () => openCollectionSyllabusPage(parentCollectionId);

  return (
    <div className="syllabus-page overflow-y-auto overflow-x-hidden h-full bg-background">
      <div className="pb-12">
        <div
          className={twMerge(
            "sticky top-0 z-20 bg-background py-1",
            isZotero8OrLater() ? "pt-4 md:pt-8" : "pt-8",
          )}
        >
          <div className="container-padded bg-background">
            <button
              type="button"
              onClick={openParent}
              className="flex items-center gap-1 text-secondary hover:text-primary bg-transparent! border-none p-0 cursor-pointer text-base in-[.print]:hidden"
              title={`Open syllabus for ${parentTitle || "this collection"}`}
            >
              <ChevronLeft size={18} />
              <span className="font-semibold">{parentTitle || "Syllabus"}</span>
            </button>
            <p className="text-sm text-secondary mt-1 in-[.print]:hidden">
              Auto-managed from this syllabus. Edits in this folder are
              overwritten.
            </p>
          </div>
        </div>

        <div className="container-padded mt-6">
          {classReading?.readingDate ? (
            <div className="text-secondary text-2xl mb-6">
              {formatReadingDate(classReading.readingDate)}
            </div>
          ) : null}

          {classReading ? (
            <ClassReadingBlock
              classReading={classReading}
              compactMode={compactMode}
              showCollectionLink={false}
              onItemClick={(item) =>
                selectItemInCollection(item, classCollectionId)
              }
            />
          ) : (
            <p className="text-secondary text-lg">
              This folder is part of {parentTitle || "the syllabus"}.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
