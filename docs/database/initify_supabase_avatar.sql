-- =============================================================================
-- IniTify — profile avatar + UI feature columns (Supabase SQL Editor)
-- Run after initify_supabase_schema.sql and initify_supabase_check_in.sql
-- =============================================================================

-- Cartoon avatar id saved from the app (e.g. leo, maya, person)
ALTER TABLE public.user_risk_profiles
  ADD COLUMN IF NOT EXISTS avatar_id VARCHAR(32);

COMMENT ON COLUMN public.user_risk_profiles.avatar_id IS
  'IniTify profile avatar key (person, leo, maya, kai, nina, sam, zoe, rio, alex, jade, emma, noah, luna, marco, aria, finn)';

-- Optional: store on users for quick lookup of latest pick
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS avatar_id VARCHAR(32);

COMMENT ON COLUMN public.users.avatar_id IS
  'Latest avatar_id mirror from user_risk_profiles sync';

-- Verify
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_risk_profiles'
  AND column_name = 'avatar_id';
