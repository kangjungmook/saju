import { Chart, DayLog } from '../types/domain';
import { getJSON, removeKey, setJSON } from './storage';
import { isoOf } from '../lib/date';

function logKey(chartId: string, date: string) {
  return `log:${chartId}:${date}`;
}
function indexKey(chartId: string) {
  return `logIndex:${chartId}`;
}

export async function getDayLog(chart: Chart, date: string): Promise<DayLog | null> {
  return getJSON<DayLog>(logKey(chart.id, date));
}

export async function saveDayLog(chart: Chart, log: DayLog): Promise<void> {
  await setJSON(logKey(chart.id, log.date), log);
  const index = (await getJSON<string[]>(indexKey(chart.id))) ?? [];
  if (!index.includes(log.date)) {
    index.push(log.date);
    await setJSON(indexKey(chart.id), index);
  }
}

export async function getLoggedDates(chart: Chart): Promise<Set<string>> {
  const index = (await getJSON<string[]>(indexKey(chart.id))) ?? [];
  return new Set(index);
}

/** Undo for a just-made save (screen 22's toast "되돌리기") — removes the entry and its index. */
export async function removeDayLog(chart: Chart, date: string): Promise<void> {
  await removeKey(logKey(chart.id, date));
  const index = (await getJSON<string[]>(indexKey(chart.id))) ?? [];
  await setJSON(indexKey(chart.id), index.filter((d) => d !== date));
}

/**
 * Consecutive logged days ending at `endDate`, counting backwards.
 *
 * 03 홈's nudge and 12's "N일 연속 기록" both show this number, so it lives here
 * rather than being counted separately on each screen — the handoff's note for
 * 26 warns that a second copy of a shared figure is how two screens start
 * disagreeing. 12 passes today (the day you're logging); 03 passes yesterday,
 * since today isn't over yet and not having logged it shouldn't read as a
 * broken streak.
 */
export function streakEndingAt(logged: Set<string>, endDate: string): number {
  const [y, m, d] = endDate.split('-').map(Number);
  const cursor = new Date(y, m - 1, d);
  let count = 0;
  while (logged.has(isoOf(cursor.getFullYear(), cursor.getMonth() + 1, cursor.getDate()))) {
    count += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}
