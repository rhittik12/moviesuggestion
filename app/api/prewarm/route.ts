import { NextRequest, NextResponse } from "next/server";

import { getPopularMovies, getTrendingMovies, prewarmMovieCaches } from "@/lib/api";
import { resilienceConfig } from "@/lib/resilienceConfig";

function unauthorizedResponse() {
  return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
}

export async function POST(request: NextRequest) {
  const configuredSecret = resilienceConfig.prewarmSecret;

  if (!configuredSecret) {
    return NextResponse.json(
      { message: "Prewarm secret is not configured." },
      { status: 503 }
    );
  }

  const providedSecret = request.headers.get("x-prewarm-secret") || "";

  if (providedSecret !== configuredSecret) {
    return unauthorizedResponse();
  }

  try {
    const [trending, ...popularPages] = await Promise.all([
      getTrendingMovies(),
      ...Array.from({ length: resilienceConfig.prewarmPopularPages }, (_, index) => getPopularMovies(index + 1))
    ]);

    const topIds = [...trending.results, ...popularPages.flatMap((page) => page.results)]
      .slice(0, resilienceConfig.prewarmMovieLimit)
      .map((movie) => String(movie.id));

    const result = await prewarmMovieCaches(topIds);

    return NextResponse.json({
      attempted: result.attempted,
      requested: topIds.length,
      warmed: result.warmed.length,
      failedCount: result.failedCount,
      failed: result.failed,
      skipped: result.skipped,
      durationMs: result.durationMs
    });
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error
          ? error.message
          : "Failed to prewarm movie caches."
      },
      { status: 500 }
    );
  }
}
