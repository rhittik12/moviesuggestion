import Link from "next/link";

import { Movie, formatRating, getPosterUrl } from "@/lib/api";
import { RetryImage } from "./RetryImage";

type MovieCardProps = {
  movie: Movie;
};

export function MovieCard({ movie }: MovieCardProps) {
  return (
    <Link
      href={`/movie/${movie.id}`}
      className="group overflow-hidden rounded-2xl border border-white/10 bg-white/5 transition hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.08]"
    >
      <div className="relative aspect-[2/3] overflow-hidden">
        <RetryImage
          src={getPosterUrl(movie.poster_path)}
          alt={movie.title}
          fill
          className="object-cover transition duration-500 group-hover:scale-105"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent p-4">
          <div className="inline-flex items-center rounded-full border border-white/15 bg-black/40 px-2.5 py-1 text-xs font-medium text-white">
            {formatRating(movie.vote_average)} / 10
          </div>
        </div>
      </div>

      <div className="space-y-2 p-4">
        <h3 className="line-clamp-1 text-sm font-semibold text-white sm:text-base">{movie.title}</h3>
        <p className="text-xs text-white/60">{movie.release_date?.slice(0, 4) || "TBA"}</p>
        <p className="line-clamp-3 text-sm leading-6 text-white/65">{movie.overview || "Overview unavailable."}</p>
      </div>
    </Link>
  );
}
