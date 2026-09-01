import { Chart, DayScore } from '../types/domain';
import { computeDayScore } from '../lib/bazi';
import { getJSON, setJSON } from './storage';

const mem = new Map<string, DayScore>();

function key(chartId: string, date: string) {
  return `score:${chartId}:${date}`;
}

/** Read-through cache: memory -> SQLite kv-store -> compute (per handoff, results are cached, never re-randomized). */
export async function getDayScore(chart: Chart, date: string): Promise<DayScore> {
  const k = key(chart.id, date);
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
