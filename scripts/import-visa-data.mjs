import fs from 'node:fs';
import pg from 'pg';
import { parseVisaCsv } from './visa-csv.mjs';

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required');

const pool = new Pool({ connectionString, max: 2 });
const client = await pool.connect();
const sourceFile = new URL('../data/visa-requirements.csv', import.meta.url);
const sourceUrl = 'https://github.com/maxix7/visa-requirements-dataset';
try {
  const rows = parseVisaCsv(fs.readFileSync(sourceFile, 'utf8'));
  await client.query(fs.readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8'));
  await client.query(fs.readFileSync(new URL('../db/migrations/002_visa_data_quality.sql', import.meta.url), 'utf8'));
  await client.query('BEGIN');
  let count = 0;
  for (const { passport, destination, requirement, maxStay, verified, source } of rows) {
    await client.query(`INSERT INTO countries(code, name) VALUES ($1, $2), ($3, $4) ON CONFLICT (code) DO NOTHING`, [passport, passport, destination, destination]);
    const previous = await client.query('SELECT * FROM visa_rules WHERE passport_code=$1 AND destination_code=$2', [passport, destination]);
    await client.query(`INSERT INTO visa_rules(passport_code,destination_code,requirement,max_stay_days,verified_at,source_name,source_url,confidence)
      VALUES ($1,$2,$3,$4,$5,$6,$7,'dataset')
      ON CONFLICT (passport_code,destination_code) DO UPDATE SET requirement=EXCLUDED.requirement,max_stay_days=EXCLUDED.max_stay_days,verified_at=EXCLUDED.verified_at,source_name=EXCLUDED.source_name,source_url=EXCLUDED.source_url,updated_at=now()`,
      [passport, destination, requirement, maxStay ? Number(maxStay) : null, verified || null, source ? new URL(source).hostname : 'Visa Requirements Dataset', source || sourceUrl]);
    const nextMaxStay = maxStay ? Number(maxStay) : null;
    if (previous.rows[0] && (previous.rows[0].requirement !== requirement || previous.rows[0].max_stay_days !== nextMaxStay || previous.rows[0].source_url !== (source || null) || String(previous.rows[0].verified_at || '').slice(0, 10) !== (verified || ''))) {
      await client.query('INSERT INTO visa_rule_history(visa_rule_id,requirement,max_stay_days,source_url,source_name,verified_at,confidence,changed_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)', [previous.rows[0].id, previous.rows[0].requirement, previous.rows[0].max_stay_days, previous.rows[0].source_url, previous.rows[0].source_name, previous.rows[0].verified_at, previous.rows[0].confidence, 'import']);
    }
    count++;
  }
  await client.query('COMMIT');
  console.log(`Imported ${count} visa rules from maxix7 (CC BY 4.0).`);
} catch (error) { await client.query('ROLLBACK'); throw error; }
finally { client.release(); await pool.end(); }
