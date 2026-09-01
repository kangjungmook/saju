import { Chart } from '../../types/domain';
import { CivilDateTime, jdeToCivil, toJDN } from './julian';
import { lunarToSolarKST } from './lunar';
import { KR_REGIONS, trueSolarAdjustmentMin } from './region';
import {
  buildTenGods,
  computePillars,
  elementDistribution,
  ganIndexOf,
} from './ganzhi';
import { computeLuckCycles } from './luckCycles';
import { kstToAbsoluteJDE } from './time';

export const ENGINE_VERSION = 'bazi-engine-v1';

export interface BirthInput {
  date: string; // YYYY-MM-DD as entered (solar or lunar per `calendar`)
  time: string | null; // HH:mm, null when hasHour is false
  calendar: 'solar' | 'lunar';
  isLeapMonth?: boolean; // only meaningful when calendar === 'lunar'
  region: keyof typeof KR_REGIONS | string;
  gender: 'female' | 'male';
}

function parseISODate(s: string): { year: number; month: number; day: number } {
  const [y, m, d] = s.split('-').map(Number);
  return { year: y, month: m, day: d };
}

/**
 * Runs the full §3 calculation order: true-solar-time correction -> 절기
 * month/year pillars -> zi-hour day pillar -> 오행/십신 -> 대운. Deterministic:
 * the same birth input always produces the same Chart (handoff §1 rule ①).
 */
export function computeChart(userId: string, chartId: string, input: BirthInput): Chart {
  const hasHour = input.time !== null;
  const [hh, mm] = hasHour ? input.time!.split(':').map(Number) : [12, 0]; // noon placeholder when unknown

  const solarDate =
    input.calendar === 'lunar'
      ? lunarToSolarKST(
          { ...parseISODate(input.date), isLeapMonth: !!input.isLeapMonth },
          hh,
          mm,
        )
      : { ...parseISODate(input.date), hour: hh, minute: mm };

  const longitude = KR_REGIONS[input.region] ?? KR_REGIONS['서울'];
  const trueSolarAdjMin = trueSolarAdjustmentMin(longitude);

  const correctedKST: CivilDateTime = shiftMinutes(solarDate, hasHour ? trueSolarAdjMin : 0);

  const { pillars, solarYear } = computePillars({ correctedKST, hasHour });
  const elements = elementDistribution(pillars);
  const tenGods = buildTenGods(pillars.day.gan, pillars);

  const jdeUT = kstToAbsoluteJDE(correctedKST);
  const { luckDirection, luckCycles } = computeLuckCycles(
    pillars.month,
    ganIndexOf(pillars.year.gan),
    input.gender,
    jdeUT,
    solarYear,
  );

  return {
    id: chartId,
    userId,
    birth: {
      date: `${solarDate.year}-${String(solarDate.month).padStart(2, '0')}-${String(solarDate.day).padStart(2, '0')}`,
      time: hasHour ? input.time : null,
      calendar: input.calendar,
      region: String(input.region),
      utcOffsetMin: 540,
      trueSolarAdjMin,
    },
    gender: input.gender,
    hasHour,
    pillars,
    dayMaster: pillars.day.gan,
    elements,
    tenGods,
    luckCycles,
    luckDirection,
    engineVersion: ENGINE_VERSION,
  };
}

function shiftMinutes(dt: CivilDateTime, minutes: number): CivilDateTime {
  const total = dt.hour * 60 + dt.minute + minutes;
  const dayShift = Math.floor(total / 1440);
  const clock = ((total % 1440) + 1440) % 1440;
  if (dayShift === 0) return { ...dt, hour: Math.floor(clock / 60), minute: clock % 60 };
  const jdn = toJDN(dt.year, dt.month, dt.day) + dayShift;
  const civil = jdeToCivil(jdn);
  return { year: civil.year, month: civil.month, day: civil.day, hour: Math.floor(clock / 60), minute: clock % 60 };
}

export { KR_REGIONS };
export { computeDayScore, applyCalibration } from './dayScore';
export { solarToLunarKST, lunarToSolarKST } from './lunar';
