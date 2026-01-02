import type { CollectionConfig, Access } from "payload";

// Access control: check if user is in authors array
const isAuthor: Access = ({ req: { user }, data }) => {
  if (!user) return false;
  // @ts-expect-error - role field
  if (user.role === "admin") return true;

  // For queries, we need to filter by author
  return {
    authors: {
      contains: user.id,
    },
  };
};

// Access control for reading - anyone can read published syllabi
const canRead: Access = ({ req: { user } }) => {
  // If user is logged in, they can see their own plus published
  if (user) {
    return {
      or: [
        { publishedAt: { exists: true } },
        { authors: { contains: user.id } },
        { createdBy: { equals: user.id } },
      ],
    };
  }
  // Public can only see published syllabi
  return {
    publishedAt: { exists: true },
  };
};

export const Syllabi: CollectionConfig = {
  slug: "syllabi",
  admin: {
    useAsTitle: "title",
  },
  access: {
    read: canRead,
    create: ({ req: { user } }) => !!user,
    update: isAuthor,
    delete: isAuthor,
  },
  fields: [
    {
      name: "remoteId",
      type: "text",
      required: true,
      unique: true,
      index: true,
      admin: {
        description: "Format: userId:libraryId:collectionId",
      },
    },
    {
      name: "zoteroUserId",
      type: "text",
      required: true,
      index: true,
      admin: {
        description: "Zotero user ID who owns this syllabus",
      },
    },
    {
      name: "libraryId",
      type: "text",
      required: true,
      index: true,
    },
    {
      name: "collectionId",
      type: "text",
      required: true,
      index: true,
    },
    {
      name: "title",
      type: "text",
      required: true,
    },
    {
      name: "institution",
      type: "text",
    },
    {
      name: "moduleNumber",
      type: "text",
      admin: {
        description: "Module or course code",
      },
    },
    {
      name: "description",
      type: "textarea",
    },
    {
      name: "syllabusData",
      type: "json",
      required: true,
      admin: {
        description: "The full syllabus JSON blob",
      },
    },
    {
      name: "authors",
      type: "relationship",
      relationTo: "users",
      hasMany: true,
      admin: {
        description: "Users who can edit this syllabus",
      },
    },
    {
      name: "createdBy",
      type: "relationship",
      relationTo: "users",
      admin: {
        description: "Original uploader",
      },
    },
    {
      name: "publishedAt",
      type: "date",
      admin: {
        description: "When set, syllabus is publicly visible",
        date: {
          pickerAppearance: "dayAndTime",
        },
      },
    },
  ],
  hooks: {
    beforeChange: [
      // Auto-set createdBy and add to authors on create
      async ({ req, operation, data }) => {
        if (operation === "create" && req.user) {
          data.createdBy = req.user.id;
          if (!data.authors) {
            data.authors = [req.user.id];
          } else if (!data.authors.includes(req.user.id)) {
            data.authors.push(req.user.id);
          }
        }
        return data;
      },
    ],
  },
};

