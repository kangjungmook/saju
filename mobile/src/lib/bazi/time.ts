import { CivilDateTime, toJDE, jdeToCivil } from './julian';

/**
 * All astronomical functions in this package (solar.ts, lunar.ts) operate on
 * absolute JDE (UT). Birth data is entered as Korea Standard Time (UTC+9)
 * civil date/time — these two helpers are the only place the +9h offset is
 * applied, so every other module can stay timezone-agnostic.
 */
export const KST_OFFSET_DAYS = 9 / 24;

export function kstToAbsoluteJDE(dt: CivilDateTime): number {
  return toJDE(dt) - KST_OFFSET_DAYS;
}

export function absoluteJDEtoKST(jde: number): CivilDateTime {
  return jdeToCivil(jde + KST_OFFSET_DAYS);
}
