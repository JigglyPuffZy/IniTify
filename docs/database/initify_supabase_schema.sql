-- =============================================================================
-- IniTify / HeatHits — SUPABASE SQL Editor (PostgreSQL)
-- Paste this ENTIRE file into: Supabase Dashboard → SQL Editor → New query → Run
-- Do NOT use initify_mysql_schema.sql here (that is for XAMPP/phpMyAdmin only)
-- =============================================================================

-- Optional: drop existing objects when re-running during development
-- DROP VIEW IF EXISTS v_emergency_summary;
-- DROP VIEW IF EXISTS v_latest_user_assessments;

-- ENUM types
DO $$ BEGIN
  CREATE TYPE activity_level AS ENUM ('Low', 'Moderate', 'High');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE hydration_status AS ENUM ('Well hydrated', 'Moderately hydrated', 'Dehydrated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE heat_data_source AS ENUM ('DOST-PAGASA', 'dev_manual', 'cached');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE risk_level AS ENUM ('LOW', 'MODERATE', 'HIGH', 'EXTREME');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE assessment_source AS ENUM ('decision-tree', 'unavailable');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE recommendation_type AS ENUM ('hydration', 'rest', 'seek_shade', 'limit_outdoor_activities');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE alert_delivery_status AS ENUM ('scheduled', 'sent', 'failed', 'permission_denied');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE emergency_alert_type AS ENUM ('popup', 'local_notification');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE sms_sent_status AS ENUM ('prepared', 'sent', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE location_context AS ENUM ('setup', 'dashboard', 'assessment', 'emergency', 'hospital', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 1. USERS & PROFILE
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  device_uuid VARCHAR(64) NOT NULL UNIQUE,
  display_name VARCHAR(120) NOT NULL,
  study_area_city VARCHAR(80) DEFAULT 'Tuguegarao City',
  study_area_province VARCHAR(80) DEFAULT 'Cagayan',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_risk_profiles (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  age SMALLINT NOT NULL CHECK (age >= 0 AND age <= 120),
  health_condition VARCHAR(120) NOT NULL,
  activity_level activity_level NOT NULL,
  hydration_status hydration_status NOT NULL,
  is_current BOOLEAN NOT NULL DEFAULT TRUE,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_risk_profiles_user ON user_risk_profiles(user_id);

CREATE TABLE IF NOT EXISTS emergency_contacts (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contact_name VARCHAR(120) NOT NULL,
  contact_phone VARCHAR(30) NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_emergency_contacts_user ON emergency_contacts(user_id);

-- 2. PAGASA / HEAT INDEX
CREATE TABLE IF NOT EXISTS heat_index_readings (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  heat_index_c NUMERIC(5,2) NOT NULL,
  data_source heat_data_source NOT NULL DEFAULT 'DOST-PAGASA',
  pagasa_provider VARCHAR(30),
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  is_cached BOOLEAN NOT NULL DEFAULT FALSE,
  retrieved_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_heat_readings_user_time ON heat_index_readings(user_id, retrieved_at);

-- 3. DECISION TREE / ASSESSMENT
CREATE TABLE IF NOT EXISTS risk_assessments (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  heat_reading_id BIGINT REFERENCES heat_index_readings(id) ON DELETE SET NULL,
  risk_level risk_level,
  assessment_source assessment_source NOT NULL DEFAULT 'decision-tree',
  message TEXT,
  heat_index_c NUMERIC(5,2),
  input_age SMALLINT,
  input_health_condition VARCHAR(120),
  input_activity_level VARCHAR(20),
  input_hydration_status VARCHAR(40),
  input_latitude NUMERIC(10,7),
  input_longitude NUMERIC(10,7),
  decision_tree_version VARCHAR(60),
  assessed_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_assessments_user_time ON risk_assessments(user_id, assessed_at);
CREATE INDEX IF NOT EXISTS idx_assessments_level ON risk_assessments(risk_level);

-- 4. RECOMMENDATIONS
CREATE TABLE IF NOT EXISTS recommendation_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assessment_id BIGINT REFERENCES risk_assessments(id) ON DELETE SET NULL,
  risk_level risk_level NOT NULL,
  recommendation_type recommendation_type NOT NULL,
  title VARCHAR(160) NOT NULL,
  description TEXT NOT NULL,
  viewed_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_recommendations_user ON recommendation_logs(user_id);

-- 5. HEAT ALERTS
CREATE TABLE IF NOT EXISTS heat_alert_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assessment_id BIGINT REFERENCES risk_assessments(id) ON DELETE SET NULL,
  risk_level risk_level NOT NULL,
  summary TEXT NOT NULL,
  delivery_status alert_delivery_status NOT NULL DEFAULT 'sent',
  sent_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_heat_alerts_user ON heat_alert_logs(user_id);

-- 6. EMERGENCY (includes SMS log table)
CREATE TABLE IF NOT EXISTS emergency_events (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assessment_id BIGINT REFERENCES risk_assessments(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL,
  activated_at TIMESTAMPTZ,
  indicator_extreme_heat BOOLEAN NOT NULL DEFAULT FALSE,
  indicator_failed_prompts BOOLEAN NOT NULL DEFAULT FALSE,
  indicator_inactivity BOOLEAN NOT NULL DEFAULT FALSE,
  failed_prompt_threshold INT,
  inactivity_threshold_min INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_emergency_events_user ON emergency_events(user_id);

CREATE TABLE IF NOT EXISTS safety_prompt_responses (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emergency_event_id BIGINT REFERENCES emergency_events(id) ON DELETE SET NULL,
  responded_ok BOOLEAN NOT NULL,
  responded_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_safety_prompts_user ON safety_prompt_responses(user_id);

CREATE TABLE IF NOT EXISTS emergency_active_alerts (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emergency_event_id BIGINT REFERENCES emergency_events(id) ON DELETE SET NULL,
  triggered_reasons TEXT NOT NULL,
  alert_type emergency_alert_type NOT NULL DEFAULT 'local_notification',
  delivered_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_emergency_alerts_user ON emergency_active_alerts(user_id);

-- SMS / emergency contact notification log
CREATE TABLE IF NOT EXISTS emergency_contact_notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emergency_event_id BIGINT REFERENCES emergency_events(id) ON DELETE SET NULL,
  contact_name VARCHAR(120) NOT NULL,
  contact_phone VARCHAR(30) NOT NULL,
  heat_risk_level risk_level,
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  nearest_hospital VARCHAR(200),
  estimated_travel_time VARCHAR(60),
  is_development_mode BOOLEAN NOT NULL DEFAULT TRUE,
  sent_status sms_sent_status NOT NULL DEFAULT 'prepared',
  sent_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_contact_notifications_user ON emergency_contact_notifications(user_id);

CREATE TABLE IF NOT EXISTS emergency_hotline_calls (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  hotline_label VARCHAR(160) NOT NULL,
  phone_dialed VARCHAR(30) NOT NULL,
  dialed_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_hotline_calls_user ON emergency_hotline_calls(user_id);

-- 7. HOSPITALS
CREATE TABLE IF NOT EXISTS hospitals (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL UNIQUE,
  address VARCHAR(255) NOT NULL,
  city VARCHAR(80) NOT NULL DEFAULT 'Tuguegarao City',
  province VARCHAR(80) NOT NULL DEFAULT 'Cagayan',
  latitude NUMERIC(10,7) NOT NULL,
  longitude NUMERIC(10,7) NOT NULL,
  phone VARCHAR(30),
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS hospital_lookups (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  hospital_id INT REFERENCES hospitals(id) ON DELETE SET NULL,
  provider VARCHAR(40) NOT NULL DEFAULT 'static-tuguegarao',
  hospital_name VARCHAR(200) NOT NULL,
  hospital_address VARCHAR(255),
  hospital_latitude NUMERIC(10,7) NOT NULL,
  hospital_longitude NUMERIC(10,7) NOT NULL,
  user_latitude NUMERIC(10,7),
  user_longitude NUMERIC(10,7),
  distance_km NUMERIC(6,2),
  estimated_travel_time VARCHAR(60),
  maps_provider VARCHAR(20),
  looked_up_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_hospital_lookups_user ON hospital_lookups(user_id);

-- 8. GPS
CREATE TABLE IF NOT EXISTS location_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  latitude NUMERIC(10,7) NOT NULL,
  longitude NUMERIC(10,7) NOT NULL,
  accuracy_m NUMERIC(8,2),
  context location_context NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_location_logs_user ON location_logs(user_id);

-- 9. OFFLINE CACHE
CREATE TABLE IF NOT EXISTS offline_cache_snapshots (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  heat_reading_id BIGINT REFERENCES heat_index_readings(id) ON DELETE SET NULL,
  assessment_id BIGINT REFERENCES risk_assessments(id) ON DELETE SET NULL,
  snapshot_at TIMESTAMPTZ NOT NULL,
  notes VARCHAR(255)
);
CREATE INDEX IF NOT EXISTS idx_offline_cache_user ON offline_cache_snapshots(user_id);

-- 10. SYSTEM CONFIG
CREATE TABLE IF NOT EXISTS system_config (
  config_key VARCHAR(80) PRIMARY KEY,
  config_value TEXT NOT NULL,
  description VARCHAR(255),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Reference data: major Tuguegarao City hospitals (matches app src/data/tuguegarao-hospitals.ts)
INSERT INTO hospitals (name, address, city, province, latitude, longitude, phone) VALUES
  ('Cagayan Valley Medical Center (CVMC)', 'Maharlika Highway, Carig Sur, Tuguegarao City, Cagayan', 'Tuguegarao City', 'Cagayan', 17.6097000, 121.7283000, '(078) 302-0000'),
  ('Tuguegarao City People''s General Hospital', 'Luna Street, Centro 6, Tuguegarao City, Cagayan', 'Tuguegarao City', 'Cagayan', 17.6131000, 121.7269000, '(078) 304-1114'),
  ('St. Paul Hospital of Tuguegarao', 'Luna Street Extension, Ugac Norte, Tuguegarao City, Cagayan', 'Tuguegarao City', 'Cagayan', 17.6139700, 121.7072700, '(078) 844-2520'),
  ('Divine Mercy Wellness Center', 'Arellano cor. Burgos Street, Centro 6, Tuguegarao City, Cagayan', 'Tuguegarao City', 'Cagayan', 17.6156160, 121.7293090, '(078) 844-4624'),
  ('Holy Infant Hospital', '54 Washington Street, Tuguegarao City, Cagayan', 'Tuguegarao City', 'Cagayan', 17.6159530, 121.7258450, '(078) 844-1039'),
  ('Cagayan United Doctors Medical Center (CUDMC)', '7 Bagay Road, Caritan Centro, Tuguegarao City, Cagayan', 'Tuguegarao City', 'Cagayan', 17.6035000, 121.7178000, '(078) 304-8888'),
  ('Dr. Ronald P. Guzman Medical Center', 'Enrile Boulevard, Carig, Tuguegarao City, Cagayan', 'Tuguegarao City', 'Cagayan', 17.6008000, 121.7195000, '(078) 304-0925'),
  ('Raphael General Hospital', 'Bagay Road, Atulayan Sur, Tuguegarao City, Cagayan', 'Tuguegarao City', 'Cagayan', 17.5988000, 121.7135000, '(078) 846-0815'),
  ('Maricar Hospital', 'Bagay Road, Tuguegarao City, Cagayan', 'Tuguegarao City', 'Cagayan', 17.6012000, 121.7154000, NULL),
  ('ACE Medical Center - Tuguegarao', 'Pallua Road, Pallua Norte, Tuguegarao City, Cagayan', 'Tuguegarao City', 'Cagayan', 17.6285000, 121.7320000, '(078) 846-8888')
ON CONFLICT (name) DO NOTHING;

INSERT INTO system_config (config_key, config_value, description) VALUES
  ('decision_tree_version', '1.0.0-trained', 'Active decision tree rules version'),
  ('emergency_failed_prompt_count', '3', 'Failed safety prompts before indicator'),
  ('emergency_inactivity_minutes', '15', 'Inactivity minutes before indicator'),
  ('emergency_safety_prompt_interval_minutes', '5', 'Safety prompt interval'),
  ('emergency_dev_mode', 'true', 'SMS not sent when true'),
  ('study_area', 'Tuguegarao City, Cagayan', 'HeatHits test location'),
  ('first_aid_approved', 'true', 'First-aid content approved flag')
ON CONFLICT (config_key) DO UPDATE SET
  config_value = EXCLUDED.config_value,
  updated_at = NOW();

-- Views
CREATE OR REPLACE VIEW v_latest_user_assessments AS
SELECT
  u.id AS user_id,
  u.display_name,
  ra.id AS assessment_id,
  ra.risk_level,
  ra.heat_index_c,
  ra.assessed_at
FROM users u
LEFT JOIN LATERAL (
  SELECT * FROM risk_assessments ra2
  WHERE ra2.user_id = u.id
  ORDER BY ra2.assessed_at DESC
  LIMIT 1
) ra ON TRUE;

CREATE OR REPLACE VIEW v_emergency_summary AS
SELECT
  u.display_name,
  ee.is_active,
  ee.activated_at,
  ee.indicator_extreme_heat,
  ee.indicator_failed_prompts,
  ee.indicator_inactivity,
  ee.created_at
FROM emergency_events ee
JOIN users u ON u.id = ee.user_id
ORDER BY ee.created_at DESC;

-- Verify (run separately in SQL editor):
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
-- ORDER BY table_name;
