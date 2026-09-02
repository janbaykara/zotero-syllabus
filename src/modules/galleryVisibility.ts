import { createContext, h } from "preact";
import type { ComponentChildren } from "preact";
import { useContext, useLayoutEffect, useRef, useState } from "preact/hooks";

/** ~2 cover rows past the viewport, so scrolling in does not flash empty shells. */
export const GALLERY_VIEWPORT_ROOT_MARGIN = "600px";

export type GalleryVisibilityCallback = (visible: boolean) => void;

type ObserverCtor = new (
  callback: IntersectionObserverCallback,
  options?: IntersectionObserverInit,
) => IntersectionObserver;

export type CreateGalleryViewportStoreOptions = {
  getObserver?: () => ObserverCtor | undefined;
  rootMargin?: string;
  /** Re-observe on the next animation frame. Tests can disable this. */
  retryObserve?: boolean;
};

export type GalleryViewportStore = {
  attach: (root: Element | null) => void;
  observe: (el: Element, cb: GalleryVisibilityCallback) => () => void;
  disconnect: () => void;
};

function defaultGetObserver(): ObserverCtor | undefined {
  try {
    const win = Zotero.getMainWindow();
    const Observer = win?.IntersectionObserver;
    if (typeof Observer === "function") {
      return Observer;
    }
  } catch {
    // Tests and early startup have no Zotero window.
  }
  if (typeof IntersectionObserver === "function") {
    return IntersectionObserver;
  }
  return undefined;
}

function getRafWindow(root: Element | null): Window | undefined {
  const fromRoot = root?.ownerDocument?.defaultView;
  if (fromRoot) {
    return fromRoot;
  }
  try {
    return Zotero.getMainWindow();
  } catch {
    return typeof window !== "undefined" ? window : undefined;
  }
}

/**
 * One IntersectionObserver for many gallery tiles. Visibility callbacks stay
 * per-element so a scroll does not re-render the whole page.
 */
export function createGalleryViewportStore(
  options?: CreateGalleryViewportStoreOptions,
): GalleryViewportStore {
  const getObserver = options?.getObserver ?? defaultGetObserver;
  const rootMargin = options?.rootMargin ?? GALLERY_VIEWPORT_ROOT_MARGIN;
  const retryObserve = options?.retryObserve !== false;
  const observed = new Map<Element, GalleryVisibilityCallback>();
  let observer: IntersectionObserver | null = null;
  let currentRoot: Element | null = null;
  let fallbackVisible = false;
  let retryRaf = 0;

  const notify = (el: Element, visible: boolean) => {
    observed.get(el)?.(visible);
  };

  const onEntries: IntersectionObserverCallback = (entries) => {
    for (const entry of entries) {
      notify(entry.target, entry.isIntersecting);
    }
  };

  const cancelRetry = () => {
    if (!retryRaf) {
      return;
    }
    getRafWindow(currentRoot)?.cancelAnimationFrame(retryRaf);
    retryRaf = 0;
  };

  const teardownObserver = () => {
    cancelRetry();
    observer?.disconnect();
    observer = null;
  };

  const observeAll = () => {
    if (!observer) {
      return;
    }
    for (const el of observed.keys()) {
      observer.observe(el);
    }
  };

  const fallbackAllVisible = () => {
    fallbackVisible = true;
    teardownObserver();
    currentRoot = null;
    for (const el of observed.keys()) {
      notify(el, true);
    }
  };

  const attach = (root: Element | null) => {
    const Observer = getObserver();
    if (typeof Observer !== "function") {
      fallbackAllVisible();
      return;
    }

    fallbackVisible = false;
    if (observer && currentRoot === root && root) {
      return;
    }

    teardownObserver();
    currentRoot = root;
    if (!root) {
      return;
    }

    observer = new Observer(onEntries, { root, rootMargin });
    observeAll();

    if (!retryObserve) {
      return;
    }
    const win = getRafWindow(root);
    if (!win) {
      return;
    }
    retryRaf = win.requestAnimationFrame(() => {
      retryRaf = 0;
      if (!observer) {
        return;
      }
      for (const el of observed.keys()) {
        observer.unobserve(el);
      }
      observeAll();
    });
  };

  const observe = (el: Element, cb: GalleryVisibilityCallback) => {
    observed.set(el, cb);
    if (fallbackVisible) {
      cb(true);
      return () => {
        observed.delete(el);
      };
    }
    observer?.observe(el);
    return () => {
      observed.delete(el);
      observer?.unobserve(el);
    };
  };

  const disconnect = () => {
    teardownObserver();
    observed.clear();
    currentRoot = null;
    fallbackVisible = false;
  };

  return { attach, observe, disconnect };
}

const GalleryViewportContext = createContext<GalleryViewportStore | null>(null);

export function GalleryViewportProvider({
  rootRef,
  children,
}: {
  rootRef: { current: Element | null };
  children: ComponentChildren;
}) {
  const storeRef = useRef<GalleryViewportStore | null>(null);
  if (!storeRef.current) {
    storeRef.current = createGalleryViewportStore();
  }
  const store = storeRef.current;

  useLayoutEffect(() => {
    const root = rootRef.current;
    store.attach(root);
    if (root) {
      return () => store.disconnect();
    }
    const win = getRafWindow(null);
    if (!win) {
      return () => store.disconnect();
    }
    const id = win.requestAnimationFrame(() => {
      store.attach(rootRef.current);
    });
    return () => {
      win.cancelAnimationFrame(id);
      store.disconnect();
    };
  }, [rootRef, store]);

  return h(GalleryViewportContext.Provider, { value: store }, children);
}

/** True while `ref` intersects the gallery scroll root (plus root margin). */
export function useNearViewport(ref: { current: Element | null }): boolean {
  const store = useContext(GalleryViewportContext);
  const [visible, setVisible] = useState(() => store == null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) {
      return;
    }
    if (!store) {
      setVisible(true);
      return;
    }
    return store.observe(el, setVisible);
  }, [ref, store]);

  return visible;
}
