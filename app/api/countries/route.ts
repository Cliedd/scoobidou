import { NextResponse } from 'next/server';
import { db, ensureSchema } from '../../../lib/db';

const labels: Record<string, string> = { visa_free: 'Sans visa', visa_on_arrival: 'Visa à l’arrivée', eta: 'eTA obligatoire', evisa: 'eVisa', visa_required: 'Visa requis', no_admission: 'Entrée non autorisée' };
const colors: Record<string, string> = { visa_free: 'green', visa_on_arrival: 'green', eta: 'blue', evisa: 'blue', visa_required: 'amber', no_admission: 'red' };

export async function GET(request: Request) {
  if (!db) return NextResponse.json({ data: [], meta: { source: 'postgresql', count: 0 } });
  const { searchParams } = new URL(request.url); const passport = (searchParams.get('passport') || 'CM').toUpperCase();
  const requirement = searchParams.get('requirement'); const search = searchParams.get('search')?.trim();
  try {
    await ensureSchema(); const values: string[] = [passport]; const where = ['vr.passport_code = $1'];
    if (requirement && requirement !== 'all') { values.push(requirement); where.push(`vr.requirement = $${values.length}`); }
    if (search) { values.push(`%${search}%`); where.push(`(c.name ILIKE $${values.length} OR c.code ILIKE $${values.length})`); }
    const result = await db.query({ text: `SELECT c.code,c.name,vr.requirement,vr.max_stay_days,vr.source_name,vr.source_url,vr.verified_at,vr.confidence FROM visa_rules vr JOIN countries c ON c.code=vr.destination_code WHERE ${where.join(' AND ')} ORDER BY c.name`, values });
    const data = result.rows.map(row => ({ code: row.code.trim().toLowerCase(), name: row.name, requirement: row.requirement, status: labels[row.requirement] || row.requirement, color: colors[row.requirement] || 'amber', days: row.max_stay_days ? `${row.max_stay_days} jours` : 'Durée à vérifier', checked: row.verified_at, source: row.source_name, sourceUrl: row.source_url, confidence: row.confidence }));
    return NextResponse.json({ data, meta: { passport, count: data.length, source: 'postgresql' } });
  } catch (error) { console.error('Countries API failed:', error); return NextResponse.json({ error: 'Impossible de charger les pays depuis PostgreSQL.' }, { status: 503 }); }
}
