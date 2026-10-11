import { describe, it, expect, beforeEach, vi } from "vitest";
import { cache } from "@/lib/cache/redis";

describe("AstreWork Redis & In-Memory Cache Engine", () => {
  beforeEach(async () => {
    // Clear out test keys before each test
    await cache.delPattern("test:*");
    await cache.delPattern("feed:*");
    await cache.delPattern("match:*");
  });

  it("reports active status without crashing (memory fallback when redis is offline)", () => {
    const status = cache.status();
    expect(["redis", "memory"]).toContain(status);
    expect(typeof cache.isAvailable()).toBe("boolean");
  });

  it("stores and retrieves primitive values and complex objects", async () => {
    const testKey = "test:object:1";
    const payload = {
      id: "job-101",
      title: "Senior AI Engineer",
      skills: ["PyTorch", "TypeScript", "Next.js"],
      salary: 180000,
      active: true,
    };

    await cache.set(testKey, payload, 60);
    const retrieved = await cache.get<typeof payload>(testKey);

    expect(retrieved).not.toBeNull();
    expect(retrieved?.id).toBe("job-101");
    expect(retrieved?.title).toBe("Senior AI Engineer");
    expect(retrieved?.skills).toEqual(["PyTorch", "TypeScript", "Next.js"]);
    expect(retrieved?.salary).toBe(180000);
    expect(retrieved?.active).toBe(true);
  });

  it("returns null for non-existent cache keys", async () => {
    const result = await cache.get("test:nonexistent:key");
    expect(result).toBeNull();
  });

  it("deletes single and multiple keys properly", async () => {
    await cache.set("test:del:1", { a: 1 });
    await cache.set("test:del:2", { b: 2 });
    await cache.set("test:del:3", { c: 3 });

    expect(await cache.get("test:del:1")).toEqual({ a: 1 });

    // Delete single
    await cache.del("test:del:1");
    expect(await cache.get("test:del:1")).toBeNull();

    // Delete multiple
    await cache.del(["test:del:2", "test:del:3"]);
    expect(await cache.get("test:del:2")).toBeNull();
    expect(await cache.get("test:del:3")).toBeNull();
  });

  it("purges wildcard patterns with delPattern", async () => {
    await cache.set("feed:active:v1", [{ id: "job-1" }]);
    await cache.set("feed:filtered:v1", [{ id: "job-2" }]);
    await cache.set("match:user:1", { score: 95 });

    await cache.delPattern("feed:*");

    expect(await cache.get("feed:active:v1")).toBeNull();
    expect(await cache.get("feed:filtered:v1")).toBeNull();
    expect(await cache.get("match:user:1")).toEqual({ score: 95 });
  });

  it("implements cache-aside factory pattern with getOrSet", async () => {
    const factory = vi.fn().mockResolvedValue({ calculated: 42, timestamp: Date.now() });

    const key = "test:getorset:1";

    // 1st call: Cache miss -> factory called
    const firstResult = await cache.getOrSet<{ calculated: number; timestamp: number }>(key, 60, factory);
    expect(factory).toHaveBeenCalledTimes(1);
    expect(firstResult.calculated).toBe(42);

    // 2nd call: Cache hit -> returns cached value, factory NOT called again
    const secondResult = await cache.getOrSet(key, 60, factory);
    expect(factory).toHaveBeenCalledTimes(1);
    expect(secondResult).toEqual(firstResult);
  });

  it("supports batch mget and mset operations", async () => {
    const items = [
      { key: "test:mset:1", value: { item: 1 }, ttlSeconds: 60 },
      { key: "test:mset:2", value: { item: 2 }, ttlSeconds: 60 },
      { key: "test:mset:3", value: { item: 3 }, ttlSeconds: 60 },
    ];

    await cache.mset(items);

    const keysToFetch = ["test:mset:1", "test:mset:missing", "test:mset:3"];
    const results = await cache.mget<{ item: number }>(keysToFetch);

    expect(results).toHaveLength(3);
    expect(results[0]).toEqual({ item: 1 });
    expect(results[1]).toBeNull();
    expect(results[2]).toEqual({ item: 3 });
  });

  it("expires keys according to TTL", async () => {
    const quickKey = "test:ttl:quick";
    // 1 second TTL
    await cache.set(quickKey, { expires: true }, 1);
    expect(await cache.get(quickKey)).toEqual({ expires: true });

    // Wait 1.1s for expiration
    await new Promise((resolve) => setTimeout(resolve, 1100));

    expect(await cache.get(quickKey)).toBeNull();
  });
});
