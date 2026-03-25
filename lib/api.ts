import { runWithOutboundLimit } from "@/lib/outboundLimiter";
import { resilienceConfig } from "@/lib/resilienceConfig";
import { logResilience } from "@/lib/resilienceLogger";
import { readSharedCache, writeSharedCache } from "@/lib/sharedCache";
import { withSingleFlight } from "@/lib/singleFlight";

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
  timeoutMs?: number;
  retry?: {
    maxAttempts?: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
  };
};

type CachePolicy = {
  key: string;
  freshTtlMs: number;
  maxTtlMs: number;
};

export type TmdbFetchMetadata = {
  usedStaleCache: boolean;
  source: "upstream" | "cache-fresh" | "cache-stale";
};

export type MovieDetailsOutcome =
  | {
      kind: "full";
      movie: MovieDetails;
      metadata: TmdbFetchMetadata;
    }
  | {
      kind: "degraded";
      movieId: string;
      message: string;
      retryAfterSeconds: number;
    }
  | {
      kind: "hard-failure";
      movieId: string;
      message: string;
      status?: number;
    };

type TmdbFetchResult<T> = {
  data: T;
  metadata: TmdbFetchMetadata;
};

const TRANSIENT_NETWORK_CODES = new Set([
  "ECONNRESET",
  "ETIMEDOUT",
  "ENOTFOUND",
  "ECONNREFUSED",
  "EAI_AGAIN"
]);

const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);
const MAX_TMDB_FETCH_ATTEMPTS = 5;
const BASE_RETRY_DELAY_MS = 300;
const MAX_RETRY_DELAY_MS = 3000;
const OUTBOUND_QUEUE_CODES = new Set(["OUTBOUND_QUEUE_FULL", "OUTBOUND_QUEUE_TIMEOUT"]);
const detailRetrySoonMarkers = new Map<string, number>();

const TRANSIENT_FETCH_MESSAGE_PATTERNS = [
  "fetch failed",
  "network",
  "timed out",
  "timeout",
  "socket",
  "econn",
  "eai_",
  "undici"
];

const DEBUG_MODE = process.env.TMDB_DEBUG === "1";

function createDebugLog() {
  if (!DEBUG_MODE) {
    return (..._args: unknown[]) => {
      // no-op when debug is off
    };
  }

  return (...args: unknown[]) => {
    console.log("[TMDB_DEBUG]", ...args);
  };
}

function generateRequestId(): string {
  return Math.random().toString(36).substring(2, 11);
}

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

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "";
}

function isTransientNetworkError(error: unknown) {
  const code = getErrorCode(error);
  return Boolean(code && TRANSIENT_NETWORK_CODES.has(code));
}

function isTransientFetchError(error: unknown) {
  if (!(error instanceof TypeError)) {
    return false;
  }

  const message = getErrorMessage(error).toLowerCase();

  if (TRANSIENT_FETCH_MESSAGE_PATTERNS.some((pattern) => message.includes(pattern))) {
    return true;
  }

  if (error && typeof error === "object" && "cause" in error) {
    const causeMessage = getErrorMessage((error as { cause?: unknown }).cause).toLowerCase();
    return TRANSIENT_FETCH_MESSAGE_PATTERNS.some((pattern) => causeMessage.includes(pattern));
  }

  return false;
}

function isRetryableStatus(status: number) {
  return RETRYABLE_STATUS_CODES.has(status);
}

function parseRetryAfterMs(retryAfter: string | null) {
  if (!retryAfter) {
    return undefined;
  }

  const asSeconds = Number(retryAfter);

  if (Number.isFinite(asSeconds) && asSeconds >= 0) {
    return asSeconds * 1000;
  }

  const asDate = Date.parse(retryAfter);

  if (!Number.isNaN(asDate)) {
    return Math.max(0, asDate - Date.now());
  }

  return undefined;
}

