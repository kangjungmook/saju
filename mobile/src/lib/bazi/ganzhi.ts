import { Element, Gan, GanZhi, TenGod, TenGodName, Zhi } from '../../types/domain';
import { toJDN, CivilDateTime } from './julian';
import { solarTermJDE } from './solar';
import { kstToAbsoluteJDE, absoluteJDEtoKST } from './time';

export const GAN: Gan[] = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'];
export const ZHI: Zhi[] = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'];
export const HANGAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
export const HANZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

const GAN_ELEMENT: Element[] = ['木', '木', '火', '火', '土', '土', '金', '金', '水', '水'];
const ZHI_ELEMENT: Element[] = ['水', '土', '木', '木', '土', '火', '火', '土', '金', '金', '土', '水'];

export function ganZhiOf(ganIndex: number, zhiIndex: number): GanZhi {
  const g = ((ganIndex % 10) + 10) % 10;
  const z = ((zhiIndex % 12) + 12) % 12;
  return { gan: GAN[g], zhi: ZHI[z], element: GAN_ELEMENT[g] };
}

export function ganIndexOf(g: Gan): number {
  return GAN.indexOf(g);
}
export function zhiIndexOf(z: Zhi): number {
  return ZHI.indexOf(z);
}
export function isYangGan(ganIndex: number): boolean {
  return ((ganIndex % 10) + 10) % 10 % 2 === 0;
}

/** 일주 — sexagenary day pillar for a given absolute JDE (day boundary already resolved by caller). */
export function dayPillarFromJDN(jdn: number): GanZhi {
  const ganIdx = (jdn + 9) % 10; // calibrated against 1900-01-31 = 甲辰
  const zhiIdx = (jdn + 1) % 12;
  return ganZhiOf(ganIdx, zhiIdx);
}

/** 년주 — year pillar using the 입춘(立春, term 0) boundary, not Jan 1. */
export function yearPillar(civilKST: CivilDateTime, jdeUT: number): { pillar: GanZhi; solarYear: number } {
  const lichun = solarTermJDE(civilKST.year, 0);
  const solarYear = jdeUT < lichun ? civilKST.year - 1 : civilKST.year;
  const ganIdx = ((solarYear - 4) % 10 + 10) % 10;
  const zhiIdx = ((solarYear - 4) % 12 + 12) % 12;
  return { pillar: ganZhiOf(ganIdx, zhiIdx), solarYear };
}

// 五虎遁 — month-1 (寅) stem for each year stem, then +1 per subsequent branch.
const YIN_MONTH_GAN_START = [2, 4, 6, 8, 0]; // indexed by (yearGanIdx % 5): 甲己->丙(2) 乙庚->戊(4) 丙辛->庚(6) 丁壬->壬(8) 戊癸->甲(0)

/** 월주 — month pillar from the 12 "절(節)" solar-term boundaries (index 0,2,4...22 in solar.ts). */
export function monthPillar(jdeUT: number, solarYear: number, yearGanIdx: number): GanZhi {
  // The 12 jié terms, in month-branch order starting at 寅(입춘..경칩): term indices 0,2,4,...,22.
  const jieBoundaries = Array.from({ length: 12 }, (_, i) => solarTermJDE(solarYear, i * 2));
  let branchOffset = 11; // falls back to 丑 (before 입춘 of *this* solarYear, i.e. still previous 丑 month) — resolved below
  for (let i = 0; i < 12; i++) {
    const start = jieBoundaries[i];
    const end = i < 11 ? jieBoundaries[i + 1] : solarTermJDE(solarYear + 1, 0);
    if (jdeUT >= start && jdeUT < end) {
      branchOffset = i;
      break;
    }
  }
  const zhiIdx = (2 + branchOffset) % 12; // 0=寅
  const ganStart = YIN_MONTH_GAN_START[((yearGanIdx % 10) + 10) % 10 % 5];
  const ganIdx = (ganStart + branchOffset) % 10;
  return ganZhiOf(ganIdx, zhiIdx);
}

// 五鼠遁 — hour-子 stem for each day stem, then +1 per subsequent branch.
const ZI_HOUR_GAN_START = [0, 2, 4, 6, 8]; // (dayGanIdx % 5): 甲己->甲(0) 乙庚->丙(2) 丙辛->戊(4) 丁壬->庚(6) 戊癸->壬(8)

/** 시주 — hour pillar. Branch from the 12 double-hours (子 = 23:00–01:00), stem via 五鼠遁. */
export function hourPillar(hour: number, minute: number, dayGanIdx: number): GanZhi {
  const totalMin = hour * 60 + minute;
  // 子(23:00-01:00)=0, 丑(01-03)=1, ... 亥(21-23)=11
  const zhiIdx = Math.floor((((totalMin + 60) % 1440) / 120)) % 12;
  const ganStart = ZI_HOUR_GAN_START[((dayGanIdx % 10) + 10) % 10 % 5];
  const ganIdx = (ganStart + zhiIdx) % 10;
  return ganZhiOf(ganIdx, zhiIdx);
}

export interface BirthPillarsInput {
  /** Gregorian, KST civil clock time, already true-solar-time corrected. */
  correctedKST: CivilDateTime;
  hasHour: boolean;
}

