import { Pool } from 'pg';

declare global { var passportlyPool: Pool | undefined }

export const db = process.env.DATABASE_URL
  ? (global.passportlyPool ??= new Pool({ connectionString: process.env.DATABASE_URL, max: 5, idleTimeoutMillis: 30_000, connectionTimeoutMillis: 5_000 }))
  : null;

export async function ensureSchema() {
  if (!db) return false;
  await db.query(`
    CREATE TABLE IF NOT EXISTS countries (
      code CHAR(2) PRIMARY KEY,
      name TEXT NOT NULL,
      kind TEXT NOT NULL DEFAULT 'country',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS visa_rules (
      id BIGSERIAL PRIMARY KEY,
      passport_code VARCHAR(3) NOT NULL,
      destination_code VARCHAR(3) NOT NULL,
      status VARCHAR(40) NOT NULL,
      stay_days INTEGER,
      fee VARCHAR(120),
      source_name TEXT NOT NULL,
      source_url TEXT,
      checked_at DATE,
      confidence VARCHAR(40) DEFAULT 'unverified',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(passport_code, destination_code)
    );
    ALTER TABLE visa_rules ADD COLUMN IF NOT EXISTS requirement TEXT;
    ALTER TABLE visa_rules ADD COLUMN IF NOT EXISTS max_stay_days INTEGER;
    ALTER TABLE visa_rules ADD COLUMN IF NOT EXISTS verified_at DATE;
    ALTER TABLE visa_rules ALTER COLUMN status DROP NOT NULL;
    UPDATE visa_rules SET requirement = CASE
      WHEN status = 'Visa à l’arrivée' THEN 'visa_on_arrival'
      WHEN status = 'eTA obligatoire' THEN 'eta'
      WHEN status = 'Visa requis' THEN 'visa_required'
      ELSE 'visa_required' END
      WHERE requirement IS NULL;
    CREATE INDEX IF NOT EXISTS visa_rules_passport_idx ON visa_rules(passport_code);
    CREATE INDEX IF NOT EXISTS visa_rules_destination_idx ON visa_rules(destination_code);
  `);
  return true;
}
