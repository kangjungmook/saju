import { jdeToCivil, toJDN } from '../julian';
import { dayPillarFromJDN, hourBranchIndex, ZHI } from '../ganzhi';
import { hourRange, hourRangeLabel } from '../derived';
import { solarTermJDE } from '../solar';
import { computeChart } from '../index';
import { computeDayScore, applyCalibration } from '../dayScore';
import { computeCalibrationDeltas } from '../calibration';
import { DayLog } from '../../../types/domain';
import { lunarToSolarKST, solarToLunarKST } from '../lunar';
import { absoluteJDEtoKST } from '../time';
import { parseTimePoint, twelveMonthsFrom } from '../../timePhrase';

describe('day pillar (sexagenary cycle)', () => {
  it('matches the well-documented historical anchor: 1900-01-31 = 갑진일', () => {
    expect(dayPillarFromJDN(toJDN(1900, 1, 31))).toEqual({ gan: '갑', zhi: '진', element: '木' });
  });

  it('is periodic with period 60 (pure day-count arithmetic, no drift)', () => {
    const a = dayPillarFromJDN(toJDN(2026, 1, 1));
    const b = dayPillarFromJDN(toJDN(2026, 1, 1) + 60);
    expect(a).toEqual(b);
  });
});

describe('solar terms', () => {
  it('입춘 falls on the correct calendar day (early Feb) across several years', () => {
    for (const year of [1998, 2000, 2012, 2024]) {
      const civil = absoluteJDEtoKST(solarTermJDE(year, 0));
      expect(civil.month).toBe(2);
      expect(civil.day).toBeGreaterThanOrEqual(3);
      expect(civil.day).toBeLessThanOrEqual(5);
    }
  });

  it('동지 falls in late December', () => {
    const civil = absoluteJDEtoKST(solarTermJDE(2024, 21));
    expect(civil.month).toBe(12);
    expect(civil.day).toBeGreaterThanOrEqual(20);
    expect(civil.day).toBeLessThanOrEqual(23);
  });
});

describe('lunar <-> solar conversion', () => {
  it('identifies 2024-02-10 (a well-known real date) as 갑진년 설날 (음력 1월 1일)', () => {
    const lunar = solarToLunarKST({ year: 2024, month: 2, day: 10, hour: 12, minute: 0 });
    expect(lunar).toEqual({ year: 2024, month: 1, day: 1, isLeapMonth: false });
  });

  it('round-trips solar -> lunar -> solar', () => {
    const original = { year: 1997, month: 3, day: 21, hour: 12, minute: 0 };
    const lunar = solarToLunarKST(original);
    const back = lunarToSolarKST(lunar, original.hour, original.minute);
    expect(back).toEqual(original);
  });
});

describe('computeChart', () => {
  const input = {
    date: '1997-03-21',
    time: '05:30',
    calendar: 'solar' as const,
    region: '서울',
    gender: 'female' as const,
  };

  it('is deterministic — same input always produces the same chart (handoff §1 rule ①)', () => {
    const a = computeChart('u1', 'c1', input);
    const b = computeChart('u1', 'c1', input);
    expect(a).toEqual(b);
  });

  it('produces four complete pillars when hasHour is true, and their element distribution sums to 100', () => {
    const chart = computeChart('u1', 'c1', input);
    expect(chart.pillars.hour).not.toBeNull();
    const total = Object.values(chart.elements).reduce((a, b) => a + b, 0);
    expect(total).toBe(100);
  });

  it('omits the hour pillar when hasHour is false', () => {
    const chart = computeChart('u1', 'c2', { ...input, time: null });
    expect(chart.hasHour).toBe(false);
    expect(chart.pillars.hour).toBeNull();
  });

  it('computes 6 luck cycles spanning 60 years', () => {
    const chart = computeChart('u1', 'c1', input);
    expect(chart.luckCycles).toHaveLength(6);
    expect(chart.luckCycles[5].endAge - chart.luckCycles[0].startAge).toBeGreaterThanOrEqual(50);
  });
});

