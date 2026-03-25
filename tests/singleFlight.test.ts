import { describe, expect, it } from "vitest";

import { getSingleFlightSize, withSingleFlight } from "@/lib/singleFlight";

describe("single flight dedupe", () => {
  it("executes work once for same key", async () => {
    let executionCount = 0;

    const work = async () => {
      executionCount += 1;
      await new Promise((resolve) => setTimeout(resolve, 50));
      return "ok";
    };

    const [first, second, third] = await Promise.all([
      withSingleFlight("k", work),
      withSingleFlight("k", work),
      withSingleFlight("k", work)
    ]);

    expect(first).toBe("ok");
    expect(second).toBe("ok");
    expect(third).toBe("ok");
    expect(executionCount).toBe(1);
    expect(getSingleFlightSize()).toBe(0);
  });
});
