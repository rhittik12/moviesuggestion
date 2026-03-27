import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { hasTmdbApiKey } from "@/lib/api";
import { SearchExperience } from "@/components/SearchExperience";

export default async function HomePage() {
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
  return (
    <main className="min-h-screen">
      <Navbar />
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-hero-gradient px-6 py-10 sm:px-10 sm:py-14">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_right,rgba(255,255,255,0.1),transparent_30%)]" />
          <div className="relative space-y-8">
            <div className="space-y-4">
              <h1 className="max-w-2xl text-4xl font-semibold leading-tight text-white sm:text-5xl lg:text-6xl">
                What to Watch Next?
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-white/70 sm:text-base">
                Discover trending movies right now or explore what everyone&apos;s watching. Filter by genre and find your
                next favorite film.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
              <Link
                href="/trending"
                className="inline-flex items-center justify-center rounded-full bg-highlight px-8 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-highlight/90"
              >
                Explore Trending
              </Link>
              <Link
                href="/popular"
                className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/5 px-8 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Browse Popular
              </Link>
            </div>
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
              <SearchExperience genres={[]} showGenreFilter={false} />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
