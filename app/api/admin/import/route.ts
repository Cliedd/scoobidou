import fs from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { db, ensureSchema } from '../../../../lib/db';

export const maxDuration = 300;

export async function POST(request: Request) {
  const token = request.headers.get('x-import-token');
  if (!process.env.IMPORT_TOKEN || token !== process.env.IMPORT_TOKEN) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!db) return NextResponse.json({ error: 'DATABASE_URL is not configured' }, { status: 503 });
  await ensureSchema();
  const csv = await fs.readFile(path.join(process.cwd(), 'data/visa-requirements.csv'), 'utf8');
  const lines = csv.split(/\r?\n/).slice(1).filter(Boolean);
  const client = await db.connect();
  let imported = 0;
  try {
    await client.query('BEGIN');
    for (let offset = 0; offset < lines.length; offset += 250) {
      const batch = lines.slice(offset, offset + 250).map(line => line.split(',').map(value => value?.trim() || null)).filter(row => row[0] && row[1] && row[2]);
      for (const [passport, destination, requirement, maxStay, verified, source] of batch) {
        await client.query('INSERT INTO countries(code,name) VALUES ($1,$2),($3,$4) ON CONFLICT (code) DO NOTHING', [passport, passport, destination, destination]);
        await client.query(`INSERT INTO visa_rules(passport_code,destination_code,requirement,max_stay_days,verified_at,source_name,source_url,confidence) VALUES ($1,$2,$3,$4,$5,$6,$7,'dataset') ON CONFLICT (passport_code,destination_code) DO UPDATE SET requirement=EXCLUDED.requirement,max_stay_days=EXCLUDED.max_stay_days,verified_at=EXCLUDED.verified_at,source_name=EXCLUDED.source_name,source_url=EXCLUDED.source_url,updated_at=now()`, [passport, destination, requirement, maxStay ? Number(maxStay) : null, verified || null, source || null, 'https://github.com/maxix7/visa-requirements-dataset']);
        imported++;
      }
    }
    await client.query('COMMIT');
    return NextResponse.json({ ok: true, imported, source: 'maxix7/visa-requirements-dataset' });
  } catch (error) { await client.query('ROLLBACK'); console.error(error); return NextResponse.json({ error: 'Import failed' }, { status: 500 }); }
  finally { client.release(); }
}
