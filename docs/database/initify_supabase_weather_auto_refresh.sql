-- =============================================================================
-- IniTify — Weather auto-refresh (15 min) logs
-- =============================================================================
-- Paste THIS FILE ONLY in Supabase → SQL Editor → Run
--
-- Run AFTER: initify_supabase_schema.sql
-- Safe to re-run.
--
-- App feature: live Open-Meteo weather refreshes every 15 minutes (auto) or
-- on manual / pull-to-refresh. This table stores each refresh for thesis logs.
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
  'IniTify live weather refresh events (auto every 15 min + manual). Provider: Open-Meteo.';

-- App sync policy (anon key used by Expo)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'initify_allow_app_sync'
  ) THEN
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

-- Verify
SELECT COUNT(*) AS weather_refresh_log_count FROM weather_refresh_logs;

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'weather_refresh_logs'
ORDER BY ordinal_position;
