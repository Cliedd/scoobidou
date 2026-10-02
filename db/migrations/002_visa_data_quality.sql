-- Compatible with both the original schema.sql and databases bootstrapped by lib/db.ts.
CREATE TABLE IF NOT EXISTS visa_rule_history (
  id BIGSERIAL PRIMARY KEY,
  visa_rule_id BIGINT NOT NULL REFERENCES visa_rules(id) ON DELETE CASCADE,
  requirement TEXT NOT NULL,
  max_stay_days INTEGER,
  source_url TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  changed_by TEXT NOT NULL DEFAULT 'import'
);

CREATE INDEX IF NOT EXISTS visa_rule_history_rule_idx ON visa_rule_history(visa_rule_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS visa_rules_source_idx ON visa_rules(source_url);
CREATE INDEX IF NOT EXISTS visa_rules_verified_idx ON visa_rules(verified_at);

DO $$ BEGIN
  ALTER TABLE visa_rules ADD CONSTRAINT visa_rules_codes_iso2_check
    CHECK (passport_code ~ '^[A-Z]{2}$' AND destination_code ~ '^[A-Z]{2}$');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE visa_rules ADD CONSTRAINT visa_rules_max_stay_nonnegative_check
    CHECK (max_stay_days IS NULL OR max_stay_days >= 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE visa_rules ADD CONSTRAINT visa_rules_requirement_check
    CHECK (requirement IN ('visa_free', 'eta', 'evisa', 'visa_on_arrival', 'visa_required', 'no_admission'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
