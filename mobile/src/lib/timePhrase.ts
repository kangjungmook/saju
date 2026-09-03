/**
 * Pulls a *timing* out of a free-text branch on 26 결정 저울 — and nothing else.
 *
 * The handoff (§4, note for 26) is deliberate about the scope: the two branches
 * are free text, but only the 시점 is parsed. Nothing here tries to understand
 * "이직" or "버틴다"; when no timing is found the screen falls back to asking
 * for a month directly rather than guessing.
 */
export interface TimePoint {
  year: number;
  month: number; // 1-12
}

const SEASON_MONTH: Record<string, number> = { 봄: 3, 여름: 6, 가을: 9, 겨울: 12 };

function clampToFuture(year: number, month: number, now: Date): TimePoint {
  const nowY = now.getFullYear();
  const nowM = now.getMonth() + 1;
  // A bare "9월" in October means next September, not one that already passed.
  if (year < nowY || (year === nowY && month < nowM)) return { year: year + 1, month };
  return { year, month };
}

export function parseTimePoint(text: string, now = new Date()): TimePoint | null {
  const s = text.replace(/\s+/g, ' ').trim();
  if (!s) return null;

  const nowY = now.getFullYear();
  const nowM = now.getMonth() + 1;

  const relYear = /내년|다음\s?해/.test(s) ? nowY + 1 : /내후년/.test(s) ? nowY + 2 : /올해|금년|이번\s?해/.test(s) ? nowY : null;

  // "다음 달" / "이번 달" resolve on their own.
  if (/다음\s?달/.test(s)) {
    return nowM === 12 ? { year: nowY + 1, month: 1 } : { year: nowY, month: nowM + 1 };
  }
  if (/이번\s?달/.test(s)) return { year: nowY, month: nowM };

  const explicitYear = s.match(/(\d{4})\s*년/);
  const monthMatch = s.match(/(\d{1,2})\s*월/);
  if (monthMatch) {
    const month = Number(monthMatch[1]);
    if (month >= 1 && month <= 12) {
      if (explicitYear) return { year: Number(explicitYear[1]), month };
      if (relYear !== null) return { year: relYear, month };
      return clampToFuture(nowY, month, now);
    }
  }

  for (const [word, month] of Object.entries(SEASON_MONTH)) {
    if (s.includes(word)) {
      if (relYear !== null) return { year: relYear, month };
      return clampToFuture(nowY, month, now);
    }
  }

  if (explicitYear) return { year: Number(explicitYear[1]), month: 1 };
  if (relYear !== null) return { year: relYear, month: 1 };
  return null;
}

/** The twelve months starting at `from`, which is the window 26 compares over. */
export function twelveMonthsFrom(from: TimePoint): TimePoint[] {
  return Array.from({ length: 12 }, (_, i) => {
    const m0 = from.month - 1 + i;
    return { year: from.year + Math.floor(m0 / 12), month: (m0 % 12) + 1 };
  });
}
