-- IniTify — Health Check-In & Reminder tables (Supabase PostgreSQL)
-- Run AFTER initify_supabase_schema.sql

DO $$ BEGIN
  CREATE TYPE general_status AS ENUM (
    'Feeling Well',
    'Mild Discomfort',
    'Not Feeling Well'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE reminder_frequency AS ENUM (
    'every_2h',
    'every_4h',
    'every_6h',
    'every_12h',
    'daily',
    'custom',
    'disabled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Extend risk profile snapshot with general status + structured conditions
ALTER TABLE user_risk_profiles
  ADD COLUMN IF NOT EXISTS general_status general_status DEFAULT 'Feeling Well',
  ADD COLUMN IF NOT EXISTS health_conditions TEXT[] DEFAULT '{}';

-- Timestamped check-ins (never overwrite history)
CREATE TABLE IF NOT EXISTS user_check_ins (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  hydration_status hydration_status NOT NULL,
  activity_level activity_level NOT NULL,
  general_status general_status NOT NULL DEFAULT 'Feeling Well',
  notes TEXT,
  check_in_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_check_ins_user_time
  ON user_check_ins(user_id, check_in_time DESC);

-- Per-user reminder preferences
CREATE TABLE IF NOT EXISTS user_reminder_settings (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  reminders_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  frequency reminder_frequency NOT NULL DEFAULT 'every_6h',
  custom_interval_minutes INT NOT NULL DEFAULT 360 CHECK (custom_interval_minutes >= 30),
  quiet_hours_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  quiet_hours_start TIME NOT NULL DEFAULT '22:00',
  quiet_hours_end TIME NOT NULL DEFAULT '07:00',
  last_reminder_sent_at TIMESTAMPTZ,
  next_reminder_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Weather-aware safety prompt acknowledgments (not medical escalation)
CREATE TABLE IF NOT EXISTS weather_safety_acknowledgments (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  heat_index_c NUMERIC(5,2),
  risk_level risk_level,
  acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_weather_safety_ack_user_time
  ON weather_safety_acknowledgments(user_id, acknowledged_at DESC);

-- ---------------------------------------------------------------------------
-- Row Level Security — scoped by user_id (pair with device-bound client filters)
-- ---------------------------------------------------------------------------
ALTER TABLE user_check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_reminder_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE weather_safety_acknowledgments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_check_ins_select_own ON user_check_ins;
CREATE POLICY user_check_ins_select_own ON user_check_ins
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS user_check_ins_insert_own ON user_check_ins;
CREATE POLICY user_check_ins_insert_own ON user_check_ins
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS user_reminder_settings_select_own ON user_reminder_settings;
CREATE POLICY user_reminder_settings_select_own ON user_reminder_settings
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS user_reminder_settings_upsert_own ON user_reminder_settings;
CREATE POLICY user_reminder_settings_upsert_own ON user_reminder_settings
  FOR ALL TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS weather_safety_ack_select_own ON weather_safety_acknowledgments;
CREATE POLICY weather_safety_ack_select_own ON weather_safety_acknowledgments
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS weather_safety_ack_insert_own ON weather_safety_acknowledgments;
CREATE POLICY weather_safety_ack_insert_own ON weather_safety_acknowledgments
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

GRANT SELECT, INSERT ON user_check_ins TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON user_reminder_settings TO anon, authenticated;
GRANT SELECT, INSERT ON weather_safety_acknowledgments TO anon, authenticated;
GRANT ALL ON user_check_ins TO service_role;
GRANT ALL ON user_reminder_settings TO service_role;
GRANT ALL ON weather_safety_acknowledgments TO service_role;
GRANT USAGE, SELECT ON SEQUENCE user_check_ins_id_seq TO service_role;
GRANT USAGE, SELECT ON SEQUENCE user_reminder_settings_id_seq TO service_role;
GRANT USAGE, SELECT ON SEQUENCE weather_safety_acknowledgments_id_seq TO service_role;
