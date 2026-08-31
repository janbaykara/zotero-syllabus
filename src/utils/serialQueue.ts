/**
 * Per-key serial promise queue. Nested enqueue on a key that is already
 * running executes immediately so a caller cannot wait on itself.
 */
export function createReentrantSerialQueue() {
  const queues = new Map<string, Promise<unknown>>();
  const inFlight = new Map<string, number>();

  function isInFlight(key: string): boolean {
    return (inFlight.get(key) || 0) > 0;
  }

  function begin(key: string): void {
    inFlight.set(key, (inFlight.get(key) || 0) + 1);
  }

  function end(key: string): void {
    const depth = (inFlight.get(key) || 1) - 1;
    if (depth <= 0) {
      inFlight.delete(key);
    } else {
      inFlight.set(key, depth);
    }
  }

  function enqueue<T>(key: string, task: () => Promise<T>): Promise<T> {
    if (isInFlight(key)) {
      return Promise.resolve().then(task);
    }
    const previous = queues.get(key) || Promise.resolve();
    const next = previous
      .catch(() => undefined)
      .then(() => {
        begin(key);
        return Promise.resolve()
          .then(task)
          .finally(() => end(key));
      });
    queues.set(
      key,
      next.then(
        () => undefined,
        () => undefined,
      ),
    );
    return next;
  }

  function clear(): void {
    queues.clear();
    inFlight.clear();
  }

  return { enqueue, isInFlight, clear };
}
