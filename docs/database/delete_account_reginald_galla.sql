-- =============================================================================
-- Delete account: Reginald Galla
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
--
-- This removes app data (profile, check-ins, contacts, etc.) for that name.
-- Auth login is removed only if you uncomment Part B (see note below).
-- =============================================================================

-- Preview what will be deleted
SELECT id, display_name, auth_user_id, device_uuid, created_at
FROM public.users
WHERE display_name ILIKE 'Reginald Galla';

-- ---------------------------------------------------------------------------
-- Part A — Delete app user rows (cascades to profiles, check-ins, contacts…)
-- ---------------------------------------------------------------------------
DELETE FROM public.users
WHERE display_name ILIKE 'Reginald Galla';

-- Verify gone
SELECT id, display_name FROM public.users WHERE display_name ILIKE 'Reginald Galla';

-- ---------------------------------------------------------------------------
-- Part B — OPTIONAL: Delete Supabase Auth login (only if this is YOUR email)
--
-- Linked auth user was: ralphmatthewpunzalan23@gmail.com
-- Uncomment ONLY if you want that login removed too (cannot sign in again).
-- ---------------------------------------------------------------------------
-- DELETE FROM auth.users
-- WHERE id = '287ec3ea-4d5d-4237-bf6b-09fd0e2d1bfe';
