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

/**
 * ItemSyllabusAssignment schema
 * Version 2: Ensures id is always present
 */
const ItemSyllabusAssignmentV2Schema = z.object({
  id: z.string(),
  classNumber: z.number().optional(),
  priority: SyllabusPrioritySchema.optional(),
  classInstruction: z.string().optional(),
  status: AssignmentStatusSchema.optional()
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
        const id = old.id || `assignment-${uuidv7()}`;
        return {
          ...old,
          id
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
  z.string(),
  ItemSyllabusAssignmentV1Schema,
);

/**
 * ItemSyllabusData schema
 * Version 2: New format - collection maps to array of assignments only
 */
const ItemSyllabusDataV2Schema = z.record(
  z.string(),
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
      // Found old format
      return 1;
    }
  }

  // All collections are arrays (new format)
  return 2;
}

/**
 * Versioned ItemSyllabusData entity
 * Handles migration from v1 (mixed format) to v2 (array format only)
 */
export const ItemSyllabusDataEntity = createVersionedEntity({
  latestVersion: 2,
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
          ztoolkit.log("Error validating migrated ItemSyllabusData:", validationResult.error);
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
 * Settings Syllabus Metadata schema
 * Automatically filters out null classes during parsing
 */
export const SettingsSyllabusMetadataSchema = z.object({
  description: z.string().optional(),
  classes: z
    .record(z.string(), SettingsClassMetadataSchema.nullable())
    .optional()
    .transform((classes) => {
      if (!classes) return undefined;
      // Filter out null classes
      const filtered: Record<
        string,
        z.infer<typeof SettingsClassMetadataSchema>
      > = {};
      for (const [key, value] of Object.entries(classes)) {
        if (value !== null) {
          filtered[key] = value;
        }
      }
      return Object.keys(filtered).length > 0 ? filtered : undefined;
    }),
  nomenclature: z.string().optional(),
  priorities: z.array(CustomPrioritySchema).optional(),
  locked: z.boolean().optional(),
  links: z.array(z.string()).optional(),
});

/**
 * Settings Collection Dictionary Data schema
 * Maps collection IDs to syllabus metadata
 */
export const SettingsCollectionDictionaryDataSchema = z.record(
  z.string(),
  SettingsSyllabusMetadataSchema,
);

/**
 * Type exports - inferred from Zod schemas
 */
export type ItemSyllabusAssignment = z.infer<
  typeof ItemSyllabusAssignmentEntity.latestSchema
>;
export type ItemSyllabusData = z.infer<typeof ItemSyllabusDataSchema>;
export type CustomPriority = z.infer<typeof CustomPrioritySchema>;
export type SettingsClassMetadata = z.infer<typeof SettingsClassMetadataSchema>;
export type SettingsSyllabusMetadata = z.infer<
  typeof SettingsSyllabusMetadataSchema
>;
export type SettingsCollectionDictionaryData = z.infer<
  typeof SettingsCollectionDictionaryDataSchema
>;
export type AssignmentStatus = z.infer<typeof AssignmentStatusSchema>;
export type ClassStatus = z.infer<typeof ClassStatusSchema>;
