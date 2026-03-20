import { HeroSkeleton, MovieGridSkeleton } from "@/components/Skeletons";

export default function Loading() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-16 px-4 py-8 sm:px-6 lg:px-8">
      <HeroSkeleton />
      <MovieGridSkeleton count={10} />
      <MovieGridSkeleton count={10} />
    </main>
  );
}
