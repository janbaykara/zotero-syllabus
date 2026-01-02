import { getPref, setPref } from "../utils/prefs";
import { SyllabusManager, GetByLibraryAndKeyArgs } from "./syllabus";

// ztoolkit is available as a global
declare const ztoolkit: ZToolkit;
declare const Zotero: _ZoteroTypes.Zotero;

/**
 * Cloud sync module for uploading syllabi to the public library
 */
export class CloudSync {
  /**
   * Get the public library base URL
   */
  static getPublicLibraryUrl(): string {
    return getPref("publicLibraryUrl") || "https://syllabus.zotero.org";
  }

  /**
   * Get the API base URL (same as public library URL for Payload CMS)
   */
  static getApiBaseUrl(): string {
    return `${this.getPublicLibraryUrl()}/api`;
  }

  /**
   * Check if user has a stored API token
   */
  static hasApiToken(): boolean {
    const token = getPref("cloudApiToken");
    return !!token && token.length > 0;
  }

  /**
   * Get stored API token
   */
  static getApiToken(): string | null {
    const token = getPref("cloudApiToken");
    return token && token.length > 0 ? token : null;
  }

  /**
   * Get stored cloud user ID
   */
  static getCloudUserId(): string | null {
    const userId = getPref("cloudUserId");
    return userId && userId.length > 0 ? userId : null;
  }

  /**
   * Get stored email
   */
  static getCloudEmail(): string | null {
    const email = getPref("cloudEmail");
    return email && email.length > 0 ? email : null;
  }

  /**
   * Get Zotero user ID
   */
  static getZoteroUserId(): string | null {
    try {
      const userID = Zotero.Users.getCurrentUserID();
      return userID ? String(userID) : null;
    } catch {
      return null;
    }
  }

  /**
   * Generate remote ID for a collection
   * Format: ${zoteroUserId}:${libraryId}:${collectionId}
   */
  static generateRemoteId(
    collectionId: number | GetByLibraryAndKeyArgs,
  ): string | null {
    const zoteroUserId = this.getZoteroUserId();
    if (!zoteroUserId) {
      ztoolkit.log("CloudSync: No Zotero user ID available");
      return null;
    }

    const collection =
      SyllabusManager.getCollectionFromIdentifier(collectionId);
    if (!collection) {
      ztoolkit.log("CloudSync: Collection not found");
      return null;
    }

    return `${zoteroUserId}:${collection.libraryID}:${collection.key}`;
  }

  /**
   * Check if a syllabus has been uploaded to the cloud
   */
  static hasRemoteVersion(collectionId: number | GetByLibraryAndKeyArgs): boolean {
    const metadata = SyllabusManager.getSyllabusMetadata(collectionId);
    return !!metadata.remoteId;
  }

  /**
   * Get the remote ID for a collection
   */
  static getRemoteId(
    collectionId: number | GetByLibraryAndKeyArgs,
  ): string | null {
    const metadata = SyllabusManager.getSyllabusMetadata(collectionId);
    return metadata.remoteId || null;
  }

  /**
   * Get the public URL for a syllabus
   */
  static getPublicUrl(collectionId: number | GetByLibraryAndKeyArgs): string | null {
    const remoteId = this.getRemoteId(collectionId);
    if (!remoteId) return null;

    const [userId, libraryId, collectionKey] = remoteId.split(":");
    if (!userId || !libraryId || !collectionKey) return null;

    const collection =
      SyllabusManager.getCollectionFromIdentifier(collectionId);
    const title = collection?.name || "syllabus";
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    return `${this.getPublicLibraryUrl()}/${userId}/${libraryId}/${collectionKey}/${slug}`;
  }

  /**
   * Prompt user for email if not already stored
   * Returns the email or null if cancelled
   */
  static async promptForEmail(): Promise<string | null> {
    const existingEmail = this.getCloudEmail();
    if (existingEmail) return existingEmail;

    // Use Zotero's prompt service
    const prompts = Zotero.getMainWindow()?.Services?.prompt;
    if (!prompts) {
      ztoolkit.log("CloudSync: Prompt service not available");
      return null;
    }

    const input = { value: "" };
    const result = prompts.prompt(
      null,
      "Zotero Syllabus - Cloud Sync",
      "Enter your email address to enable cloud sync.\nThis will create an account on the Zotero Syllabus Public Library.",
      input,
      null,
      { value: false },
    );

    if (!result || !input.value) {
      return null;
    }

    // Basic email validation
    const email = input.value.trim();
    if (!email.includes("@") || !email.includes(".")) {
      new ztoolkit.ProgressWindow("Invalid Email", {
        closeOnClick: true,
        closeTime: 3000,
      })
        .createLine({
          text: "Please enter a valid email address",
          type: "fail",
        })
        .show();
      return null;
    }

    return email;
  }

