-- Compatible with both the original schema.sql and databases bootstrapped by lib/db.ts.
CREATE TABLE IF NOT EXISTS visa_rule_history (
  id BIGSERIAL PRIMARY KEY,
  visa_rule_id BIGINT NOT NULL REFERENCES visa_rules(id) ON DELETE CASCADE,
  requirement TEXT NOT NULL,
  max_stay_days INTEGER,
  source_url TEXT,
  source_name TEXT,
  verified_at DATE,
  confidence TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  changed_by TEXT NOT NULL DEFAULT 'import'
);

CREATE INDEX IF NOT EXISTS visa_rule_history_rule_idx ON visa_rule_history(visa_rule_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS visa_rules_source_idx ON visa_rules(source_url);
CREATE INDEX IF NOT EXISTS visa_rules_verified_idx ON visa_rules(verified_at);
ALTER TABLE visa_rule_history ADD COLUMN IF NOT EXISTS source_name TEXT;
ALTER TABLE visa_rule_history ADD COLUMN IF NOT EXISTS verified_at DATE;
ALTER TABLE visa_rule_history ADD COLUMN IF NOT EXISTS confidence TEXT;
DO $$ BEGIN
  ALTER TABLE visa_rules ADD CONSTRAINT visa_rules_confidence_check
    CHECK (confidence IN ('dataset','verified','community_reviewed','unverified'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE OR REPLACE VIEW visa_data_quality AS
SELECT COUNT(*)::bigint AS rule_count,
       COUNT(DISTINCT passport_code)::bigint AS passport_count,
       COUNT(DISTINCT destination_code)::bigint AS destination_count,
       COUNT(*) FILTER (WHERE source_url IS NULL)::bigint AS missing_source_count,
       COUNT(*) FILTER (WHERE verified_at IS NULL)::bigint AS missing_verified_count,
       COUNT(*) FILTER (WHERE confidence = 'unverified')::bigint AS unverified_count,
       COUNT(*) FILTER (WHERE passport_code = destination_code)::bigint AS self_pair_count
FROM visa_rules;

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
