import { Chart } from '../types/domain';
import { getJSON, setJSON } from './storage';

/** How closely a past year's reading matched what actually happened. */
export type RecallVerdict = 'hit' | 'near' | 'miss';

export interface RecallAnswer {
  year: number;
  verdict: RecallVerdict;
}

function key(chartId: string) {
  return `recall:${chartId}`;
}

export async function getRecallAnswers(chart: Chart): Promise<RecallAnswer[]> {
  return (await getJSON<RecallAnswer[]>(key(chart.id))) ?? [];
}

/**
 * Records one answer, replacing any earlier answer for the same year — 25 lets
 * you cycle back to a year you already judged, and a second opinion should
 * supersede the first rather than double-count in the tally.
 */
export async function saveRecallAnswer(chart: Chart, answer: RecallAnswer): Promise<RecallAnswer[]> {
  const existing = await getRecallAnswers(chart);
  const next = [...existing.filter((a) => a.year !== answer.year), answer].sort((a, b) => a.year - b.year);
  await setJSON(key(chart.id), next);
  return next;
}

/** "3 중 2" — how many of the years you've judged actually landed. */
export function recallTally(answers: RecallAnswer[]): { total: number; hits: number } {
  return { total: answers.length, hits: answers.filter((a) => a.verdict === 'hit').length };
}
