// lib/simpleCache.ts
type Entry<T> = { value: T; ts: number; ttl: number };

const store = new Map<string, Entry<any>>();

export function cacheGet<T>(key: string): T | undefined {
  const e = store.get(key);
  if (!e) return;
  if (Date.now() - e.ts > e.ttl) {
    store.delete(key);
    return;
  }
  return e.value as T;
}

export function cacheSet<T>(key: string, value: T, ttlMs = 60_000) {
  store.set(key, { value, ts: Date.now(), ttl: ttlMs });
}

export function cacheDel(key: string) {
  store.delete(key);
}

export function cacheClearByPrefix(prefix: string) {
  [...store.keys()].forEach(k => k.startsWith(prefix) && store.delete(k));
}
