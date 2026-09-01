/**
 * Lunisolar (음력) <-> Gregorian conversion, for the 02 screen's 양력/음력
 * toggle. Built from the same primitives real 만세력 tools use: New Moon
 * times (Meeus ch.49 periodic-term series) mark month starts, and the 24
 * solar terms (solar.ts) mark which month is 윤달(leap) — a lunar month is
 * leap when it contains no 중기(中氣) (the odd-indexed terms in
 * SOLAR_TERM_NAMES: 우수·춘분·곡우...).
 *
 * Caveat: the New Moon series below keeps the dominant ~25 periodic terms,
 * good to within a minute or two — enough to always land on the correct
 * calendar day except for the exceedingly rare birth reported at the exact
 * minute of a new moon. A production system should eventually cross-check
 * against an authoritative source (e.g. KASI) for that edge case.
 */
import { normalizeDegrees } from './julian';
import { solarTermJDE, SOLAR_TERM_NAMES } from './solar';
import { CivilDateTime } from './julian';
import { kstToAbsoluteJDE, absoluteJDEtoKST } from './time';

const DEG = Math.PI / 180;

function newMoonJDE(k: number): number {
  const T = k / 1236.85;
  const T2 = T * T, T3 = T2 * T, T4 = T3 * T;
  const JDE0 = 2451550.09766 + 29.530588861 * k + 0.00015437 * T2 - 0.000000150 * T3 + 0.00000000073 * T4;
  const E = 1 - 0.002516 * T - 0.0000074 * T2;
  const M = normalizeDegrees(2.5534 + 29.10535669 * k - 0.0000218 * T2 - 0.00000011 * T3) * DEG;
  const Mp = normalizeDegrees(201.5643 + 385.81693528 * k + 0.0107582 * T2 + 0.00001238 * T3 - 0.000000058 * T4) * DEG;
  const F = normalizeDegrees(160.7108 + 390.67050284 * k - 0.0016118 * T2 - 0.00000227 * T3 + 0.000000011 * T4) * DEG;
  const Omega = normalizeDegrees(124.7746 - 1.56375588 * k + 0.0020672 * T2 + 0.00000215 * T3) * DEG;

  const corr =
    -0.4072 * Math.sin(Mp) +
    0.17241 * E * Math.sin(M) +
    0.01608 * Math.sin(2 * Mp) +
    0.01039 * Math.sin(2 * F) +
    0.00739 * E * Math.sin(Mp - M) -
    0.00514 * E * Math.sin(Mp + M) +
    0.00208 * E * E * Math.sin(2 * M) -
    0.00111 * Math.sin(Mp - 2 * F) -
    0.00057 * Math.sin(Mp + 2 * F) +
    0.00056 * E * Math.sin(2 * Mp + M) -
    0.00042 * Math.sin(3 * Mp) +
    0.00042 * E * Math.sin(M + 2 * F) +
    0.00038 * E * Math.sin(M - 2 * F) -
    0.00024 * E * Math.sin(2 * Mp - M) -
    0.00017 * Math.sin(Omega) -
    0.00007 * Math.sin(Mp + 2 * M) +
    0.00004 * Math.sin(2 * Mp - 2 * F) +
    0.00004 * Math.sin(3 * M) +
    0.00003 * Math.sin(Mp + M - 2 * F) +
    0.00003 * Math.sin(2 * Mp + 2 * F) -
    0.00003 * Math.sin(Mp + M + 2 * F) +
    0.00003 * Math.sin(Mp - M + 2 * F) -
    0.00002 * Math.sin(Mp - M - 2 * F) -
    0.00002 * Math.sin(3 * Mp + M) +
    0.00002 * Math.sin(4 * Mp);

  return JDE0 + corr;
}

function kApprox(jde: number): number {
  return (jde - 2451550.09766) / 29.530588861;
}

/** New moon at or immediately before `jde`. */
function newMoonOnOrBefore(jde: number): { k: number; jde: number } {
  let k = Math.ceil(kApprox(jde));
  let nm = newMoonJDE(k);
  while (nm > jde) {
    k -= 1;
    nm = newMoonJDE(k);
  }
  return { k, jde: nm };
}

interface LunarMonthEntry {
  k: number;
  start: number; // JDE of the new moon that opens this month
  number: number; // 1-12
  isLeap: boolean;
  civilYear: number; // the Gregorian(-ish) lunar year this month is filed under
}

/** Nearest solar term (any of the 24) to `jde`, searched within +-20 days. */
function nearestTermAfter(jde: number, approxGregorianYear: number): { jde: number; index: number } {
  let best: { jde: number; index: number } | null = null;
  for (let y = approxGregorianYear - 1; y <= approxGregorianYear + 1; y++) {
    for (let i = 0; i < 24; i++) {
      const t = solarTermJDE(y, i);
      if (t >= jde && (!best || t < best.jde)) best = { jde: t, index: i };
    }
  }
  return best!;
}

