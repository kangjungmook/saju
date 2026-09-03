/** Shared field data for any birth-date/time form (02 온보딩, 19 관계 추가). */

export const HOUR_SLOTS = [
  { z: 0, label: '오후 11시 – 오전 1시' },
  { z: 1, label: '오전 1시 – 3시' },
  { z: 2, label: '오전 3시 – 5시' },
  { z: 3, label: '오전 5시 – 7시' },
  { z: 4, label: '오전 7시 – 9시' },
  { z: 5, label: '오전 9시 – 11시' },
  { z: 6, label: '오전 11시 – 오후 1시' },
  { z: 7, label: '오후 1시 – 3시' },
  { z: 8, label: '오후 3시 – 5시' },
  { z: 9, label: '오후 5시 – 7시' },
  { z: 10, label: '오후 7시 – 9시' },
  { z: 11, label: '오후 9시 – 11시' },
];

export const YEARS = Array.from({ length: 90 }, (_, i) => String(2016 - i));
export const MONTHS = Array.from({ length: 12 }, (_, i) => String(i + 1));
export const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1));

/**
 * The user only picks a 2-hour 시(時) slot, not an exact minute, so the
 * midpoint is the representative clock time we hand to the engine — it's
 * the choice least likely to cross into the neighbouring 시 once true solar
 * time (±90min across Korea) shifts it, unlike the slot's start edge.
 */
export function zhiMidClock(z: number): { hour: number; minute: number } {
  const startMin = (((2 * z - 1) + 24) % 24) * 60;
  const midMin = (startMin + 60) % 1440;
  return { hour: Math.floor(midMin / 60), minute: midMin % 60 };
}
