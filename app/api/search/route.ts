import { NextRequest, NextResponse } from "next/server";

import { searchMovies } from "@/lib/api";

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
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Unable to search movies."
      },
      { status: 500 }
    );
  }
}
