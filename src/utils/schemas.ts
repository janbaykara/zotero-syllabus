import { z } from "zod";
import { createVersionedEntity, defineVersion } from "verzod";
import { uuidv7 } from "uuidv7";
import { getCachedCollectionById } from "./cache";

// ztoolkit is available as a global
declare const ztoolkit: ZToolkit;

/**
 * Syllabus Priority enum schema
 */
export const SyllabusPrioritySchema = z.string();

/**
 * Assignment Status schema
 */
export const AssignmentStatusSchema = z.enum(["done"]).nullable();

/**
 * Class Status schema
 */
export const ClassStatusSchema = z.enum(["done"]).nullable();

/**
 * ItemSyllabusAssignment schema
 * Version 1: Basic structure with optional fields
 */
const ItemSyllabusAssignmentV1Schema = z.object({
  id: z.string().optional(),
  classNumber: z.number().optional(),
  priority: SyllabusPrioritySchema.optional(),
  classInstruction: z.string().optional(),
});

function generateAssignmentId(): string {
  return `assignment-${uuidv7()}`;
}

export function generateClassId(): string {
  return `class-${uuidv7()}`;
}

/**
 * ItemSyllabusAssignment schema
 * Version 2: Ensures id is always present
 */
export const classNumberSchema = z.number().int().min(1).optional();

const ItemSyllabusAssignmentV2Schema = z.object({
  id: z.string().default(generateAssignmentId),
  classNumber: classNumberSchema,
  priority: SyllabusPrioritySchema.optional().nullable(),
  classInstruction: z.string().optional().nullable(),
  status: AssignmentStatusSchema.optional().nullable(),
});

/**
 * Version 3: assignments point at a stable classId. classNumber is accepted on
 * ingest (Extra, Talis JSON) but is not stored as identity.
 */
const ItemSyllabusAssignmentV3Schema = z.object({
  id: z.string().default(generateAssignmentId),
  classId: z.string().optional(),
  classNumber: classNumberSchema,
  priority: SyllabusPrioritySchema.optional().nullable(),
  classInstruction: z.string().optional().nullable(),
  status: AssignmentStatusSchema.optional().nullable(),
});

/**
 * Get version from assignment data
 */
function getAssignmentVersion(data: unknown): number | null {
  if (typeof data !== "object" || data === null) {
    return null;
  }
  const obj = data as Record<string, unknown>;
  if (typeof obj.classId === "string" && obj.classId.length > 0) {
    return 3;
  }
  if (!("id" in obj) || obj.id === undefined) {
    return 1;
  }
  return 2;
}

/**
 * Versioned ItemSyllabusAssignment entity
 * Handles migration from v1 (id optional) to v2 (id required) to v3 (classId)
 */
export const ItemSyllabusAssignmentEntity = createVersionedEntity({
  latestVersion: 3,
  getVersion: getAssignmentVersion,
  versionMap: {
    1: defineVersion({
      schema: ItemSyllabusAssignmentV1Schema,
      initial: true,
    }),
    2: defineVersion({
      schema: ItemSyllabusAssignmentV2Schema,
      initial: false,
      up: (old: z.infer<typeof ItemSyllabusAssignmentV1Schema>) => {
        const id = old.id || generateAssignmentId();
        return {
          ...old,
          id,
        };
      },
    }),
    3: defineVersion({
      schema: ItemSyllabusAssignmentV3Schema,
      initial: false,
      up: (old: z.infer<typeof ItemSyllabusAssignmentV2Schema>) => ({
        ...old,
      }),
    }),
  },
});

/**
 * ItemSyllabusData schema
 * Version 1: Old format - collection maps to single object
 */
const ItemSyllabusDataV1Schema = z.record(
  z.string().describe("collectionId"),
  ItemSyllabusAssignmentV1Schema,
);

/**
 * ItemSyllabusData schema
 * Version 2: New format - collection maps to array of assignments only
 * Keys are still numeric collection IDs as strings
 */
const ItemSyllabusDataV2Schema = z.record(
  z.string().describe("collectionId"),
  z.array(ItemSyllabusAssignmentEntity.latestSchema),
);

/**
 * ItemSyllabusData schema
 * Version 3: Array format with `${libraryID}:${collectionKey}` keys
 */
const ItemSyllabusDataV3Schema = z.record(
  z.string().describe("libraryID:collectionKey"),
  z.array(ItemSyllabusAssignmentEntity.latestSchema),
);

