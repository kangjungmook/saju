/** Julian day utilities (Fliegel & Van Flandern algorithm), Gregorian calendar only. */

export interface CivilDateTime {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number; // 0-23, local
  minute: number; // 0-59
}

/** Julian Day Number for a Gregorian calendar date (integer, date-only, no time-of-day). */
export function toJDN(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return (
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  );
}

/** Julian Ephemeris Day (fractional) for a UTC civil date-time. */
export function toJDE(dt: CivilDateTime): number {
  const jdn = toJDN(dt.year, dt.month, dt.day);
  const dayFraction = (dt.hour - 12) / 24 + dt.minute / 1440;
  return jdn + dayFraction;
}

export function jdeToCivil(jde: number): CivilDateTime {
  const jd = jde + 0.5;
  let Z = Math.floor(jd);
  const F = jd - Z;
  let A = Z;
  if (Z >= 2299161) {
    const alpha = Math.floor((Z - 1867216.25) / 36524.25);
    A = Z + 1 + alpha - Math.floor(alpha / 4);
  }
  const B = A + 1524;
  const C = Math.floor((B - 122.1) / 365.25);
  const D = Math.floor(365.25 * C);
  const E = Math.floor((B - D) / 30.6001);
  const dayFrac = B - D - Math.floor(30.6001 * E) + F;
  const day = Math.floor(dayFrac);
  const month = E < 14 ? E - 1 : E - 13;
  const year = month > 2 ? C - 4716 : C - 4715;
  const hourFrac = (dayFrac - day) * 24;
  const hour = Math.floor(hourFrac);
  const minute = Math.round((hourFrac - hour) * 60);
  return { year, month, day, hour, minute };
}

export function normalizeDegrees(deg: number): number {
  let d = deg % 360;
  if (d < 0) d += 360;
  return d;
}