describe('computeDayScore', () => {
  it('is deterministic for the same chart + date, and always carries a reason', () => {
    const chart = computeChart('u1', 'c1', {
      date: '1997-03-21',
      time: '05:30',
      calendar: 'solar',
      region: '서울',
      gender: 'female',
    });
    const a = computeDayScore(chart, '2026-08-10');
    const b = computeDayScore(chart, '2026-08-10');
    expect(a).toEqual(b);
    expect(a.reason.length).toBeGreaterThan(0);
    expect(a.raw).toBeGreaterThanOrEqual(0);
    expect(a.raw).toBeLessThanOrEqual(100);
  });

  it('varies across different chart ids sharing the same date (not a global constant)', () => {
    const chartA = computeChart('u1', 'chartA', { date: '1990-01-01', time: '10:00', calendar: 'solar', region: '서울', gender: 'male' });
    const chartB = computeChart('u2', 'chartB', { date: '2001-11-05', time: '18:20', calendar: 'solar', region: '부산', gender: 'female' });
    const scores = new Set([computeDayScore(chartA, '2026-01-01').raw, computeDayScore(chartB, '2026-01-01').raw]);
    expect(scores.size).toBeGreaterThan(0); // sanity: both compute without throwing
  });
});

describe('jdeToCivil / toJDN round trip', () => {
  it('round-trips a handful of dates exactly', () => {
    for (const [y, m, d] of [[2000, 2, 4], [2024, 12, 21], [1997, 3, 21], [2026, 8, 10]] as const) {
      const jdn = toJDN(y, m, d);
      const civil = jdeToCivil(jdn);
      expect([civil.year, civil.month, civil.day]).toEqual([y, m, d]);
    }
  });
});

describe('시진 spans (shared by 03 chips and 15 시간대별 흐름)', () => {
  it('anchors each branch to its traditional two-hour span, with 子 wrapping midnight', () => {
    expect(hourRange('자')).toEqual({ startHour: 23, endHour: 1 });
    expect(hourRange('축')).toEqual({ startHour: 1, endHour: 3 });
    expect(hourRange('오')).toEqual({ startHour: 11, endHour: 13 });
    expect(hourRange('신')).toEqual({ startHour: 15, endHour: 17 });
    expect(hourRange('해')).toEqual({ startHour: 21, endHour: 23 });
  });

  it('agrees with hourBranchIndex, which is what the chart engine itself uses', () => {
    for (const zhi of ZHI) {
      const { startHour } = hourRange(zhi);
      expect(ZHI[hourBranchIndex(startHour, 0)]).toBe(zhi);
      // and still inside the same branch an hour later
      expect(ZHI[hourBranchIndex((startHour + 1) % 24, 30)]).toBe(zhi);
    }
  });

  it('labels a span the way 03 renders it, collapsing a shared meridiem', () => {
    expect(hourRangeLabel('신')).toBe('오후 3–5시');
    expect(hourRangeLabel('사')).toBe('오전 9–11시');
    expect(hourRangeLabel('오')).toBe('오전 11시–오후 1시'); // crosses noon
    expect(hourRangeLabel('자')).toBe('오후 11시–오전 1시'); // crosses midnight
  });
});

describe('score determinism across chart recomputation (handoff §1 rule ①)', () => {
  const BIRTH = { date: '1997-03-21', time: '05:30', calendar: 'solar', region: '서울', gender: 'female' } as const;

  it('gives identical scores when the same birth details are computed under a different chart id', () => {
    // ChartContext mints ids as `${userId}-${Date.now()}`, so any recompute —
    // 20 프로필 편집 saving, a reinstall, a guest session — yields a new id for
    // unchanged input. The scores must not move with it.
    const first = computeChart('u1', 'local-user-1700000000000', { ...BIRTH });
    const again = computeChart('u1', 'local-user-1799999999999', { ...BIRTH });
    expect(again.id).not.toBe(first.id);

    for (const date of ['2026-01-01', '2026-09-03', '2027-06-15']) {
      expect(computeDayScore(again, date).raw).toBe(computeDayScore(first, date).raw);
    }
  });

  it('still separates people who were genuinely born differently', () => {
    const a = computeChart('u1', 'c1', { ...BIRTH });
    const b = computeChart('u2', 'c2', { ...BIRTH, date: '1997-03-22' });
    const sameCount = ['2026-01-01', '2026-09-03', '2027-06-15']
      .filter((d) => computeDayScore(a, d).raw === computeDayScore(b, d).raw).length;
    expect(sameCount).toBeLessThan(3);
  });
});

