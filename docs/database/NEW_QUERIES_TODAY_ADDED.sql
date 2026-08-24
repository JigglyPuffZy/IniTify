-- =============================================================================
-- IniTify — NEW QUERIES TODAY ADDED
-- File: docs/database/NEW_QUERIES_TODAY_ADDED.sql
-- Date: 2026-08-21
-- =============================================================================
-- Paste into Supabase → SQL Editor.
-- Requires: initify_supabase_schema.sql already applied (users, hospitals, etc.).
-- Safe to re-run.
--
-- NOTE: There is NO table named public.assessment_records in IniTify.
--       That name caused ERROR 42P01. Use weather_refresh_logs instead for
--       refresh history (auto 15-min + user Refresh / pull-to-refresh).
--
-- HOW TO RUN (3 short pastes — avoids enum / "Failed to fetch" issues):
--   A) Paste SECTION A only → Run
--   B) Paste SECTION B only → Run
--   C) Paste SECTION C only → Run
-- =============================================================================


-- =============================================================================
-- SECTION A — Check-in location context (nearest hospital CTA GPS)
-- Paste THIS BLOCK ONLY → Run → wait for Success
-- =============================================================================
ALTER TYPE location_context ADD VALUE IF NOT EXISTS 'check_in';


-- =============================================================================
-- SECTION B — Hospital lookup source + seed Tuguegarao hospitals
-- Paste THIS BLOCK ONLY → Run
-- =============================================================================
ALTER TABLE hospital_lookups
  ADD COLUMN IF NOT EXISTS lookup_source VARCHAR(40) NOT NULL DEFAULT 'hospital_tab';

COMMENT ON COLUMN hospital_lookups.lookup_source IS
  'hospital_tab | emergency | check_in_ai';

CREATE INDEX IF NOT EXISTS idx_hospital_lookups_source
  ON hospital_lookups (lookup_source, looked_up_at DESC);

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
ON CONFLICT (name) DO UPDATE SET
  address = EXCLUDED.address,
  city = EXCLUDED.city,
  province = EXCLUDED.province,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  phone = EXCLUDED.phone,
  is_active = TRUE;

SELECT COUNT(*) AS hospital_count FROM hospitals WHERE is_active = TRUE;


-- =============================================================================
-- SECTION C — Weather auto-refresh logs (15 min + user Refresh)
-- Replaces the wrong "assessment_records" script.
--
-- Mapping (old wrong names → IniTify):
--   live_refresh      → trigger = 'auto_15m'
--   user_refresh      → trigger = 'manual'
--   app open / resume → trigger = 'app_open' | 'foreground'
-- =============================================================================
DO $$ BEGIN
  CREATE TYPE weather_refresh_trigger AS ENUM (
    'app_open',
    'manual',
    'auto_15m',
    'foreground'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE weather_refresh_status AS ENUM (
    'success',
    'cached',
    'unavailable',
    'invalid'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS weather_refresh_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trigger weather_refresh_trigger NOT NULL,
  status weather_refresh_status NOT NULL,
  provider VARCHAR(40) NOT NULL DEFAULT 'open-meteo',
  heat_index_c NUMERIC(5,2),
  temp_c NUMERIC(5,2),
  feels_like_c NUMERIC(5,2),
  humidity NUMERIC(5,2),
  condition_text VARCHAR(160),
  interval_minutes INT NOT NULL DEFAULT 15,
  message TEXT,
  refreshed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_weather_refresh_user_time
  ON weather_refresh_logs (user_id, refreshed_at DESC);

CREATE INDEX IF NOT EXISTS idx_weather_refresh_trigger
  ON weather_refresh_logs (trigger, refreshed_at DESC);

COMMENT ON TABLE weather_refresh_logs IS
  'Live Open-Meteo refresh history. auto_15m = timer; manual = user Refresh / pull-to-refresh.';

COMMENT ON COLUMN weather_refresh_logs.trigger IS
  'app_open | manual (user refresh) | auto_15m (15-min) | foreground';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'initify_allow_app_sync') THEN
    PERFORM public.initify_allow_app_sync(
      'public.weather_refresh_logs'::regclass,
      'initify_weather_refresh_logs_app_sync'
    );
  ELSE
    ALTER TABLE weather_refresh_logs ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS initify_weather_refresh_logs_app_sync ON weather_refresh_logs;
    CREATE POLICY initify_weather_refresh_logs_app_sync
      ON weather_refresh_logs
      FOR ALL TO anon, authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

GRANT ALL ON TABLE weather_refresh_logs TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE weather_refresh_logs_id_seq TO anon, authenticated;

-- Example: latest user (manual) refreshes
-- SELECT id, trigger, status, heat_index_c, temp_c, condition_text, refreshed_at
-- FROM weather_refresh_logs
-- WHERE trigger = 'manual'
-- ORDER BY refreshed_at DESC
-- LIMIT 20;

-- Example: latest auto 15-min refreshes
-- SELECT id, trigger, status, heat_index_c, refreshed_at
-- FROM weather_refresh_logs
-- WHERE trigger = 'auto_15m'
-- ORDER BY refreshed_at DESC
-- LIMIT 20;

SELECT COUNT(*) AS weather_refresh_log_count FROM weather_refresh_logs;

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'weather_refresh_logs'
ORDER BY ordinal_position;
