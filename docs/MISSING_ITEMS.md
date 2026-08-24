# IniTify — Missing Items Checklist

Heat index uses **WeatherAPI.com**.

---

## Priority 1 — Blocks core assessment (fix these first)

| # | Item | Status | Who | Action |
|---|---|---|---|---|
| 1 | **Decision Tree rules** | BLOCKED | **You** | Paste research rules into `src/config/decision-tree.rules.ts`, set `enabled: true` |
| 2 | **WeatherAPI key** | Missing | **You** | Sign up at [weatherapi.com](https://www.weatherapi.com/signup.aspx) → `EXPO_PUBLIC_WEATHERAPI_KEY` in `.env` |
| 3 | **`.env` file** | Missing | **You** | Copy `.env.example` → `.env` and fill values |

**Without #1–#3:** Dashboard works, but **Run Risk Assessment** may not use live heat data or produce LOW/MODERATE/HIGH/EXTREME.

---

## Priority 2 — Needed for full documented features

| # | Item | Status | Who | Action |
|---|---|---|---|---|
| 4 | **Emergency thresholds** | Not specified | **You** | Set in `src/config/emergency.config.ts`: failed prompt count, inactivity minutes |
| 5 | **First-aid content** | Placeholder | **You / adviser** | Add approved heat-stroke text to `src/constants/first-aid.ts` |
| 6 | **Emergency contact** | Optional in app | **You** | Add in Setup if testing emergency flow |
| 7 | **Hospital data provider** | Not chosen | **You / group** | Pick API (e.g. Google Places, DOH list) → `EXPO_PUBLIC_HOSPITAL_DATA_PROVIDER` |
| 8 | **Maps/navigation** | Not chosen | **You / group** | Pick provider → `EXPO_PUBLIC_MAPS_PROVIDER` |

---

## Priority 3 — Later / production

| # | Item | Status | Notes |
|---|---|---|---|
| 10 | **Firebase or MySQL** | Not chosen | Local AsyncStorage works for dev |
| 11 | **Real emergency SMS/call** | Dev mode ON | `EMERGENCY_DEV_MODE = true` — safe for testing |
| 12 | **Production push notifications** | Partial | Local alerts work in Expo Go |
| 13 | **AI evaluation (F1, confusion matrix)** | Not started | Needs decision tree + test dataset from research |
| 14 | **End-to-end device testing** | Not started | After WeatherAPI key + decision tree |

---

## What already works

- App entry, setup, navigation, all screens  
- GPS / location permission  
- User profile save (local)  
- Offline cache structure  
- Push notification permission + local alerts  
- Emergency UI + safety prompts  
- Setup checklist on dashboard (shows missing items live)

---

## Your next step

**Paste your Decision Tree from the research paper** into `src/config/decision-tree.rules.ts`.

That is the #1 thing you can do **today** without waiting on external API approvals.

---

## See missing items in the app

Open **Dashboard** → scroll to **Setup Checklist** — it updates based on what is configured.
