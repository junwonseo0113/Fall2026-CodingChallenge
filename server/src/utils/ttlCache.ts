/** A minimal in-memory cache where each entry expires `ttlMs` after it's set. */
export function createTtlCache<T>(ttlMs: number) {
  const store = new Map<string, { expiresAt: number; value: T }>();

  return {
    get(key: string): T | undefined {
      const entry = store.get(key);
      if (!entry || entry.expiresAt <= Date.now()) return undefined;
      return entry.value;
    },
    set(key: string, value: T): void {
      store.set(key, { expiresAt: Date.now() + ttlMs, value });
    },
  };
}
