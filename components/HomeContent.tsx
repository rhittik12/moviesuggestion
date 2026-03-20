"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { Genre, Movie } from "@/lib/api";

import { GenreFilter } from "./GenreFilter";
import { MovieCard } from "./MovieCard";
import { Navbar, type HomeTab } from "./Navbar";
import { SearchExperience } from "./SearchExperience";
import { SectionHeader } from "./SectionHeader";
import { MovieGridSkeleton } from "./Skeletons";

type HomeContentProps = {
  initialTrendingMovies: Movie[];
  initialPopularMovies: Movie[];
  genres: Genre[];
};

type MoviesResponse = {
  results: Movie[];
  totalPages?: number;
  message?: string;
};

export function HomeContent({ initialTrendingMovies, initialPopularMovies, genres }: HomeContentProps) {
  const [activeTab, setActiveTab] = useState<HomeTab>("trending");
  const [selectedGenreId, setSelectedGenreId] = useState<number | null>(null);
  const [movies, setMovies] = useState<Movie[]>(initialTrendingMovies);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const hasMounted = useRef(false);

  async function getTrendingMovies(signal?: AbortSignal) {
    const response = await fetch("/api/trending", { signal, cache: "no-store" });
    const data = (await response.json()) as MoviesResponse;

    if (!response.ok) {
      throw new Error(data.message || "Unable to load trending movies.");
    }

    return data.results;
  }

  async function getPopularMovies(signal?: AbortSignal) {
    const response = await fetch("/api/popular", { signal, cache: "no-store" });
    const data = (await response.json()) as MoviesResponse;

    if (!response.ok) {
      throw new Error(data.message || "Unable to load popular movies.");
    }

    return data.results;
  }

  async function getMoviesByGenre(genreId: number, signal?: AbortSignal) {
    const response = await fetch(`/api/discover?genreId=${genreId}`, { signal, cache: "no-store" });
    const data = (await response.json()) as MoviesResponse;

    if (!response.ok) {
      throw new Error(data.message || "Unable to load this genre right now.");
    }

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

        if (activeTab === "trending") {
          const nextMovies = await getTrendingMovies(controller.signal);
          setMovies(nextMovies);
          return;
        }

        if (activeTab === "popular") {
          const nextMovies = await getPopularMovies(controller.signal);
          setMovies(nextMovies);
          return;
        }

        if (selectedGenreId) {
          const nextMovies = await getMoviesByGenre(selectedGenreId, controller.signal);
          setMovies(nextMovies);
        } else {
          setMovies([]);
        }
      } catch (fetchError) {
        if ((fetchError as Error).name !== "AbortError") {
          setError((fetchError as Error).message || "Something went wrong while switching tabs.");
          setMovies([]);
        }
      } finally {
        setIsLoading(false);
      }
    }

    loadMovies();

    return () => controller.abort();
  }, [activeTab, selectedGenreId]);

  const featuredMovie = movies[0] ?? initialTrendingMovies[0] ?? initialPopularMovies[0];

  const browseCopy = useMemo(() => {
    if (activeTab === "trending") {
      return {
        eyebrow: "Right Now",
        title: "Trending Movies",
        description: "Fresh picks people are watching and talking about right now."
      };
    }

    if (activeTab === "popular") {
      return {
        eyebrow: "Most Watched",
        title: "Popular Movies",
        description: "A curated wall of crowd favorites pulled straight from TMDB."
      };
    }

    return {
      eyebrow: "Browse By Genre",
      title: selectedGenreId
        ? genres.find((genre) => genre.id === selectedGenreId)?.name || "Genres"
        : "Choose a Genre",
      description: selectedGenreId
        ? "Switch genres to instantly refresh the movie wall."
        : "Pick a genre to explore a curated list of matching movies."
    };
  }, [activeTab, genres, selectedGenreId]);

  return (
    <main className="min-h-screen">
      <Navbar
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setError("");

          if (tab === "trending") {
            setMovies(initialTrendingMovies);
          }

          if (tab === "popular") {
            setMovies(initialPopularMovies);
          }

          if (tab === "genre" && !selectedGenreId && genres[0]) {
            setSelectedGenreId(genres[0].id);
          }
        }}
      />

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-16 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-hero-gradient shadow-glow transition duration-500">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_right,rgba(255,255,255,0.1),transparent_30%)]" />
          <div className="relative grid gap-10 px-6 py-8 sm:px-8 sm:py-10 lg:grid-cols-[1.1fr,0.9fr] lg:px-12 lg:py-14">
            <div className="space-y-6">
              <span className="inline-flex rounded-full border border-highlight/40 bg-highlight/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.32em] text-highlight">
                TMDB Powered Picks
              </span>
              <div className="space-y-4">
                <h1 className="max-w-2xl text-4xl font-semibold leading-tight text-white sm:text-5xl lg:text-6xl">
                  Find your next movie night favorite in seconds.
                </h1>
                <p className="max-w-2xl text-sm leading-7 text-white/70 sm:text-base">
                  Browse trending releases, search instantly, filter by genre, and jump into movie pages
                  packed with recommendations tailored by TMDB.
                </p>
              </div>
              <SearchExperience genres={genres} />
            </div>

            {featuredMovie ? (
              <div className="flex flex-col justify-end rounded-[1.75rem] border border-white/10 bg-black/25 p-6 backdrop-blur-sm transition duration-500">
                <p className="text-xs uppercase tracking-[0.35em] text-white/55">Featured In {browseCopy.title}</p>
                <h2 className="mt-4 text-3xl font-semibold text-white">{featuredMovie.title}</h2>
                <p className="mt-4 line-clamp-5 text-sm leading-7 text-white/70">{featuredMovie.overview}</p>
                <div className="mt-8 flex flex-wrap gap-3 text-sm text-white/70">
                  <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">
                    Rating {featuredMovie.vote_average.toFixed(1)}
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">
                    Release {featuredMovie.release_date || "TBA"}
                  </span>
                </div>
              </div>
            ) : null}
          </div>
        </section>

        <section id="browse" className="space-y-6">
          <div className="flex flex-col gap-5">
            <SectionHeader
              eyebrow={browseCopy.eyebrow}
              title={browseCopy.title}
              description={browseCopy.description}
            />

            {activeTab === "genre" ? (
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
            ) : null}
          </div>

          {error ? (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-100">
              {error}
            </div>
          ) : null}

          <div className={`transition-all duration-300 ${isLoading ? "opacity-60" : "opacity-100"}`}>
            {isLoading ? <MovieGridSkeleton count={10} /> : null}

            {!isLoading && activeTab === "genre" && !selectedGenreId ? (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-white/65">
                Select a genre to load movies.
              </div>
            ) : null}

            {!isLoading && movies.length > 0 ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                {movies.slice(0, 10).map((movie) => (
                  <MovieCard key={`${activeTab}-${movie.id}`} movie={movie} />
                ))}
              </div>
            ) : null}

            {!isLoading && movies.length === 0 && (!error || activeTab !== "genre") ? (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-white/65">
                No movies are available for this tab right now.
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
