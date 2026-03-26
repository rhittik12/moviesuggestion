import { MovieListContent } from "@/components/MovieListContent";
import { Navbar } from "@/components/Navbar";
import { TmdbFetchError, hasTmdbApiKey, getMovieGenres, getPopularMovies } from "@/lib/api";

function ErrorUnavailable({ message }: { message: string }) {
  return (
    <main className="min-h-screen">
      <Navbar />
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 py-10 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-hero-gradient px-6 py-10 sm:px-10 sm:py-14">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-highlight">TMDB Unavailable</p>
          <h1 className="mt-4 max-w-2xl text-4xl font-semibold leading-tight text-white sm:text-5xl">
            We could not load popular movies from TMDB right now.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/70 sm:text-base">{message}</p>
          <div className="mt-8 rounded-3xl border border-white/10 bg-black/25 p-5 text-sm text-white/75">
            If your API key is correct, this is usually a temporary network, VPN, proxy, firewall, or TMDB outage issue.
          </div>
        </section>
      </div>
    </main>
  );
}

export const metadata = {
  title: "Popular Movies",
  description: "Explore popular movies on TMDB"
};

export default async function PopularPage() {
  if (!hasTmdbApiKey()) {
    return (
      <main className="min-h-screen">
        <Navbar />
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 py-10 sm:px-6 lg:px-8">
          <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-hero-gradient px-6 py-10 sm:px-10 sm:py-14">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-highlight">Setup Required</p>
            <h1 className="mt-4 max-w-2xl text-4xl font-semibold leading-tight text-white sm:text-5xl">
              Add your TMDB API key to start browsing movies.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/70 sm:text-base">
              Create a `.env.local` file in the project root and add `TMDB_API_KEY=your_key_here`, then restart the
              dev server.
            </p>
            <div className="mt-8 rounded-3xl border border-white/10 bg-black/25 p-5 text-sm text-white/75">
              This app uses TMDB for trending movies, popular titles, search, genres, and recommendations.
            </div>
          </section>
        </div>
      </main>
    );
  }

  try {
    const [popularResponse, genres] = await Promise.all([
      getPopularMovies(),
      getMovieGenres()
    ]);

    return (
      <>
        <Navbar />
        <MovieListContent
          initialMovies={popularResponse.results}
          genres={genres}
          category="popular"
        />
      </>
    );
  } catch (error) {
    const message = error instanceof TmdbFetchError
      ? error.message
      : "An unexpected error occurred while loading popular movies.";

    return <ErrorUnavailable message={message} />;
  }
}
