import { Storage } from 'expo-sqlite/kv-store';

/**
 * Local persistence for the client-side cache described in the handoff doc
 * (§1 rule ①: server/engine output is cached, never recomputed randomly).
 * Backed by expo-sqlite's key-value store, which survives app restarts.
 *
 * Every call is timeout-guarded: on web specifically, the kv-store's worker
 * bundle can fail to load in some dev setups, and when that happens its
 * calls don't reject — they hang forever. A stuck persistence layer must
 * never be able to block sign-in or chart creation, so a timeout here
 * degrades to "treat as cache miss" / "drop the write" rather than hanging
 * the UI. In-memory state (set before these are called at every call site)
 * stays correct for the session either way — only next-launch continuity
 * is lost.
 */
const TIMEOUT_MS = 2000;

function withTimeout<T>(promise: Promise<T>, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(fallback), TIMEOUT_MS);
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); console.warn('[storage] operation failed:', e); resolve(fallback); },
    );
  });
}

export async function getJSON<T>(key: string): Promise<T | null> {
  const raw = await withTimeout(Storage.getItem(key), null);
  if (raw == null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function setJSON(key: string, value: unknown): Promise<void> {
  await withTimeout(Storage.setItem(key, JSON.stringify(value)), undefined);
}

export async function removeKey(key: string): Promise<void> {
  await withTimeout(Storage.removeItem(key), undefined);
}
