import { Redis } from "@upstash/redis";

import { logResilience } from "@/lib/resilienceLogger";

type CacheRecord<T> = {
  value: T;
  storedAt: number;
};

type CacheResult<T> = {
  value: T;
  isFresh: boolean;
  source: "memory" | "redis";
};

const localFallbackCache = new Map<string, CacheRecord<unknown>>();
let missingRedisEnvWarned = false;

const redisClient = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN
    })
  : null;

if (!redisClient && !missingRedisEnvWarned) {
  missingRedisEnvWarned = true;
  console.warn("[RESILIENCE] Shared cache is running in memory-only mode because UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN is missing.");
  logResilience("cache_mode", { mode: "memory" });
}

if (redisClient) {
  logResilience("cache_mode", { mode: "redis" });
}

function getAgeMs(record: CacheRecord<unknown>) {
  return Date.now() - record.storedAt;
}

function isValidCacheRecord<T>(value: unknown): value is CacheRecord<T> {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as { storedAt?: unknown; value?: unknown };

  if (typeof candidate.storedAt !== "number" || !Number.isFinite(candidate.storedAt)) {
    return false;
  }

  if (!("value" in candidate)) {
    return false;
  }

  return true;
}

async function readRedis<T>(key: string) {
  if (!redisClient) {
    return null;
  }

  try {
    const value = await redisClient.get<unknown>(key);

    if (!isValidCacheRecord<T>(value)) {
      if (value !== null) {
        logResilience("cache_invalid_record", { key, storage: "redis" });
      }

      return null;
    }

    return value;
  } catch {
    return null;
  }
}

async function writeRedis<T>(key: string, record: CacheRecord<T>, maxTtlMs: number) {
  if (!redisClient) {
    return;
  }

  try {
    await redisClient.set(key, record, {
      ex: Math.ceil(maxTtlMs / 1000)
    });
  } catch {
    // Ignore cache write failures.
  }
}

export async function readSharedCache<T>(
  key: string,
  freshTtlMs: number,
  maxTtlMs: number
): Promise<CacheResult<T> | null> {
  const localValue = localFallbackCache.get(key);

  if (localValue && !isValidCacheRecord<T>(localValue)) {
    localFallbackCache.delete(key);
    logResilience("cache_invalid_record", { key, storage: "memory" });
  }

  const local = isValidCacheRecord<T>(localValue)
    ? localValue
    : undefined;

  if (local) {
    const ageMs = getAgeMs(local);

    if (ageMs <= maxTtlMs) {
      const isFresh = ageMs <= freshTtlMs;
      logResilience(isFresh ? "cache_hit" : "cache_stale_served", { key, storage: "memory", ageMs });
      return {
        value: local.value,
        isFresh,
        source: "memory"
      };
    }

    localFallbackCache.delete(key);
  }

  const redisValue = await readRedis<T>(key);

  if (!redisValue) {
    logResilience("cache_miss", { key });
    return null;
  }

  const ageMs = getAgeMs(redisValue);

  if (ageMs > maxTtlMs) {
    logResilience("cache_miss", { key, reason: "expired" });
    return null;
  }

  localFallbackCache.set(key, redisValue);

  const isFresh = ageMs <= freshTtlMs;
  logResilience(isFresh ? "cache_hit" : "cache_stale_served", { key, storage: "redis", ageMs });

  return {
    value: redisValue.value,
    isFresh,
    source: "redis"
  };
}

export async function writeSharedCache<T>(key: string, value: T, maxTtlMs: number) {
  const record: CacheRecord<T> = {
    value,
    storedAt: Date.now()
  };

  localFallbackCache.set(key, record);
  await writeRedis(key, record, maxTtlMs);

  logResilience("cache_write", { key });
}
