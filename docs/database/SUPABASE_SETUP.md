# Supabase SQL Editor Setup — IniTify

Supabase uses **PostgreSQL**, not MySQL. Use the Supabase file below — **not** `initify_mysql_schema.sql`.

---

## What to paste in Supabase SQL Editor

| Step | File |
|------|------|
| **1 (required)** | `docs/database/initify_supabase_schema.sql` |
| **2 (required)** | `docs/database/initify_supabase_permissions.sql` |
| **3 (optional demo rows)** | `docs/database/initify_supabase_sample_data.sql` |
| **4 (PAGASA news)** | `docs/database/initify_supabase_pagasa_news.sql` |

### Steps in Supabase Dashboard

1. Go to [supabase.com](https://supabase.com) → your project  
2. Left menu → **SQL Editor**  
3. **New query**  
4. Open `initify_supabase_schema.sql` in Cursor → **Ctrl+A, Ctrl+C**  
5. Paste into Supabase → click **Run**  
6. Check **Table Editor** — you should see 17 tables  
7. **New query** → paste `initify_supabase_permissions.sql` → **Run** (lets the app insert data)

### App `.env` (already configured if you shared keys)

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

The IniTify mobile app currently syncs via **`server/` + MySQL** OR local storage.

To connect the app **directly to Supabase**, you would need:
- Supabase project URL + anon key in `.env` (done)
- `@supabase/supabase-js` in the app (done — sync on setup, heat, assessment, emergency, location)

For **thesis database demo**, running the SQL in Supabase Table Editor is enough to show schema + sample data.

---

## Quick reference — all 17 tables

`users`, `user_risk_profiles`, `emergency_contacts`, `heat_index_readings`, `risk_assessments`, `recommendation_logs`, `heat_alert_logs`, `emergency_events`, `safety_prompt_responses`, `emergency_active_alerts`, `emergency_contact_notifications`, `emergency_hotline_calls`, `hospitals`, `hospital_lookups`, `location_logs`, `offline_cache_snapshots`, `system_config`
