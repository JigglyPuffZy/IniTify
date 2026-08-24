# Supabase setup — IniTify

Run these in **Supabase → SQL Editor** (one file at a time, in order).

| Step | File | Purpose |
|------|------|---------|
| 1 | `initify_supabase_schema.sql` | Core tables |
| 2 | `initify_supabase_check_in.sql` | Check-ins + reminders |
| 3 | `initify_supabase_health_safety_kb.sql` | Safety tips KB |
| 4 | `initify_supabase_auth.sql` | Login / sign-up link |
| 5 | `initify_supabase_fix_app_sync.sql` | RLS policies (fixes 403) |
| 6 | `initify_supabase_hospitals_seed.sql` | Hospital list (optional re-seed) |
| 7 | `initify_supabase_check_in_nearest_hospital.sql` | Nearest-hospital check-in support |
| 8 | `initify_supabase_weather_auto_refresh.sql` | Weather refresh logs |
| 9 | `initify_supabase_verify.sql` | Verify tables |

**403 on `/rest/v1/users`?** Re-run step 5.

App uses **Supabase only** (no MySQL server required for the APK).

## Auth — fix "limit exceeded" / users can’t open the app

Supabase free projects throttle confirmation emails. New accounts get created, then sign-in fails with **email rate limit exceeded** / **limit exceeded**, or users never get a confirmation email.

**Recommended for IniTify testing / thesis demos:**

1. Open **Supabase Dashboard → Authentication → Providers → Email**
2. Turn **Confirm email** **OFF**
3. Save
4. For accounts already stuck: **Authentication → Users** → open each user → **Confirm email** (or delete and have them sign up again)

After Confirm email is off, new sign-ups can sign in immediately without an email link.