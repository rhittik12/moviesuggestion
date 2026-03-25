import { describe, expect, it } from "vitest";

import { TmdbFetchError, isRecoverableTmdbErrorForStale } from "@/lib/api";

describe("TMDB stale fallback classification", () => {
  it("marks retryable statuses as stale-recoverable", () => {
    expect(isRecoverableTmdbErrorForStale(new TmdbFetchError("429", { status: 429 }))).toBe(true);
    expect(isRecoverableTmdbErrorForStale(new TmdbFetchError("503", { status: 503 }))).toBe(true);
    expect(isRecoverableTmdbErrorForStale(new TmdbFetchError("404", { status: 404 }))).toBe(false);
  });

  it("marks queue saturation and transient network codes as stale-recoverable", () => {
    expect(isRecoverableTmdbErrorForStale(new TmdbFetchError("queue", { code: "OUTBOUND_QUEUE_FULL" }))).toBe(true);
    expect(isRecoverableTmdbErrorForStale(new TmdbFetchError("transient", { code: "ETIMEDOUT" }))).toBe(true);
  });
});