const cache = new Map<number, LunarMonthEntry[]>();

/** Builds the month table spanning 동짓달(prev year) .. 동짓달(year), inclusive/exclusive. */
function buildLunarYear(year: number): LunarMonthEntry[] {
  const cached = cache.get(year);
  if (cached) return cached;

  const ws21 = (y: number) => solarTermJDE(y, 21); // 동지
  const wsPrev = ws21(year - 1);
  const wsCurr = ws21(year);

  const m0 = newMoonOnOrBefore(wsPrev); // month containing previous 동지 -> lunar month 11
  const m1 = newMoonOnOrBefore(wsCurr); // month containing this 동지 -> lunar month 11 of `year`

  const monthCount = m1.k - m0.k; // 12 (normal) or 13 (one leap month this year)
  const starts: { k: number; start: number }[] = [];
  for (let i = 0; i <= monthCount; i++) {
    starts.push({ k: m0.k + i, start: newMoonJDE(m0.k + i) });
  }

  // A month [starts[i].start, starts[i+1].start) is leap iff it contains no 중기 (odd term index).
  const leapSlot = (() => {
    if (monthCount === 12) return -1;
    for (let i = 0; i < monthCount; i++) {
      const term = nearestTermAfter(starts[i].start, year);
      const isZhongqi = term.index % 2 === 1;
      const withinMonth = term.jde < starts[i + 1].start;
      if (!(isZhongqi && withinMonth)) {
        // No zhongqi lands inside this month at all -> leap month.
        // (nearestTermAfter always returns *a* term; check it truly falls before next month start.)
        let hasZhongqiInside = false;
        for (let y = year - 1; y <= year + 1 && !hasZhongqiInside; y++) {
          for (let idx = 1; idx < 24; idx += 2) {
            const t = solarTermJDE(y, idx);
            if (t >= starts[i].start && t < starts[i + 1].start) hasZhongqiInside = true;
          }
        }
        if (!hasZhongqiInside) return i;
      }
    }
    return -1;
  })();

  const entries: LunarMonthEntry[] = [];
  let num = 11;
  let civilYear = year - 1;
  for (let i = 0; i <= monthCount; i++) {
    const isLeap = i === leapSlot;
    entries.push({ k: starts[i].k, start: starts[i].start, number: num, isLeap, civilYear });
    if (!isLeap) {
      num += 1;
      if (num === 13) {
        // Month 12 (섣달) still belongs to `year - 1`; the wrap to month 1 (정월) is what starts `year`.
        num = 1;
        civilYear = year;
      }
    }
  }

  cache.set(year, entries);
  return entries;
}

export interface LunarDate {
  year: number;
  month: number;
  day: number;
  isLeapMonth: boolean;
}

/** Converts a KST lunar civil date+time to its Gregorian (solar) KST equivalent. */
export function lunarToSolarKST(lunar: LunarDate, hour: number, minute: number): CivilDateTime {
  const table = buildLunarYear(lunar.year);
  const entry =
    table.find((e) => e.number === lunar.month && e.isLeap === lunar.isLeapMonth && e.civilYear === lunar.year) ??
    table.find((e) => e.number === lunar.month && e.isLeap === lunar.isLeapMonth);
  if (!entry) throw new Error(`음력 ${lunar.year}년 ${lunar.isLeapMonth ? '윤' : ''}${lunar.month}월을 찾을 수 없습니다.`);
  const dayJDE = entry.start + (lunar.day - 1);
  const civilAtNoonUTC = absoluteJDEtoKST(dayJDE);
  return { year: civilAtNoonUTC.year, month: civilAtNoonUTC.month, day: civilAtNoonUTC.day, hour, minute };
}

/** Converts a Gregorian KST civil date+time to its lunar (음력) equivalent. */
export function solarToLunarKST(civil: CivilDateTime): LunarDate {
  const jde = kstToAbsoluteJDE({ ...civil, hour: 12, minute: 0 });
  const table = buildLunarYear(civil.year + 1).concat(buildLunarYear(civil.year), buildLunarYear(civil.year - 1));
  let match: LunarMonthEntry | null = null;
  for (const e of table) {
    if (e.start <= jde) {
      if (!match || e.start > match.start) match = e;
    }
  }
  if (!match) throw new Error('음력 변환 실패');
  const day = Math.round(jde - match.start) + 1;
  return { year: match.civilYear, month: match.number, day, isLeapMonth: match.isLeap };
}

export { SOLAR_TERM_NAMES };
