import Image from "next/image";
import Link from "next/link";

import { MovieCard } from "@/components/MovieCard";
import { Navbar } from "@/components/Navbar";
import { SectionHeader } from "@/components/SectionHeader";
import {
  TmdbFetchError,
  formatDate,
  formatRating,
  getBackdropUrl,
  getMovieDetails,
  getRecommendedMovies,
  getSimilarMovies,
  getPosterUrl,
  hasTmdbApiKey
} from "@/lib/api";

type MoviePageProps = {
  params: Promise<{
    id: string;
  }>;
};

function MovieUnavailable({ message }: { message: string }) {
  return (
    <main className="min-h-screen">
      <Navbar />
      <div className="mx-auto flex min-h-[70vh] max-w-4xl flex-col items-center justify-center gap-6 px-4 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-highlight">TMDB Unavailable</p>
        <h1 className="text-4xl font-semibold text-white">We could not load this movie right now</h1>
        <p className="max-w-2xl text-sm leading-7 text-white/65 sm:text-base">{message}</p>
        <Link
          href="/"
          className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/10"
        >
          Back to Home
        </Link>
      </div>
    </main>
  );
}

export default async function MovieDetailsPage({ params }: MoviePageProps) {
  if (!hasTmdbApiKey()) {
    return (
      <main className="min-h-screen">
        <Navbar />
        <div className="mx-auto flex min-h-[70vh] max-w-4xl flex-col items-center justify-center gap-6 px-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-highlight">Configuration Needed</p>
          <h1 className="text-4xl font-semibold text-white">TMDB API key missing</h1>
          <p className="max-w-2xl text-sm leading-7 text-white/65 sm:text-base">
            Add `TMDB_API_KEY` to your `.env.local` file, restart the server, and reopen this movie page.
          </p>
          <Link
            href="/"
            className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/10"
          >
            Back to Home
          </Link>
        </div>
      </main>
    );
  }

  const { id } = await params;

  try {
    const moviePromise = getMovieDetails(id);
    const recommendationsPromise = getRecommendedMovies(id);
    const similarPromise = getSimilarMovies(id);

    const movie = await moviePromise;
    const [recommendationsResult, similarResult] = await Promise.allSettled([
      recommendationsPromise,
      similarPromise
    ]);

    const recommendations = recommendationsResult.status === "fulfilled"
      ? recommendationsResult.value.results
      : [];
    const similar = similarResult.status === "fulfilled"
      ? similarResult.value.results
      : [];
    const fallbackRecommendations = recommendations.length > 0 ? recommendations : similar;

    return (
      <main className="min-h-screen">
        <Navbar />

        <section className="relative isolate overflow-hidden border-b border-white/10">
          <Image
            src={getBackdropUrl(movie.backdrop_path)}
            alt={movie.title}
            fill
            priority
            className="-z-20 object-cover opacity-35"
            sizes="100vw"
          />
          <div className="absolute inset-0 -z-10 bg-gradient-to-t from-canvas via-canvas/70 to-canvas/20" />

          <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[320px,1fr] lg:px-8 lg:py-16">
            <div className="relative mx-auto w-full max-w-[320px] overflow-hidden rounded-[2rem] border border-white/10 shadow-2xl shadow-black/40">
              <Image
                src={getPosterUrl(movie.poster_path, "w780")}
                alt={movie.title}
                width={780}
                height={1170}
                className="h-auto w-full object-cover"
                priority
              />
            </div>

            <div className="flex flex-col justify-center space-y-6">
              <Link href="/" className="text-sm text-white/60 transition hover:text-white">
                Back to browse
              </Link>
              <div className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-highlight">Movie Details</p>
                <h1 className="text-4xl font-semibold text-white sm:text-5xl">{movie.title}</h1>
                {movie.tagline ? <p className="text-lg text-white/65">{movie.tagline}</p> : null}
              </div>

              <div className="flex flex-wrap gap-3 text-sm text-white/75">
                <span className="rounded-full border border-white/10 bg-black/20 px-4 py-2">
                  Rating {formatRating(movie.vote_average)} / 10
                </span>
                <span className="rounded-full border border-white/10 bg-black/20 px-4 py-2">
                  Release {formatDate(movie.release_date)}
                </span>
                {movie.runtime ? (
                  <span className="rounded-full border border-white/10 bg-black/20 px-4 py-2">
                    Runtime {movie.runtime} min
                  </span>
                ) : null}
              </div>

              <p className="max-w-3xl text-sm leading-8 text-white/70 sm:text-base">{movie.overview}</p>

              <div className="flex flex-wrap gap-3">
                {movie.genres.map((genre) => (
                  <span
                    key={genre.id}
                    className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80"
                  >
                    {genre.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto flex w-full max-w-7xl flex-col gap-14 px-4 py-10 sm:px-6 lg:px-8">
          <div className="space-y-6">
            <SectionHeader
              eyebrow="Because You Watched"
              title={`More like ${movie.title}`}
              description="Recommendations are powered by TMDB similarity and recommendation endpoints."
            />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {fallbackRecommendations.slice(0, 10).map((recommendedMovie) => (
                <MovieCard key={recommendedMovie.id} movie={recommendedMovie} />
              ))}
            </div>
          </div>
        </section>
      </main>
    );
  } catch (error) {
    const message = error instanceof TmdbFetchError
      ? error.message
      : "An unexpected error occurred while loading this movie.";

    return <MovieUnavailable message={message} />;
  }
}
