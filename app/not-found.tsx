import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-6 px-4 text-center">
      <p className="text-sm uppercase tracking-[0.35em] text-highlight">404</p>
      <h1 className="text-4xl font-semibold text-white">Movie not found</h1>
      <p className="text-sm leading-7 text-white/65">
        The title you requested is not available right now, or the link is no longer valid.
      </p>
      <Link
        href="/"
        className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/10"
      >
        Back to Home
      </Link>
    </div>
  );
}