/**
 * Get version from ItemSyllabusData
 */
function getItemSyllabusDataVersion(data: unknown): number | null {
  if (typeof data !== "object" || data === null) {
    return null;
  }
  const obj = data as Record<string, unknown>;

  // Check if any collection has the old format (single object instead of array)
  for (const value of Object.values(obj)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      // Found old format (v1)
      return 1;
    }
  }

  // Check if any keys are, nonetheless, numeric IDs (v2)
  // ztoolkit.log("item - considering v2 migration - are they numbers?", Object.keys(obj), Object.keys(obj).some(key => Number.isInteger(Number(key))));
  if (Object.keys(obj).some((key) => Number.isInteger(Number(key)))) {
    // ztoolkit.log("item - considering v2 migration - yes!!!");
    return 2;
  }

  // All collections are arrays with libraryID:key format keys (v3)
  return 3;
}

/**
 * Versioned ItemSyllabusData entity
 * Handles migration from v1 (mixed format) to v2 (array format only) to v3 (libraryID:key format)
 */
export const ItemSyllabusDataEntity = createVersionedEntity({
  latestVersion: 3,
  getVersion: getItemSyllabusDataVersion,
  versionMap: {
    1: defineVersion({
      schema: ItemSyllabusDataV1Schema,
      initial: true,
    }),
    2: defineVersion({
      schema: ItemSyllabusDataV2Schema,
      initial: false,
      up: (old: z.infer<typeof ItemSyllabusDataV1Schema>) => {
        const migrated: z.infer<typeof ItemSyllabusDataV2Schema> = {};

        for (const [collectionId, value] of Object.entries(old)) {
          // Old format: single object, convert to array
          const result = ItemSyllabusAssignmentEntity.safeParse(value);
          if (result.type === "ok") {
            const migratedAssignment = result.value;
            // Only migrate if it has actual data
            if (
              migratedAssignment.priority ||
              migratedAssignment.classInstruction ||
              migratedAssignment.classNumber !== undefined
            ) {
              migrated[collectionId] = [migratedAssignment];
            } else {
              migrated[collectionId] = [];
            }
          } else {
            ztoolkit.log(
              "Error migrating old format assignment:",
              result.error,
              value,
            );
            migrated[collectionId] = [];
          }
        }

        // Validate the migrated data before returning
        const validationResult = ItemSyllabusDataV2Schema.safeParse(migrated);
        if (validationResult.success) {
          return validationResult.data;
        } else {
          ztoolkit.log(
            "Error validating migrated ItemSyllabusData:",
            validationResult.error,
          );
          // Return the migrated data anyway - it should be valid, but if not, log it
          return migrated;
        }
      },
    }),
    3: defineVersion({
      schema: ItemSyllabusDataV3Schema,
      initial: false,
      up: (old: z.infer<typeof ItemSyllabusDataV2Schema>) => {
        const migrated: z.infer<typeof ItemSyllabusDataV3Schema> = {};

        for (const [collectionIdStr, assignments] of Object.entries(old)) {
          // ztoolkit.log("item - Considering v2->v3 migration for collectionIdStr", collectionIdStr);
          // Try to parse as numeric ID
          const collectionId = parseInt(collectionIdStr, 10);
          if (isNaN(collectionId)) {
            // Not a numeric ID, skip or keep as-is
            // ztoolkit.log(
            //   "item - Skipping non-numeric collection ID during migration:",
            //   collectionIdStr,
            // );
            continue;
          }

          // Get collection to extract libraryID and key
          const collection = getCachedCollectionById(collectionId);
          if (!collection) {
            // Collection doesn't exist (orphaned data), skip
            // ztoolkit.log(
            //   "item - Skipping orphaned collection ID during migration:",
            //   collectionId,
            // );
            continue;
          }

          // Convert to new format: `${libraryID}:${collectionKey}`
          const newKey = `${collection.libraryID}:${collection.key}`;
          migrated[newKey] = assignments;
        }

        // Validate the migrated data before returning
        const validationResult = ItemSyllabusDataV3Schema.safeParse(migrated);
        if (validationResult.success) {
          ztoolkit.log("item - migration finished successfully", old, migrated);
          return validationResult.data;
        } else {
          ztoolkit.log(
            "item - Error validating migrated ItemSyllabusData:",
            validationResult.error,
          );
          // Return the migrated data anyway - it should be valid, but if not, log it
          return migrated;
        }
      },
    }),
  },
});