  /**
   * Register user and get API token
   */
  static async ensureApiToken(): Promise<string | null> {
    // Check if we already have a token
    const existingToken = this.getApiToken();
    if (existingToken) return existingToken;

    // Get Zotero user ID
    const zoteroUserId = this.getZoteroUserId();
    if (!zoteroUserId) {
      new ztoolkit.ProgressWindow("Cloud Sync Error", {
        closeOnClick: true,
        closeTime: 5000,
      })
        .createLine({
          text: "Please sync your Zotero library first to get a user ID",
          type: "fail",
        })
        .show();
      return null;
    }

    // Prompt for email
    const email = await this.promptForEmail();
    if (!email) return null;

    try {
      // Register with the API
      const response = await fetch(`${this.getApiBaseUrl()}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          zoteroUserId,
          email,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Registration failed: ${error}`);
      }

      const data = await response.json();
      const { apiKey, userId } = data;

      if (!apiKey) {
        throw new Error("No API key returned from registration");
      }

      // Store the credentials
      setPref("cloudApiToken", apiKey);
      setPref("cloudUserId", userId);
      setPref("cloudEmail", email);

      new ztoolkit.ProgressWindow("Cloud Sync", {
        closeOnClick: true,
        closeTime: 3000,
      })
        .createLine({
          text: "Successfully registered for cloud sync!",
          type: "success",
        })
        .show();

      return apiKey;
    } catch (error) {
      ztoolkit.log("CloudSync: Registration error:", error);
      new ztoolkit.ProgressWindow("Cloud Sync Error", {
        closeOnClick: true,
        closeTime: 5000,
      })
        .createLine({
          text: error instanceof Error ? error.message : "Registration failed",
          type: "fail",
        })
        .show();
      return null;
    }
  }

  /**
   * Check if a remote syllabus exists
   */
  static async checkRemoteExists(remoteId: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.getApiBaseUrl()}/syllabi?where[remoteId][equals]=${encodeURIComponent(remoteId)}&limit=1`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) return false;

      const data = await response.json();
      return data.docs && data.docs.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Upload or update a syllabus to the cloud
   */
  static async uploadSyllabus(
    collectionId: number | GetByLibraryAndKeyArgs,
  ): Promise<{ success: boolean; remoteId?: string; error?: string }> {
    try {
      // Ensure we have an API token
      const apiToken = await this.ensureApiToken();
      if (!apiToken) {
        return { success: false, error: "No API token available" };
      }

      // Get collection
      const collection =
        SyllabusManager.getCollectionFromIdentifier(collectionId);
      if (!collection) {
        return { success: false, error: "Collection not found" };
      }

      // Generate remote ID
      const remoteId = this.generateRemoteId(collectionId);
      if (!remoteId) {
        return { success: false, error: "Could not generate remote ID" };
      }

      // Prepare export data
      const title = collection.name || "Untitled Syllabus";
      const syllabusData = await SyllabusManager.prepareExportData(
        collectionId,
        title,
      );

      // Get additional metadata
      const metadata = SyllabusManager.getSyllabusMetadata(collectionId);
      const [zoteroUserId, libraryId, collectionKey] = remoteId.split(":");

      // Check if remote exists
      const exists = await this.checkRemoteExists(remoteId);

      const payload = {
        remoteId,
        zoteroUserId,
        libraryId,
        collectionId: collectionKey,
        title,
        institution: metadata.institution || "",
        moduleNumber: metadata.moduleNumber || "",
        description: metadata.description || "",
        syllabusData,
        publishedAt: new Date().toISOString(),
      };

      let response: Response;

      if (exists) {
        // Update existing syllabus - first get the ID
        const findResponse = await fetch(
          `${this.getApiBaseUrl()}/syllabi?where[remoteId][equals]=${encodeURIComponent(remoteId)}&limit=1`,
          {
            headers: {
              Authorization: `users API-Key ${apiToken}`,
            },
          },
        );
        const findData = await findResponse.json();
        const existingId = findData.docs?.[0]?.id;

        if (!existingId) {
          return { success: false, error: "Could not find existing syllabus" };
        }

        response = await fetch(`${this.getApiBaseUrl()}/syllabi/${existingId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `users API-Key ${apiToken}`,
          },
          body: JSON.stringify(payload),
        });
      } else {
        // Create new syllabus
        response = await fetch(`${this.getApiBaseUrl()}/syllabi`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `users API-Key ${apiToken}`,
          },
          body: JSON.stringify(payload),
        });
      }

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Upload failed: ${error}`);
      }

      // Store the remote ID in metadata
      await SyllabusManager.setRemoteId(collectionId, remoteId, "page");

      return { success: true, remoteId };
    } catch (error) {
      ztoolkit.log("CloudSync: Upload error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Upload failed",
      };
    }
  }

  /**
   * Import a syllabus from a URL
   */
  static async importFromUrl(
    collectionId: number | GetByLibraryAndKeyArgs,
    url: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Fetch the export data
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusText}`);
      }

      const jsonString = await response.text();

      // Use the existing import function
      await SyllabusManager.importSyllabusMetadata(
        collectionId,
        jsonString,
        "page",
      );

      return { success: true };
    } catch (error) {
      ztoolkit.log("CloudSync: Import error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Import failed",
      };
    }
  }

  /**
   * Clear stored cloud credentials
   */
  static clearCredentials(): void {
    setPref("cloudApiToken", "");
    setPref("cloudUserId", "");
    setPref("cloudEmail", "");
  }
}

// Re-export types
export type GetByLibraryAndKeyArgs = Parameters<
  typeof Zotero.Collections.getByLibraryAndKey
>;

