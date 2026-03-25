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

export function logResilience(event: ResilienceEvent, details: Record<string, unknown>) {
  if (!resilienceConfig.logEnabled) {
    return;
  }

  console.log(`[RESILIENCE] ${event}`, details);
}
