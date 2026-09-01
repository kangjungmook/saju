import { Storage } from 'expo-sqlite/kv-store';

/**
 * Local persistence for the client-side cache described in the handoff doc
 * (§1 rule ①: server/engine output is cached, never recomputed randomly).
 * Backed by expo-sqlite's key-value store, which survives app restarts.
 *
 * An in-memory layer sits in front of it and is the actual source of truth
 * for the running session. Two reasons: (1) on web specifically, the
 * kv-store's worker bundle can fail or take a long time to come up in some
 * dev setups, and a timeout there must never mean "the write silently
 * didn't happen" to the rest of the running app — a screen that reads
 * right after another screen writes needs to see it regardless of whether
 * the underlying store is currently healthy; (2) it makes every read after
 * the first free. Cross-restart persistence is still best-effort via the
 * underlying store, same as before.
 */
const TIMEOUT_MS = 2000;
const mem = new Map<string, string | null>();

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
  if (mem.has(key)) {
    const raw = mem.get(key);
    if (raw == null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  const raw = await withTimeout(Storage.getItem(key), null);
  mem.set(key, raw);
  if (raw == null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function setJSON(key: string, value: unknown): Promise<void> {
  const raw = JSON.stringify(value);
  mem.set(key, raw); // committed to the in-memory source of truth immediately
  await withTimeout(Storage.setItem(key, raw), undefined);
}

export async function removeKey(key: string): Promise<void> {
  mem.set(key, null);
  await withTimeout(Storage.removeItem(key), undefined);
}
