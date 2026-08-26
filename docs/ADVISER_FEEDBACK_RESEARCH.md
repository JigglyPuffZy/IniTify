# Adviser Feedback — Research Notes (IniTify / HeatHits)

This document addresses adviser comments on **quantifiable safety tips**, **water-intake hydration classification**, **related-study variables**, and **average response time (WiFi vs cellular)**.

---

## 1. Quantifiable safety tips (implemented)

IniTify now uses **specific numbers** in recommendations instead of vague advice:

| Area | Quantified guidance |
|------|---------------------|
| Hydration (general) | **250 ml (1 cup)** every **15–20 min** in heat; **2–3 L** total on hot days |
| Rest breaks | **5–10 min** rest every **30–45 min** outdoors |
| Shade / cool-down | Move to shade/AC within **5 min** if unwell; stay **10–15 min** before returning |
| Peak heat avoidance | Limit strenuous outdoor activity **10:00 AM–3:00 PM** |
| Continuous outdoor work | **≤20–30 min** when heat index is HIGH/EXTREME |
| Extreme heat | **250–500 ml** water in the next **15–20 min** (unless fluid-restricted) |

**Code locations:** `recommendation.service.ts`, `risk-assessment.config.ts`, `local-health-safety-tips.ts`, `tify-knowledge.ts` (risk guidance).

---

## 2. Personal info — water intake → AI classification (implemented)

### User input
Users report **cups, ml, or liters** (e.g. `4 cups`, `1 L`, `500 ml`, quick-reply chips).

### Classification thresholds (1 cup = 250 ml)
| Status (app label) | Volume (today so far) | Cups |
|--------------------|------------------------|------|
| **Well Hydrated** | ≥ **2.0 L** | ≥ **8 cups** |
| **Needs Hydration** (moderate) | **1.0 – 1.99 L** | **4 – 7 cups** |
| **Dehydrated / Concerning** | < **1.0 L** | < **4 cups** |

Tify (AI) and the scripted check-in **parse the amount**, state it back to the user, and assign the enum used by the decision tree.

**Code:** `src/utils/hydration-volume.ts`, `check-in-chat.service.ts`, `tify-system-prompt.ts`

> Note: Thresholds are **decision-support for heat check-ins**, not clinical diagnosis. Kidney/heart patients with fluid limits should follow physician guidance.

---

## 3. Related studies — variables tested & differences vs IniTify

| Study / system | Main variables measured | How IniTify differs |
|----------------|-------------------------|---------------------|
| **PAGASA iHeatMap / heat index advisories** | Air temp, humidity → heat index bands (27–32, 33–41, 42–51, ≥52°C); public advisory text | IniTify adds **personal** inputs: age, comorbidity, activity, **reported fluid intake (L/cups)**, symptoms; outputs individualized risk + tips |
| **WBGT occupational heat standards (ISO 7243, ACGIH)** | Wet-bulb globe temperature, work/rest cycles in **minutes**, metabolic rate | IniTify uses **PAGASA heat index** (not WBGT) + self-reported activity; rest advice expressed as **5–10 min / 30–45 min** cycles |
| **Hydration & heat-stress field studies (e.g. Kenefick, Sawka)** | Body mass loss, urine color/osmolality, fluid intake **mL·kg⁻¹·h⁻¹**, core temp | IniTify uses **self-reported volume (cups/L)** — no lab/weight sensors; simpler for community mobile use |
| **mHealth heat apps (literature reviews)** | Often GPS, ambient temp, push alerts; sometimes heart rate | IniTify combines **Open-Meteo local weather**, **decision tree**, **AI companion (Tify)**, emergency call/SMS, nearest hospital |
| **Early warning systems (Philippines)** | Population-level heat alerts | IniTify is **individual-level** with chronic-condition tips (hypertension, diabetes, asthma, etc.) |

**IniTify unique combination for thesis:** heat index (environmental) + vulnerability profile + **quantified hydration intake** + symptom chat + quantified safety tips + emergency actions.

---

## 4. Average response time — WiFi vs cellular data

### What is measured
- **Tify AI check-in round-trip time** (user sends message → assistant reply), logged in `network-latency-log.ts` when the OpenAI-compatible API is called.
- **Weather fetch** (Open-Meteo) can be timed similarly during trials.

### Recommended thesis protocol
1. **Sample size:** e.g. **30 messages per network type** (WiFi vs mobile data) per device model.
2. **Controlled steps:**
   - Same location, same time window (reduce weather API variance).
   - Toggle **WiFi only** vs **mobile data only** (airplane mode + data on).
   - Record: device model, network type, `durationMs` from dev console or exported logs.
3. **Report:** mean, median, min, max, standard deviation for each network type.
4. **Helper in app:** `getRecentLatencyLogs()` and `summarizeLatencyByNetwork()` in `src/utils/network-latency-log.ts`.

### Expected difference (literature / practice)
Cellular latency is often **50–200 ms higher** than WiFi on the same route, but LLM API time (**1–5+ s**) usually dominates total response time; network type mainly affects **reliability** and **tail latency** on weak signal.

---

## 5. Suggested thesis wording (short)

> Safety recommendations include quantified hydration (250 ml every 15–20 minutes), rest intervals (5–10 minutes per 30–45 minutes outdoors), and peak-heat avoidance (10:00 AM–3:00 PM). Hydration status is derived from user-reported fluid volume (cups/liters) using thresholds of 2.0 L (well hydrated), 1.0–1.99 L (moderate), and below 1.0 L (dehydrated/concerning). Average AI response time was compared under WiFi and mobile data during controlled trials.

---

*Last updated: August 2026 — aligned with IniTify adviser feedback.*
