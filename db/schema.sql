CREATE TABLE IF NOT EXISTS countries (
  code CHAR(2) PRIMARY KEY,
  name TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'country',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS visa_rules (
  id BIGSERIAL PRIMARY KEY,
  passport_code CHAR(2) NOT NULL REFERENCES countries(code),
  destination_code CHAR(2) NOT NULL REFERENCES countries(code),
  requirement TEXT NOT NULL CHECK (requirement IN ('visa_free','eta','evisa','visa_on_arrival','visa_required','no_admission')),
  max_stay_days INTEGER,
  verified_at DATE,
  source_url TEXT,
  source_name TEXT,
  confidence TEXT NOT NULL DEFAULT 'dataset',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (passport_code, destination_code)
);

CREATE TABLE IF NOT EXISTS visa_rule_history (
  id BIGSERIAL PRIMARY KEY,
  visa_rule_id BIGINT NOT NULL REFERENCES visa_rules(id) ON DELETE CASCADE,
  requirement TEXT NOT NULL,
  max_stay_days INTEGER,
  source_url TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  changed_by TEXT NOT NULL DEFAULT 'import'
);

CREATE INDEX IF NOT EXISTS visa_rules_passport_idx ON visa_rules(passport_code);
CREATE INDEX IF NOT EXISTS visa_rules_destination_idx ON visa_rules(destination_code);
CREATE INDEX IF NOT EXISTS visa_rules_requirement_idx ON visa_rules(requirement);
