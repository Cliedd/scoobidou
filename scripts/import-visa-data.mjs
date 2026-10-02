import fs from 'node:fs';
import readline from 'node:readline';
import pg from 'pg';

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required');

const pool = new Pool({ connectionString, max: 2 });
const client = await pool.connect();
const sourceFile = new URL('../data/visa-requirements.csv', import.meta.url);
const sourceUrl = 'https://github.com/maxix7/visa-requirements-dataset';
try {
  await client.query(fs.readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8'));
  await client.query('BEGIN');
  const rl = readline.createInterface({ input: fs.createReadStream(sourceFile), crlfDelay: Infinity });
  let first = true; let count = 0;
  for await (const line of rl) {
    if (first) { first = false; continue; }
    const [passport, destination, requirement, maxStay, verified, source] = line.split(',').map(value => value?.trim() || null);
    if (!passport || !destination || !requirement) continue;
    await client.query(`INSERT INTO countries(code, name) VALUES ($1, $1), ($2, $2) ON CONFLICT (code) DO NOTHING`, [passport, destination]);
    await client.query(`INSERT INTO visa_rules(passport_code,destination_code,requirement,max_stay_days,verified_at,source_name,source_url,confidence)
      VALUES ($1,$2,$3,$4,$5,$6,$7,'dataset')
      ON CONFLICT (passport_code,destination_code) DO UPDATE SET requirement=EXCLUDED.requirement,max_stay_days=EXCLUDED.max_stay_days,verified_at=EXCLUDED.verified_at,source_name=EXCLUDED.source_name,source_url=EXCLUDED.source_url,updated_at=now()`,
      [passport, destination, requirement, maxStay ? Number(maxStay) : null, verified || null, source || null, sourceUrl]);
    count++;
  }
  await client.query('COMMIT');
  console.log(`Imported ${count} visa rules from maxix7 (CC BY 4.0).`);
} catch (error) { await client.query('ROLLBACK'); throw error; }
finally { client.release(); await pool.end(); }
