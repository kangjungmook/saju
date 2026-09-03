import { Calibration, Chart, DayScore } from '../types/domain';
import { applyCalibration, computeDayScore } from '../lib/bazi';
import { chartSeed } from '../lib/bazi/dayScore';
import { bandFromScore } from '../theme/tokens';
import { getCalibration } from './calibration';
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

/**
 * 27 체감 보정's effect is applied here, on read, rather than being baked into
 * the cached record.
 *
 * The handoff (§4, note for 27) wants `raw` preserved, only `adjusted` moved,
 * an exact return to the original numbers when it's switched off, and the score
 * cache invalidated whenever the strength changes. Deriving `adjusted` at read
 * time satisfies all four without an invalidation step at all: what's cached is
 * always the untouched `raw`, and the calibration is a pure function layered on
 * top of it.
 */
function withCalibration(score: DayScore, cal: Calibration | null): DayScore {
  if (!cal) return score;
  const adjusted = applyCalibration(score.raw, score.ganZhi.element, cal.byElement, cal.strength, cal.enabled);
  return { ...score, adjusted, band: bandFromScore(adjusted) };
}

/** Read-through cache: memory -> SQLite kv-store -> compute (per handoff, results are cached, never re-randomized). */
export async function getDayScore(chart: Chart, date: string): Promise<DayScore> {
  const k = key(chart, date);
  const cal = await getCalibration(chart);

  const inMem = mem.get(k);
  if (inMem) return withCalibration(inMem, cal);

  const cached = await getJSON<DayScore>(k);
  if (cached && cached.scoreVersion === computeDayScore(chart, date).scoreVersion) {
    mem.set(k, cached);
    return withCalibration(cached, cal);
  }

  const score = computeDayScore(chart, date);
  mem.set(k, score);
  await setJSON(k, score);
  return withCalibration(score, cal);
}

export async function getDayScoresRange(chart: Chart, dates: string[]): Promise<Record<string, DayScore>> {
  const entries = await Promise.all(dates.map(async (d) => [d, await getDayScore(chart, d)] as const));
  return Object.fromEntries(entries);
}
