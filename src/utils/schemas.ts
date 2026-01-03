import { z } from "zod";
import { createVersionedEntity, defineVersion } from "verzod";
import { uuidv7 } from "uuidv7";

// ztoolkit is available as a global
declare const ztoolkit: ZToolkit;

/**
 * Syllabus Priority enum
 */
export enum SyllabusPriority {
  COURSE_INFO = "course-info",
  ESSENTIAL = "essential",
  RECOMMENDED = "recommended",
  OPTIONAL = "optional",
}

/**
 * Syllabus Priority enum schema
 */
export const SyllabusPrioritySchema = z.nativeEnum(SyllabusPriority);

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

/**
 * ItemSyllabusAssignment schema
 * Version 2: Ensures id is always present
 */
export const classNumberSchema = z.number().int().min(1).optional();

const ItemSyllabusAssignmentV2Schema = z.object({
  id: z.string().default(generateAssignmentId),
  classNumber: classNumberSchema,
  priority: SyllabusPrioritySchema.optional(),
  classInstruction: z.string().optional(),
  status: AssignmentStatusSchema.optional(),
});

/**
 * Get version from assignment data
 */
function getAssignmentVersion(data: unknown): number | null {
  if (typeof data !== "object" || data === null) {
    return null;
  }
  const obj = data as Record<string, unknown>;
  // If no version specified, check if id exists - if not, it's v1, otherwise assume v2
  if (!("id" in obj) || obj.id === undefined) {
    return 1;
  }
  return 2;
}

/**
 * Versioned ItemSyllabusAssignment entity
 * Handles migration from v1 (id optional) to v2 (id required)
 */
export const ItemSyllabusAssignmentEntity = createVersionedEntity({
  latestVersion: 2,
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
        // Generate ID if missing using uuidv7
        const id = old.id || generateAssignmentId();
        return {
          ...old,
          id,
        };
      },
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
          const collection = Zotero.Collections.get(collectionId);
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
export const CustomPrioritySchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/), // Hex color
  order: z.number().int(),
});

/**
 * Settings Class Metadata schema
 */
export const SettingsClassMetadataSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  itemOrder: z.array(z.string()).optional(),
  readingDate: z.string().optional(), // ISO date string
  status: ClassStatusSchema.optional(),
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
  description: z.string().optional(),
  classes: transformClasses(SettingsClassMetadataSchema),
  nomenclature: z.string().optional(),
  priorities: z.array(CustomPrioritySchema).optional(),
  locked: z.boolean().optional(),
});

/**
 * Export Syllabus Metadata schema
 * Extends SettingsSyllabusMetadataSchema with:
 * - collectionTitle field added
 * - locked field excluded
 * - classes use ExportClassMetadataSchema (excludes status)
 *
 * Uses shared transform function to avoid duplication
 */
export const ExportSyllabusMetadataSchema = SettingsSyllabusMetadataSchema.omit(
  {
    classes: true,
    locked: true,
  },
).extend({
  collectionTitle: z.string(),
  classes: transformClasses(ExportClassMetadataSchema),
  rdf: z.string().optional(), // RDF serialized as XML string
});

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
export type CustomPriority = z.infer<typeof CustomPrioritySchema>;
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
export type AssignmentStatus = z.infer<typeof AssignmentStatusSchema>;
export type ClassStatus = z.infer<typeof ClassStatusSchema>;
