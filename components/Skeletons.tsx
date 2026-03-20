export function MovieCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
      <div className="aspect-[2/3] animate-pulse bg-white/10" />
      <div className="space-y-3 p-4">
        <div className="h-4 w-3/4 animate-pulse rounded bg-white/10" />
        <div className="h-3 w-1/3 animate-pulse rounded bg-white/10" />
        <div className="h-3 w-full animate-pulse rounded bg-white/10" />
        <div className="h-3 w-5/6 animate-pulse rounded bg-white/10" />
      </div>
    </div>
  );
}

export function MovieGridSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {Array.from({ length: count }).map((_, index) => (
        <MovieCardSkeleton key={index} />
      ))}
    </div>
  );
}

export function HeroSkeleton() {
  return (
    <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 p-6 sm:p-8 lg:p-10">
      <div className="h-4 w-24 animate-pulse rounded bg-white/10" />
      <div className="mt-4 h-10 w-2/3 animate-pulse rounded bg-white/10" />
      <div className="mt-4 h-4 w-full animate-pulse rounded bg-white/10" />
      <div className="mt-2 h-4 w-5/6 animate-pulse rounded bg-white/10" />
      <div className="mt-8 h-14 w-full animate-pulse rounded-2xl bg-white/10" />
    </div>
  );
}

export function DetailsSkeleton() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-10 px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-[320px,1fr]">
        <div className="aspect-[2/3] animate-pulse rounded-3xl bg-white/10" />
        <div className="space-y-4">
          <div className="h-4 w-24 animate-pulse rounded bg-white/10" />
          <div className="h-12 w-3/4 animate-pulse rounded bg-white/10" />
          <div className="h-4 w-full animate-pulse rounded bg-white/10" />
          <div className="h-4 w-11/12 animate-pulse rounded bg-white/10" />
          <div className="h-4 w-5/6 animate-pulse rounded bg-white/10" />
        </div>
      </div>
      <MovieGridSkeleton count={5} />
    </div>
  );
}
