import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("shared cache safety", () => {
  const previousEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...previousEnv };
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  afterEach(() => {
    process.env = { ...previousEnv };
  });

  it("warns once when redis env vars are missing", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {
      // no-op for test
    });

    const cacheModule = await import("@/lib/sharedCache");

    await cacheModule.writeSharedCache("k", { movie: 1 }, 10_000);
    await cacheModule.readSharedCache("k", 5_000, 10_000);

    expect(warnSpy).toHaveBeenCalledTimes(1);

    warnSpy.mockRestore();
  });

  it("returns null for invalid records without throwing", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "token";

    vi.doMock("@upstash/redis", () => {
      return {
        Redis: class {
          async get() {
            return { storedAt: "invalid", value: { title: "bad" } };
          }

          async set() {
            // no-op for test
          }
        }
      };
    });

    const cacheModule = await import("@/lib/sharedCache");

    const result = await cacheModule.readSharedCache("corrupt", 5_000, 10_000);

    expect(result).toBeNull();
  });
});
