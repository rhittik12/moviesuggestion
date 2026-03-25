import { resilienceConfig } from "@/lib/resilienceConfig";
import { logResilience } from "@/lib/resilienceLogger";

type Waiter = {
  resolve: () => void;
  reject: (error: Error) => void;
  timer: NodeJS.Timeout;
};

type OutboundLimiterMetrics = {
  queueFull: number;
  queueTimeout: number;
  acquiredImmediately: number;
  acquiredFromQueue: number;
};

const limiterMetrics: OutboundLimiterMetrics = {
  queueFull: 0,
  queueTimeout: 0,
  acquiredImmediately: 0,
  acquiredFromQueue: 0
};

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getSaturationBackoffMs() {
  const jitter = Math.floor(Math.random() * 120);
  return Math.min(250, 60 + jitter);
}

class TokenBucketLimiter {
  private tokens = resilienceConfig.outboundBucketSize;

  private lastRefillAt = Date.now();

  private queue: Waiter[] = [];

  private refillTokens() {
    const now = Date.now();
    const elapsedMs = now - this.lastRefillAt;

    if (elapsedMs <= 0) {
      return;
    }

    const refillPerMs = resilienceConfig.outboundTokenRatePerSecond / 1000;
    const refillAmount = elapsedMs * refillPerMs;

    if (refillAmount < 1) {
      return;
    }

    this.tokens = Math.min(
      resilienceConfig.outboundBucketSize,
      this.tokens + refillAmount
    );
    this.lastRefillAt = now;
  }

  private drainQueue() {
    this.refillTokens();

    while (this.queue.length > 0 && this.tokens >= 1) {
      this.tokens -= 1;
      const waiter = this.queue.shift();

      if (!waiter) {
        break;
      }

      clearTimeout(waiter.timer);
      waiter.resolve();
    }
  }

  async acquire() {
    // Always service queued waiters first to preserve FIFO fairness.
    this.drainQueue();

    if (this.queue.length === 0 && this.tokens >= 1) {
      this.tokens -= 1;
      limiterMetrics.acquiredImmediately += 1;
      logResilience("outbound_acquired_immediately", {
        queueLength: this.queue.length
      });
      return;
    }

    if (this.queue.length >= resilienceConfig.outboundQueueLimit) {
      limiterMetrics.queueFull += 1;
      logResilience("outbound_queue_full", {
        queueLength: this.queue.length,
        queueLimit: resilienceConfig.outboundQueueLimit
      });

      await wait(getSaturationBackoffMs());

      throw new Error("Outbound TMDB queue full");
    }

    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        const index = this.queue.findIndex((waiter) => waiter.reject === reject);

        if (index !== -1) {
          this.queue.splice(index, 1);
        }

        logResilience("outbound_queue_timeout", {
          queueLength: this.queue.length,
          timeoutMs: resilienceConfig.outboundQueueTimeoutMs
        });

        limiterMetrics.queueTimeout += 1;

        reject(new Error("Outbound TMDB queue timeout"));
      }, resilienceConfig.outboundQueueTimeoutMs);

      this.queue.push({
        timer,
        reject,
        resolve: () => {
          limiterMetrics.acquiredFromQueue += 1;
          logResilience("outbound_acquired_from_queue", {
            queueLength: this.queue.length
          });
          resolve();
        }
      });
    });

    // Attempt to dispatch immediately in case tokens are currently available.
    this.drainQueue();
  }

  getQueueLength() {
    return this.queue.length;
  }

  tick() {
    this.drainQueue();
  }
}

const limiter = new TokenBucketLimiter();

const isServerRuntime = typeof window === "undefined";
const limiterTickIntervalMs = Math.max(
  5,
  Math.min(100, Math.floor(resilienceConfig.outboundQueueTimeoutMs / 2))
);

if (isServerRuntime) {
  const intervalHandle = setInterval(() => {
    limiter.tick();
  }, limiterTickIntervalMs);

  if (typeof intervalHandle.unref === "function") {
    intervalHandle.unref();
  }
}

export async function runWithOutboundLimit<T>(work: () => Promise<T>) {
  await limiter.acquire();
  return work();
}

export function getOutboundQueueLength() {
  return limiter.getQueueLength();
}

export function getOutboundLimiterMetrics(): OutboundLimiterMetrics {
  return { ...limiterMetrics };
}

export function resetOutboundLimiterMetrics() {
  limiterMetrics.queueFull = 0;
  limiterMetrics.queueTimeout = 0;
  limiterMetrics.acquiredImmediately = 0;
  limiterMetrics.acquiredFromQueue = 0;
}
