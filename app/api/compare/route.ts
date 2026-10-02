import { NextResponse } from 'next/server';
import { db, ensureSchema } from '../../../lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const left = (searchParams.get('left') || 'CM').toUpperCase();
  const right = (searchParams.get('right') || 'FR').toUpperCase();
  if (!db) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  await ensureSchema();
  const result = await db.query(`SELECT destination_code, passport_code, requirement, max_stay_days, source_name, verified_at FROM visa_rules WHERE passport_code IN ($1,$2) ORDER BY destination_code`, [left, right]);
  const grouped = new Map<string, Record<string, unknown>>();
  for (const row of result.rows as Array<{ destination_code: string; passport_code: string }>) {
    const item: Record<string, unknown> = grouped.get(row.destination_code) || { destination: row.destination_code };
    item[row.passport_code] = row;
    grouped.set(row.destination_code, item);
  }
  return NextResponse.json({ passports: [left, right], data: Array.from(grouped.values()) });
}
