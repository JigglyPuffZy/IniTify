# IniTify — Missing Items Checklist

PAGASA API request is **in progress** (you handle the letter). Everything below is what still blocks or limits the app.

---

## Priority 1 — Blocks core assessment (fix these first)

| # | Item | Status | Who | Action |
|---|---|---|---|---|
| 1 | **Decision Tree rules** | BLOCKED | **You** | Paste research rules into `src/config/decision-tree.rules.ts`, set `enabled: true` |
| 2 | **PAGASA TenDay token** | In progress | **You** | Wait for approval → put in `.env` as `EXPO_PUBLIC_PAGASA_API_KEY` |
| 3 | **PAGASA location names** | Missing | **You** | Set `EXPO_PUBLIC_PAGASA_PROVINCE` and `EXPO_PUBLIC_PAGASA_MUNICITY` in `.env` |
| 4 | **`.env` file** | Missing | **You** | Copy `.env.example` → `.env` and fill values |

**Without #1–#4:** Dashboard works, but **Run Risk Assessment** will not produce LOW/MODERATE/HIGH/EXTREME.

---

## Priority 2 — Needed for full documented features

| # | Item | Status | Who | Action |
|---|---|---|---|---|
| 5 | **Emergency thresholds** | Not specified | **You** | Set in `src/config/emergency.config.ts`: failed prompt count, inactivity minutes |
| 6 | **First-aid content** | Placeholder | **You / adviser** | Add approved heat-stroke text to `src/constants/first-aid.ts` |
| 7 | **Emergency contact** | Optional in app | **You** | Add in Setup if testing emergency flow |
| 8 | **Hospital data provider** | Not chosen | **You / group** | Pick API (e.g. Google Places, DOH list) → `EXPO_PUBLIC_HOSPITAL_DATA_PROVIDER` |
| 9 | **Maps/navigation** | Not chosen | **You / group** | Pick provider → `EXPO_PUBLIC_MAPS_PROVIDER` |

---

## Priority 3 — Later / production

| # | Item | Status | Notes |
|---|---|---|---|
| 10 | **Firebase or MySQL** | Not chosen | Local AsyncStorage works for dev |
| 11 | **Real emergency SMS/call** | Dev mode ON | `EMERGENCY_DEV_MODE = true` — safe for testing |
| 12 | **Production push notifications** | Partial | Local alerts work in Expo Go |
| 13 | **AI evaluation (F1, confusion matrix)** | Not started | Needs decision tree + test dataset from research |
| 14 | **End-to-end device testing** | Not started | After PAGASA token + decision tree |

---

## What already works (no PAGASA needed)

- App entry, setup, navigation, all screens  
- GPS / location permission  
- User profile save (local)  
- Offline cache structure  
- Push notification permission + local alerts  
- Emergency UI + safety prompts  
- Setup checklist on dashboard (shows missing items live)

---

## Your next step (while waiting for PAGASA)

**Paste your Decision Tree from the research paper** into `src/config/decision-tree.rules.ts`.

That is the #1 thing you can do **today** without waiting for PAGASA.

Send the decision tree rules here (text, table, or screenshot) and I can format them into the rules file for you.

---

## See missing items in the app

Open **Dashboard** → scroll to **Setup Checklist** — it updates based on what is configured.
