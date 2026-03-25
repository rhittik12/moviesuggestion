const inflight = new Map<string, Promise<unknown>>();

export async function withSingleFlight<T>(key: string, work: () => Promise<T>): Promise<T> {
  const existing = inflight.get(key);

  if (existing) {
    return existing as Promise<T>;
  }

  const promise = work();
  inflight.set(key, promise);

  try {
    return await promise;
  } finally {
    inflight.delete(key);
  }
}

export function getSingleFlightSize() {
  return inflight.size;
}
