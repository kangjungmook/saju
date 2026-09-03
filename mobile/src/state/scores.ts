import { Chart, DayScore } from '../types/domain';
import { computeDayScore } from '../lib/bazi';
import { chartSeed } from '../lib/bazi/dayScore';
import { getJSON, setJSON } from './storage';

const mem = new Map<string, DayScore>();

/**
 * Keyed on the birth details, not just the chart id.
 *
 * 20 프로필 편집 deliberately keeps the same chart id when it recomputes, so
 * that day logs (stored under that id) survive the edit. That means the id can
 * no longer stand in for "which chart is this" — edit your birth region and an
 * id-keyed cache would keep serving the scores of the chart you just replaced,
 * against the handoff's requirement that past scores be re-ranked under the new
 * 원국. Folding the seed in makes an edited chart miss the cache and recompute;
 * the superseded entries are simply never read again.
 */
function key(chart: Chart, date: string) {
  return `score:${chart.id}:${chartSeed(chart)}:${date}`;
}

/** Read-through cache: memory -> SQLite kv-store -> compute (per handoff, results are cached, never re-randomized). */
export async function getDayScore(chart: Chart, date: string): Promise<DayScore> {
  const k = key(chart, date);
  const inMem = mem.get(k);
  if (inMem) return inMem;

  const cached = await getJSON<DayScore>(k);
  if (cached && cached.scoreVersion === computeDayScore(chart, date).scoreVersion) {
    mem.set(k, cached);
    return cached;
  }

  const score = computeDayScore(chart, date);
  mem.set(k, score);
  await setJSON(k, score);
  return score;
}

export async function getDayScoresRange(chart: Chart, dates: string[]): Promise<Record<string, DayScore>> {
  const entries = await Promise.all(dates.map(async (d) => [d, await getDayScore(chart, d)] as const));
  return Object.fromEntries(entries);
}