function getRetryDelayMs(attempt: number, retryAfterMs: number | undefined, retryOptions: FetchOptions["retry"]) {
  if (typeof retryAfterMs === "number") {
    return Math.max(100, retryAfterMs);
  }

  const baseDelayMs = retryOptions?.baseDelayMs ?? BASE_RETRY_DELAY_MS;
  const maxDelayMs = retryOptions?.maxDelayMs ?? MAX_RETRY_DELAY_MS;
  const exponentialDelay = baseDelayMs * (2 ** attempt);
  const jitter = Math.floor(Math.random() * 200);
  return Math.min(maxDelayMs, exponentialDelay + jitter);
}

function markDetailsRetrySoon(movieId: string, ttlMs: number) {
  detailRetrySoonMarkers.set(movieId, Date.now() + ttlMs);
}

function getDetailsRetrySoonRemainingMs(movieId: string) {
  const retryAt = detailRetrySoonMarkers.get(movieId);

  if (!retryAt) {
    return 0;
  }

  const remaining = retryAt - Date.now();

  if (remaining <= 0) {
    detailRetrySoonMarkers.delete(movieId);
    return 0;
  }

  return remaining;
}

export function __setDetailsRetrySoonMarkerForTest(movieId: string, ttlMs: number) {
  markDetailsRetrySoon(movieId, ttlMs);
}

export function __clearDetailsRetrySoonMarkersForTest() {
  detailRetrySoonMarkers.clear();
}

function isNonRetryableDetailsError(error: unknown) {
  return error instanceof TmdbFetchError
    && (error.status === 401 || error.status === 404);
}

