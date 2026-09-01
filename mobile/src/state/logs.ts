import { Chart, DayLog } from '../types/domain';
import { getJSON, setJSON } from './storage';

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
