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
export function parseHTMLTemplate(doc: Document, html: string): DocumentFragment {
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
