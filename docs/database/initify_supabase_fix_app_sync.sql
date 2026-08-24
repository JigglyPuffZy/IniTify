-- =============================================================================
-- IniTify — Fix app sync 403 (Supabase SQL Editor)
-- Run this AFTER:
--   1) initify_supabase_schema.sql
--   2) initify_supabase_check_in.sql
--   3) initify_supabase_health_safety_kb.sql  (optional but recommended)
--   4) initify_supabase_auth.sql              (if you use Login / Sign up)
--
-- Fixes: POST /users 403 Forbidden, check-in sync, reminders, safety tips KB
-- Safe to re-run (drops and recreates policies).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Grants (anon key used by the mobile app)
-- ---------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Helper — permissive policy for app sync (thesis / device-bound client)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.initify_allow_app_sync(p_table regclass, p_policy text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', p_table);
  EXECUTE format('DROP POLICY IF EXISTS %I ON %s', p_policy, p_table);
  EXECUTE format(
    'CREATE POLICY %I ON %s FOR ALL TO anon, authenticated USING (true) WITH CHECK (true)',
    p_policy,
    p_table
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. Core tables the app writes to (fixes users 403 + profile sync)
-- ---------------------------------------------------------------------------
SELECT public.initify_allow_app_sync('public.users'::regclass, 'initify_users_app_sync');
SELECT public.initify_allow_app_sync('public.user_risk_profiles'::regclass, 'initify_risk_profiles_app_sync');
SELECT public.initify_allow_app_sync('public.emergency_contacts'::regclass, 'initify_emergency_contacts_app_sync');
SELECT public.initify_allow_app_sync('public.heat_index_readings'::regclass, 'initify_heat_readings_app_sync');
SELECT public.initify_allow_app_sync('public.risk_assessments'::regclass, 'initify_assessments_app_sync');
SELECT public.initify_allow_app_sync('public.recommendation_logs'::regclass, 'initify_recommendations_app_sync');
SELECT public.initify_allow_app_sync('public.heat_alert_logs'::regclass, 'initify_heat_alerts_app_sync');
SELECT public.initify_allow_app_sync('public.emergency_events'::regclass, 'initify_emergency_events_app_sync');
SELECT public.initify_allow_app_sync('public.safety_prompt_responses'::regclass, 'initify_safety_prompts_app_sync');
SELECT public.initify_allow_app_sync('public.emergency_active_alerts'::regclass, 'initify_emergency_active_app_sync');
SELECT public.initify_allow_app_sync('public.emergency_contact_notifications'::regclass, 'initify_contact_notif_app_sync');
SELECT public.initify_allow_app_sync('public.emergency_hotline_calls'::regclass, 'initify_hotline_calls_app_sync');
SELECT public.initify_allow_app_sync('public.hospital_lookups'::regclass, 'initify_hospital_lookups_app_sync');
SELECT public.initify_allow_app_sync('public.location_logs'::regclass, 'initify_location_logs_app_sync');
SELECT public.initify_allow_app_sync('public.offline_cache_snapshots'::regclass, 'initify_offline_cache_app_sync');

-- Check-in + reminders (Tify chat, notification reminders)
SELECT public.initify_allow_app_sync('public.user_check_ins'::regclass, 'initify_check_ins_app_sync');
SELECT public.initify_allow_app_sync('public.user_reminder_settings'::regclass, 'initify_reminder_settings_app_sync');
SELECT public.initify_allow_app_sync('public.weather_safety_acknowledgments'::regclass, 'initify_weather_ack_app_sync');

-- Health safety KB (read-only for app — still allow SELECT via policy)
DO $$ BEGIN
  PERFORM public.initify_allow_app_sync('public.health_conditions'::regclass, 'initify_health_conditions_read');
  PERFORM public.initify_allow_app_sync('public.weather_hazards'::regclass, 'initify_weather_hazards_read');
  PERFORM public.initify_allow_app_sync('public.health_safety_tips'::regclass, 'initify_health_safety_tips_read');
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'Health KB tables missing — run initify_supabase_health_safety_kb.sql';
END $$;

-- system_config health check
DO $$ BEGIN
  PERFORM public.initify_allow_app_sync('public.system_config'::regclass, 'initify_system_config_read');
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- 4. Verify — should return rows (not empty)
-- ---------------------------------------------------------------------------
SELECT tablename, policyname, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('users', 'user_check_ins', 'user_reminder_settings')
ORDER BY tablename, policyname;

-- Quick write test (rolls back if you wrap in transaction; here it inserts a test row)
INSERT INTO users (device_uuid, display_name)
VALUES ('initify-sql-verify-' || floor(random() * 1000000)::text, 'SQL verify')
ON CONFLICT (device_uuid) DO UPDATE SET updated_at = NOW()
RETURNING id, device_uuid, display_name;

-- ---------------------------------------------------------------------------
-- Done. Restart Expo app after updating .env with your project URL + anon key.
-- =============================================================================
