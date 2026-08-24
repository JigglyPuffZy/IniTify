# IniTify — App Feature → MySQL Table Map

Every screen and feature in the app maps to at least one database table.

---

## Screens → Tables

| App screen | What it does | MySQL tables |
|------------|--------------|--------------|
| **index** | Welcome / start | — |
| **setup** | Name, age, health, activity, hydration, emergency contact | `users`, `user_risk_profiles`, `emergency_contacts`, `location_logs` |
| **dashboard** | Heat data, checklist, run assessment | `heat_index_readings`, `risk_assessments`, `system_config` |
| **assessment** | Shows decision tree result | `risk_assessments` |
| **recommendations** | Hydration, rest, shade, limit outdoor | `recommendation_logs` |
| **alerts** | Push heat-risk notifications | `heat_alert_logs` |
| **emergency** | Indicators, safety prompts, calls, first-aid, contact notify | `emergency_events`, `safety_prompt_responses`, `emergency_active_alerts`, `emergency_contact_notifications`, `emergency_hotline_calls` |
| **hospital** | Nearest hospital + maps | `hospitals`, `hospital_lookups`, `location_logs` |
| **offline** | Cached heat + assessment | `offline_cache_snapshots`, `heat_index_readings`, `risk_assessments` |

---

## Services → Tables

| Service | Tables |
|---------|--------|
| WeatherAPI / environmental | `heat_index_readings` |
| Decision tree | `risk_assessments`, `system_config` |
| Risk assessment | `risk_assessments` |
| Recommendations | `recommendation_logs` |
| Notifications (alerts) | `heat_alert_logs` |
| Emergency logic | `emergency_events`, `safety_prompt_responses` |
| Emergency ACTIVE alert (Step 2) | `emergency_active_alerts` |
| Emergency contact notify | `emergency_contact_notifications` |
| Hotline dial (Step 1) | `emergency_hotline_calls` |
| Hospital finder | `hospitals`, `hospital_lookups` |
| Location GPS | `location_logs` |
| Offline cache | `offline_cache_snapshots` |
| ML training dataset | **Separate file** `ml/data/heat_risk_dataset.csv` (not in app DB unless you import) |

---

## All 17 tables

| # | Table | Purpose |
|---|-------|---------|
| 1 | `users` | App user / device |
| 2 | `user_risk_profiles` | Age, health, activity, hydration |
| 3 | `emergency_contacts` | Emergency contact name + phone |
| 4 | `heat_index_readings` | WeatherAPI / manual heat index |
| 5 | `risk_assessments` | Decision tree output |
| 6 | `recommendation_logs` | Recommendations shown |
| 7 | `heat_alert_logs` | Alert notifications |
| 8 | `emergency_events` | Emergency ACTIVE episodes |
| 9 | `safety_prompt_responses` | I'm OK / Need Help taps |
| 10 | `emergency_active_alerts` | Step 2 popup/notification log |
| 11 | `emergency_contact_notifications` | Prepared/sent SMS payload |
| 12 | `emergency_hotline_calls` | Tuguegarao hotline dials |
| 13 | `hospitals` | Reference hospital list |
| 14 | `hospital_lookups` | Nearest hospital queries |
| 15 | `location_logs` | GPS history |
| 16 | `offline_cache_snapshots` | Offline screen cache |
| 17 | `system_config` | Thresholds, tree version, flags |

---

## Views (reporting)

| View | Purpose |
|------|---------|
| `v_latest_user_assessments` | Latest risk level per user |
| `v_emergency_summary` | Emergency event history |

---

## Still NOT in MySQL (by design)

| Item | Where it lives |
|------|----------------|
| Decision tree rules (JSON/TS) | `src/config/decision-tree.rules.ts` |
| First-aid full text | `src/constants/first-aid.ts` (+ `system_config.first_aid_approved` flag) |
| Training CSV (120 rows) | `ml/data/heat_risk_dataset.csv` |
| WeatherAPI key | `.env` only (`EXPO_PUBLIC_WEATHERAPI_KEY`) |

---

## Local vs MySQL

| Storage | When |
|---------|------|
| **AsyncStorage** (phone) | Always — works offline |
| **MySQL** | When API server running + `.env` configured |

Both can run together: phone saves locally, syncs to MySQL when online.
