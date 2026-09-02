import { assert } from "chai";
import {
  createGalleryViewportStore,
  GALLERY_VIEWPORT_ROOT_MARGIN,
} from "../src/modules/galleryVisibility";

class FakeIntersectionObserver {
  static instances: FakeIntersectionObserver[] = [];
  callback: IntersectionObserverCallback;
  options: IntersectionObserverInit | undefined;
  observed = new Set<Element>();

  constructor(
    callback: IntersectionObserverCallback,
    options?: IntersectionObserverInit,
  ) {
    this.callback = callback;
    this.options = options;
    FakeIntersectionObserver.instances.push(this);
  }

  observe(el: Element) {
    this.observed.add(el);
  }

  unobserve(el: Element) {
    this.observed.delete(el);
  }

  disconnect() {
    this.observed.clear();
  }

  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }

  root: Element | Document | null = null;
  rootMargin = "";
  thresholds: ReadonlyArray<number> = [];

  trigger(el: Element, isIntersecting: boolean) {
    this.callback(
      [
        {
          target: el,
          isIntersecting,
          intersectionRatio: isIntersecting ? 1 : 0,
          time: 0,
          boundingClientRect: {} as DOMRectReadOnly,
          intersectionRect: {} as DOMRectReadOnly,
          rootBounds: null,
        },
      ],
      this as unknown as IntersectionObserver,
    );
  }
}

function fakeEl(): Element {
  return {} as Element;
}

function storeWithFakeObserver() {
  FakeIntersectionObserver.instances = [];
  return createGalleryViewportStore({
    getObserver: () =>
      FakeIntersectionObserver as unknown as typeof IntersectionObserver,
    retryObserve: false,
  });
}

describe("createGalleryViewportStore", function () {
  it("queues observe until attach, then reports intersecting and leave", function () {
    const store = storeWithFakeObserver();
    const root = fakeEl();
    const tile = fakeEl();
    const seen: boolean[] = [];

    const unobserve = store.observe(tile, (visible) => {
      seen.push(visible);
    });
    assert.deepEqual(seen, []);
    assert.equal(FakeIntersectionObserver.instances.length, 0);

    store.attach(root);
    assert.equal(FakeIntersectionObserver.instances.length, 1);
    const observer = FakeIntersectionObserver.instances[0];
    assert.equal(observer.options?.root, root);
    assert.equal(observer.options?.rootMargin, GALLERY_VIEWPORT_ROOT_MARGIN);
    assert.isTrue(observer.observed.has(tile));

    observer.trigger(tile, true);
    observer.trigger(tile, false);
    assert.deepEqual(seen, [true, false]);

    unobserve();
    observer.trigger(tile, true);
    assert.deepEqual(seen, [true, false]);
    assert.isFalse(observer.observed.has(tile));
  });

  it("unregisters on disconnect", function () {
    const store = storeWithFakeObserver();
    const root = fakeEl();
    const tile = fakeEl();
    let calls = 0;
    store.observe(tile, () => {
      calls += 1;
    });
    store.attach(root);
    const observer = FakeIntersectionObserver.instances[0];
    store.disconnect();
    observer.trigger(tile, true);
    assert.equal(calls, 0);
    assert.equal(observer.observed.size, 0);
  });

  it("treats every tile as visible when IntersectionObserver is missing", function () {
    const store = createGalleryViewportStore({
      getObserver: () => undefined,
      retryObserve: false,
    });
    const seen: boolean[] = [];
    store.observe(fakeEl(), (visible) => {
      seen.push(visible);
    });
    store.attach(fakeEl());
    assert.deepEqual(seen, [true]);

    const late: boolean[] = [];
    store.observe(fakeEl(), (visible) => {
      late.push(visible);
    });
    assert.deepEqual(late, [true]);
  });
});
