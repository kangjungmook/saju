import { DayLog, Element } from '../../types/domain';
import { toJDN } from './julian';
import { dayPillarFromJDN } from './ganzhi';

const ELEMENTS: Element[] = ['木', '火', '土', '金', '水'];
const EMPTY: Record<Element, number> = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };

/** Handoff §4, note for 27: below this the screen stays hidden rather than drawing an empty graph. */
export const CALIBRATION_MIN_LOGS = 14;

/**
 * Where a `felt` band sits on the 0-100 scale — the midpoint of each band as
 * `bandFromScore` cuts them (0-34 / 35-49 / 50-64 / 65-79 / 80-100), so the gap
 * against `predictedRaw` is measured on one scale.
 */
const FELT_AS_SCORE: Record<number, number> = { 1: 20, 2: 42, 3: 57, 4: 72, 5: 90 };

/**
 * Learns the user's own bias from their logs: for every logged day, how far the
 * day actually landed from what the app predicted, grouped by that day's
 * element. Positive means they consistently do *better* than the chart says on
 * that element's days.
 *
 * Lives here rather than in state/ because it is pure engine work — and because
 * putting it behind the storage layer made it untestable without pulling
 * expo-sqlite into the test run.
 */
export function computeCalibrationDeltas(logs: DayLog[]): { byElement: Record<Element, number>; sampleSize: number } {
  const sums: Record<Element, number> = { ...EMPTY };
  const counts: Record<Element, number> = { ...EMPTY };

  for (const log of logs) {
    const [y, m, d] = log.date.split('-').map(Number);
    const el = dayPillarFromJDN(toJDN(y, m, d)).element;
    sums[el] += FELT_AS_SCORE[log.felt] - log.predictedRaw;
    counts[el] += 1;
  }

  const byElement = { ...EMPTY };
  for (const el of ELEMENTS) {
    if (counts[el] === 0) continue;
    // Clamped to the ±20 the Calibration type documents, and shrunk while the
    // sample for that element is thin — three 水 days shouldn't move 水 as hard
    // as thirty do.
    const mean = sums[el] / counts[el];
    const confidence = Math.min(1, counts[el] / 8);
    byElement[el] = Math.max(-20, Math.min(20, Math.round(mean * confidence)));
  }
  return { byElement, sampleSize: logs.length };
}
