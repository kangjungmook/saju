export function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function isoOf(y: number, m: number, d: number): string {
  return `${y}-${pad(m)}-${pad(d)}`;
}

export function todayISO(): string {
  const t = new Date();
  return isoOf(t.getFullYear(), t.getMonth() + 1, t.getDate());
}

/** `count` consecutive ISO dates ending at (and including) `date`, oldest first. */
export function trailingDates(date: string, count: number): string[] {
  const [y, m, d] = date.split('-').map(Number);
  const base = new Date(y, m - 1, d);
  return Array.from({ length: count }, (_, i) => {
    const dt = new Date(base);
    dt.setDate(dt.getDate() - (count - 1 - i));
    return isoOf(dt.getFullYear(), dt.getMonth() + 1, dt.getDate());
  });
}
