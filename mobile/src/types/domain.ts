/**
 * Core data model — ported 1:1 from 개발 핸드오프.dc.html §2 (데이터 모델).
 * Personal-identity data (birth info) and derived calculation results are
 * kept in separate entities so account deletion only has to remove the
 * profile, per the handoff's storage rule.
 */

export type Gan = '갑' | '을' | '병' | '정' | '무' | '기' | '경' | '신' | '임' | '계';
export type Zhi = '자' | '축' | '인' | '묘' | '진' | '사' | '오' | '미' | '신' | '유' | '술' | '해';
export type Element = '木' | '火' | '土' | '金' | '水';
export type TenGodName =
  | '비견' | '겁재' | '식신' | '상관' | '편재' | '정재' | '편관' | '정관' | '편인' | '정인';

export interface GanZhi {
  gan: Gan;
  zhi: Zhi;
  element: Element;
}

export interface TenGod {
  name: TenGodName;
  pillar: 'year' | 'month' | 'hour';
  summary: string;
}

export interface LuckCycle {
  /** Ordinal 0..5, ~10 years each, spanning the 60-year luckCycles window. */
  index: number;
  startAge: number;
  endAge: number;
  pillar: GanZhi;
}

export interface Chart {
  id: string;
  userId: string;
  birth: {
    date: string; // YYYY-MM-DD
    time: string | null; // HH:mm, null when hasHour is false
    calendar: 'solar' | 'lunar';
    region: string;
    utcOffsetMin: number;
    trueSolarAdjMin: number; // e.g. Seoul −32
  };
  gender: 'female' | 'male';
  hasHour: boolean;
  pillars: {
    year: GanZhi;
    month: GanZhi;
    day: GanZhi;
    hour: GanZhi | null;
  };
  dayMaster: Gan;
  elements: Record<Element, number>; // sums to 100
  tenGods: TenGod[];
  luckCycles: LuckCycle[]; // 60 years, computed once, stored permanently
  luckDirection: 'forward' | 'backward';
  engineVersion: string;
}

export interface DayScore {
  chartId: string;
  date: string; // YYYY-MM-DD, midnight-anchored
  ganZhi: GanZhi; // day pillar for that date (일진)
  raw: number; // 0-100 integer, unadjusted
  adjusted: number; // calibration-adjusted; equals raw when calibration is off
  band: 1 | 2 | 3 | 4 | 5; // derived display band, not part of the formula
  reason: string; // one-line rationale; never render a score without it
  bestHours: Zhi[];
  scoreVersion: string;
}

export interface DayLog {
  chartId: string;
  date: string;
  felt: 1 | 2 | 3 | 4 | 5;
  note: string;
  tags: string[];
  predictedRaw: number; // score at the moment of logging, frozen
}

export interface Calibration {
  chartId: string;
  byElement: Record<Element, number>; // -20..+20
  strength: 0 | 0.5 | 1; // raw / blended / felt-first
  enabled: boolean;
  sampleSize: number;
  updatedAt: string;
}

export interface Relation {
  id: string;
  ownerId: string;
  name: string;
  kind: 'partner' | 'family' | 'colleague' | 'friend';
  birth: Chart['birth'];
  hasHour: boolean;
  compatibility: { total: number; breakdown: Record<string, number> } | null;
}

export interface Qna {
  id: string;
  chartId: string;
  question: string;
  answer: string;
  context: { pillars: Chart['pillars']; dayScore: DayScore };
  linkedDate: string | null;
  saved: boolean;
  createdAt: string;
}
