import { resilienceConfig } from "@/lib/resilienceConfig";

type ResilienceEvent =
  | "cache_mode"
  | "cache_invalid_record"
  | "cache_hit"
  | "cache_miss"
  | "cache_stale_served"
  | "stale_served_on_error"
  | "cache_write"
  | "singleflight_join"
  | "singleflight_create"
  | "outbound_acquired_immediately"
  | "outbound_acquired_from_queue"
  | "outbound_queue_full"
  | "outbound_queue_timeout"
  | "tmdb_retry"
  | "tmdb_terminal_error";

const REDACTED_KEY_FIELDS = new Set(["key", "cacheKey"]);

function createStableHash(value: string) {
  let hash = 2166136261;

  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(16);
}

function sanitizeLogValue(field: string, value: unknown): unknown {
  if (REDACTED_KEY_FIELDS.has(field) && typeof value === "string") {
    return `redacted:${createStableHash(value)}`;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeLogValue(field, item));
  }

  if (value && typeof value === "object") {
    const sanitizedEntries = Object.entries(value as Record<string, unknown>).map(([nestedField, nestedValue]) => {
      return [nestedField, sanitizeLogValue(nestedField, nestedValue)];
    });

    return Object.fromEntries(sanitizedEntries);
  }

  return value;
}

function sanitizeLogDetails(details: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(details).map(([field, value]) => [field, sanitizeLogValue(field, value)])
  );
}

export function logResilience(event: ResilienceEvent, details: Record<string, unknown>) {
  if (!resilienceConfig.logEnabled) {
    return;
  }

  console.log(`[RESILIENCE] ${event}`, sanitizeLogDetails(details));
}