/**
 * ItemSyllabusData schema (for direct use, uses latest version)
 * Maps collection IDs to arrays of assignments
 */
export const ItemSyllabusDataSchema = ItemSyllabusDataEntity.latestSchema;

/**
 * Custom Priority schema
 */
export const PrioritySchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string().optional().nullable(), // Hex color, nullable
  order: z.number().int(),
});

/**
 * Default priorities - defined here to avoid circular dependency
 */
export const DEFAULT_PRIORITIES: z.infer<typeof PrioritySchema>[] = [
  {
    id: "course-info",
    name: "Course Information",
    color: "#F97316",
    order: 1,
  },
  {
    id: "essential",
    name: "Essential",
    color: "#8B5CF6",
    order: 2,
  },
  {
    id: "recommended",
    name: "Recommended",
    color: "#3B82F6",
    order: 3,
  },
  {
    id: "optional",
    name: "Optional",
    color: "#AAA",
    order: 4,
  },
];

/**
 * Settings Class Metadata schema
 */
export const SettingsClassMetadataSchema = z.object({
  title: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  itemOrder: z.array(z.string()).optional(),
  readingDate: z.string().optional().nullable(), // ISO date string
  status: ClassStatusSchema.optional().nullable(),
});

export const StoredClassMetadataSchema = SettingsClassMetadataSchema.extend({
  number: z.number().int().min(1),
  /** Zotero collection.key of the one-way class subcollection. */
  subcollectionKey: z.string().optional(),
});

/**
 * Export Class Metadata schema (excludes status field)
 */
export const ExportClassMetadataSchema = SettingsClassMetadataSchema.omit({
  status: true,
});

/**
 * Shared transform function for classes field
 * Filters out null classes and empty itemOrder arrays
 */
const transformClasses = <T extends z.ZodTypeAny>(classSchema: T) => {
  return z
    .record(z.string(), classSchema)
    .default(() => ({}))
    .transform((classes) => {
      if (!classes) return {};
      const filtered: Record<string, z.infer<typeof classSchema>> = {};
      for (const [key, value] of Object.entries(classes)) {
        if (!value) {
          // Skip null classes
          continue;
        }
        // Remove empty itemOrder arrays
        const cleanedValue = { ...value };
        if (cleanedValue.itemOrder && cleanedValue.itemOrder.length === 0) {
          delete cleanedValue.itemOrder;
        }
        filtered[key] = cleanedValue;
      }
      return Object.keys(filtered).length > 0 ? filtered : {};
    });
};

/**
 * Settings Syllabus Metadata schema
 * Automatically filters out null classes, empty itemOrder arrays, and empty class entries during parsing
 */
export const SettingsSyllabusMetadataSchema = z.object({
  description: z.string().optional().nullable(),
  institution: z.string().optional().nullable(),
  courseCode: z.string().optional().nullable(),
  classes: transformClasses(SettingsClassMetadataSchema),
  nomenclature: z.string().optional(),
  priorities: z.array(PrioritySchema).default(DEFAULT_PRIORITIES),
  locked: z.boolean().optional().nullable(),
  links: z.array(z.string()).optional(),
  cslStyle: z.string().optional().nullable(),
  /** When true, class folders are created and deleted. Missing means off. */
  createSubcollections: z.boolean().optional(),
});

/**
 * Legacy / Talis translator JSON. .syllabus files are the collection note HTML.
 */
export const ExportSyllabusMetadataSchema = SettingsSyllabusMetadataSchema.omit(
  {
    classes: true,
    locked: true,
  },
).extend({
  collectionTitle: z.string().optional().nullable(),
  classes: transformClasses(ExportClassMetadataSchema),
  rdf: z.string().optional(), // RDF serialized as XML string
  items: z
    .record(z.string(), z.array(ItemSyllabusAssignmentEntity.latestSchema))
    .optional(),
});

export const COLLECTION_SYLLABUS_DOCUMENT_VERSION = 2 as const;

/**
 * Collection syllabus document stored in a top-level collection note.
 * Combines syllabus metadata with per-item assignments keyed by item.key.
 */
const CollectionSyllabusDocumentV1Schema =
  SettingsSyllabusMetadataSchema.extend({
    version: z.literal(1).default(1),
    items: z
      .record(z.string(), z.array(ItemSyllabusAssignmentEntity.latestSchema))
      .default(() => ({})),
  });

/**
 * v2: classes are keyed by stable classId; each class stores its display number.
 */
