import { LuckCycle, GanZhi } from '../../types/domain';
import { ganIndexOf, ganZhiOf, isYangGan, zhiIndexOf } from './ganzhi';
import { solarTermJDE } from './solar';

/**
 * 대운 — 60-year luck cycle. Direction (順行/逆行) follows the classic rule:
 * 양간 year + male, or 음간 year + female -> forward; the opposite pairing
 * -> backward. Starting age comes from the distance (in days) to the
 * nearest 절(節) boundary in that direction, at 3 days ≈ 1 year.
 */
export function computeLuckCycles(
  monthPillar: GanZhi,
  yearGanIdx: number,
  gender: 'male' | 'female',
  jdeUT: number,
  solarYear: number,
): { luckDirection: 'forward' | 'backward'; luckCycles: LuckCycle[]; startAge: number } {
  const yearIsYang = isYangGan(yearGanIdx);
  const forward = (yearIsYang && gender === 'male') || (!yearIsYang && gender === 'female');

  // The 12 절(節) boundaries bracketing this solar year, extended one term either side.
  const jieTerms: number[] = [];
  for (let y = solarYear - 1; y <= solarYear + 1; y++) {
    for (let i = 0; i < 24; i += 2) jieTerms.push(solarTermJDE(y, i));
  }
  jieTerms.sort((a, b) => a - b);

  let daysToTerm: number;
  if (forward) {
    const next = jieTerms.find((t) => t > jdeUT)!;
    daysToTerm = next - jdeUT;
  } else {
    const prevs = jieTerms.filter((t) => t <= jdeUT);
    const prev = prevs[prevs.length - 1];
    daysToTerm = jdeUT - prev;
  }
  const startAge = Math.max(1, Math.round(daysToTerm / 3));

  const monthGanIdx = ganIndexOf(monthPillar.gan);
  const monthZhiIdx = zhiIndexOf(monthPillar.zhi);
  const step = forward ? 1 : -1;

  const luckCycles: LuckCycle[] = Array.from({ length: 6 }, (_, i) => {
    const offset = (i + 1) * step;
    const pillar = ganZhiOf(monthGanIdx + offset, monthZhiIdx + offset);
    return {
      index: i,
      startAge: startAge + i * 10,
      endAge: startAge + i * 10 + 9,
      pillar,
    };
  });

  return { luckDirection: forward ? 'forward' : 'backward', luckCycles, startAge };
}
