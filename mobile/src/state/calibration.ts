import { Calibration, Chart, DayLog } from '../types/domain';
import { computeCalibrationDeltas } from '../lib/bazi/calibration';
import { getJSON, setJSON } from './storage';

export { CALIBRATION_MIN_LOGS, computeCalibrationDeltas } from '../lib/bazi/calibration';

function key(chartId: string) {
  return `calibration:${chartId}`;
}

export async function getCalibration(chart: Chart): Promise<Calibration | null> {
  return getJSON<Calibration>(key(chart.id));
}

export async function saveCalibration(chart: Chart, c: Calibration): Promise<void> {
  await setJSON(key(chart.id), c);
}

export function defaultCalibration(chart: Chart, logs: DayLog[]): Calibration {
  const { byElement, sampleSize } = computeCalibrationDeltas(logs);
  return { chartId: chart.id, byElement, strength: 0.5, enabled: false, sampleSize, updatedAt: new Date().toISOString() };
}
