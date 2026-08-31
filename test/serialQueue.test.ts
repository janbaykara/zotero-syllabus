import { assert } from "chai";
import { createReentrantSerialQueue } from "../src/utils/serialQueue";

describe("createReentrantSerialQueue", function () {
  it("runs tasks for the same key in order", async function () {
    const queue = createReentrantSerialQueue();
    const order: number[] = [];
    const first = queue.enqueue("a", async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      order.push(1);
    });
    const second = queue.enqueue("a", async () => {
      order.push(2);
    });
    await Promise.all([first, second]);
    assert.deepEqual(order, [1, 2]);
  });

  it("does not deadlock when a task enqueues another on the same key", async function () {
    const queue = createReentrantSerialQueue();
    let innerRan = false;
    const result = await Promise.race([
      queue.enqueue("a", async () => {
        await queue.enqueue("a", async () => {
          innerRan = true;
          return "inner";
        });
        return "outer";
      }),
      new Promise<string>((_, reject) => {
        setTimeout(() => reject(new Error("deadlock")), 1000);
      }),
    ]);
    assert.equal(result, "outer");
    assert.isTrue(innerRan);
  });

  it("reports in-flight while the outer task is running", async function () {
    const queue = createReentrantSerialQueue();
    let sawInFlight = false;
    await queue.enqueue("a", async () => {
      sawInFlight = queue.isInFlight("a");
      await queue.enqueue("a", async () => {
        assert.isTrue(queue.isInFlight("a"));
      });
    });
    assert.isTrue(sawInFlight);
    assert.isFalse(queue.isInFlight("a"));
  });
});
