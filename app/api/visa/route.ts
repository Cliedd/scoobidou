import { NextResponse } from 'next/server';
import { db, ensureSchema } from '../../../lib/db';

const rules = [
  { passport: 'CM', destination: 'RW', status: 'visa_on_arrival', days: 30, fee: '50 USD', source: 'Immigration Rwanda', checkedAt: '2026-09-12', confidence: 'verified' },
  { passport: 'CM', destination: 'KE', status: 'eta', days: 90, fee: '35 USD', source: 'eCitizen Kenya', checkedAt: '2026-09-10', confidence: 'verified' },
  { passport: 'CM', destination: 'TR', status: 'visa_required', days: 90, fee: '60–100 EUR', source: 'Ministère turc des Affaires étrangères', checkedAt: '2026-09-08', confidence: 'verified' },
  { passport: 'CM', destination: 'FR', status: 'visa_required', days: 90, fee: '90 EUR + service', source: 'France-Visas', checkedAt: '2026-09-14', confidence: 'verified' },
  { passport: 'CM', destination: 'AE', status: 'visa_required', days: 30, fee: '70–150 USD', source: 'UAE Government Portal', checkedAt: '2026-09-05', confidence: 'community_reviewed' },
];

export function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const passport = (searchParams.get('passport') || 'CM').toUpperCase();
  const destination = searchParams.get('destination')?.toUpperCase();
  return getRules(passport, destination);
}

async function getRules(passport: string, destination?: string | null) {
  if (db) {
    try {
      await ensureSchema();
      const query = destination
        ? { text: 'SELECT * FROM visa_rules WHERE passport_code = $1 AND destination_code = $2 ORDER BY destination_code', values: [passport, destination] }
        : { text: 'SELECT * FROM visa_rules WHERE passport_code = $1 ORDER BY destination_code', values: [passport] };
      const result = await db.query(query);
      if (result.rows.length) return NextResponse.json({ data: result.rows, meta: { passport, count: result.rows.length, source: 'postgresql' } });
    } catch (error) { console.error('Database unavailable, using seed data:', error); }
  }
  const seed = rules.filter(rule => rule.passport === passport && (!destination || rule.destination === destination));
  return NextResponse.json({ data: seed, meta: { passport, count: seed.length, source: 'seed', lastUpdated: '2026-09-14' } });
}
