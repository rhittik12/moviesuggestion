import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

async function importLimiter() {
  return import("@/lib/outboundLimiter");
}

describe("outbound limiter", () => {
  const previousEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    process.env = { ...previousEnv };
  });

  it("rejects when queue is full", async () => {
    process.env.TMDB_OUTBOUND_TOKENS_PER_SECOND = "1";
    process.env.TMDB_OUTBOUND_BUCKET_SIZE = "1";
    process.env.TMDB_OUTBOUND_QUEUE_LIMIT = "1";
    process.env.TMDB_OUTBOUND_QUEUE_TIMEOUT_MS = "2000";

    const { getOutboundLimiterMetrics, resetOutboundLimiterMetrics, runWithOutboundLimit } = await importLimiter();
    resetOutboundLimiterMetrics();

    let release = () => {
      // placeholder
    };

    const blocker = new Promise<void>((resolve) => {
      release = resolve;
    });

    const first = runWithOutboundLimit(async () => {
      await blocker;
      return "first";
    });

    const second = runWithOutboundLimit(async () => "second");

    await expect(runWithOutboundLimit(async () => "third")).rejects.toThrow("Outbound TMDB queue full");

    release();
    await first;
    await second;

    const metrics = getOutboundLimiterMetrics();
    expect(metrics.queueFull).toBeGreaterThanOrEqual(1);
    expect(metrics.acquiredImmediately).toBeGreaterThanOrEqual(1);
  });

  it("times out queued requests", async () => {
    process.env.TMDB_OUTBOUND_TOKENS_PER_SECOND = "1";
    process.env.TMDB_OUTBOUND_BUCKET_SIZE = "1";
    process.env.TMDB_OUTBOUND_QUEUE_LIMIT = "10";
    process.env.TMDB_OUTBOUND_QUEUE_TIMEOUT_MS = "50";

    const { getOutboundLimiterMetrics, resetOutboundLimiterMetrics, runWithOutboundLimit } = await importLimiter();
    resetOutboundLimiterMetrics();

    let release = () => {
      // placeholder
    };

    const blocker = new Promise<void>((resolve) => {
      release = resolve;
    });

    const first = runWithOutboundLimit(async () => {
      await blocker;
      return "first";
    });

    await expect(runWithOutboundLimit(async () => "second")).rejects.toThrow("Outbound TMDB queue timeout");

    release();
    await first;

    const metrics = getOutboundLimiterMetrics();
    expect(metrics.queueTimeout).toBeGreaterThanOrEqual(1);
  });
});
