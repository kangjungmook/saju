import { Chart, DayScore, Element, GanZhi, Zhi } from '../../types/domain';
import { toJDN } from './julian';
import { dayPillarFromJDN, GAN_ELEMENT, ganIndexOf, hourPillar, relateElements, ZHI, zhiIndexOf } from './ganzhi';

/**
 * Day-score model (0-100). There is no single public "official" BaZi scoring
 * formula — traditional 사주 reading is interpretive — so this is our own
 * worked rule set built from elemental-relation theory (生剋 cycles) plus the
 * person's own element balance, kept fully deterministic per handoff §1 rule
 * ① (same input -> same output; no randomness, no time-of-request drift).
 */

const RELATION_WEIGHT: Record<ReturnType<typeof relateElements>, number> = {
  producedBy: 13, // day's element supports (生) the day master — resourceful, easy day
  same: 7, // day's element matches the day master — parallel strength
  produces: 3, // day master's energy flows outward (食傷) — expressive but draining
  controls: 9, // day master can act on the day's element (財) — opportunity
  controlledBy: -10, // day's element pressures the day master (官殺) — friction
};

function seededUnit(key: string): number {
  // xmur3-style string hash -> mulberry32, so the same (chartId, date) always yields the same texture.
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

const REASON_TEMPLATES: Record<string, string> = {
  producedBy: '오늘 일진 {gz}이 일간을 채워주는 결이라 여유가 있어요.',
  same: '오늘 일진 {gz}이 일간과 같은 기운이라 힘이 붙는 날이에요.',
  produces: '오늘 일진 {gz}이 일간의 기운을 밖으로 꺼내 쓰는 날이에요.',
  controls: '오늘 일진 {gz}이 일간이 다루기 수월한 결이라 기회가 보여요.',
  controlledBy: '오늘 일진 {gz}이 일간을 누르는 결이라 속도를 늦추는 게 좋아요.',
};

function ganZhiLabel(gz: GanZhi): string {
  return `${gz.gan}${gz.zhi}`;
}

export function computeDayScore(chart: Chart, dateISO: string, scoreVersion = 'bazi-engine-v1'): DayScore {
  const [y, m, d] = dateISO.split('-').map(Number);
  const jdn = toJDN(y, m, d);
  const dayGZ = dayPillarFromJDN(jdn);

  const dayMasterElement = GAN_ELEMENT[ganIndexOf(chart.dayMaster)];
  const rel = relateElements(dayGZ.element, dayMasterElement);

  // How scarce this element already is in the chart shapes how much a supportive day helps
  // (or a controlling day hurts) — a person low on 水 feels a 水 day more than someone flush with it.
  const scarcity = 1 - (chart.elements[dayGZ.element] ?? 0) / 100; // 0 (abundant) .. ~0.9 (absent)
  const magnitude = RELATION_WEIGHT[rel] * (0.6 + 0.8 * scarcity);

  const texture = (seededUnit(`${chart.id}:${dateISO}`) - 0.5) * 12; // deterministic +-6 texture
  const raw = Math.max(0, Math.min(100, Math.round(50 + magnitude + texture)));
  const band = raw < 35 ? 1 : raw < 50 ? 2 : raw < 65 ? 3 : raw < 80 ? 4 : 5;

  const bestHours = bestHoursFor(chart, dayGZ);

  return {
    chartId: chart.id,
    date: dateISO,
    ganZhi: dayGZ,
    raw,
    adjusted: raw,
    band,
    reason: REASON_TEMPLATES[rel].replace('{gz}', ganZhiLabel(dayGZ)),
    bestHours,
    scoreVersion,
  };
}

function bestHoursFor(chart: Chart, dayGZ: GanZhi): Zhi[] {
  const dayGanIdx = ganIndexOf(dayGZ.gan);
  const dayMasterElement = GAN_ELEMENT[ganIndexOf(chart.dayMaster)];
  const scored = ZHI.map((_, zhiIdx) => {
    const gz = hourPillar(zhiIdx * 2, 0, dayGanIdx);
    const rel = relateElements(gz.element, dayMasterElement);
    return { zhi: ZHI[zhiIdx], weight: RELATION_WEIGHT[rel] };
  });
  scored.sort((a, b) => b.weight - a.weight);
  return scored.slice(0, 3).map((s) => s.zhi);
}

/** Applies a Calibration to a raw score, per handoff §2/§4-27: always preserve raw, only move adjusted. */
export function applyCalibration(
  raw: number,
  dayElement: Element,
  byElement: Record<Element, number>,
  strength: 0 | 0.5 | 1,
  enabled: boolean,
): number {
  if (!enabled || strength === 0) return raw;
  const delta = (byElement[dayElement] ?? 0) * strength;
  return Math.max(0, Math.min(100, Math.round(raw + delta)));
}
