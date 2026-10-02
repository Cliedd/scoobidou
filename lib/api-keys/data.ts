import { db, ensureSchema } from '../db';

const seedRules = [
  { passport: 'CM', destination: 'RW', requirement: 'visa_on_arrival', max_stay_days: 30, fee: '50 USD', source_name: 'Immigration Rwanda', verified_at: '2026-09-12' },
  { passport: 'CM', destination: 'KE', requirement: 'eta', max_stay_days: 90, fee: '35 USD', source_name: 'eCitizen Kenya', verified_at: '2026-09-10' },
  { passport: 'CM', destination: 'TR', requirement: 'visa_required', max_stay_days: 90, fee: '60–100 EUR', source_name: 'Ministère turc des Affaires étrangères', verified_at: '2026-09-08' },
  { passport: 'CM', destination: 'FR', requirement: 'visa_required', max_stay_days: 90, fee: '90 EUR + service', source_name: 'France-Visas', verified_at: '2026-09-14' },
  { passport: 'CM', destination: 'AE', requirement: 'visa_required', max_stay_days: 30, fee: '70–150 USD', source_name: 'UAE Government Portal', verified_at: '2026-09-05' },
];
export async function visaRules(passport: string, destination?: string) {
  if (db) { await ensureSchema(); const q = destination ? ['SELECT * FROM visa_rules WHERE passport_code=$1 AND destination_code=$2 ORDER BY destination_code', [passport, destination]] : ['SELECT * FROM visa_rules WHERE passport_code=$1 ORDER BY destination_code', [passport]]; const result = await db.query(q[0] as string, q[1] as string[]); if (result.rows.length) return result.rows; }
  return seedRules.filter(r => r.passport === passport && (!destination || r.destination === destination));
}
export async function countries() {
  if (db) { await ensureSchema(); const result = await db.query('SELECT code,name,kind FROM countries ORDER BY name'); if (result.rows.length) return result.rows; }
  return Array.from(new Set(seedRules.flatMap(r => [r.passport, r.destination]))).sort().map(code => ({ code, name: code, kind: 'country' }));
}
