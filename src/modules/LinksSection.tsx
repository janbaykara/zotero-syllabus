// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h, Fragment } from "preact";
import { useState, useEffect, useRef } from "preact/hooks";
import { twMerge } from "tailwind-merge";
import { Pencil, Plus, ExternalLink, Trash2 } from "lucide-preact";
import { getString } from "../utils/locale";

export function LinksSection({
  links,
  setLinks,
  isLocked,
  compactMode,
}: {
  links: string[];
  setLinks: (links: string[]) => void;
  isLocked: boolean;
  compactMode: boolean;
}) {
  const savedLinks = links.map((link) => link.trim()).filter(Boolean);
  const [draft, setDraft] = useState<{
    index: number | null;
    value: string;
  } | null>(null);
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!draft) {
      return;
    }
    const input = inputRef.current;
    if (!input) {
      return;
    }
    input.focus();
    if (draft.value) {
      input.select();
    }
  }, [draft?.index]);

  const commitDraft = (value: string) => {
    const current = draftRef.current;
    if (!current) {
      return;
    }
    draftRef.current = null;
    setDraft(null);
    const trimmed = value.trim();
    const next = [...savedLinks];
    if (current.index === null) {
      if (trimmed) {
        next.push(trimmed);
      }
    } else if (trimmed) {
      next[current.index] = trimmed;
    } else {
      next.splice(current.index, 1);
    }
    setLinks(next.filter(Boolean));
  };

  const cancelDraft = () => {
    draftRef.current = null;
    setDraft(null);
  };

  const handleAddLink = () => {
    commitDraft(draft?.value || "");
    setDraft({ index: null, value: "" });
  };

  const handleDeleteLink = (index: number) => {
    cancelDraft();
    setLinks(savedLinks.filter((_, i) => i !== index));
  };

  const handleLinkClick = (url: string) => {
    if (!draft) {
      Zotero.launchURL(url);
    }
  };

  if (isLocked && savedLinks.length === 0) {
    return null;
  }

  const editingNew = draft?.index === null;
  const rows: Array<{ url: string; index: number } | { draft: true }> = [
    ...savedLinks.map((url, index) => ({ url, index })),
    ...(editingNew ? [{ draft: true as const }] : []),
  ];

  return (
    <div className="container-padded">
      <div className={twMerge("py-2", compactMode ? "text-base" : "text-lg")}>
        <div className="flex flex-col gap-2">
          {rows.map((row) => {
            const isDraftRow = "draft" in row;
            const index = isDraftRow ? null : row.index;
            const isEditing = draft ? draft.index === index : false;

            return (
              <div
                key={isDraftRow ? "draft" : `link-${index}`}
                className="flex flex-row items-center gap-2 group w-full"
              >
                {isEditing && draft ? (
                  <>
                    <input
                      ref={inputRef}
                      type="text"
                      inputMode="url"
                      value={draft.value}
                      placeholder={getString("placeholder-url")}
                      className={twMerge(
                        "flex-1 w-full bg-transparent border-none px-0 py-1",
                        "focus:outline-3 focus:outline-accent-blue focus:rounded-xs focus:outline-offset-2",
                      )}
                      onInput={(e) =>
                        setDraft({
                          ...draft,
                          value: (e.target as HTMLInputElement).value,
                        })
                      }
                      onBlur={() => commitDraft(draft.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          commitDraft(draft.value);
                        } else if (e.key === "Escape") {
                          e.preventDefault();
                          cancelDraft();
                        }
                      }}
                    />
                    <Trash2
                      size={16}
                      className="text-secondary hover:text-red-400 cursor-pointer shrink-0"
                      onMouseDown={(e) => {
                        e.preventDefault();
                      }}
                      onClick={() => {
                        if (draft.index === null) {
                          cancelDraft();
                        } else {
                          handleDeleteLink(draft.index);
                        }
                      }}
                      title={getString("links-delete")}
                      aria-label={getString("links-delete")}
                    />
                  </>
                ) : "url" in row ? (
                  <>
                    <div
                      className="flex-1 flex items-center gap-2 cursor-pointer hover:text-accent-blue"
                      onClick={() => handleLinkClick(row.url)}
                    >
                      <ExternalLink
                        size={16}
                        className="text-secondary shrink-0"
                      />
                      <span className="text-primary break-all underline">
                        {row.url}
                      </span>
                    </div>
                    {!isLocked && (
                      <>
                        <Pencil
                          size={16}
                          className="text-secondary hover:text-primary cursor-pointer shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDraft({
                              index: row.index,
                              value: row.url,
                            });
                          }}
                          title={getString("links-edit")}
                          aria-label={getString("links-edit")}
                        />
                        <Trash2
                          size={16}
                          className="text-secondary hover:text-red-400 cursor-pointer shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteLink(row.index);
                          }}
                          title={getString("links-delete")}
                          aria-label={getString("links-delete")}
                        />
                      </>
                    )}
                  </>
                ) : null}
              </div>
            );
          })}
          {!isLocked && (
            <button
              onClick={handleAddLink}
              className="flex items-center gap-2 text-secondary hover:text-primary cursor-pointer self-start in-[.print]:hidden"
              title={getString("links-add")}
              aria-label={getString("links-add")}
            >
              <Plus size={16} />
              <span>{getString("links-add")}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
