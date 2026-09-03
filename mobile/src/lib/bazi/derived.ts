import { Chart, DayScore, Element, GanZhi, TenGodName, Zhi } from '../../types/domain';
import { GAN_ELEMENT, HANGAN, HANZHI, ZHI_ELEMENT, ganIndexOf, monthPillar, relateElements, yearPillar, zhiIndexOf } from './ganzhi';
import { kstToAbsoluteJDE } from './time';
import { computeDayScore, chartSeed } from './dayScore';

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

/**
 * 세운·대운·월 scores share the day model's shape. They also share its seed:
 * these used to hang off `chart.id` even after `computeDayScore` moved to the
 * birth details, so the same person on a second device would see matching day
 * scores but different year and month ones.
 */
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
    return { year, score: scoreForPillar(chart, pillar, `${chartSeed(chart)}:seun:${year}`) };
  });
}

/** 대운 — one point per luck cycle already computed on the Chart (real 60-year cycles, not a fixture). */
export function computeDaeunSeries(chart: Chart): { startAge: number; endAge: number; score: number }[] {
  return chart.luckCycles.map((c) => ({
    startAge: c.startAge,
    endAge: c.endAge,
    score: scoreForPillar(chart, c.pillar, `${chartSeed(chart)}:daeun:${c.index}`),
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
// `hanja` is the 오방색 character, which is what 03's chip shows next to the name.
// `hex` is the swatch fill: these were oklch() strings, which only ever resolved
// because the app had so far only been run on web — React Native's own color
// parser has no oklch(), so the 04 상세 swatch was broken on iOS/Android.
const COLOR_BY_ELEMENT: Record<Element, { name: string; hanja: string; hex: string }> = {
  木: { name: '청록', hanja: '靑', hex: '#419977' }, // oklch(0.62 0.10 165)
  火: { name: '다홍', hanja: '赤', hex: '#D36854' }, // oklch(0.64 0.14 32)
  土: { name: '담황', hanja: '黃', hex: '#DCC188' }, // oklch(0.82 0.08 85)
  金: { name: '백자', hanja: '白', hex: '#E4E8F0' }, // oklch(0.93 0.012 265)
  水: { name: '먹빛', hanja: '黑', hex: '#3E4858' }, // oklch(0.40 0.03 260)
};
// `label` is spelled out rather than built as `${name}쪽`, which would produce
// "중앙쪽" for 土.
const DIRECTION_BY_ELEMENT: Record<Element, { name: string; hanja: string; label: string; deg: number }> = {
  木: { name: '동', hanja: '東', label: '동쪽', deg: 90 },
  火: { name: '남', hanja: '南', label: '남쪽', deg: 180 },
  金: { name: '서', hanja: '西', label: '서쪽', deg: 270 },
  水: { name: '북', hanja: '北', label: '북쪽', deg: 0 },
  土: { name: '중앙', hanja: '中', label: '중앙', deg: 45 },
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
  color: { name: string; hanja: string; hex: string };
  direction: { name: string; hanja: string; label: string; deg: number };
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

/**
 * 23 연간 뷰's month tiles. Scored from the calendar month's actual 절기-based
 * 월주 (month pillar) relative to the day master — the same mechanism 세운/대운
 * use — rather than averaging each day's score: a day-score average over any
 * ~30-day window washes out almost all variation, since the day-stem (10-day)
 * and day-branch (12-day) cycles both spread evenly across a month regardless
 * of which month it is. The month pillar is what actually differs month to
 * month, so scoring it directly is what shows a real "이 달이 낫다" signal.
 */
export function calendarMonthPillar(year: number, month: number): GanZhi {
  const sample = { year, month, day: 15, hour: 12, minute: 0 }; // mid-month, away from 절기 boundaries
  const jde = kstToAbsoluteJDE(sample);
  const { pillar: yearP, solarYear } = yearPillar(sample, jde);
  return monthPillar(jde, solarYear, ganIndexOf(yearP.gan));
}

export function monthScore(chart: Chart, year: number, month: number): number {
  const pillar = calendarMonthPillar(year, month);
  return scoreForPillar(chart, pillar, `${chartSeed(chart)}:month:${year}-${month}`);
}

export function currentAge(birthISO: string): number {
  const [by] = birthISO.split('-').map(Number);
  return new Date().getFullYear() - by + 1; // 세는나이, matches the luck-cycle age convention
}

/** The 입춘-anchored year pillar for `year`, e.g. "丙午" — used by 23 연간 뷰's header. */
export function yearGanZhiHanja(year: number): string {
  const sample = { year, month: 7, day: 1, hour: 0, minute: 0 };
  const { pillar } = yearPillar(sample, kstToAbsoluteJDE(sample));
  return `${HANGAN[ganIndexOf(pillar.gan)]}${HANZHI[zhiIndexOf(pillar.zhi)]}`;
}

// --- Screen 13 (월간 결산) -----------------------------------------------

export function dailyScoresForMonth(chart: Chart, year: number, month: number): { date: string; score: number }[] {
  const daysInMonth = new Date(year, month, 0).getDate();
  return Array.from({ length: daysInMonth }, (_, i) => {
    const date = `${year}-${String(month).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`;
    return { date, score: computeDayScore(chart, date).raw };
  });
}

const ELEMENT_MOOD: Record<Element, string> = { 木: '확장', 火: '표현', 土: '다짐', 金: '정리', 水: '흐름' };

export function monthlyElementMood(year: number, month: number): { element: Element; mood: string } {
  const pillar = calendarMonthPillar(year, month);
  return { element: pillar.element, mood: ELEMENT_MOOD[pillar.element] };
}

const HEADLINE_BY_RELATION: Record<ReturnType<typeof relateElements>, { title: string; body: (el: string) => string }> = {
  producedBy: { title: '채워지는 결로 지났습니다', body: (el) => `${el}이 든든하게 받쳐준 달이라, 무리하지 않아도 힘이 남았어요.` },
  same: { title: '나답게 밀어붙인 달이었습니다', body: (el) => `${el} 기운이 겹쳐 힘이 넘쳤던 만큼, 잠시 멈추는 연습도 필요했을 거예요.` },
  produces: { title: '꺼내 쓰는 결로 지났습니다', body: (el) => `${el} 방향으로 에너지를 많이 썼던 달이라, 회복하는 시간이 곁들여지면 좋아요.` },
  controls: { title: '기회를 다루며 지났습니다', body: (el) => `${el} 쪽 기회가 계속 보였던 달이에요. 손에 쥔 걸 정리해볼 타이밍입니다.` },
  controlledBy: { title: '버티는 힘을 길렀습니다', body: (el) => `${el}의 압박이 있었던 달이라 속도를 늦출 수밖에 없었어요. 잘 견딘 시기입니다.` },
};

export function monthlyHeadline(chart: Chart, year: number, month: number): { title: string; body: string } {
  const pillar = calendarMonthPillar(year, month);
  const dmEl = GAN_ELEMENT[ganIndexOf(chart.dayMaster)];
  const rel = relateElements(pillar.element, dmEl);
  const info = HEADLINE_BY_RELATION[rel];
  return { title: info.title, body: info.body(`${pillar.element}(${ELEMENT_INFO[pillar.element].reading})`) };
}

/**
 * Clock span each 시진 covers, as 03's chips and 15's rows both label it.
 * Branch i spans [2i-1, 2i+1) hours, so 子 wraps midnight at 23–01.
 * Kept here rather than inline in a screen so 15 시간대별 흐름 reads the same
 * spans 03 shows — the handoff warns (note for 26) that a second copy of a
 * shared formula is how two screens start disagreeing.
 */
export function hourRange(zhi: Zhi): { startHour: number; endHour: number } {
  const i = zhiIndexOf(zhi);
  return { startHour: (i * 2 + 23) % 24, endHour: (i * 2 + 1) % 24 };
}

function clockLabel(hour: number): string {
  const isPM = hour >= 12;
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${isPM ? '오후' : '오전'} ${h12}시`;
}

/** "오후 3–5시" — collapses the meridiem when both ends share it, as the design does. */
export function hourRangeLabel(zhi: Zhi): string {
  const { startHour, endHour } = hourRange(zhi);
  const startPM = startHour >= 12;
  const endPM = endHour >= 12;
  const end12 = endHour % 12 === 0 ? 12 : endHour % 12;
  if (startPM === endPM) return `${clockLabel(startHour).replace('시', '')}–${end12}시`;
  return `${clockLabel(startHour)}–${clockLabel(endHour)}`;
}

const AGE_TENS = ['', '열', '스물', '서른', '마흔', '쉰', '예순', '일흔', '여든', '아흔'];
const AGE_ONES = ['', '한', '두', '세', '네', '다섯', '여섯', '일곱', '여덟', '아홉'];

/** "스물두 살" — 25's year card labels the age the way the design writes it. */
export function koreanAge(age: number): string {
  if (age < 10 || age > 99) return `${age}살`;
  const t = Math.floor(age / 10);
  const o = age % 10;
  return `${AGE_TENS[t]}${AGE_ONES[o]} 살`.replace('  ', ' ');
}

export interface PastYearReading {
  year: number;
  age: number;
  daeun: GanZhi | null;
  score: number;
  bestMonth: number;
  line: string;
}

/**
 * What 25 지난 일 맞춰보기 says about one past year, *before* asking whether it
 * landed. The handoff's note for 25 is explicit that the reading comes first
 * and the question second — reversed, it stops being a trust device and turns
 * into a survey.
 *
 * Everything here is the same machinery the rest of the app runs on: the year's
 * own 세운 score, the strongest month from `monthScore`, and the 대운 the user
 * was actually in at that age.
 */
export function pastYearReading(chart: Chart, year: number): PastYearReading {
  const birthYear = Number(chart.birth.date.slice(0, 4));
  const age = year - birthYear + 1; // Korean counting, as the 대운 table uses
  const daeun = chart.luckCycles.find((c) => c.startAge <= age && age <= c.endAge)?.pillar ?? null;

  const months = Array.from({ length: 12 }, (_, i) => ({ m: i + 1, s: monthScore(chart, year, i + 1) }));
  const best = months.reduce((a, b) => (b.s > a.s ? b : a));
  const score = Math.round(months.reduce((a, b) => a + b.s, 0) / 12);

  const line =
    score >= 62
      ? `그해 ${best.m}월에 가장 크게 트였습니다.`
      : score <= 45
        ? `그해는 대체로 얕았고, ${best.m}월쯤 한 번 숨이 트였습니다.`
        : `크게 요동치지 않았고, ${best.m}월이 가장 나았습니다.`;

  return { year, age, daeun, score, bestMonth: best.m, line };
}

/**
 * Past years worth asking about, most distinctive first — a year that scored
 * near the middle is one nobody can confirm or deny, so it proves nothing.
 * Starts at age 15; earlier years are rarely recalled in the terms this asks.
 */
export function recallCandidateYears(chart: Chart): number[] {
  const birthYear = Number(chart.birth.date.slice(0, 4));
  const thisYear = new Date().getFullYear();
  const from = birthYear + 14;
  if (thisYear - 1 < from) return [];
  const years = Array.from({ length: thisYear - from }, (_, i) => from + i);
  return years
    .map((y) => ({ y, distance: Math.abs(pastYearReading(chart, y).score - 50) }))
    .sort((a, b) => b.distance - a.distance)
    .map((e) => e.y);
}
