# HeatHits Training Dataset — Labeling Guide

**Dataset type:** Expert-labeled **synthetic** data (for AI model development)  
**NOT** real survey or clinical data — replace or extend with field data from Tuguegarao testing when available.

---

## Columns (matches IniTify app)

| CSV column | IniTify field | Type | Allowed values |
|---|---|---|---|
| `record_id` | — | ID | HH-001, HH-002, … |
| `heat_index` | `heatIndex` | number (°C) | e.g. 22–55 |
| `age` | `age` | number | years |
| `health_condition` | `healthCondition` | string | None, Healthy, Hypertension, Diabetes, Asthma, Heart disease |
| `activity_level` | `activityLevel` | string | **Low**, **Moderate**, **High** |
| `hydration_status` | `hydrationStatus` | string | **Well hydrated**, **Moderately hydrated**, **Dehydrated** |
| `risk_level` | Decision tree output | string | **LOW**, **MODERATE**, **HIGH**, **EXTREME** |
| `pagasa_band` | (reference only) | string | PAGASA iHeatMap category for that heat index |
| `notes` | (reference only) | string | Short profile description |

---

## PAGASA iHeatMap bands (environmental)

| Heat index (°C) | PAGASA category |
|---|---|
| &lt; 27 | Below caution |
| 27 – 32 | Caution |
| 33 – 41 | Extreme caution |
| 42 – 51 | Danger |
| ≥ 52 | Extreme danger |

---

## Individual risk factors (HeatHits research)

| Factor | Higher risk when |
|---|---|
| Age | ≥ 60 years |
| Health condition | Any value except None / Healthy / N/A |
| Activity level | **High** |
| Hydration status | **Dehydrated** |

---

## Expert labeling rules used in this dataset

These rules match the **provisional** tree in `src/config/decision-tree.rules.ts`:

1. **Heat index ≥ 42** → always **EXTREME**
2. **Heat index 33–41** → base **HIGH**; any one risk factor above → **EXTREME**
3. **Heat index 27–32** → base **MODERATE**; any one risk factor → **HIGH**
4. **Heat index &lt; 27** → base **LOW**; any one risk factor → **MODERATE**

---

## How to edit

1. Open `heat_risk_dataset.csv` in Excel or Google Sheets  
2. Add rows — do **not** change column headers  
3. Label `risk_level` using the rules above (or your adviser-approved rules)  
4. Re-run `python ml/train_decision_tree.py` to retrain and export new rules

---

## For your thesis

State clearly: *"An expert-labeled synthetic dataset of N records was used for initial Decision Tree training and confusion-matrix evaluation. Field validation in Tuguegarao City is planned as future work."*
