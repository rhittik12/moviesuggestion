import { NextResponse } from "next/server";

import { getPopularMovies } from "@/lib/api";

export async function GET() {
  try {
    const response = await getPopularMovies();

    return NextResponse.json({
      results: response.results,
      totalPages: response.total_pages
    });
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Unable to load popular movies."
      },
      { status: 500 }
    );
  }
}
