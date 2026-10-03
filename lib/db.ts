import { Pool } from 'pg';

declare global { var passportlyPool: Pool | undefined; var passportlySchemaPromise: Promise<boolean> | undefined }

export const db = process.env.DATABASE_URL
  ? (global.passportlyPool ??= new Pool({ connectionString: process.env.DATABASE_URL, max: 5, idleTimeoutMillis: 30_000, connectionTimeoutMillis: 5_000 }))
  : null;

export async function ensureSchema() {
  if(!db) return false;
  if(!global.passportlySchemaPromise) global.passportlySchemaPromise=initializeSchema().catch(error=>{global.passportlySchemaPromise=undefined;throw error;});
  return global.passportlySchemaPromise;
}
async function initializeSchema() {
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
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
    DO $$ BEGIN ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('user','editor','admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TIMESTAMPTZ NOT NULL
    );
    CREATE TABLE IF NOT EXISTS rate_limits (
      bucket TEXT PRIMARY KEY,
      count INTEGER NOT NULL DEFAULT 0,
      window_started_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS saved_trips (
      id BIGSERIAL PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      passport_code CHAR(2) NOT NULL,
      destination_code CHAR(2) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE(user_id, passport_code, destination_code)
    );
    CREATE TABLE IF NOT EXISTS visa_alerts (
      id BIGSERIAL PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      passport_code CHAR(2) NOT NULL,
      destination_code CHAR(2),
      email_enabled BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    ALTER TABLE visa_rules ADD COLUMN IF NOT EXISTS review_status TEXT NOT NULL DEFAULT 'approved';
    ALTER TABLE visa_rules ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id);
    ALTER TABLE visa_rules ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
    CREATE TABLE IF NOT EXISTS admin_audit_log (
      id BIGSERIAL PRIMARY KEY,
      actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
      action TEXT NOT NULL, entity_type TEXT NOT NULL, entity_id TEXT,
      before_data JSONB, after_data JSONB, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS admin_audit_created_idx ON admin_audit_log(created_at DESC);
    CREATE INDEX IF NOT EXISTS admin_audit_entity_idx ON admin_audit_log(entity_type, entity_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS visa_rules_review_status_idx ON visa_rules(review_status);
    CREATE TABLE IF NOT EXISTS api_keys (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      key_prefix TEXT NOT NULL,
      key_hash TEXT UNIQUE NOT NULL,
      plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free','pro','business')),
      active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      last_used_at TIMESTAMPTZ
    );
    CREATE TABLE IF NOT EXISTS api_usage (
      id BIGSERIAL PRIMARY KEY,
      api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
      request_id TEXT NOT NULL,
      endpoint TEXT NOT NULL,
      status_code INTEGER NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS api_usage_key_date_idx ON api_usage(api_key_id, created_at);
    CREATE TABLE IF NOT EXISTS stripe_events (
      id TEXT PRIMARY KEY, type TEXT NOT NULL, payload JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS stripe_api_keys (
      api_key_id UUID PRIMARY KEY REFERENCES api_keys(id) ON DELETE CASCADE,
      stripe_customer_id TEXT NOT NULL, stripe_subscription_id TEXT UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS monitor_sources (
      id BIGSERIAL PRIMARY KEY, name TEXT NOT NULL, url TEXT NOT NULL UNIQUE,
      parser TEXT NOT NULL DEFAULT 'text', enabled BOOLEAN NOT NULL DEFAULT true,
      last_checked_at TIMESTAMPTZ, last_fingerprint TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS monitor_snapshots (
      id BIGSERIAL PRIMARY KEY, source_id BIGINT NOT NULL REFERENCES monitor_sources(id) ON DELETE CASCADE,
      fingerprint TEXT NOT NULL, content TEXT NOT NULL, fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE(source_id, fingerprint)
    );
    CREATE TABLE IF NOT EXISTS monitor_proposals (
      id BIGSERIAL PRIMARY KEY, source_id BIGINT NOT NULL REFERENCES monitor_sources(id) ON DELETE CASCADE,
      previous_snapshot_id BIGINT REFERENCES monitor_snapshots(id), current_snapshot_id BIGINT NOT NULL REFERENCES monitor_snapshots(id),
      diff TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
      reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL, reviewed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS monitor_proposals_status_idx ON monitor_proposals(status, created_at DESC);
    CREATE TABLE IF NOT EXISTS notification_preferences (
      user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      email_enabled BOOLEAN NOT NULL DEFAULT true, digest_enabled BOOLEAN NOT NULL DEFAULT true,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS notification_deliveries (
      id BIGSERIAL PRIMARY KEY, user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      proposal_id BIGINT NOT NULL REFERENCES monitor_proposals(id) ON DELETE CASCADE,
      email TEXT NOT NULL, delivered_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(user_id, proposal_id)
    );
    CREATE TABLE IF NOT EXISTS notification_attempts (
      id BIGSERIAL PRIMARY KEY, user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      proposal_id BIGINT NOT NULL REFERENCES monitor_proposals(id) ON DELETE CASCADE,
      email TEXT NOT NULL, provider TEXT NOT NULL DEFAULT 'resend', sent BOOLEAN NOT NULL,
      reason TEXT, provider_detail TEXT, attempted_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS notification_attempts_proposal_idx ON notification_attempts(proposal_id, attempted_at DESC);
    CREATE TABLE IF NOT EXISTS saved_checklists (
      id BIGSERIAL PRIMARY KEY, user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      guide_slug TEXT NOT NULL, checked JSONB NOT NULL DEFAULT '[]'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(user_id, guide_slug)
    );
    CREATE TABLE IF NOT EXISTS saved_itineraries (
      id BIGSERIAL PRIMARY KEY, user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL DEFAULT 'Mon itinéraire', stays JSONB NOT NULL, reference_date DATE NOT NULL,
      calculation JSONB, updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS testimonials (
      id BIGSERIAL PRIMARY KEY, user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      author_name TEXT NOT NULL, destination TEXT NOT NULL, content TEXT NOT NULL,
      rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5), status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    ALTER TABLE saved_checklists ADD COLUMN IF NOT EXISTS tasks JSONB NOT NULL DEFAULT '[]'::jsonb;
    ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
    ALTER TABLE visa_alerts ADD COLUMN IF NOT EXISTS baseline_requirement TEXT;
    ALTER TABLE visa_alerts ADD COLUMN IF NOT EXISTS baseline_days INTEGER;
  `);
  return true;
}
