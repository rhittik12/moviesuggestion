"use client";

type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;
};

export function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <div className="relative w-full">
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search movies, actors, moods..."
        className="h-14 w-full rounded-2xl border border-white/10 bg-white/10 px-5 pr-14 text-sm text-white outline-none ring-0 placeholder:text-white/40 transition focus:border-highlight/60 focus:bg-white/[0.14] sm:text-base"
        aria-label="Search movies"
      />
      <div className="pointer-events-none absolute inset-y-0 right-5 flex items-center text-white/45">
        Ctrl K
      </div>
    </div>
  );
}
