export type PeriodKind = 'week' | 'month';

export type PeriodRange = {
  /** Inclusive start, ms epoch. */
  start: number;
  /** Exclusive end, ms epoch. */
  end: number;
};

/** Monday 00:00 of the week containing `d`. */
export function startOfWeek(d: Date): Date {
  const out = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = out.getDay(); // 0 = Sunday
  const diff = day === 0 ? 6 : day - 1;
  out.setDate(out.getDate() - diff);
  return out;
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/** Anchor shifted by `delta` periods (weeks or months). */
export function shiftPeriod(kind: PeriodKind, anchor: Date, delta: number): Date {
  const out = new Date(anchor);
  if (kind === 'week') out.setDate(out.getDate() + delta * 7);
  else out.setMonth(out.getMonth() + delta);
  return out;
}

export function periodRange(kind: PeriodKind, anchor: Date): PeriodRange {
  if (kind === 'week') {
    const start = startOfWeek(anchor);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    return { start: start.getTime(), end: end.getTime() };
  }
  const start = startOfMonth(anchor);
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
  return { start: start.getTime(), end: end.getTime() };
}

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** "July 2026" for months, "Jun 29 – Jul 5, 2026" for weeks. */
export function periodLabel(kind: PeriodKind, anchor: Date): string {
  if (kind === 'month') {
    return `${MONTHS_LONG[anchor.getMonth()]} ${anchor.getFullYear()}`;
  }
  const start = startOfWeek(anchor);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const startLabel = `${MONTHS_SHORT[start.getMonth()]} ${start.getDate()}`;
  const endLabel =
    start.getMonth() === end.getMonth()
      ? `${end.getDate()}`
      : `${MONTHS_SHORT[end.getMonth()]} ${end.getDate()}`;
  return `${startLabel} – ${endLabel}, ${end.getFullYear()}`;
}

/** "Jul 4, 2026 · 3:15 PM" */
export function formatDateTime(ms: number): string {
  const d = new Date(ms);
  let hours = d.getHours();
  const suffix = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} · ${hours}:${minutes} ${suffix}`;
}

/** "Jul 4" */
export function formatDayShort(ms: number): string {
  const d = new Date(ms);
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`;
}