const CollectionSyllabusDocumentV2Schema = SettingsSyllabusMetadataSchema.omit({
  classes: true,
}).extend({
  version: z
    .literal(COLLECTION_SYLLABUS_DOCUMENT_VERSION)
    .default(COLLECTION_SYLLABUS_DOCUMENT_VERSION),
  classes: transformClasses(StoredClassMetadataSchema),
  items: z
    .record(z.string(), z.array(ItemSyllabusAssignmentEntity.latestSchema))
    .default(() => ({})),
  itemIndex: z
    .record(
      z.string(),
      z.object({
        title: z.string().optional(),
        doi: z.string().optional().nullable(),
        isbn: z.string().optional().nullable(),
        pmid: z.string().optional().nullable(),
        pmcid: z.string().optional().nullable(),
        arxiv: z.string().optional().nullable(),
      }),
    )
    .optional(),
});

function getCollectionSyllabusDocumentVersion(data: unknown): number | null {
  if (typeof data !== "object" || data === null) {
    return null;
  }
  const version = (data as Record<string, unknown>).version;
  if (
    typeof version === "number" &&
    Number.isInteger(version) &&
    version >= 1
  ) {
    return version;
  }
  // Unversioned JSON is the original number-keyed document.
  return 1;
}

function migrateClassesToIds(
  oldClasses: Record<string, SettingsClassMetadata> | undefined,
  oldItems: Record<string, ItemSyllabusAssignment[]> | undefined,
): {
  classes: Record<string, z.infer<typeof StoredClassMetadataSchema>>;
  items: Record<string, ItemSyllabusAssignment[]>;
} {
  const classes: Record<string, z.infer<typeof StoredClassMetadataSchema>> = {};
  const numberToId = new Map<number, string>();

  for (const [key, meta] of Object.entries(oldClasses || {})) {
    const number = parseInt(key, 10);
    if (isNaN(number) || !meta) {
      continue;
    }
    const id = generateClassId();
    numberToId.set(number, id);
    classes[id] = StoredClassMetadataSchema.parse({ ...meta, number });
  }

  const items: Record<string, ItemSyllabusAssignment[]> = {};
  for (const [itemKey, assignments] of Object.entries(oldItems || {})) {
    items[itemKey] = assignments.map((assignment) => {
      const { classNumber, ...rest } = assignment;
      if (classNumber === undefined) {
        return rest;
      }
      let classId = numberToId.get(classNumber);
      if (!classId) {
        classId = generateClassId();
        numberToId.set(classNumber, classId);
        classes[classId] = StoredClassMetadataSchema.parse({
          number: classNumber,
        });
      }
      return { ...rest, classId };
    });
  }

  return { classes, items };
}

export const CollectionSyllabusDocumentEntity = createVersionedEntity({
  latestVersion: COLLECTION_SYLLABUS_DOCUMENT_VERSION,
  getVersion: getCollectionSyllabusDocumentVersion,
  versionMap: {
    1: defineVersion({
      schema: CollectionSyllabusDocumentV1Schema,
      initial: true,
    }),
    2: defineVersion({
      schema: CollectionSyllabusDocumentV2Schema,
      initial: false,
      up: (old: z.infer<typeof CollectionSyllabusDocumentV1Schema>) => {
        const { classes, items } = migrateClassesToIds(old.classes, old.items);
        return {
          ...old,
          version: COLLECTION_SYLLABUS_DOCUMENT_VERSION,
          classes,
          items,
        };
      },
    }),
  },
});

export const CollectionSyllabusDocumentSchema =
  CollectionSyllabusDocumentEntity.latestSchema;

/**
 * Settings Collection Dictionary Data schema
 * Version 1: Keys are numeric collection IDs as strings
 */
const SettingsCollectionDictionaryDataV1Schema = z.record(
  z.string(),
  SettingsSyllabusMetadataSchema,
);

/**
 * Settings Collection Dictionary Data schema
 * Version 2: Keys are `${libraryID}:${collectionKey}` format
 */
const SettingsCollectionDictionaryDataV2Schema = z.record(
  z.string(),
  SettingsSyllabusMetadataSchema,
);

/**
 * Get version from SettingsCollectionDictionaryData
 */