export interface PillarResult {
  pillars: { year: GanZhi; month: GanZhi; day: GanZhi; hour: GanZhi | null };
  solarYear: number;
}

export function computePillars({ correctedKST, hasHour }: BirthPillarsInput): PillarResult {
  const jdeUT = kstToAbsoluteJDE(correctedKST);

  // Per the handoff spec (§3 step 3), the day itself rolls over at 23:00 KST (子時 start),
  // not midnight — an effective-date shift, not a split-hour rule.
  const effectiveDate =
    correctedKST.hour === 23 ? absoluteJDEtoKST(jdeUT + 1) : correctedKST;
  const jdn = toJDN(effectiveDate.year, effectiveDate.month, effectiveDate.day);
  const day = dayPillarFromJDN(jdn);

  const { pillar: year, solarYear } = yearPillar(correctedKST, jdeUT);
  const month = monthPillar(jdeUT, solarYear, ganIndexOf(year.gan));
  const hourP = hasHour ? hourPillar(correctedKST.hour, correctedKST.minute, ganIndexOf(day.gan)) : null;

  return { pillars: { year, month, day, hour: hourP }, solarYear };
}

/** 오행 분포 — counts each pillar's stem+branch element, normalized to sum 100. */
export function elementDistribution(pillars: PillarResult['pillars']): Record<Element, number> {
  const counts: Record<Element, number> = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  const add = (gz: GanZhi | null) => {
    if (!gz) return;
    counts[gz.element] += 1;
    counts[ZHI_ELEMENT[zhiIndexOf(gz.zhi)]] += 1;
  };
  add(pillars.year);
  add(pillars.month);
  add(pillars.day);
  add(pillars.hour);
  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;

  // Largest-remainder rounding: rounding each share independently can overshoot or
  // undershoot 100 by a point or two, and the type's contract (and the 05 screen's
  // 오행 bars) both assume the five values sum to exactly 100.
  const elements = Object.keys(counts) as Element[];
  const shares = elements.map((el) => (counts[el] / total) * 100);
  const floors = shares.map(Math.floor);
  const remainder = 100 - floors.reduce((a, b) => a + b, 0);
  const order = elements
    .map((el, i) => ({ i, frac: shares[i] - floors[i] }))
    .sort((a, b) => b.frac - a.frac);
  for (let k = 0; k < remainder; k++) floors[order[k].i] += 1;

  const out = {} as Record<Element, number>;
  elements.forEach((el, i) => {
    out[el] = floors[i];
  });
  return out;
}

const PRODUCES: Record<Element, Element> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
const CONTROLS: Record<Element, Element> = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };

export type ElementRelation = 'same' | 'produces' | 'controls' | 'producedBy' | 'controlledBy';

export function relateElements(from: Element, to: Element): ElementRelation {
  if (from === to) return 'same';
  if (PRODUCES[from] === to) return 'produces';
  if (CONTROLS[from] === to) return 'controls';
  if (PRODUCES[to] === from) return 'producedBy';
  return 'controlledBy';
}

const TEN_GOD_TABLE: Record<ElementRelation, [TenGodName, TenGodName]> = {
  // [same yin-yang, different yin-yang]
  same: ['비견', '겁재'],
  produces: ['식신', '상관'],
  controls: ['편재', '정재'],
  controlledBy: ['편관', '정관'],
  producedBy: ['편인', '정인'],
};

export function tenGodOf(dayMaster: Gan, other: GanZhi): TenGodName {
  const dmIdx = ganIndexOf(dayMaster);
  const otherIdx = ganIndexOf(other.gan);
  const rel = relateElements(GAN_ELEMENT[dmIdx], other.element);
  const sameYinYang = isYangGan(dmIdx) === isYangGan(otherIdx);
  return TEN_GOD_TABLE[rel][sameYinYang ? 0 : 1];
}

const TEN_GOD_BLURB: Record<TenGodName, string> = {
  비견: '스스로 판단하고 밀어붙이는 힘이 강해요.',
  겁재: '나눠 쓰고 함께 움직이는 자리를 편하게 느껴요.',
  식신: '만드는 걸 좋아하는, 과정에서 힘을 얻는 자리예요.',
  상관: '표현하고 드러내는 데서 기운이 나요.',
  편재: '기회를 넓게 벌이는 걸 즐기는 자리예요.',
  정재: '차곡차곡 쌓고 관리하는 데 강해요.',
  편관: '압박 속에서 오히려 승부욕이 붙는 자리예요.',
  정관: '스스로 규칙을 세우고 지키는 사람이에요.',
  편인: '혼자 있는 시간에서 회복하는 자리예요.',
  정인: '배우고 받아들이는 데서 편안함을 느껴요.',
};

export function buildTenGods(dayMaster: Gan, pillars: PillarResult['pillars']): TenGod[] {
  const out: TenGod[] = [];
  (['year', 'month', 'hour'] as const).forEach((key) => {
    const gz = pillars[key];
    if (!gz) return;
    const name = tenGodOf(dayMaster, gz);
    out.push({ name, pillar: key, summary: TEN_GOD_BLURB[name] });
  });
  return out;
}

export { ZHI_ELEMENT, GAN_ELEMENT };
