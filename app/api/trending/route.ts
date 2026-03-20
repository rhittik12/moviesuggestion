import { NextResponse } from "next/server";

import { getTrendingMovies } from "@/lib/api";

export async function GET() {
  try {
    const response = await getTrendingMovies();

    return NextResponse.json({
      results: response.results,
      totalPages: response.total_pages
    });
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Unable to load trending movies."
      },
      { status: 500 }
    );
  }
}
