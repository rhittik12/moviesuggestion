import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  __clearDetailsRetrySoonMarkersForTest,
  __setDetailsRetrySoonMarkerForTest,
  getMovieDetailsOutcome
} from "@/lib/api";

describe("movie details outcome", () => {
  beforeEach(() => {
    __clearDetailsRetrySoonMarkersForTest();
  });

  afterEach(() => {
    __clearDetailsRetrySoonMarkersForTest();
  });

  it("returns degraded outcome immediately during retry-soon window", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    __setDetailsRetrySoonMarkerForTest("42", 8_000);

    const outcome = await getMovieDetailsOutcome("42");

    expect(outcome.kind).toBe("degraded");
    if (outcome.kind === "degraded") {
      expect(outcome.movieId).toBe("42");
      expect(outcome.retryAfterSeconds).toBeGreaterThanOrEqual(1);
    }

    expect(fetchSpy).not.toHaveBeenCalled();

    fetchSpy.mockRestore();
  });
});
