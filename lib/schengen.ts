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
  if(typeof value==='string' && !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Date invalide');
  const d = value instanceof Date ? new Date(value) : new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) throw new Error('Date invalide');
  if(typeof value==='string' && d.toISOString().slice(0,10)!==value) throw new Error('Date invalide');
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
};
const iso = (d: Date) => d.toISOString().slice(0, 10);
const daysBetween = (start: Date, end: Date) => end < start ? 0 : Math.floor((end.getTime() - start.getTime()) / DAY) + 1;

export function calculateSchengen(stays: Stay[], reference: string | Date = new Date()): SchengenResult {
  if (!Array.isArray(stays) || stays.length > 100) throw new Error('Le nombre de séjours doit être compris entre 0 et 100');
  const ref = dateOnly(reference);
  const windowStart = new Date(ref.getTime() - 179 * DAY);
  const normalized = stays.map((stay) => {
    if (!stay || typeof stay.start !== 'string' || typeof stay.end !== 'string') throw new Error('Séjour invalide');
    if (stay.country !== undefined && (typeof stay.country !== 'string' || stay.country.length > 100)) throw new Error('Pays invalide');
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
    let uniqueDays=0;
    for (let d = new Date(start > windowStart ? start : windowStart); d <= end && d <= ref; d = new Date(d.getTime() + DAY)) {
      const key = iso(d); if (covered.has(key)) overlap = true; else uniqueDays++; covered.add(key);
    }
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
