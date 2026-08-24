-- Run AFTER initify_supabase_schema.sql
-- Run AFTER initify_supabase_health_safety_kb.sql (health/first-aid knowledge base)
--
-- This file grants database permissions only — it does NOT contain health tips.
-- All conditions + first-aid/safety tips live in:
--   docs/database/initify_supabase_health_safety_kb.sql

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated;

-- Health Safety KB tables (safe if not created yet — re-run this file after initify_supabase_health_safety_kb.sql)
DO $$ BEGIN
  GRANT SELECT ON health_conditions TO anon, authenticated;
  GRANT SELECT ON weather_hazards TO anon, authenticated;
  GRANT SELECT ON health_safety_tips TO anon, authenticated;
  GRANT SELECT ON v_personalized_safety_tips TO anon, authenticated;
  GRANT SELECT, INSERT ON user_check_ins TO anon, authenticated;
  GRANT SELECT, INSERT, UPDATE ON user_reminder_settings TO anon, authenticated;
  GRANT SELECT, INSERT ON weather_safety_acknowledgments TO anon, authenticated;
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;

-- Optional: permissive RLS if you enable row level security later
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "anon_all_users" ON users FOR ALL TO anon USING (true) WITH CHECK (true);