function getSettingsCollectionDictionaryDataVersion(
  data: unknown,
): number | null {
  if (typeof data !== "object" || data === null) {
    return null;
  }
  const obj = data as Record<string, unknown>;

  // Check if any key is a numeric ID (old format - local collection IDs)
  if (
    Object.keys(obj).some(
      (key) => !key.includes(":") && !isNaN(parseInt(key, 10)),
    )
  ) {
    return 1;
  }

  // All keys are libraryID:key format (new format)
  return 2;
}

/**
 * Versioned SettingsCollectionDictionaryData entity
 * Handles migration from v1 (numeric collection IDs) to v2 (libraryID:key format)
 */
export const SettingsCollectionDictionaryDataEntity = createVersionedEntity({
  latestVersion: 2,
  getVersion: getSettingsCollectionDictionaryDataVersion,
  versionMap: {
    1: defineVersion({
      schema: SettingsCollectionDictionaryDataV1Schema,
      initial: true,
    }),
    2: defineVersion({
      schema: SettingsCollectionDictionaryDataV2Schema,
      initial: false,
      up: (old: z.infer<typeof SettingsCollectionDictionaryDataV1Schema>) => {
        const migrated: z.infer<
          typeof SettingsCollectionDictionaryDataV2Schema
        > = {};

        for (const [collectionIdStr, metadata] of Object.entries(old)) {
          ztoolkit.log(
            "settings - Considering v1->v2 migration",
            collectionIdStr,
          );

          // Try to parse as numeric ID
          const collectionId = parseInt(collectionIdStr, 10);
          if (isNaN(collectionId)) {
            // Not a numeric ID, skip or keep as-is
            ztoolkit.log(
              "settings - Skipping non-numeric collection ID during migration:",
              collectionIdStr,
            );
            continue;
          }

          // Get collection to extract libraryID and key
          const collection = Zotero.Collections.get(collectionId);
          if (!collection) {
            // Collection doesn't exist (orphaned data), skip
            ztoolkit.log(
              "Skipping orphaned collection ID during migration:",
              collectionId,
            );
            continue;
          }

          // Convert to new format: `${libraryID}:${collectionKey}`
          const newKey = `${collection.libraryID}:${collection.key}`;
          migrated[newKey] = metadata;
        }

        // Validate the migrated data before returning
        const validationResult =
          SettingsCollectionDictionaryDataV2Schema.safeParse(migrated);
        if (validationResult.success) {
          ztoolkit.log("settings - migration finished successfully", migrated);
          return validationResult.data;
        } else {
          ztoolkit.log(
            "Error validating migrated SettingsCollectionDictionaryData:",
            validationResult.error,
          );
          // Return the migrated data anyway - it should be valid, but if not, log it
          return migrated;
        }
      },
    }),
  },
});

/**
 * Settings Collection Dictionary Data schema (for direct use, uses latest version)
 */
export const SettingsCollectionDictionaryDataSchema =
  SettingsCollectionDictionaryDataEntity.latestSchema;

/**
 * Type exports - inferred from Zod schemas
 */
export type ItemSyllabusAssignment = z.infer<
  typeof ItemSyllabusAssignmentEntity.latestSchema
>;
export type ItemSyllabusData = z.infer<typeof ItemSyllabusDataSchema>;
export type Priority = z.infer<typeof PrioritySchema>;
export type SettingsClassMetadata = z.infer<typeof SettingsClassMetadataSchema>;
export type ExportClassMetadata = z.infer<typeof ExportClassMetadataSchema>;
export type SettingsSyllabusMetadata = z.infer<
  typeof SettingsSyllabusMetadataSchema
>;
export type ExportSyllabusMetadata = z.infer<
  typeof ExportSyllabusMetadataSchema
>;
export type SettingsCollectionDictionaryData = z.infer<
  typeof SettingsCollectionDictionaryDataSchema
>;
export type CollectionSyllabusDocument = z.infer<
  typeof CollectionSyllabusDocumentSchema
>;
export type StoredClassMetadata = z.infer<typeof StoredClassMetadataSchema>;
export type AssignmentStatus = z.infer<typeof AssignmentStatusSchema>;
export type ClassStatus = z.infer<typeof ClassStatusSchema>;

export function findClassIdByNumber(
  classes: CollectionSyllabusDocument["classes"] | undefined,
  classNumber: number,
): string | undefined {
  if (!classes) {
    return undefined;
  }
  for (const [classId, meta] of Object.entries(classes)) {
    if (meta?.number === classNumber) {
      return classId;
    }
  }
  return undefined;
}

