// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h, Fragment } from "preact";
import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import { Plus } from "lucide-preact";
import { getString } from "../utils/locale";
import { confirmPrompt, promptText } from "../utils/window";
import {
  applyMyAnnotationsSavedView,
  createMyAnnotationsSavedView,
  myAnnotationsSavedViewMatches,
  useMyAnnotationsSavedViews,
  withRemovedMyAnnotationsSavedView,
  type MyAnnotationsSavedView,
} from "./myAnnotationsViews";
import type { AnnotationsQuoteOrder } from "./explorerQueries";
import type { MyAnnotationsOrder } from "./myAnnotationsPrefs";

type DisplayOptions = {
  order: MyAnnotationsOrder;
  quoteOrder: AnnotationsQuoteOrder;
  colorFilter: string[];
  tagFilter: string[];
};

export function MyAnnotationsSavedViews({
  order,
  quoteOrder,
  colorFilter,
  tagFilter,
}: DisplayOptions) {
  const [views, setViews] = useMyAnnotationsSavedViews();
  const [menu, setMenu] = useState<{
    view: MyAnnotationsSavedView;
    x: number;
    y: number;
  } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const current: DisplayOptions = {
    order,
    quoteOrder,
    colorFilter,
    tagFilter,
  };
  const canSave = colorFilter.length > 0 || tagFilter.length > 0;

  useEffect(() => {
    if (!menu) {
      return;
    }
    const onPointerDown = (event: MouseEvent) => {
      const root = menuRef.current;
      if (
        !root ||
        !(event.target instanceof Node) ||
        root.contains(event.target)
      ) {
        return;
      }
      setMenu(null);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenu(null);
      }
    };
    const win = Zotero.getMainWindow();
    win.document.addEventListener("mousedown", onPointerDown, true);
    win.document.addEventListener("keydown", onKeyDown, true);
    return () => {
      win.document.removeEventListener("mousedown", onPointerDown, true);
      win.document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [menu]);

  const handleSave = useCallback(() => {
    const name = promptText(
      getString("my-annotations-view-save-title"),
      getString("my-annotations-view-save-prompt"),
    );
    if (!name) {
      return;
    }
    const view = createMyAnnotationsSavedView(name, {
      order,
      quoteOrder,
      colorFilter,
      tagFilter,
    });
    setViews([...views, view]);
  }, [colorFilter, order, quoteOrder, setViews, tagFilter, views]);

  const handleApply = useCallback((view: MyAnnotationsSavedView) => {
    applyMyAnnotationsSavedView(view);
    setMenu(null);
  }, []);

  const handleDelete = useCallback(
    (view: MyAnnotationsSavedView) => {
      setMenu(null);
      const ok = confirmPrompt(
        getString("my-annotations-view-delete-title"),
        getString("my-annotations-view-delete-confirm", {
          args: { name: view.name },
        }),
      );
      if (!ok) {
        return;
      }
      setViews(withRemovedMyAnnotationsSavedView(views, view.id));
    },
    [setViews, views],
  );

  const handleContextMenu = useCallback(
    (event: MouseEvent, view: MyAnnotationsSavedView) => {
      event.preventDefault();
      event.stopPropagation();
      setMenu({ view, x: event.clientX, y: event.clientY });
    },
    [],
  );

  if (views.length === 0 && !canSave) {
    return null;
  }

  return (
    <>
      <nav
        className="syllabus-gallery-groups-nav mt-2"
        aria-label={getString("my-annotations-views-aria")}
      >
        <div className="syllabus-gallery-groups-nav-inner">
          {views.map((view) => {
            const isActive = myAnnotationsSavedViewMatches(view, current);
            return (
              <button
                key={view.id}
                type="button"
                className="syllabus-gallery-group-pill"
                aria-current={isActive ? "true" : undefined}
                title={getString("my-annotations-view-apply", {
                  args: { name: view.name },
                })}
                onClick={() => handleApply(view)}
                onContextMenu={(event) => handleContextMenu(event, view)}
              >
                <span className="syllabus-gallery-group-pill-label">
                  {view.name}
                </span>
              </button>
            );
          })}
          {canSave ? (
            <button
              type="button"
              className="syllabus-gallery-group-pill syllabus-my-annotations-view-add"
              title={getString("my-annotations-view-save")}
              aria-label={getString("my-annotations-view-save")}
              onClick={handleSave}
            >
              <Plus size={12} aria-hidden="true" />
              <span className="syllabus-gallery-group-pill-label">
                {getString("my-annotations-view-save-title")}
              </span>
            </button>
          ) : null}
        </div>
      </nav>
      {menu ? (
        <div
          ref={menuRef}
          className="syllabus-my-annotations-view-menu"
          style={{ left: `${menu.x}px`, top: `${menu.y}px` }}
          role="menu"
        >
          <button
            type="button"
            role="menuitem"
            className="syllabus-my-annotations-view-menu-item"
            onClick={() => handleDelete(menu.view)}
          >
            {getString("my-annotations-view-delete")}
          </button>
        </div>
      ) : null}
    </>
  );
}
