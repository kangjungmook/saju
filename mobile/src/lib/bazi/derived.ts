import { Chart, DayScore, Element, GanZhi, TenGodName } from '../../types/domain';
import { GAN_ELEMENT, HANGAN, ZHI_ELEMENT, ganIndexOf, relateElements, yearPillar, zhiIndexOf } from './ganzhi';
import { kstToAbsoluteJDE } from './time';

const RELATION_WEIGHT: Record<ReturnType<typeof relateElements>, number> = {
  producedBy: 13,
  same: 7,
  produces: 3,
  controls: 9,
  controlledBy: -10,
};

function seededUnit(key: string): number {
  let h = 1779033703 ^ key.length;
  for (let i = 0; i < key.length; i++) {
    h = Math.imul(h ^ key.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

function scoreForPillar(chart: Chart, gz: GanZhi, seedKey: string): number {
  const dayMasterElement = GAN_ELEMENT[ganIndexOf(chart.dayMaster)];
  const rel = relateElements(gz.element, dayMasterElement);
  const scarcity = 1 - (chart.elements[gz.element] ?? 0) / 100;
  const magnitude = RELATION_WEIGHT[rel] * (0.6 + 0.8 * scarcity);
  const texture = (seededUnit(seedKey) - 0.5) * 10;
  return Math.max(0, Math.min(100, Math.round(50 + magnitude + texture)));
}

/** 세운 — one point per calendar year (입춘-anchored), reusing the day-score relation model at year granularity. */
export function computeSeunSeries(chart: Chart, centerYear: number, span = 13): { year: number; score: number }[] {
  const half = Math.floor(span / 2);
  return Array.from({ length: span }, (_, i) => {
    const year = centerYear - half + i;
    const sample = { year, month: 7, day: 1, hour: 0, minute: 0 }; // mid-year sample within that 입춘-year
    const { pillar } = yearPillar(sample, kstToAbsoluteJDE(sample));
    return { year, score: scoreForPillar(chart, pillar, `${chart.id}:seun:${year}`) };
  });
}

/** 대운 — one point per luck cycle already computed on the Chart (real 60-year cycles, not a fixture). */
export function computeDaeunSeries(chart: Chart): { startAge: number; endAge: number; score: number }[] {
  return chart.luckCycles.map((c) => ({
    startAge: c.startAge,
    endAge: c.endAge,
    score: scoreForPillar(chart, c.pillar, `${chart.id}:daeun:${c.index}`),
  }));
}

type Facet = '재물' | '관계' | '컨디션' | '일·학업';
const TEN_GOD_FACET: Record<TenGodName, Facet | null> = {
  편재: '재물', 정재: '재물',
  비견: '관계', 겁재: '관계', 정관: '관계', 편관: '관계',
  식신: '일·학업', 상관: '일·학업', 편인: '일·학업', 정인: '일·학업',
};

export function computeFacets(chart: Chart, day: DayScore): { name: Facet; value: number }[] {
  const facets: Facet[] = ['재물', '관계', '컨디션', '일·학업'];
  return facets.map((name) => {
    if (name === '컨디션') return { name, value: day.adjusted };
    const hits = chart.tenGods.filter((t) => TEN_GOD_FACET[t.name] === name).length;
    return { name, value: Math.max(5, Math.min(98, day.adjusted + hits * 6 - 6)) };
  });
}

const NUMBER_BY_ELEMENT: Record<Element, [number, number]> = {
  木: [3, 8], 火: [2, 7], 土: [5, 10], 金: [4, 9], 水: [1, 6],
};
const COLOR_BY_ELEMENT: Record<Element, { name: string; oklch: string }> = {
  木: { name: '청록', oklch: 'oklch(0.62 0.10 165)' },
  火: { name: '다홍', oklch: 'oklch(0.64 0.14 32)' },
  土: { name: '담황', oklch: 'oklch(0.82 0.08 85)' },
  金: { name: '백자', oklch: 'oklch(0.93 0.012 265)' },
  水: { name: '먹빛', oklch: 'oklch(0.40 0.03 260)' },
};
const DIRECTION_BY_ELEMENT: Record<Element, { name: string; deg: number }> = {
  木: { name: '동', deg: 90 },
  火: { name: '남', deg: 180 },
  金: { name: '서', deg: 270 },
  水: { name: '북', deg: 0 },
  土: { name: '중앙', deg: 45 },
};
const FOOD_BY_ELEMENT: Record<Element, { name: string; emoji: string }> = {
  木: { name: '푸른 채소', emoji: '🥬' },
  火: { name: '매콤한 음식', emoji: '🌶️' },
  土: { name: '곡물·단호박', emoji: '🌾' },
  金: { name: '흰쌀·두부', emoji: '🥣' },
  水: { name: '해산물·국물', emoji: '🍲' },
};

export interface LuckyItems {
  number: number;
  color: { name: string; oklch: string };
  direction: { name: string; deg: number };
  food: { name: string; emoji: string };
}

/** Traditional element associations (河圖 lucky numbers, 오방색, 오행 방위) keyed off the day pillar's branch element. */
export function computeLuckyItems(dayGZ: GanZhi, dayGanIdx: number): LuckyItems {
  const zEl = ZHI_ELEMENT[zhiIndexOf(dayGZ.zhi)];
  const [lo, hi] = NUMBER_BY_ELEMENT[zEl];
  const isYang = dayGanIdx % 2 === 0;
  return {
    number: isYang ? lo : hi,
    color: COLOR_BY_ELEMENT[zEl],
    direction: DIRECTION_BY_ELEMENT[zEl],
    food: FOOD_BY_ELEMENT[zEl],
  };
}

const REMEDY: [string, string][] = [
  ['말이 앞서기 쉬운 날이에요. 확답은 내일로 미뤄두세요.', '자기 전 5분, 오늘 한 말 중 하나만 되짚어 보면 마음이 정리돼요.'],
  ['작은 지출이 새기 쉬워요. 충동구매는 하루만 재워두세요.', '아침에 지갑을 한 번 정리하고 나가면 씀씀이가 저절로 잡혀요.'],
  ['무던한 날이지만 피로가 조용히 쌓여요.', '점심 뒤 10분만 밖을 걸으면 오후 흐름이 훨씬 가벼워져요.'],
  ['들뜬 마음에 약속을 과하게 잡기 쉬워요.', '나가기 전 물 한 잔 마시고 나가면 페이스가 차분해져요.'],
  ['좋은 날일수록 남의 몫을 잊기 쉬워요.', '고마운 사람 한 명에게 짧은 메시지를 보내면 기운이 더 오래가요.'],
];
export function remedyForBand(band: 1 | 2 | 3 | 4 | 5): { caution: string; ritual: string } {
  const [caution, ritual] = REMEDY[band - 1];
  return { caution, ritual };
}

// --- Screen 05 (내 사주 · 원국 풀이) ------------------------------------

export const ELEMENT_INFO: Record<Element, { reading: string; noun: string; nounParticle: string; readingParticle: '이' | '가' }> = {
  木: { reading: '목', noun: '나무', nounParticle: '를', readingParticle: '이' },
  火: { reading: '화', noun: '불', nounParticle: '을', readingParticle: '가' },
  土: { reading: '토', noun: '흙', nounParticle: '을', readingParticle: '가' },
  金: { reading: '금', noun: '쇠', nounParticle: '를', readingParticle: '이' },
  水: { reading: '수', noun: '물', nounParticle: '을', readingParticle: '가' },
};

/** "나무를 닮은 사주 / 갑목(甲木) 일간" — built from the real day master, not a fixture. */
export function dayMasterHeadline(chart: Chart): { line1: string; line2: string } {
  const dmIdx = ganIndexOf(chart.dayMaster);
  const el = GAN_ELEMENT[dmIdx];
  const info = ELEMENT_INFO[el];
  return {
    line1: `${info.noun}${info.nounParticle} 닮은 사주`,
    line2: `${chart.dayMaster}${info.reading}(${HANGAN[dmIdx]}${el}) 일간`,
  };
}

/** One line naming the chart's most- and least-represented elements. */
export function elementDistributionSummary(elements: Record<Element, number>): string {
  const entries = Object.entries(elements) as [Element, number][];
  const [highEl] = entries.reduce((a, b) => (b[1] > a[1] ? b : a));
  const [lowEl] = entries.reduce((a, b) => (b[1] < a[1] ? b : a));
  const high = ELEMENT_INFO[highEl];
  const low = ELEMENT_INFO[lowEl];
  return `${high.reading}(${highEl})${high.readingParticle} 도드라지고 ${low.reading}(${lowEl})${low.readingParticle} 옅은 구성이에요.`;
}

const STRENGTH_LABELS = ['신약', '약간 신약', '중화', '약간 신강', '신강'] as const;

/**
 * 일간 강약 — how supported vs. drained the day master is by the chart's other
 * seven characters. Each of the other stems/branches either reinforces (같은
 * 오행 or 일간을 생하는 오행) or drains (일간이 생/극하거나, 일간을 극하는 오행);
 * the balance maps to 0–100 with 50 = 중화.
 */
export function dayMasterStrength(chart: Chart): { percent: number; label: (typeof STRENGTH_LABELS)[number] } {
  const dmEl = GAN_ELEMENT[ganIndexOf(chart.dayMaster)];
  const others: GanZhi[] = [chart.pillars.year, chart.pillars.month, chart.pillars.hour].filter(
    (p): p is GanZhi => p !== null,
  );
  const branchElements = [chart.pillars.year, chart.pillars.month, chart.pillars.day, chart.pillars.hour]
    .filter((p): p is GanZhi => p !== null)
    .map((p) => ZHI_ELEMENT[zhiIndexOf(p.zhi)]);

  let score = 0;
  let count = 0;
  const tally = (el: Element) => {
    const rel = relateElements(el, dmEl);
    score += rel === 'same' || rel === 'producedBy' ? 1 : -1;
    count += 1;
  };
  others.forEach((p) => tally(p.element));
  branchElements.forEach(tally);

  const percent = Math.round(50 + (score / Math.max(1, count)) * 50);
  const clamped = Math.max(2, Math.min(98, percent));
  const idx = clamped < 30 ? 0 : clamped < 45 ? 1 : clamped <= 55 ? 2 : clamped <= 70 ? 3 : 4;
  return { percent: clamped, label: STRENGTH_LABELS[idx] };
}

const CALENDAR_LABEL = { solar: '양력', lunar: '음력' } as const;

/** "1997년 3월 21일 묘시생 · 양력" */
export function birthCaption(chart: Chart): string {
  const [y, m, d] = chart.birth.date.split('-').map(Number);
  const hourPart = chart.hasHour && chart.pillars.hour ? `${chart.pillars.hour.zhi}시생 · ` : '시간 미상 · ';
  return `${y}년 ${m}월 ${d}일 ${hourPart}${CALENDAR_LABEL[chart.birth.calendar]}`;
}
