"use client";

import type { Genre } from "@/lib/api";

type GenreFilterProps = {
  genres: Genre[];
  selectedGenreIds: number[];
  onSelect: (genreId: number | null) => void;
};

export function GenreFilter({ genres, selectedGenreIds, onSelect }: GenreFilterProps) {
  return (
    <div id="genres" className="flex flex-wrap gap-3">
      <button
        type="button"
        onClick={() => onSelect(null)}
        className={`rounded-full border px-4 py-2 text-sm transition ${
          selectedGenreIds.length === 0     
            ? "border-highlight bg-highlight text-white"
            : "border-white/10 bg-white/5 text-white/70 hover:border-white/20 hover:text-white"
        }`}
      >
        All Genres
      </button>

      {genres.map((genre) => (
        <button
          key={genre.id}
          type="button"
          onClick={() => onSelect(genre.id)}
          className={`rounded-full border px-4 py-2 text-sm transition ${
            selectedGenreIds.includes(genre.id)
              ? "border-highlight bg-highlight text-white"
              : "border-white/10 bg-white/5 text-white/70 hover:border-white/20 hover:text-white"
          }`}
        >
          {genre.name}
        </button>
      ))}
    </div>
  );
}
