/**
 * Sun's apparent geocentric ecliptic longitude and the 24 solar-term (절기)
 * dates derived from it. Meeus, "Astronomical Algorithms" ch.25 low-precision
 * solar coordinates (~0.01° accuracy, well under a minute of time) — this is
 * the same approach production 만세력 engines use for term boundaries.
 */
import { normalizeDegrees } from './julian';

const DEG = Math.PI / 180;

/** Apparent geocentric longitude of the Sun (degrees, 0-360) at Julian Ephemeris Day `jde`. */
export function sunApparentLongitude(jde: number): number {
  const T = (jde - 2451545.0) / 36525;
  const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  const M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
  const Mrad = M * DEG;
  const C =
    (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(Mrad) +
    (0.019993 - 0.000101 * T) * Math.sin(2 * Mrad) +
    0.000289 * Math.sin(3 * Mrad);
  const trueLong = L0 + C;
  const omega = 125.04 - 1934.136 * T;
  const apparent = trueLong - 0.00569 - 0.00478 * Math.sin(omega * DEG);
  return normalizeDegrees(apparent);
}

/**
 * Solve for the JDE at which the Sun's apparent longitude equals `targetDeg`,
 * starting from `guessJde`. Newton-style step using the sun's mean daily
 * motion (~0.9856°/day); converges in a handful of iterations.
 */
export function solveSolarLongitude(targetDeg: number, guessJde: number): number {
  let jde = guessJde;
  for (let i = 0; i < 8; i++) {
    const lon = sunApparentLongitude(jde);
    let diff = targetDeg - lon;
    diff = ((diff + 180) % 360 + 360) % 360 - 180; // wrap to (-180, 180]
    if (Math.abs(diff) < 1e-6) break;
    jde += diff / 0.9856;
  }
  return jde;
}

/**
 * The 24 solar terms in order starting at 立春 (315°), which is how BaZi
 * month boundaries are conventionally listed. Index 0,2,4... are the 12
 * "절(節)" terms that define month-pillar boundaries; index 1,3,5... are the
 * "중기(中氣)" terms used to detect leap lunar months.
 */
export const SOLAR_TERM_NAMES = [
  '입춘', '우수', '경칩', '춘분', '청명', '곡우',
  '입하', '소만', '망종', '하지', '소서', '대서',
  '입추', '처서', '백로', '추분', '한로', '상강',
  '입동', '소설', '대설', '동지', '소한', '대한',
] as const;

/** Approximate day-of-year (in a non-leap-aware sense) used to seed the solver for each term. */
const SEED_MONTH_DAY: [number, number][] = [
  [2, 4], [2, 19], [3, 6], [3, 21], [4, 5], [4, 20],
  [5, 6], [5, 21], [6, 6], [6, 21], [7, 7], [7, 23],
  [8, 8], [8, 23], [9, 8], [9, 23], [10, 8], [10, 24],
  [11, 8], [11, 22], [12, 7], [12, 22], [1, 6], [1, 20],
];

import { toJDE } from './julian';

/** JDE of solar term `termIndex` (0=입춘 .. 23=대한) nearest to Gregorian `year`. */
export function solarTermJDE(year: number, termIndex: number): number {
  const [m, d] = SEED_MONTH_DAY[termIndex];
  // 소한/대한 (index 22,23) fall in January of `year+1` relative to the 입춘-anchored year.
  const seedYear = termIndex >= 22 ? year + 1 : year;
  const targetDeg = 315 + termIndex * 15;
  const guess = toJDE({ year: seedYear, month: m, day: d, hour: 0, minute: 0 });
  return solveSolarLongitude(normalizeDegrees(targetDeg), guess);
}

/** All 24 solar-term JDEs for the 立春-anchored solar year `year` (입춘[year] .. 대한[year+1]). */
export function solarTermsForYear(year: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < 24; i++) out.push(solarTermJDE(year, i));
  return out;
}
