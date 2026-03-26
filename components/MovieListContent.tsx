"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { Genre, Movie } from "@/lib/api";

import { GenreFilter } from "./GenreFilter";
import { MovieCard } from "./MovieCard";
import { SectionHeader } from "./SectionHeader";
import { MovieGridSkeleton } from "./Skeletons";

type MovieListContentProps = {
  initialMovies: Movie[];
  genres: Genre[];
  category: "trending" | "popular";
};

type MoviesResponse = {
  results: Movie[];
  totalPages?: number;
  message?: string;
};

function toVisibleMoviesError(response: Response, data: MoviesResponse, fallbackMessage: string) {
  if (!response.ok) {
    throw new Error(data.message || fallbackMessage);
  }

  if (data.message && data.results.length === 0) {
    throw new Error(data.message);
  }
}

export function MovieListContent({ initialMovies, genres, category }: MovieListContentProps) {
  const [selectedGenreId, setSelectedGenreId] = useState<number | null>(null);
  const [movies, setMovies] = useState<Movie[]>(initialMovies);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const hasMounted = useRef(false);

  async function getMoviesByGenre(genreId: number, signal?: AbortSignal) {
    const response = await fetch(`/api/discover?genreId=${genreId}`, { signal, cache: "no-store" });
    const data = (await response.json()) as MoviesResponse;

    toVisibleMoviesError(response, data, `Unable to load ${category} movies by genre.`);

    return data.results;
  }

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }

    const controller = new AbortController();

    async function loadMovies() {
      try {
        setIsLoading(true);
        setError("");

        if (selectedGenreId) {
          const nextMovies = await getMoviesByGenre(selectedGenreId, controller.signal);
          setMovies(nextMovies);
        } else {
          setMovies(initialMovies);
        }
      } catch (fetchError) {
        if ((fetchError as Error).name !== "AbortError") {
          setError((fetchError as Error).message || `Something went wrong loading ${category} movies.`);
          setMovies([]);
        }
      } finally {
        setIsLoading(false);
      }
    }

    loadMovies();

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGenreId, initialMovies, category]);

  const browseCopy = useMemo(() => {
    if (selectedGenreId) {
      const genreName = genres.find((genre) => genre.id === selectedGenreId)?.name || "Genre";
      return {
        eyebrow: "Browse By Genre",
        title: genreName,
        description: "Switch genres to instantly refresh the movie wall."
      };
    }

    if (category === "trending") {
      return {
        eyebrow: "Right Now",
        title: "Trending Movies",
        description: "Fresh picks people are watching and talking about right now."
      };
    }

    return {
      eyebrow: "Most Watched",
      title: "Popular Movies",
      description: "A curated wall of crowd favorites."
    };
  }, [selectedGenreId, category, genres]);

  return (
    <main className="min-h-screen">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-16 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <section id="browse" className="space-y-6">
          <div className="flex flex-col gap-5">
            <SectionHeader
              eyebrow={browseCopy.eyebrow}
              title={browseCopy.title}
              description={browseCopy.description}
            />

            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 sm:p-5">
              <GenreFilter
                genres={genres}
                selectedGenreId={selectedGenreId}
                onSelect={(genreId) => {
                  setSelectedGenreId(genreId);
                  setError("");
                }}
              />
            </div>
          </div>

          {error ? (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-100">
              {error}
            </div>
          ) : null}

          <div className={`transition-all duration-300 ${isLoading ? "opacity-60" : "opacity-100"}`}>
            {isLoading ? <MovieGridSkeleton count={10} /> : null}

            {!isLoading && movies.length > 0 ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                {movies.slice(0, 10).map((movie) => (
                  <MovieCard key={movie.id} movie={movie} />
                ))}
              </div>
            ) : null}

            {!isLoading && movies.length === 0 ? (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-white/65">
                No movies available right now.
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
