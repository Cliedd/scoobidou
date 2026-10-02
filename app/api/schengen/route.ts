import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const entries = Array.isArray(body.entries) ? body.entries : [];
  const reference = body.referenceDate ? new Date(body.referenceDate) : new Date();
  if (Number.isNaN(reference.getTime())) return NextResponse.json({ error: 'referenceDate invalide' }, { status: 400 });
  const normalized = entries.map((entry: { start: string; end: string }) => ({ start: new Date(entry.start), end: new Date(entry.end) })).filter((entry: { start: Date; end: Date }) => !Number.isNaN(entry.start.getTime()) && !Number.isNaN(entry.end.getTime()));
  const windowStart = new Date(reference); windowStart.setDate(windowStart.getDate() - 179);
  const usedDays = normalized.reduce((total: number, entry: { start: Date; end: Date }) => {
    const start = entry.start > windowStart ? entry.start : windowStart;
    const end = entry.end < reference ? entry.end : reference;
    return total + (end >= start ? Math.floor((end.getTime() - start.getTime()) / 86400000) + 1 : 0);
  }, 0);
  return NextResponse.json({ referenceDate: reference.toISOString().slice(0, 10), windowStart: windowStart.toISOString().slice(0, 10), usedDays, remainingDays: Math.max(0, 90 - usedDays), compliant: usedDays <= 90 });
}
