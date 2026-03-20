"use client";

export default function Error({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-6 px-4 text-center">
      <p className="rounded-full border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-red-200">
        Something broke
      </p>
      <h1 className="text-3xl font-semibold text-white">We could not load the movie experience.</h1>
      <p className="max-w-xl text-sm leading-7 text-white/65">
        {error.message || "An unexpected error happened while talking to TMDB."}
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-canvas transition hover:bg-white/90"
      >
        Try again
      </button>
    </div>
  );
}
