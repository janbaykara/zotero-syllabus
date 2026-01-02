import type { CollectionConfig } from "payload";

export const Users: CollectionConfig = {
  slug: "users",
  auth: {
    // Enable API key authentication
    useAPIKey: true,
  },
  admin: {
    useAsTitle: "email",
  },
  access: {
    // Only admins can read user list
    read: ({ req: { user } }) => {
      if (!user) return false;
      // Users can read their own data
      return {
        id: { equals: user.id },
      };
    },
    // Anyone can create (for auto-registration from Zotero)
    create: () => true,
    // Only admins or the user themselves can update
    update: ({ req: { user } }) => {
      if (!user) return false;
      return {
        id: { equals: user.id },
      };
    },
    // Only admins can delete
    delete: ({ req: { user } }) => {
      if (!user) return false;
      return user.role === "admin";
    },
  },
  fields: [
    {
      name: "zoteroUserId",
      type: "text",
      required: true,
      unique: true,
      index: true,
      admin: {
        description: "The Zotero user ID",
      },
    },
    {
      name: "role",
      type: "select",
      options: [
        { label: "Admin", value: "admin" },
        { label: "User", value: "user" },
      ],
      defaultValue: "user",
      access: {
        // Only admins can change roles
        update: ({ req: { user } }) => {
          return user?.role === "admin";
        },
      },
    },
  ],
};
