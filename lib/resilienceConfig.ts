type NumberSetting = {
  minimum: number;
  fallback: number;
};

function parseNumberSetting(raw: string | undefined, setting: NumberSetting) {
  if (!raw) {
    return setting.fallback;
  }

  const parsed = Number(raw);

  if (!Number.isFinite(parsed) || parsed < setting.minimum) {
    return setting.fallback;
  }

  return parsed;
}

function parseBoolean(raw: string | undefined, fallback: boolean) {
  if (!raw) {
    return fallback;
  }

  return ["1", "true", "yes", "on"].includes(raw.toLowerCase());
}

export const resilienceConfig = {
  logEnabled: parseBoolean(process.env.TMDB_RESILIENCE_LOGS, false),
  detailsFreshTtlMs: parseNumberSetting(process.env.TMDB_DETAILS_FRESH_TTL_MS, {
    minimum: 1_000,
    fallback: 30 * 60 * 1_000
  }),
  detailsStaleTtlMs: parseNumberSetting(process.env.TMDB_DETAILS_STALE_TTL_MS, {
    minimum: 10_000,
    fallback: 24 * 60 * 60 * 1_000
  }),
  recommendationsFreshTtlMs: parseNumberSetting(process.env.TMDB_RECS_FRESH_TTL_MS, {
    minimum: 1_000,
    fallback: 30 * 60 * 1_000
  }),
  recommendationsStaleTtlMs: parseNumberSetting(process.env.TMDB_RECS_STALE_TTL_MS, {
    minimum: 10_000,
    fallback: 24 * 60 * 60 * 1_000
  }),
  detailsRetrySoonTtlMs: parseNumberSetting(process.env.TMDB_DETAILS_RETRY_SOON_TTL_MS, {
    minimum: 1_000,
    fallback: 10_000
  }),
  detailsQuickFallbackTimeoutMs: parseNumberSetting(process.env.TMDB_DETAILS_QUICK_FALLBACK_TIMEOUT_MS, {
    minimum: 200,
    fallback: 1_500
  }),
  searchFreshTtlMs: parseNumberSetting(process.env.TMDB_SEARCH_FRESH_TTL_MS, {
    minimum: 1_000,
    fallback: 20_000
  }),
  searchStaleTtlMs: parseNumberSetting(process.env.TMDB_SEARCH_STALE_TTL_MS, {
    minimum: 5_000,
    fallback: 60_000
  }),
  outboundTokenRatePerSecond: parseNumberSetting(process.env.TMDB_OUTBOUND_TOKENS_PER_SECOND, {
    minimum: 1,
    fallback: 6
  }),
  outboundBucketSize: parseNumberSetting(process.env.TMDB_OUTBOUND_BUCKET_SIZE, {
    minimum: 1,
    fallback: 40
  }),
  outboundQueueLimit: parseNumberSetting(process.env.TMDB_OUTBOUND_QUEUE_LIMIT, {
    minimum: 1,
    fallback: 500
  }),
  outboundQueueTimeoutMs: parseNumberSetting(process.env.TMDB_OUTBOUND_QUEUE_TIMEOUT_MS, {
    minimum: 10,
    fallback: 8_000
  }),
  prewarmSecret: process.env.PREWARM_SECRET || "",
  prewarmMovieLimit: parseNumberSetting(process.env.PREWARM_MOVIE_LIMIT, {
    minimum: 1,
    fallback: 200
  }),
  prewarmPopularPages: parseNumberSetting(process.env.PREWARM_POPULAR_PAGES, {
    minimum: 1,
    fallback: 5
  }),
  prewarmBatchSize: parseNumberSetting(process.env.PREWARM_BATCH_SIZE, {
    minimum: 1,
    fallback: 20
  }),
  prewarmConcurrency: parseNumberSetting(process.env.PREWARM_CONCURRENCY, {
    minimum: 1,
    fallback: 5
  })
};
