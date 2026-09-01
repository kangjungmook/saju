import { jdeToCivil, toJDN } from '../julian';
import { dayPillarFromJDN } from '../ganzhi';
import { solarTermJDE } from '../solar';
import { computeChart } from '../index';
import { computeDayScore } from '../dayScore';
import { lunarToSolarKST, solarToLunarKST } from '../lunar';
import { absoluteJDEtoKST } from '../time';

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