function normalizeParams(params: Record<string, string | number | undefined>) {
  return Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== "")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${String(value).trim()}`)
    .join("&");
}

function buildCachePolicy(
  scope: string,
  endpoint: string,
  params: Record<string, string | number | undefined>,
  freshTtlMs: number,
  maxTtlMs: number
): CachePolicy {
  const normalizedParams = normalizeParams(params);
  const key = `tmdb:${scope}:${endpoint}:${normalizedParams}`;

  return {
    key,
    freshTtlMs,
    maxTtlMs
  };
}

function isRecoverableForStale(error: unknown) {
  if (!(error instanceof TmdbFetchError)) {
    return false;
  }

  if (typeof error.status === "number" && isRetryableStatus(error.status)) {
    return true;
  }

  if (error.code && (TRANSIENT_NETWORK_CODES.has(error.code) || OUTBOUND_QUEUE_CODES.has(error.code))) {
    return true;
  }

  return false;
}

export function isRecoverableTmdbErrorForStale(error: unknown) {
  return isRecoverableForStale(error);
}

async function performTmdbRequest<T>(
  endpoint: string,
  params: Record<string, string | number | undefined> = {},
  options: FetchOptions = {}
): Promise<T> {
  const apiKey = getApiKey();
  const requestId = generateRequestId();
  const debug = createDebugLog();

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
  const maxAttempts = options.retry?.maxAttempts ?? MAX_TMDB_FETCH_ATTEMPTS;

  debug(`request_start endpoint=${endpoint} maxAttempts=${maxAttempts} requestId=${requestId}`);

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const controller = typeof AbortController !== "undefined"
      ? new AbortController()
      : undefined;
    const timeoutHandle = controller && options.timeoutMs
      ? setTimeout(() => controller.abort(), options.timeoutMs)
      : undefined;

    try {
      const response = await runWithOutboundLimit(() =>
        fetch(url, {
          cache: options.cache ?? "force-cache",
          next: options.revalidate ? { revalidate: options.revalidate } : undefined,
          signal: controller?.signal
        })
      );

      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }

      if (!response.ok) {
        debug(`response_not_ok endpoint=${endpoint} attempt=${attempt} status=${response.status} requestId=${requestId}`);

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

        if (isRetryableStatus(response.status) && attempt < maxAttempts - 1) {
          const retryDelayMs = getRetryDelayMs(
            attempt,
            parseRetryAfterMs(response.headers.get("retry-after")),
            options.retry
          );
          logResilience("tmdb_retry", {
            endpoint,
            attempt,
            nextAttempt: attempt + 1,
            retryDelayMs,
            status: response.status
          });

          await wait(retryDelayMs);
          continue;
        }

        throw new TmdbFetchError(`TMDB request failed: ${response.status} ${response.statusText}`, {
          status: response.status
        });
      }

      debug(`request_success endpoint=${endpoint} attempt=${attempt} requestId=${requestId}`);

      return response.json() as Promise<T>;
    } catch (error) {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }

      if (error instanceof TmdbFetchError) {
        throw error;
      }

      const errorMessage = getErrorMessage(error);

      if ((errorMessage.includes("Outbound TMDB queue") || OUTBOUND_QUEUE_CODES.has(getErrorCode(error) ?? "")) && attempt < maxAttempts - 1) {
        const retryDelayMs = getRetryDelayMs(attempt, undefined, options.retry);
        logResilience("tmdb_retry", {
          endpoint,
          attempt,
          nextAttempt: attempt + 1,
          retryDelayMs,
          reason: "queue_saturated"
        });
        await wait(retryDelayMs);
        continue;
      }

      if ((isTransientNetworkError(error) || isTransientFetchError(error)) && attempt < maxAttempts - 1) {
        const retryDelayMs = getRetryDelayMs(attempt, undefined, options.retry);
        logResilience("tmdb_retry", {
          endpoint,
          attempt,
          nextAttempt: attempt + 1,
          retryDelayMs,
          reason: "transient_network"
        });

        await wait(retryDelayMs);
        continue;
      }

      const errorCode = getErrorCode(error);

      logResilience("tmdb_terminal_error", {
        endpoint,
        attempt,
        errorMessage,
        errorCode
      });

      if (errorMessage.includes("queue full")) {
        throw new TmdbFetchError("TMDB traffic is currently saturated. Please try again shortly.", {
          code: "OUTBOUND_QUEUE_FULL",
          status: 503
        });
      }

      if (errorMessage.includes("queue timeout")) {
        throw new TmdbFetchError("TMDB traffic is currently saturated. Please try again shortly.", {
          code: "OUTBOUND_QUEUE_TIMEOUT",
          status: 503
        });
      }

      throw new TmdbFetchError(
        "Unable to reach TMDB right now. Check your internet connection, VPN/firewall, or try again in a moment.",
        {
          code: errorCode
        }
      );
    }
  }

  throw new TmdbFetchError("Unable to reach TMDB right now.");
}

async function tmdbFetchWithResilience<T>(
  endpoint: string,
  params: Record<string, string | number | undefined> = {},
  options: FetchOptions = {},
  cachePolicy?: CachePolicy
): Promise<TmdbFetchResult<T>> {
  if (!cachePolicy) {
    return {
      data: await performTmdbRequest<T>(endpoint, params, options),
      metadata: {
        usedStaleCache: false,
        source: "upstream"
      }
    };
  }

  const cacheKey = cachePolicy.key;
  const cached = await readSharedCache<T>(cacheKey, cachePolicy.freshTtlMs, cachePolicy.maxTtlMs);

  if (cached?.isFresh) {
    return {
      data: cached.value,
      metadata: {
        usedStaleCache: false,
        source: "cache-fresh"
      }
    };
  }

  const refreshed = async () =>
    withSingleFlight(cacheKey, async () => {
      logResilience("singleflight_create", { cacheKey });
      const data = await performTmdbRequest<T>(endpoint, params, options);
      await writeSharedCache(cacheKey, data, cachePolicy.maxTtlMs);
      return data;
    });

  try {
    if (cached && !cached.isFresh) {
      logResilience("singleflight_join", { cacheKey, reason: "stale_refresh" });
    }

    const data = await refreshed();

    return {
      data,
      metadata: {
        usedStaleCache: false,
        source: "upstream"
      }
    };
  } catch (error) {
    if (cached && isRecoverableForStale(error)) {
      logResilience("stale_served_on_error", {
        cacheKey,
        reason: error instanceof TmdbFetchError ? (error.code ?? error.status ?? "unknown") : "unknown",
        cacheSource: cached.source
      });

      return {
        data: cached.value,
        metadata: {
          usedStaleCache: true,
          source: "cache-stale"
        }
      };
    }

    throw error;
  }
}

export async function getTrendingMovies() {
  const response = await tmdbFetchWithResilience<PaginatedResponse<Movie>>(
    "/trending/movie/week",
    {},
    { revalidate: 1800 },
    buildCachePolicy("trending", "/trending/movie/week", {}, 30 * 60 * 1_000, 2 * 60 * 60 * 1_000)
  );

  return response.data;
}

export async function getPopularMovies(page = 1) {
  const response = await tmdbFetchWithResilience<PaginatedResponse<Movie>>(
    "/movie/popular",
    { page },
    { revalidate: 1800 },
    buildCachePolicy("popular", "/movie/popular", { page }, 30 * 60 * 1_000, 2 * 60 * 60 * 1_000)
  );

  return response.data;
}

function shouldCacheSearchQuery(query: string, page: number) {
  const normalized = query.trim().toLowerCase();
  return normalized.length >= 3 && normalized.length <= 40 && page <= 2;
}

export async function searchMovies(query: string, page = 1) {
  const searchParams = {
    query,
    page,
    include_adult: "false"
  };

  const cachePolicy = shouldCacheSearchQuery(query, page)
    ? buildCachePolicy(
        "search",
        "/search/movie",
        searchParams,
        resilienceConfig.searchFreshTtlMs,
        resilienceConfig.searchStaleTtlMs
      )
    : undefined;

  const response = await tmdbFetchWithResilience<PaginatedResponse<Movie>>(
    "/search/movie",
    searchParams,
    { cache: "no-store" },
    cachePolicy
  );

  return response.data;
}

export async function getMovieDetailsWithMeta(movieId: string) {
  return tmdbFetchWithResilience<MovieDetails>(
    `/movie/${movieId}`,
    {},
    {
      revalidate: 1800,
      retry: {
        maxAttempts: 5,
        baseDelayMs: 350,
        maxDelayMs: 5000
      }
    },
    buildCachePolicy(
      "details",
      `/movie/${movieId}`,
      {},
      resilienceConfig.detailsFreshTtlMs,
      resilienceConfig.detailsStaleTtlMs
    )
  );
}

async function getMovieDetailsQuickFallback(movieId: string) {
  const data = await performTmdbRequest<MovieDetails>(
    `/movie/${movieId}`,
    {},
    {
      cache: "no-store",
      timeoutMs: resilienceConfig.detailsQuickFallbackTimeoutMs,
      retry: {
        maxAttempts: 1
      }
    }
  );

  const cachePolicy = buildCachePolicy(
    "details",
    `/movie/${movieId}`,
    {},
    resilienceConfig.detailsFreshTtlMs,
    resilienceConfig.detailsStaleTtlMs
  );

  await writeSharedCache(cachePolicy.key, data, cachePolicy.maxTtlMs);

  return data;
}

export async function getMovieDetailsOutcome(movieId: string): Promise<MovieDetailsOutcome> {
  const retrySoonRemainingMs = getDetailsRetrySoonRemainingMs(movieId);

  if (retrySoonRemainingMs > 0) {
    return {
      kind: "degraded",
      movieId,
      message: "Movie details are temporarily delayed. Please retry in a few seconds.",
      retryAfterSeconds: Math.max(1, Math.ceil(retrySoonRemainingMs / 1000))
    };
  }

  try {
    const response = await getMovieDetailsWithMeta(movieId);

    return {
      kind: "full",
      movie: response.data,
      metadata: response.metadata
    };
  } catch (error) {
    if (isNonRetryableDetailsError(error)) {
      return {
        kind: "hard-failure",
        movieId,
        message: error instanceof Error ? error.message : "Unable to load this movie.",
        status: error instanceof TmdbFetchError ? error.status : undefined
      };
    }

    if (isRecoverableForStale(error)) {
      try {
        const movie = await getMovieDetailsQuickFallback(movieId);

        return {
          kind: "full",
          movie,
          metadata: {
            usedStaleCache: false,
            source: "upstream"
          }
        };
      } catch {
        markDetailsRetrySoon(movieId, resilienceConfig.detailsRetrySoonTtlMs);

        return {
          kind: "degraded",
          movieId,
          message: "Movie details are temporarily delayed. Please retry in a few seconds.",
          retryAfterSeconds: Math.max(1, Math.ceil(resilienceConfig.detailsRetrySoonTtlMs / 1000))
        };
      }
    }

    return {
      kind: "hard-failure",
      movieId,
      message: error instanceof Error ? error.message : "Unable to load this movie.",
      status: error instanceof TmdbFetchError ? error.status : undefined
    };
  }
}

export async function getMovieDetails(movieId: string) {
  const outcome = await getMovieDetailsOutcome(movieId);

  if (outcome.kind === "full") {
    return outcome.movie;
  }

  throw new TmdbFetchError(outcome.message, {
    status: outcome.kind === "hard-failure" ? outcome.status : 503
  });
}

export async function getMovieGenres() {
  const response = await tmdbFetchWithResilience<{ genres: Genre[] }>(
    "/genre/movie/list",
    {},
    { revalidate: 86400 },
    buildCachePolicy("genres", "/genre/movie/list", {}, 24 * 60 * 60 * 1_000, 48 * 60 * 60 * 1_000)
  );

  return response.data.genres;
}

export async function discoverMoviesByGenre(genreId: number, page = 1) {
  const response = await tmdbFetchWithResilience<PaginatedResponse<Movie>>(
    "/discover/movie",
    {
      with_genres: genreId,
      sort_by: "popularity.desc",
      page,
      include_adult: "false"
    },
    { cache: "no-store" }
  );

  return response.data;
}

export async function getRecommendedMoviesWithMeta(movieId: string) {
  return tmdbFetchWithResilience<PaginatedResponse<Movie>>(
    `/movie/${movieId}/recommendations`,
    {},
    { revalidate: 1800 },
    buildCachePolicy(
      "recommendations",
      `/movie/${movieId}/recommendations`,
      {},
      resilienceConfig.recommendationsFreshTtlMs,
      resilienceConfig.recommendationsStaleTtlMs
    )
  );
}

export async function getRecommendedMovies(movieId: string) {
  const response = await getRecommendedMoviesWithMeta(movieId);
  return response.data;
}

export async function prewarmMovieCaches(movieIds: string[]) {
  const startedAt = Date.now();
  const normalizedIds = Array.from(new Set(movieIds.filter(Boolean)));
  const skipped = Math.max(0, movieIds.length - normalizedIds.length);
  const warmed: string[] = [];
  const failed: string[] = [];

  const batches: string[][] = [];

  for (let index = 0; index < normalizedIds.length; index += resilienceConfig.prewarmBatchSize) {
    batches.push(normalizedIds.slice(index, index + resilienceConfig.prewarmBatchSize));
  }

  const queue = [...batches];

  const workerCount = Math.min(resilienceConfig.prewarmConcurrency, Math.max(1, queue.length));

  const worker = async () => {
    while (queue.length > 0) {
      const batch = queue.shift();

      if (!batch || batch.length === 0) {
        break;
      }

      const batchResults = await Promise.allSettled(
        batch.map(async (movieId) => {
          await Promise.all([getMovieDetails(movieId), getRecommendedMovies(movieId)]);
          return movieId;
        })
      );

      batchResults.forEach((result, position) => {
        if (result.status === "fulfilled") {
          warmed.push(result.value);
          return;
        }

        const fallbackMovieId = batch[position];

        if (fallbackMovieId) {
          failed.push(fallbackMovieId);
        }
      });
    }
  };

  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  return {
    attempted: normalizedIds.length,
    warmed,
    failed,
    failedCount: failed.length,
    skipped,
    durationMs: Date.now() - startedAt
  };
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
