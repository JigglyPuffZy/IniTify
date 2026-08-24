# Supabase SQL Editor Setup — IniTify

Supabase uses **PostgreSQL**, not MySQL. Use the Supabase file below — **not** `initify_mysql_schema.sql`.

---

## What to paste in Supabase SQL Editor

Run **one file per query** in this order (copy entire file → paste → **Run**):

| Step | File | Purpose |
|------|------|---------|
| **1 (required)** | `initify_supabase_schema.sql` | Core tables (users, assessments, emergency, hospitals…) |
| **2 (required)** | `initify_supabase_check_in.sql` | Check-ins, reminder settings, weather acks |
| **3 (recommended)** | `initify_supabase_health_safety_kb.sql` | Personalized safety tips by health + weather |
| **4 (auth)** | `initify_supabase_auth.sql` | Login / sign-up link to `auth.users` |
| **5 (required)** | `initify_supabase_fix_app_sync.sql` | **Fixes 403 Forbidden** — RLS policies for anon key |
| **6 (optional)** | `initify_supabase_hospitals_seed.sql` | Re-seed hospital list |
| **6b (optional)** | `initify_supabase_check_in_nearest_hospital.sql` | Check-in nearest-hospital CTA only (`check_in` location + `lookup_source`) |
| **6c (optional)** | `initify_supabase_weather_auto_refresh.sql` | 15-min live weather auto-refresh logs (`weather_refresh_logs`) |
| **7 (verify)** | `initify_supabase_verify.sql` | Confirm tables + sample rows |

> **Getting `403` on `/rest/v1/users`?** You skipped step 5, or ran `initify_supabase_auth.sql` without the fix file. Run `initify_supabase_fix_app_sync.sql` — safe to re-run.

`initify_supabase_permissions.sql` is optional if you already ran step 5 (the fix file includes grants + policies).

### Steps in Supabase Dashboard

1. Go to [supabase.com](https://supabase.com) → your project  
2. Left menu → **SQL Editor**  
3. **New query**  
4. Open `initify_supabase_schema.sql` in Cursor → **Ctrl+A, Ctrl+C**  
5. Paste into Supabase → click **Run**  
6. Repeat for steps 2 → 5 in the table above (especially **`initify_supabase_fix_app_sync.sql`**)  
7. **New query** → paste `initify_supabase_verify.sql` → **Run**  

---

## App buttons → SQL tables (lahat may table na)

| Button / feature | Screen | Supabase table |
|------------------|--------|----------------|
| Get started / Setup save | Setup | `users`, `user_risk_profiles`, `emergency_contacts` |
| Run risk assessment | Home | `risk_assessments`, `heat_index_readings` |
| Safety tips | Recommendations | `recommendation_logs` |
| Allow / Send test alert | Alerts | `heat_alert_logs` |
| **Call** (hotlines) | Emergency | `emergency_hotline_calls` |
| I'm OK / Need help | Emergency | `safety_prompt_responses` |
| Emergency ACTIVE popup | Background | `emergency_events`, `emergency_active_alerts`, `emergency_contact_notifications` |
| Find nearest hospital | Emergency / Hospitals | `hospital_lookups` |
| Get directions | Hospitals | `hospital_lookups` (logged on list load) |
| GPS refresh | Home / Dashboard | `location_logs` |
| Live weather | Weather | WeatherAPI.com (not stored in Supabase by default) |
| Offline saved data | Offline | `offline_cache_snapshots` (local-first; optional sync) |

**Note:** Hospitals list works **offline** from `src/data/tuguegarao-hospitals.ts`. SQL `hospitals` table is for thesis demo / reporting — seeded in step 1.

---

### App `.env`

```env
EXPO_PUBLIC_DATABASE_PROVIDER=supabase
EXPO_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-jwt-key
```

Restart Expo after changing `.env`: stop `npx expo start` and run it again.

**Important:** Only the **anon** key goes in `EXPO_PUBLIC_*`. Never put the service role key in the mobile app.

### Verify

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

```sql
SELECT * FROM hospitals;
SELECT * FROM system_config;
```

---

## SMS in Supabase

SMS logs go in table: **`emergency_contact_notifications`**

| Column | Meaning |
|--------|---------|
| `sent_status` | `prepared` / `sent` / `failed` |
| `is_development_mode` | `true` = SMS not actually sent yet |
| `contact_phone` | Number that would receive SMS |

Real SMS still needs a gateway (Twilio, Semaphore) — table is ready to store logs.

---

## Do NOT paste these in Supabase

| File | For |
|------|-----|
| `initify_mysql_schema.sql` | XAMPP / phpMyAdmin / MySQL only |
| `initify_sample_data.sql` | MySQL syntax only |

---

## "Success. No rows returned" — is that normal?

| What you ran | Result | Meaning |
|--------------|--------|---------|
| `initify_supabase_permissions.sql` | Success, no rows | **Normal** — GRANT commands don't return rows |
| `initify_supabase_schema.sql` | Success, no rows | **Normal** — CREATE TABLE doesn't return rows |
| `SELECT * FROM users` | Success, no rows | **Empty table** — run sample data OR use the app Setup flow |
| `SELECT * FROM hospitals` | Success, no rows | **Schema not run** — run step 1 again (hospitals are seeded in schema) |
| `initify_supabase_sample_data.sql` | Should show **counts** at bottom | e.g. users=1, hospitals=4 |

---

This is a **Supabase website/network** issue, not your SQL file.

Try:
1. Check internet connection  
2. Refresh the page / log in again  
3. Disable VPN or try another browser  
4. Wait a few minutes (Supabase outage)  
5. Create project at supabase.com first, then open SQL Editor  

---

## App connection note

The app syncs **directly to Supabase** when `.env` has:

- `EXPO_PUBLIC_DATABASE_PROVIDER=supabase`
- Valid `EXPO_PUBLIC_SUPABASE_URL` + `EXPO_PUBLIC_SUPABASE_ANON_KEY`

Local AsyncStorage still works offline. Sync runs on setup, assessment, emergency Call button, hospitals, alerts, and more (see table above).

---

## Quick reference — all 17 tables

`users`, `user_risk_profiles`, `emergency_contacts`, `heat_index_readings`, `risk_assessments`, `recommendation_logs`, `heat_alert_logs`, `emergency_events`, `safety_prompt_responses`, `emergency_active_alerts`, `emergency_contact_notifications`, `emergency_hotline_calls`, `hospitals`, `hospital_lookups`, `location_logs`, `offline_cache_snapshots`, `system_config`