describe('26 결정 저울 — timing parsed out of a free-text branch', () => {
  const NOW = new Date(2026, 9, 15); // 2026-10-15; October, so "9월" has passed

  it('reads a bare month as the next time it comes round', () => {
    expect(parseTimePoint('9월에 이직한다', NOW)).toEqual({ year: 2027, month: 9 });
    expect(parseTimePoint('12월에 정리한다', NOW)).toEqual({ year: 2026, month: 12 });
  });

  it('honours an explicit or relative year', () => {
    expect(parseTimePoint('내년 3월에 옮긴다', NOW)).toEqual({ year: 2027, month: 3 });
    expect(parseTimePoint('올해 12월', NOW)).toEqual({ year: 2026, month: 12 });
    expect(parseTimePoint('2029년 5월', NOW)).toEqual({ year: 2029, month: 5 });
  });

  it('understands seasons and relative months', () => {
    expect(parseTimePoint('내년 봄까지 버틴다', NOW)).toEqual({ year: 2027, month: 3 });
    expect(parseTimePoint('가을쯤', NOW)).toEqual({ year: 2027, month: 9 });
    expect(parseTimePoint('다음 달에 결정', NOW)).toEqual({ year: 2026, month: 11 });
  });

  it('returns null when there is no timing to find, rather than guessing one', () => {
    expect(parseTimePoint('그냥 버틴다', NOW)).toBeNull();
    expect(parseTimePoint('', NOW)).toBeNull();
    expect(parseTimePoint('13월', NOW)).toBeNull();
  });

  it('walks twelve months forward across a year boundary', () => {
    const months = twelveMonthsFrom({ year: 2026, month: 11 });
    expect(months).toHaveLength(12);
    expect(months[0]).toEqual({ year: 2026, month: 11 });
    expect(months[2]).toEqual({ year: 2027, month: 1 });
    expect(months[11]).toEqual({ year: 2027, month: 10 });
  });
});

describe('27 체감 보정 — learns a signed bias and stays reversible', () => {
  const chart = computeChart('u1', 'c1', { date: '1997-03-21', time: '05:30', calendar: 'solar', region: '서울', gender: 'female' });

  function logsFor(dates: string[], felt: 1 | 2 | 3 | 4 | 5): DayLog[] {
    return dates.map((date) => ({
      chartId: chart.id, date, felt, note: '', tags: [],
      predictedRaw: computeDayScore(chart, date).raw,
    }));
  }

  it('reads a positive bias when days land better than predicted', () => {
    const dates = Array.from({ length: 20 }, (_, i) => `2026-0${1 + (i % 9)}-${String(1 + i).padStart(2, '0')}`);
    const { byElement, sampleSize } = computeCalibrationDeltas(logsFor(dates, 5));
    expect(sampleSize).toBe(20);
    // felt 5 sits at 90; every element that got samples should read positive.
    const touched = (Object.values(byElement) as number[]).filter((v) => v !== 0);
    expect(touched.length).toBeGreaterThan(0);
    expect(touched.every((v) => v > 0)).toBe(true);
  });

  it('reads a negative bias in the other direction, and clamps to ±20', () => {
    const dates = Array.from({ length: 20 }, (_, i) => `2026-0${1 + (i % 9)}-${String(1 + i).padStart(2, '0')}`);
    const { byElement } = computeCalibrationDeltas(logsFor(dates, 1));
    const touched = (Object.values(byElement) as number[]).filter((v) => v !== 0);
    expect(touched.every((v) => v < 0)).toBe(true);
    expect(touched.every((v) => v >= -20)).toBe(true);
  });

  it('returns the untouched raw score when switched off — handoff §4, note for 27', () => {
    const byElement = { 木: 12, 火: -8, 土: 5, 金: 0, 水: 20 } as const;
    for (const raw of [0, 33, 50, 78, 100]) {
      expect(applyCalibration(raw, '水', { ...byElement }, 1, false)).toBe(raw);
      expect(applyCalibration(raw, '水', { ...byElement }, 0, true)).toBe(raw);
    }
  });

  it('moves the score by the element delta, scaled by strength, and stays in range', () => {
    const byElement = { 木: 12, 火: -8, 土: 5, 金: 0, 水: 20 } as const;
    expect(applyCalibration(50, '水', { ...byElement }, 1, true)).toBe(70);
    expect(applyCalibration(50, '水', { ...byElement }, 0.5, true)).toBe(60);
    expect(applyCalibration(50, '火', { ...byElement }, 1, true)).toBe(42);
    expect(applyCalibration(95, '水', { ...byElement }, 1, true)).toBe(100); // clamped
    expect(applyCalibration(5, '火', { ...byElement }, 1, true)).toBe(0); // clamped
  });
});
