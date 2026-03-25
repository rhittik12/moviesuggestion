import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api", () => {
  return {
    getTrendingMovies: vi.fn(async () => ({
      results: Array.from({ length: 6 }, (_, index) => ({ id: index + 1 }))
    })),
    getPopularMovies: vi.fn(async (page: number) => ({
      results: Array.from({ length: 6 }, (_, index) => ({ id: page * 100 + index + 1 }))
    })),
    prewarmMovieCaches: vi.fn(async (ids: string[]) => ({
      attempted: ids.length,
      warmed: ids.slice(0, 3),
      failed: ids.slice(3, 5),
      failedCount: Math.max(0, ids.length - 3),
      skipped: 0,
      durationMs: 120
    }))
  };
});

vi.mock("@/lib/resilienceConfig", () => ({
  resilienceConfig: {
    prewarmSecret: "secret",
    prewarmMovieLimit: 10,
    prewarmPopularPages: 2
  }
}));

describe("prewarm route", () => {
  it("returns detailed metrics and enforces secret", async () => {
    const { POST } = await import("@/app/api/prewarm/route");

    const response = await POST({
      headers: {
        get(name: string) {
          if (name === "x-prewarm-secret") {
            return "secret";
          }

          return null;
        }
      },
      nextUrl: new URL("https://example.com/api/prewarm")
    } as never);

    expect(response.status).toBe(200);

    const payload = await response.json();
    expect(payload.attempted).toBe(10);
    expect(payload.requested).toBe(10);
    expect(payload.warmed).toBe(3);
    expect(payload.failedCount).toBeGreaterThanOrEqual(1);
    expect(payload.durationMs).toBe(120);
  });
});
