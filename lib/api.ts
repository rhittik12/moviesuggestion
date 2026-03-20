const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p";

export type Genre = {
  id: number;
  name: string;
};

export type Movie = {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  genre_ids: number[];
};

export type MovieDetails = Movie & {
  genres: Genre[];
  runtime: number;
  status: string;
  tagline: string;
};

export type PaginatedResponse<T> = {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
};

type FetchOptions = {
  cache?: RequestCache;
  revalidate?: number;
};

const TRANSIENT_NETWORK_CODES = new Set([
  "ECONNRESET",
  "ETIMEDOUT",
  "ENOTFOUND",
  "ECONNREFUSED",
  "EAI_AGAIN"
]);

export class TmdbFetchError extends Error {
  code?: string;
  status?: number;

  constructor(message: string, options: { code?: string; status?: number } = {}) {
    super(message);
    this.name = "TmdbFetchError";
    this.code = options.code;
    this.status = options.status;
  }
}

export function hasTmdbApiKey() {
  return Boolean(process.env.TMDB_API_KEY);
}

function getApiKey() {
  const apiKey = process.env.TMDB_API_KEY;

  if (!apiKey) {
    throw new Error("Missing TMDB_API_KEY environment variable.");
  }

  return apiKey;
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getErrorCode(error: unknown) {
  if (error && typeof error === "object" && "cause" in error) {
    const cause = (error as { cause?: { code?: string } }).cause;
    return cause?.code;
  }

  return undefined;
}

function isTransientNetworkError(error: unknown) {
  const code = getErrorCode(error);
  return Boolean(code && TRANSIENT_NETWORK_CODES.has(code));
}

async function tmdbFetch<T>(
  endpoint: string,
  params: Record<string, string | number | undefined> = {},
  options: FetchOptions = {}
): Promise<T> {
  const apiKey = getApiKey();
  const searchParams = new URLSearchParams({
    api_key: apiKey,
    language: "en-US"
  });

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      searchParams.set(key, String(value));
    }
  });

  const url = `${TMDB_BASE_URL}${endpoint}?${searchParams.toString()}`;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch(url, {
        cache: options.cache ?? "force-cache",
        next: options.revalidate ? { revalidate: options.revalidate } : undefined
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new TmdbFetchError("TMDB rejected the API key. Verify TMDB_API_KEY in your .env.local file.", {
            status: response.status
          });
        }

        if (response.status === 404) {
          throw new TmdbFetchError("The requested movie could not be found on TMDB.", {
            status: response.status
          });
        }

        throw new TmdbFetchError(`TMDB request failed: ${response.status} ${response.statusText}`, {
          status: response.status
        });
      }

      return response.json() as Promise<T>;
    } catch (error) {
      if (error instanceof TmdbFetchError) {
        throw error;
      }

      if (attempt === 0 && isTransientNetworkError(error)) {
        await wait(400);
        continue;
      }

      throw new TmdbFetchError(
        "Unable to reach TMDB right now. Check your internet connection, VPN/firewall, or try again in a moment.",
        {
          code: getErrorCode(error)
        }
      );
    }
  }

  throw new TmdbFetchError("Unable to reach TMDB right now.");
}

export async function getTrendingMovies() {
  return tmdbFetch<PaginatedResponse<Movie>>(
    "/trending/movie/week",
    {},
    { revalidate: 1800 }
  );
}

export async function getPopularMovies(page = 1) {
  return tmdbFetch<PaginatedResponse<Movie>>(
    "/movie/popular",
    { page },
    { revalidate: 1800 }
  );
}

export async function searchMovies(query: string, page = 1) {
  return tmdbFetch<PaginatedResponse<Movie>>(
    "/search/movie",
    {
      query,
      page,
      include_adult: "false"
    },
    { cache: "no-store" }
  );
}

export async function getMovieDetails(movieId: string) {
  return tmdbFetch<MovieDetails>(`/movie/${movieId}`, {}, { revalidate: 1800 });
}

export async function getMovieGenres() {
  const response = await tmdbFetch<{ genres: Genre[] }>(
    "/genre/movie/list",
    {},
    { revalidate: 86400 }
  );

  return response.genres;
}

export async function discoverMoviesByGenre(genreId: number, page = 1) {
  return tmdbFetch<PaginatedResponse<Movie>>(
    "/discover/movie",
    {
      with_genres: genreId,
      sort_by: "popularity.desc",
      page,
      include_adult: "false"
    },
    { cache: "no-store" }
  );
}

export async function getRecommendedMovies(movieId: string) {
  return tmdbFetch<PaginatedResponse<Movie>>(
    `/movie/${movieId}/recommendations`,
    {},
    { revalidate: 1800 }
  );
}

export async function getSimilarMovies(movieId: string) {
  return tmdbFetch<PaginatedResponse<Movie>>(
    `/movie/${movieId}/similar`,
    {},
    { revalidate: 1800 }
  );
}

export function getPosterUrl(path: string | null, size = "w500") {
  if (!path) {
    return "/poster-placeholder.svg";
  }

  return `${TMDB_IMAGE_BASE_URL}/${size}${path}`;
}

export function getBackdropUrl(path: string | null, size = "original") {
  if (!path) {
    return "/backdrop-placeholder.svg";
  }

  return `${TMDB_IMAGE_BASE_URL}/${size}${path}`;
}

export function formatRating(rating: number) {
  return rating.toFixed(1);
}

export function formatDate(date: string) {
  if (!date) {
    return "Release date unavailable";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric"
  }).format(new Date(date));
}
