import { Storage } from 'expo-sqlite/kv-store';

/**
 * Local persistence for the client-side cache described in the handoff doc
 * (§1 rule ①: server/engine output is cached, never recomputed randomly).
 * Backed by expo-sqlite's key-value store, which survives app restarts.
 */
export async function getJSON<T>(key: string): Promise<T | null> {
  const raw = await Storage.getItem(key);
  if (raw == null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function setJSON(key: string, value: unknown): Promise<void> {
  await Storage.setItem(key, JSON.stringify(value));
}

export async function removeKey(key: string): Promise<void> {
  await Storage.removeItem(key);
}
