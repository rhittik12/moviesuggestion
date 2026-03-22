"use client";

import { useEffect, useMemo, useState } from "react";

import { Genre, Movie } from "@/lib/api";

import { GenreFilter } from "./GenreFilter";
import { MovieCard } from "./MovieCard";
import { SearchBar } from "./SearchBar";
import { SectionHeader } from "./SectionHeader";
import { MovieGridSkeleton } from "./Skeletons";

type SearchExperienceProps = {
  genres: Genre[];
};

type ApiResponse = {
  page: number;
  results: Movie[];
  totalPages: number;
};

type ApiErrorResponse = {
  message?: string;
};

const DEBOUNCE_MS = 450;

export function SearchExperience({ genres }: SearchExperienceProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedGenreId, setSelectedGenreId] = useState<number | null>(null);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
      setPage(1);
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const controller = new AbortController();
    const hasQuery = debouncedQuery.length > 0;
    const hasGenre = selectedGenreId !== null;

    if (!hasQuery && !hasGenre) {
      setMovies([]);
      setError("");
      setLoading(false);
      setPage(1);
      setTotalPages(1);
      return () => controller.abort();
    }

    async function fetchMovies() {
      try {
        setLoading(true);
        setError("");

        const endpoint = hasQuery
          ? `/api/search?query=${encodeURIComponent(debouncedQuery)}&page=${page}`
          : `/api/discover?genreId=${selectedGenreId}&page=${page}`;

        const response = await fetch(endpoint, {
          signal: controller.signal
        });

        if (!response.ok) {
          let message = "Unable to fetch movies right now.";

          try {
            const errorPayload = (await response.json()) as ApiErrorResponse;

            if (errorPayload?.message) {
              message = errorPayload.message;
            }
          } catch {
            // Ignore JSON parse errors and use fallback message.
          }

          throw new Error(message);
        }

        const data = (await response.json()) as ApiResponse;

        setMovies((current) => (page === 1 ? data.results : [...current, ...data.results]));
        setTotalPages(data.totalPages);
      } catch (fetchError) {
        if ((fetchError as Error).name !== "AbortError") {
          setError((fetchError as Error).message || "Something went wrong.");
        }
      } finally {
        setLoading(false);
      }
    }

    fetchMovies();

    return () => controller.abort();
  }, [debouncedQuery, selectedGenreId, page]);

  const displayedMovies = useMemo(() => {
    if (!selectedGenreId || !debouncedQuery) {
      return movies;
    }

    return movies.filter((movie) => movie.genre_ids.includes(selectedGenreId));
  }, [debouncedQuery, movies, selectedGenreId]);

  const activeLabel = debouncedQuery
    ? `Results for "${debouncedQuery}"`
    : genres.find((genre) => genre.id === selectedGenreId)?.name || "Selected Genre";

  const shouldShowResults = debouncedQuery.length > 0 || selectedGenreId !== null;
  const canLoadMore = page < totalPages && !loading;

  return (
    <div className="space-y-8">
      <div className="space-y-5">
        <SearchBar value={query} onChange={setQuery} />
        <GenreFilter genres={genres} selectedGenreId={selectedGenreId} onSelect={(genreId) => { setSelectedGenreId(genreId); setMovies([]); setPage(1); setTotalPages(1); }} />
      </div>

      {shouldShowResults ? (
        <section className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <SectionHeader
              eyebrow={debouncedQuery ? "Live Search" : "Genre Picks"}
              title={activeLabel}
              description={
                debouncedQuery
                  ? "Search updates automatically after a short pause, so browsing feels fast without spamming the API."
                  : "Use genres to quickly surface the strongest matches for the mood you are in."
              }
            />
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setDebouncedQuery("");
                setSelectedGenreId(null);
                setMovies([]);
                setPage(1);
                setTotalPages(1);
              }}
              className="self-start rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/75 transition hover:border-white/20 hover:text-white"
            >
              Clear filters
            </button>
          </div>

          {error ? (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-100">
              {error}
            </div>
          ) : null}

          {loading && page === 1 ? <MovieGridSkeleton count={10} /> : null}

          {!loading && displayedMovies.length === 0 && !error ? (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-white/65">
              No movies matched the current search. Try a different title or clear the filters.
            </div>
          ) : null}

          {displayedMovies.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {displayedMovies.map((movie) => (
                <MovieCard key={movie.id} movie={movie} />
              ))}
            </div>
          ) : null}

          {loading && page > 1 ? <MovieGridSkeleton count={5} /> : null}

          {canLoadMore ? (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => setPage((current) => current + 1)}
                className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-canvas transition hover:bg-white/90"
              >
                Load more
              </button>
            </div>
          ) : null}

          {debouncedQuery && selectedGenreId ? (
            <p className="text-sm text-white/45">
              Search results are narrowed client-side by the selected genre.
            </p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