export function getClassNumberById(
  classes: CollectionSyllabusDocument["classes"] | undefined,
  classId: string | undefined,
): number | undefined {
  if (!classes || !classId) {
    return undefined;
  }
  return classes[classId]?.number;
}

export function assignmentClassNumber(
  assignment: Pick<ItemSyllabusAssignment, "classId" | "classNumber">,
  classes?: CollectionSyllabusDocument["classes"],
): number | undefined {
  const fromId = getClassNumberById(classes, assignment.classId);
  if (fromId !== undefined) {
    return fromId;
  }
  return assignment.classNumber;
}

export function classByNumber(
  metadata: SettingsSyllabusMetadata | undefined,
  classNumber: number | null | undefined,
): SettingsClassMetadata | undefined {
  if (!metadata?.classes || classNumber == null) {
    return undefined;
  }
  return metadata.classes[classNumber] || metadata.classes[String(classNumber)];
}

/** Only an explicit `true` enables class folders. Missing means off. */
export function shouldCreateSubcollections(document: {
  createSubcollections?: boolean | null;
}): boolean {
  return document.createSubcollections === true;
}

export function classesToNumberKeyed(
  classes: CollectionSyllabusDocument["classes"] | undefined,
): SettingsSyllabusMetadata["classes"] {
  const byNumber: NonNullable<SettingsSyllabusMetadata["classes"]> = {};
  for (const meta of Object.values(classes || {})) {
    if (!meta?.number) {
      continue;
    }
    const {
      number: _number,
      subcollectionKey: _subcollectionKey,
      ...rest
    } = meta;
    byNumber[String(meta.number)] = rest;
  }
  return Object.keys(byNumber).length > 0 ? byNumber : {};
}

export function mergeNumberKeyedClasses(
  existing: CollectionSyllabusDocument["classes"] | undefined,
  incoming: SettingsSyllabusMetadata["classes"] | undefined,
): NonNullable<CollectionSyllabusDocument["classes"]> {
  const next: NonNullable<CollectionSyllabusDocument["classes"]> = {
    ...(existing || {}),
  };
  const usedIds = new Set<string>();
  for (const [key, meta] of Object.entries(incoming || {})) {
    const number = parseInt(key, 10);
    if (isNaN(number) || !meta) {
      continue;
    }
    let classId = findClassIdByNumber(next, number);
    if (!classId || usedIds.has(classId)) {
      classId = generateClassId();
    }
    usedIds.add(classId);
    const existingMeta = next[classId];
    next[classId] = StoredClassMetadataSchema.parse({
      ...existingMeta,
      ...meta,
      number,
      ...(existingMeta?.subcollectionKey
        ? { subcollectionKey: existingMeta.subcollectionKey }
        : {}),
    });
  }
  return next;
}

export function ensureClassRecord(
  classes: NonNullable<CollectionSyllabusDocument["classes"]>,
  classNumber: number,
): string {
  const existing = findClassIdByNumber(classes, classNumber);
  if (existing) {
    return existing;
  }
  const classId = generateClassId();
  classes[classId] = StoredClassMetadataSchema.parse({
    title: "",
    number: classNumber,
  });
  return classId;
}

export function persistAssignment(
  assignment: ItemSyllabusAssignment,
  classes: NonNullable<CollectionSyllabusDocument["classes"]>,
): ItemSyllabusAssignment {
  const { classNumber, classId: existingClassId, ...rest } = assignment;
  let classId =
    existingClassId && classes[existingClassId] ? existingClassId : undefined;
  if (typeof classNumber === "number") {
    const currentNumber = classId ? classes[classId]?.number : undefined;
    if (currentNumber !== classNumber) {
      classId = ensureClassRecord(classes, classNumber);
    }
  }
  const persisted: ItemSyllabusAssignment = { ...rest };
  if (classId) {
    persisted.classId = classId;
  }
  return persisted;
}

export function hydrateAssignment(
  assignment: ItemSyllabusAssignment,
  classes?: CollectionSyllabusDocument["classes"],
): ItemSyllabusAssignment {
  const classNumber = assignmentClassNumber(assignment, classes);
  if (classNumber === undefined) {
    return assignment;
  }
  return { ...assignment, classNumber };
}

export function hydrateAssignments(
  assignments: ItemSyllabusAssignment[] | undefined,
  classes?: CollectionSyllabusDocument["classes"],
): ItemSyllabusAssignment[] {
  return (assignments || []).map((assignment) =>
    hydrateAssignment(assignment, classes),
  );
}
