# Weather API & Heat Risk Assessment

How IniTify loads live weather for **Tuguegarao City, Cagayan** and computes your **personalized heat risk level** (Low / Moderate / High / Extreme).

> **Note:** IniTify does **not** forecast future weather for the risk badge. It uses **current** conditions plus your health profile to estimate **heat-related health risk right now**. Open-Meteo’s forecast endpoint is used only for the **current** weather block.

---

## Overview

```mermaid
flowchart LR
  A[App opens / Refresh] --> B[Tuguegarao coords]
  B --> C[Open-Meteo API]
  C --> D[Heat index °C]
  D --> E[User profile]
  E --> F[Decision tree engine]
  F --> G[Risk on Home + Assessment]
```

| Stage | What it does |
|--------|----------------|
| **Location** | Fixed coordinates for Tuguegarao City center |
| **Weather** | [Open-Meteo](https://open-meteo.com/) forecast API (`current` variables) |
| **Heat index** | Computed from temp + humidity (Rothfusz), with apparent temperature as fallback |
| **Risk** | PAGASA bands + personal vulnerability (health, age, activity, hydration) |

---

## 1. Tuguegarao City location

Weather is always fetched for the study area — **not** from the phone GPS.

**File:** `src/constants/study-area.ts`

| Field | Value |
|--------|--------|
| City | Tuguegarao City |
| Province | Cagayan |
| Latitude | `17.6132` |
| Longitude | `121.727` |

**File:** `src/context/IniTifyContext.tsx` — `refreshHeatData()` passes these coordinates to the environmental service.

GPS is used separately (e.g. hospitals, emergency) via `locationService`, but **live heat/weather for the app uses Tuguegarao**.

---

## 2. Open-Meteo setup

### No API key

Open-Meteo is free for non-commercial use and **does not require an API key**.

Docs: [open-meteo.com/en/docs](https://open-meteo.com/en/docs)

### Endpoint IniTify uses

```http
GET https://api.open-meteo.com/v1/forecast
  ?latitude=17.6132
  &longitude=121.727
  &current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m,is_day
  &timezone=Asia/Manila
```

Example (browser / Postman):

https://api.open-meteo.com/v1/forecast?latitude=17.6132&longitude=121.727&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&timezone=Asia%2FManila

**File:** `src/services/environmental/open-meteo-client.ts`

### Response fields used

| Open-Meteo field | App use |
|------------------|---------|
| `temperature_2m` | Air temperature (°C) |
| `relative_humidity_2m` | Humidity (%) |
| `apparent_temperature` | Feels-like (°C); heat-index fallback |
| `weather_code` | Condition text (WMO code → English) |
| `wind_speed_10m` | Wind (km/h) |
| `wind_direction_10m` | Wind compass direction |
| `is_day` | Day/night icon |
| `time` | Last updated |

### Sample current payload

```json
{
  "current": {
    "time": "2026-08-20T22:45",
    "temperature_2m": 27.4,
    "relative_humidity_2m": 91,
    "apparent_temperature": 34.5,
    "precipitation": 0.0,
    "weather_code": 3,
    "wind_speed_10m": 1.2
  }
}
```

---

## 3. How heat index (°C) is chosen

**File:** `src/services/environmental/open-meteo-client.ts` → `resolveHeatIndexC()`

Candidates (takes the **maximum** for heat-safety conservatism):

1. **Computed** heat index from `temperature_2m` + `relative_humidity_2m` (Rothfusz / NWS formula)
2. Open-Meteo `apparent_temperature`
3. Plain `temperature_2m` (fallback)

**Formula file:** `src/services/environmental/pagasa/heat-index-calculator.ts`

### Pipeline

**File:** `src/services/environmental/environmental.service.ts`

1. Call Open-Meteo
2. Clean and validate (`environmental-pipeline.ts`)
3. Save to offline cache
4. Optionally sync to Supabase if configured
5. Return weather snapshot + heat reading to `IniTifyContext`

### Fallbacks

| Situation | Behavior |
|-----------|----------|
| API / network error, has cache | Show last saved heat reading (`status: 'cached'`) |
| No cache, manual mode on | Prompt to enter heat on Home (`EXPO_PUBLIC_DEV_MANUAL_HEAT=true`) |
| No cache, no manual | Show unavailable message |

---

## 4. When data refreshes

**File:** `src/context/IniTifyContext.tsx`

| Trigger | Action |
|---------|--------|
| User logged in + profile loaded | `refreshHeatData()` |
| Heat reading or profile risk factors change | `runAssessment()` |
| Home **Refresh** button / pull-to-refresh | `refreshHeatData()` + `runAssessment()` |

State stored in context:

- `heatReading` — heat index + coords + timestamp
- `currentWeather` — temp, humidity, condition, wind, etc.
- `assessment` — final risk level and explanation
- `heatDataSource` — `'live'` \| `'cached'` \| `'dev_manual'` \| `'unavailable'`

---

## 5. Heat risk assessment (decision tree)

Risk is **not** temperature alone. It combines **environment** + **personal vulnerability**.

**Entry:** `riskAssessmentService.assess()` → `decisionTreeService.evaluate()` → `assessHeatRisk()`  
**Core logic:** `src/services/decision-tree/heat-risk-classifier.ts`  
**Config:** `src/config/risk-assessment.config.ts`

### Step 1 — Environmental risk (weather)

PAGASA-style heat index bands:

| Heat index (°C) | Level | Label |
|-----------------|--------|--------|
| &lt; 27 | **LOW** | Below caution |
| 27 – 32 | **MODERATE** | Caution |
| 33 – 41 | **HIGH** | Extreme caution |
| ≥ 42 | **EXTREME** | Danger |

**Humidity bump:** If humidity ≥ **70%** and environmental level is at most **Moderate**, risk can increase by **one step** (never above Extreme).

### Step 2 — Personal vulnerability (profile)

Points added from health conditions, age, activity, hydration, and general status.

### Step 3 — Combine

Escalate from environmental baseline using vulnerability score + critical overrides (e.g. dehydrated + already hot → Extreme).

Shown on **Home** (risk badge) and **Assessment** (`app/assessment.tsx`).

---

## 6. Requirements for live risk

1. **Internet** — Open-Meteo needs network (no API key)
2. **Complete profile** — age, health, activity, hydration
3. **Decision tree enabled** — `src/config/decision-tree.rules.ts` with `enabled: true`

Optional:

```env
EXPO_PUBLIC_DEV_MANUAL_HEAT=true
```

---

## 7. Key source files

| Path | Role |
|------|------|
| `src/constants/study-area.ts` | Tuguegarao coordinates |
| `src/services/environmental/open-meteo-client.ts` | HTTP call to Open-Meteo |
| `src/services/environmental/environmental.service.ts` | Fetch, cache, fallbacks |
| `src/services/environmental/pagasa/heat-index-calculator.ts` | Heat index formula |
| `src/context/IniTifyContext.tsx` | `refreshHeatData`, `runAssessment` |
| `src/services/risk-assessment/risk-assessment.service.ts` | Assessment orchestration |
| `src/services/decision-tree/heat-risk-classifier.ts` | 3-step risk engine |
| `src/config/risk-assessment.config.ts` | Bands, points, thresholds |

---

## 8. Related docs

- [PAGASA_AND_DECISION_TREE.md](./PAGASA_AND_DECISION_TREE.md) — Decision tree rules file format
- [INITYIFY_SYSTEM_SPEC.md](./INITYIFY_SYSTEM_SPEC.md) — Full system specification

---

## Disclaimer

IniTify is a **decision-support and early-warning tool**. It is **not** a medical diagnostic or treatment device. Risk levels are guidance based on weather data and self-reported profile information.
