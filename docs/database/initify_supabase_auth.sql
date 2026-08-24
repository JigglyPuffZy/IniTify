-- =============================================================================
-- IniTify — Supabase Auth (Login / Create Account)
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
--
-- MINIMUM PREREQUISITE:
--   initify_supabase_schema.sql  (creates public.users)
--
-- OPTIONAL (run before Part B below, or re-run this file after them):
--   initify_supabase_check_in.sql
--   initify_supabase_health_safety_kb.sql
--   initify_supabase_permissions.sql
--
-- NOTE: Login & signup use Supabase's built-in auth.users table.
--       You do NOT create a "login" or "accounts" table manually.
-- =============================================================================

-- =============================================================================
-- PART A — Core auth link (safe to run after schema.sql only)
-- =============================================================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON public.users(auth_user_id);

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  display_name TEXT;
BEGIN
  display_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
    SPLIT_PART(NEW.email, '@', 1),
    'IniTify user'
  );

  INSERT INTO public.users (
    auth_user_id,
    device_uuid,
    display_name,
    study_area_city,
    study_area_province,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    'auth_' || NEW.id::TEXT,
    display_name,
    'Tuguegarao City',
    'Cagayan',
    NOW(),
    NOW()
  )
  ON CONFLICT (auth_user_id) DO UPDATE
    SET display_name = EXCLUDED.display_name,
        updated_at = NOW();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();

INSERT INTO public.users (auth_user_id, device_uuid, display_name, study_area_city, study_area_province)
SELECT
  au.id,
  'auth_' || au.id::TEXT,
  COALESCE(
    NULLIF(TRIM(au.raw_user_meta_data->>'full_name'), ''),
    NULLIF(TRIM(au.raw_user_meta_data->>'name'), ''),
    SPLIT_PART(au.email, '@', 1),
    'IniTify user'
  ),
  'Tuguegarao City',
  'Cagayan'
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.users u WHERE u.auth_user_id = au.id
);

-- =============================================================================
-- PART B — Row Level Security (skips tables that are not created yet)
-- Re-run this entire file after initify_supabase_check_in.sql if you skipped it.
-- =============================================================================

DO $$ BEGIN
  ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

  DROP POLICY IF EXISTS "users_select_own" ON public.users;
  CREATE POLICY "users_select_own"
    ON public.users FOR SELECT
    TO authenticated
    USING (auth_user_id = auth.uid());

  DROP POLICY IF EXISTS "users_update_own" ON public.users;
  CREATE POLICY "users_update_own"
    ON public.users FOR UPDATE
    TO authenticated
    USING (auth_user_id = auth.uid())
    WITH CHECK (auth_user_id = auth.uid());
END $$;

DO $$ BEGIN
  ALTER TABLE public.user_risk_profiles ENABLE ROW LEVEL SECURITY;

  DROP POLICY IF EXISTS "risk_profiles_own" ON public.user_risk_profiles;
  CREATE POLICY "risk_profiles_own"
    ON public.user_risk_profiles FOR ALL
    TO authenticated
    USING (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()))
    WITH CHECK (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()));
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'Skipped user_risk_profiles RLS — run initify_supabase_schema.sql';
END $$;

DO $$ BEGIN
  ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;

  DROP POLICY IF EXISTS "emergency_contacts_own" ON public.emergency_contacts;
  CREATE POLICY "emergency_contacts_own"
    ON public.emergency_contacts FOR ALL
    TO authenticated
    USING (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()))
    WITH CHECK (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()));
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'Skipped emergency_contacts RLS — run initify_supabase_schema.sql';
END $$;

DO $$ BEGIN
  ALTER TABLE public.user_check_ins ENABLE ROW LEVEL SECURITY;

  DROP POLICY IF EXISTS "check_ins_own" ON public.user_check_ins;
  CREATE POLICY "check_ins_own"
    ON public.user_check_ins FOR ALL
    TO authenticated
    USING (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()))
    WITH CHECK (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()));
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'Skipped user_check_ins RLS — run initify_supabase_check_in.sql first, then re-run this file';
END $$;

DO $$ BEGIN
  ALTER TABLE public.user_reminder_settings ENABLE ROW LEVEL SECURITY;

  DROP POLICY IF EXISTS "reminder_settings_own" ON public.user_reminder_settings;
  CREATE POLICY "reminder_settings_own"
    ON public.user_reminder_settings FOR ALL
    TO authenticated
    USING (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()))
    WITH CHECK (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()));
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'Skipped user_reminder_settings RLS — run initify_supabase_check_in.sql first, then re-run this file';
END $$;

DO $$ BEGIN
  GRANT SELECT ON health_conditions TO authenticated;
  GRANT SELECT ON weather_hazards TO authenticated;
  GRANT SELECT ON health_safety_tips TO authenticated;
  GRANT SELECT ON v_personalized_safety_tips TO authenticated;
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'Skipped health KB grants — run initify_supabase_health_safety_kb.sql first';
END $$;
