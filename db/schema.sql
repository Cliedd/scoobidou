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
  review_status TEXT NOT NULL DEFAULT 'approved' CHECK (review_status IN ('pending','approved','rejected')),
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  UNIQUE (passport_code, destination_code)
);

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

CREATE INDEX IF NOT EXISTS visa_rules_passport_idx ON visa_rules(passport_code);
CREATE INDEX IF NOT EXISTS visa_rules_destination_idx ON visa_rules(destination_code);
CREATE INDEX IF NOT EXISTS visa_rules_requirement_idx ON visa_rules(requirement);
CREATE INDEX IF NOT EXISTS visa_rules_review_status_idx ON visa_rules(review_status);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user','editor','admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE visa_rules ADD CONSTRAINT visa_rules_reviewed_by_fk FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL;
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id BIGSERIAL PRIMARY KEY, actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL, entity_type TEXT NOT NULL, entity_id TEXT, before_data JSONB, after_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS testimonials (
  id BIGSERIAL PRIMARY KEY, user_id UUID REFERENCES users(id) ON DELETE SET NULL, author_name TEXT NOT NULL,
  destination TEXT NOT NULL, content TEXT NOT NULL, rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')), created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
