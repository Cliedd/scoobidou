export type Stay = { start: string; end: string; country?: string; fee?: number };

export type SchengenResult = {
  referenceDate: string;
  windowStart: string;
  usedDays: number;
  remainingDays: number;
  compliant: boolean;
  overstayDays: number;
  daysByCountry: Record<string, number>;
  stays: Array<Stay & { days: number; overlap: boolean }>;
};

const DAY = 86400000;
const dateOnly = (value: string | Date) => {
  const d = value instanceof Date ? new Date(value) : new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) throw new Error('Date invalide');
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
};
const iso = (d: Date) => d.toISOString().slice(0, 10);
const daysBetween = (start: Date, end: Date) => end < start ? 0 : Math.floor((end.getTime() - start.getTime()) / DAY) + 1;

export function calculateSchengen(stays: Stay[], reference: string | Date = new Date()): SchengenResult {
  const ref = dateOnly(reference);
  const windowStart = new Date(ref.getTime() - 179 * DAY);
  const normalized = stays.map((stay) => {
    const start = dateOnly(stay.start); const end = dateOnly(stay.end);
    if (end < start) throw new Error('La date de fin doit être postérieure au début');
    const clippedStart = start > windowStart ? start : windowStart;
    const clippedEnd = end < ref ? end : ref;
    return { ...stay, start: iso(start), end: iso(end), days: daysBetween(clippedStart, clippedEnd), overlap: false };
  });
  const covered = new Set<string>();
  const byCountry: Record<string, number> = {};
  const resultStays = normalized.map((stay) => {
    let overlap = false;
    const start = dateOnly(stay.start); const end = dateOnly(stay.end);
    for (let d = new Date(start); d <= end && d <= ref; d = new Date(d.getTime() + DAY)) {
      if (d < windowStart) continue;
      const key = iso(d); if (covered.has(key)) overlap = true; covered.add(key);
    }
    const uniqueDays = Array.from(covered).filter((key) => key >= stay.start && key <= stay.end).length;
    const country = stay.country || 'Espace Schengen';
    byCountry[country] = (byCountry[country] || 0) + Math.max(0, uniqueDays);
    return { ...stay, days: uniqueDays, overlap };
  });
  const usedDays = covered.size;
  return { referenceDate: iso(ref), windowStart: iso(windowStart), usedDays, remainingDays: Math.max(0, 90 - usedDays), compliant: usedDays <= 90, overstayDays: Math.max(0, usedDays - 90), daysByCountry: byCountry, stays: resultStays };
}

export function calculateFees(stays: Stay[], defaultFee = 90) {
  return stays.reduce((sum, stay) => sum + (typeof stay.fee === 'number' ? stay.fee : defaultFee), 0);
}
