/**
 * Helper to escape HTML special characters
 */
export function escapeHTML(str: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return str.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Helper to parse HTML template string into a DocumentFragment
 */
export function parseHTMLTemplate(
  doc: Document,
  html: string,
): DocumentFragment {
  const parser = new doc.defaultView!.DOMParser();
  const parsed = parser.parseFromString(
    `<template>${html}</template>`,
    "text/html",
  );
  const template = parsed.querySelector("template")!;
  return template.content;
}

/**
 * Helper to parse XUL template string into a DocumentFragment
 */
export function parseXULTemplate(xul: string): DocumentFragment {
  const win = Zotero.getMainWindow();
  return win.MozXULElement.parseXULToFragment(xul);
}

/**
 * Creates a reusable editable text input element that wraps text
 * @param doc - The document to create the element in
 * @param options - Configuration options
 * @returns The created textarea element
 */
export function createEditableTextInput(
  doc: Document,
  options: {
    className: string;
    initialValue: string;
    onSave: (newValue: string) => Promise<void>;
    onCancel?: () => void;
    placeholder?: string;
    emptyBehavior?: "reset" | "delete"; // 'reset' reverts to original value, 'delete' saves empty string
  },
): HTMLTextAreaElement {
  const {
    className,
    initialValue,
    onSave,
    onCancel,
    placeholder,
    emptyBehavior = "reset",
  } = options;

  // Check if an element with this class already exists and is being edited
  const existingElement = doc.querySelector(
    `.${className}`,
  ) as HTMLTextAreaElement | null;
  let textToPreserve: string | null = null;
  let wasEditing = false;

  if (existingElement && doc.activeElement === existingElement) {
    textToPreserve = existingElement.value || "";
    wasEditing = true;
  }

  // Create textarea element (allows text wrapping)
  const textareaElement = doc.createElement("textarea");
  textareaElement.className = className;
  textareaElement.setAttribute("spellcheck", "false");
  textareaElement.setAttribute("rows", "1"); // Start with single line
  textareaElement.setAttribute("wrap", "soft"); // Allow wrapping
  if (placeholder) {
    textareaElement.placeholder = placeholder;
  }

  // Set initial value
  const valueToUse = textToPreserve !== null ? textToPreserve : initialValue;
  textareaElement.value = valueToUse;

  // Auto-resize textarea to fit content
  const autoResize = () => {
    // Temporarily remove height constraint to get accurate scrollHeight
    const currentHeight = textareaElement.style.height;
    textareaElement.style.height = "auto";
    // Get the scroll height (content height)
    const scrollHeight = textareaElement.scrollHeight;
    // Set the height to match scroll height
    textareaElement.style.height = `${scrollHeight}px`;
    // Ensure overflow is hidden to prevent scrollbars
    textareaElement.style.overflowY = "hidden";
  };

  // Store original value for comparison and cancellation
  let originalValue = initialValue;

  // Prevent clicks from propagating to parent handlers
  textareaElement.addEventListener("click", (e: MouseEvent) => {
    e.stopPropagation();
  });

  // Helper function to save the value
  const saveValue = async () => {
    const newValue = textareaElement.value.trim();

    // Handle empty value based on emptyBehavior mode
    if (!newValue) {
      if (emptyBehavior === "delete") {
        // Delete mode: save empty string
        try {
          await onSave("");
          originalValue = "";
          // Update textarea height after save
          autoResize();
        } catch (err) {
          ztoolkit.log("Error saving editable text:", err);
          // Revert to original value on error
          textareaElement.value = originalValue;
          autoResize();
        }
      } else {
        // Reset mode: revert to original value
        textareaElement.value = originalValue;
        autoResize();
      }
      return;
    }

    // Only update if value actually changed
    if (newValue !== originalValue) {
      try {
        await onSave(newValue);
        originalValue = newValue;
        // Update textarea height after save
        autoResize();
      } catch (err) {
        ztoolkit.log("Error saving editable text:", err);
        // Revert to original value on error
        textareaElement.value = originalValue;
        autoResize();
      }
    }
  };

  // Handle blur event (when user clicks away or tabs out)
  textareaElement.addEventListener("blur", async (e: FocusEvent) => {
    await saveValue();
  });

  // Handle input event to auto-resize
  textareaElement.addEventListener("input", () => {
    // Use setTimeout to ensure the input has been processed
    setTimeout(() => {
      autoResize();
    }, 0);
  });

  // Handle keyboard events
  textareaElement.addEventListener("keydown", (e: KeyboardEvent) => {
    // Stop propagation to prevent Zotero's handlers from interfering
    e.stopPropagation();

    // Handle Enter: if Ctrl/Cmd is pressed, save; otherwise allow new line
    if (e.key === "Enter") {
      if (e.ctrlKey || e.metaKey) {
        // Ctrl+Enter or Cmd+Enter saves and blurs
        e.preventDefault();
        saveValue();
        textareaElement.blur();
        return;
      }
      // Regular Enter creates a new line (default behavior)
      // Don't prevent default
      return;
    }

    // Allow Escape to cancel editing
    if (e.key === "Escape") {
      e.preventDefault();
      textareaElement.value = originalValue;
      autoResize();
      if (onCancel) {
        onCancel();
      }
      textareaElement.blur();
      return;
    }

    // For all other keys (backspace, delete, typing, etc.),
    // just stop propagation but let the textarea handle them normally
    // Don't prevent default - textarea elements handle these natively
  });

  // Handle clicks outside the textarea to ensure blur works
  const handleDocumentClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (
      !textareaElement.contains(target) &&
      doc.activeElement === textareaElement
    ) {
      // Clicked outside - blur will fire naturally, but ensure it does
      textareaElement.blur();
    }
  };

  // Add document click listener (will be cleaned up when view re-renders)
  doc.addEventListener("click", handleDocumentClick, true);

  // Auto-resize after element is in DOM and styled
  // Use setTimeout to ensure layout is complete
  setTimeout(() => {
    autoResize();
  }, 0);

  // If it was being edited, restore focus
  if (wasEditing && textToPreserve !== null) {
    // Use setTimeout to ensure the element is in the DOM
    setTimeout(() => {
      textareaElement.focus();
      // Move cursor to end for textarea elements
      textareaElement.setSelectionRange(
        textareaElement.value.length,
        textareaElement.value.length,
      );
      // Resize again after focus to ensure correct height
      autoResize();
    }, 0);
  }

  return textareaElement;
}

