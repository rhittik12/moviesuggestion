import { NextRequest, NextResponse } from "next/server";

import { TmdbFetchError, searchMovies } from "@/lib/api";

const RETRYABLE_SEARCH_STATUS = new Set([429, 500, 502, 503, 504]);

function isTransientSearchFailure(error: unknown) {
  if (!(error instanceof TmdbFetchError)) {
    return false;
  }

  if (typeof error.status === "number" && RETRYABLE_SEARCH_STATUS.has(error.status)) {
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
  const query = request.nextUrl.searchParams.get("query")?.trim() || "";
  const page = Number(request.nextUrl.searchParams.get("page") || "1");

  if (!Number.isInteger(page) || page < 1 || page > 500) {
    return NextResponse.json({ message: "Invalid page value." }, { status: 400 });
  }

  if (!query) {
    return NextResponse.json({
      page: 1,
      results: [],
      totalPages: 1
    });
  }

  if (query.length > 120) {
    return NextResponse.json({ message: "Search query is too long." }, { status: 400 });
  }

  try {
    const response = await searchMovies(query, page);

    return NextResponse.json({
      page: response.page,
      results: response.results,
      totalPages: response.total_pages
    });
  } catch (error) {
    if (isTransientSearchFailure(error)) {
      return NextResponse.json({
        page,
        results: [],
        totalPages: 1,
        message: "Search is temporarily busy. Please retry in a moment."
      });
    }

    const status = error instanceof TmdbFetchError
      ? (error.status ?? 502)
      : 502;

    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Unable to search movies."
      },
      { status }
    );
  }
}
