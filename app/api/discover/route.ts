import { NextRequest, NextResponse } from "next/server";

import { TmdbFetchError, discoverMoviesByGenre } from "@/lib/api";

const RETRYABLE_DISCOVER_STATUS = new Set([429, 500, 502, 503, 504]);

function isTransientDiscoverFailure(error: unknown) {
  if (!(error instanceof TmdbFetchError)) {
    return false;
  }

  if (typeof error.status === "number" && RETRYABLE_DISCOVER_STATUS.has(error.status)) {
    return true;
  }

  return error.code === "OUTBOUND_QUEUE_FULL"
    || error.code === "OUTBOUND_QUEUE_TIMEOUT"
    || error.code === "ECONNRESET"
    || error.code === "ETIMEDOUT"
    || error.code === "ENOTFOUND"
    || error.code === "EAI_AGAIN";
}

export async function GET(request: NextRequest) {
  const genreId = Number(request.nextUrl.searchParams.get("genreId"));
  const page = Number(request.nextUrl.searchParams.get("page") || "1");

  if (!Number.isInteger(page) || page < 1 || page > 500) {
    return NextResponse.json({ message: "Invalid page value." }, { status: 400 });
  }

  if (!genreId) {
    return NextResponse.json({
      page: 1,
      results: [],
      totalPages: 1
    });
  }

  if (!Number.isInteger(genreId) || genreId < 1) {
    return NextResponse.json({ message: "Invalid genreId value." }, { status: 400 });
  }

  try {
    const response = await discoverMoviesByGenre(genreId, page);

    return NextResponse.json({
      page: response.page,
      results: response.results,
      totalPages: response.total_pages
    });
  } catch (error) {
    if (isTransientDiscoverFailure(error)) {
      return NextResponse.json({
        page,
        results: [],
        totalPages: 1,
        message: "Discover is temporarily busy. Please retry in a moment."
      });
    }

    const status = error instanceof TmdbFetchError
      ? (error.status ?? 502)
      : 502;

    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Unable to discover movies."
      },
      { status }
    );
  }
}