export function getSystemTheme(): string {
  const win = Zotero.getMainWindow();
  return (win?.matchMedia?.("(prefers-color-scheme: dark)")?.matches ?? false)
    ? "dark"
    : "light";
}

// <img class="syllabus-item-thumbnail-img" src="${getThumbnailForItem(item)}" alt="${escapeHTML(title)}" />
export function getThumbnailForItem(item: Zotero.Item): string | null {
  let imageSrc: string | null = null;

  // First try getImageSrc method if available
  if ((item as any).getImageSrc) {
    imageSrc = (item as any).getImageSrc();
  }

  // If no image, try to get from attachments
  if (!imageSrc) {
    const attachments = item.getAttachments();
    for (const attId of attachments) {
      try {
        const att = Zotero.Items.get(attId);
        if (
          att &&
          att.isAttachment() &&
          att.attachmentContentType?.startsWith("image/")
        ) {
          const file = att.getFilePath();
          if (file) {
            imageSrc = `file://${file}`;
            break;
          }
        }
      } catch (e) {
        // Continue to next attachment
      }
    }
  }

  return imageSrc;
}

export function generateImageSetString(
  __icon: Zotero.Item["itemType"],
  __size: number = 16,
): string {
  const icon = itemTypeToIconFileName(__icon, __icon);
  const size = 16;
  return `
    image-set(url("chrome://zotero/skin/item-type/${size}/dark/${icon}.svg") 1x, url("chrome://zotero/skin/item-type/${size}/dark/${icon}@2x.svg") 2x) no-repeat center/contain,image-set(url("chrome://zotero/skin/item-type/${size}/white/${icon}.svg") 1x, url("chrome://zotero/skin/item-type/${size}/white/${icon}@2x.svg") 2x) center/0,image-set(url("chrome://zotero/skin/item-type/${size}/light/${icon}.svg") 1x, url("chrome://zotero/skin/item-type/${size}/light/${icon}@2x.svg") 2x) center/0,image-set(url("chrome://zotero/skin/item-type/${size}/dark/${icon}.svg") 1x, url("chrome://zotero/skin/item-type/${size}/dark/${icon}@2x.svg") 2x) center/0
  `;
}

/**
 * Map Zotero item type to icon name
 */
export const itemTypeToIconFileName = (
  itemType: Zotero.Item["itemType"],
  defaultValue: string = "document",
): string => {
  return itemType.toString();

  // // Map item types to icon names
  // const iconMap: Record<Zotero.Item['itemType'], string> = {
  //   book: "book",
  //   bookSection: "book",
  //   journalArticle: "article",
  //   article: "article",
  //   magazineArticle: "article",
  //   newspaperArticle: "article",
  //   webpage: "web",
  //   website: "web",
  //   blogPost: "web",
  //   videoRecording: "video",
  //   audioRecording: "audio",
  //   film: "video",
  //   thesis: "document",
  //   report: "document",
  //   document: "document",
  //   letter: "letter",
  //   email: "email",
  //   interview: "interview",
  //   conferencePaper: "paper",
  //   presentation: "presentation",
  //   patent: "patent",
  //   map: "map",
  //   artwork: "artwork",
  //   software: "software",
  //   dataset: "dataset",
  // };

  // return iconMap[itemType] || defaultValue || "document";
};
