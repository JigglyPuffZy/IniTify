-- IniTify — Supabase verification (run AFTER schema + permissions)
-- Paste in Supabase SQL Editor → Run → check results panel

-- 1) All 17 core tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
  AND table_name IN (
    'users',
    'user_risk_profiles',
    'emergency_contacts',
    'heat_index_readings',
    'risk_assessments',
    'recommendation_logs',
    'heat_alert_logs',
    'emergency_events',
    'safety_prompt_responses',
    'emergency_active_alerts',
    'emergency_contact_notifications',
    'emergency_hotline_calls',
    'hospitals',
    'hospital_lookups',
    'location_logs',
    'offline_cache_snapshots',
    'system_config'
  )
ORDER BY table_name;

-- 2) PAGASA news tables (optional — run initify_supabase_pagasa_news.sql first)
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('pagasa_updates', 'pagasa_collection_logs')
ORDER BY table_name;

-- 3) Reference data seeded
SELECT 'hospitals' AS item, COUNT(*)::text AS count FROM hospitals
UNION ALL
SELECT 'system_config', COUNT(*)::text FROM system_config;

-- 4) Sample hospital row (should return 10 after schema or seed)
SELECT id, name, phone FROM hospitals ORDER BY name LIMIT 5;

-- 5) Views for thesis reporting
SELECT table_name
FROM information_schema.views
WHERE table_schema = 'public'
  AND table_name IN ('v_latest_user_assessments', 'v_emergency_summary');

-- 6) After using the app — spot-check live sync (replace with your display name if needed)
SELECT u.display_name, ra.risk_level, ra.assessed_at
FROM users u
LEFT JOIN risk_assessments ra ON ra.user_id = u.id
ORDER BY ra.assessed_at DESC NULLS LAST
LIMIT 5;

SELECT u.display_name, hc.hotline_label, hc.phone_dialed, hc.dialed_at
FROM emergency_hotline_calls hc
JOIN users u ON u.id = hc.user_id
ORDER BY hc.dialed_at DESC
LIMIT 5;
