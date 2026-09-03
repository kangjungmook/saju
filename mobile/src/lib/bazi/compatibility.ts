import { Chart } from '../../types/domain';
import { computeChart, BirthInput } from './index';
import { computeDayScore } from './dayScore';
import { GAN_ELEMENT, ganIndexOf, relateElements } from './ganzhi';
import { ELEMENT_INFO, dayMasterStrength } from './derived';

const RELATION_WEIGHT = { producedBy: 13, same: 7, produces: 3, controls: 9, controlledBy: -10 } as const;

/** Builds a throwaway Chart for a Relation's birth info, purely to compare against the owner's chart. */
export function computeCounterpartChart(relationId: string, birth: BirthInput): Chart {
  return computeChart('counterpart', relationId, birth);
}

/**
 * How good one date is for the two of them together. 11 궁합 uses it for its
 * 잘 맞는 날 list and 03 홈 for the "…님과 맞는 날" row; they read different
 * date windows but must not read different formulas (handoff, note for 26:
 * a second copy of a shared formula is how two screens start disagreeing).
 */
export function sharedDayScore(me: Chart, other: Chart, date: string): number {
  const a = computeDayScore(me, date).raw;
  const b = computeDayScore(other, date).raw;
  return Math.round((a + b) / 2);
}

export interface CompatibilityResult {
  total: number;
  breakdown: { label: string; value: number }[];
  headline: string;
  goodDays: { date: string; score: number }[];
}

function relationHeadline(elA: string, elB: string, rel: ReturnType<typeof relateElements>): string {
  const a = ELEMENT_INFO[elA as keyof typeof ELEMENT_INFO];
  const b = ELEMENT_INFO[elB as keyof typeof ELEMENT_INFO];
  if (rel === 'same') return `같은 결을 가진 사이`;
  if (rel === 'produces') return `${a.noun}${a.nounParticle} ${b.noun}${b.nounParticle} 밀어주는 결`;
  if (rel === 'producedBy') return `${b.noun}${b.nounParticle} ${a.noun}${a.nounParticle} 밀어주는 결`;
  return `서로 다른 속도가 부딪히며 다듬어지는 결`;
}

export function computeCompatibility(me: Chart, other: Chart): CompatibilityResult {
  const meDmEl = GAN_ELEMENT[ganIndexOf(me.dayMaster)];
  const otherDmEl = GAN_ELEMENT[ganIndexOf(other.dayMaster)];
  const rel = relateElements(meDmEl, otherDmEl);

  const harmony = Math.max(5, Math.min(98, Math.round(50 + RELATION_WEIGHT[rel] * 3)));

  const sharedTenGods = me.tenGods.filter((t) => other.tenGods.some((o) => o.name === t.name)).length;
  const conversation = Math.max(10, Math.min(96, 50 + sharedTenGods * 12));

  const wealthNames = new Set(['편재', '정재']);
  const meHasWealth = me.tenGods.some((t) => wealthNames.has(t.name));
  const otherHasWealth = other.tenGods.some((t) => wealthNames.has(t.name));
  const money = meHasWealth === otherHasWealth ? 74 : 42;

  const breakdown = [
    { label: '오행 상생', value: harmony },
    { label: '대화의 결', value: conversation },
    { label: '돈 쓰는 방식', value: money },
  ];

  // handoff §4 note for 11·19: without the counterpart's birth hour, drop 결정 속도 rather than fake it.
  if (me.hasHour && other.hasHour) {
    const strengthDiff = Math.abs(dayMasterStrength(me).percent - dayMasterStrength(other).percent);
    breakdown.push({ label: '결정 속도', value: Math.max(8, Math.min(96, 100 - strengthDiff)) });
  }

  const total = Math.round(breakdown.reduce((a, b) => a + b.value, 0) / breakdown.length);

  const today = new Date();
  const candidates = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const goodDays = candidates
    .map((date) => ({ date, score: sharedDayScore(me, other, date) }))
    .sort((x, y) => y.score - x.score)
    .slice(0, 3)
    .sort((x, y) => (x.date < y.date ? -1 : 1));

  return { total, breakdown, headline: relationHeadline(meDmEl, otherDmEl, rel), goodDays };
}
