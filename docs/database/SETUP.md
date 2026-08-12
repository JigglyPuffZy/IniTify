# Database Setup — IniTify / HeatHits

> **Using Supabase SQL Editor?** Use PostgreSQL, not MySQL → see **[SUPABASE_SETUP.md](./SUPABASE_SETUP.md)** and paste **`initify_supabase_schema.sql`**.

---

# MySQL Database Setup (XAMPP / phpMyAdmin)

## What to paste in SQL Editor (step by step)

### Step A — Create all tables (REQUIRED)

1. Open **MySQL Workbench**, **phpMyAdmin**, **XAMPP** SQL tab, or **HeidiSQL**
2. Open file: `docs/database/initify_mysql_schema.sql`
3. **Select ALL** → **Execute / Run**
4. Success check:

```sql
USE initify_db;
SHOW TABLES;
```

You should see **17 tables** and can run:

```sql
SELECT * FROM hospitals;
SELECT * FROM system_config;
```

---

### Step B — Sample demo data (OPTIONAL)

1. Open: `docs/database/initify_sample_data.sql`
2. Execute entire file
3. Verify:

```sql
SELECT * FROM v_latest_user_assessments;
SELECT * FROM users;
```

---

## Connection settings (for API server)

Create `server/.env` from `server/.env.example`:

```env
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=initify_db
PORT=3001
```

Start API:

```powershell
cd server
npm install
npm start
```

---

## Connect the mobile app

In project root `.env`:

```env
EXPO_PUBLIC_DATABASE_PROVIDER=mysql
EXPO_PUBLIC_MYSQL_API_URL=http://YOUR_PC_IP:3001
```

Use your PC LAN IP (not `localhost`) when testing on phone via Expo Go.

Restart: `npx expo start -c`

---

## Quick verification queries

```sql
-- Latest assessments
SELECT * FROM v_latest_user_assessments;

-- Emergency history
SELECT * FROM v_emergency_summary;

-- All heat readings
SELECT u.display_name, h.heat_index_c, h.data_source, h.retrieved_at
FROM heat_index_readings h
JOIN users u ON u.id = h.user_id
ORDER BY h.retrieved_at DESC;

-- Hospital reference list
SELECT id, name, phone FROM hospitals WHERE is_active = 1;
```

---

## Files in this folder

| File | Paste in SQL editor? |
|------|----------------------|
| `initify_mysql_schema.sql` | **Yes — run first** |
| `initify_sample_data.sql` | Optional — demo rows |
| `FEATURE_MAP.md` | Read only — feature checklist |

---

## Important

- Mobile app **cannot** connect to MySQL directly (security). It syncs via **API server** (`server/`).
- Phone still uses **AsyncStorage** offline; MySQL is cloud/backup for thesis.
- Never put PAGASA API keys in MySQL.
