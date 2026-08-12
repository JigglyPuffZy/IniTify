# HeatHits Dataset — Column Reference & Sample Rows

Files:
- **CSV:** `ml/data/heat_risk_dataset.csv` (opens in Excel)
- **Excel:** `ml/data/heat_risk_dataset.xlsx` (formatted table)

---

## Column map → IniTify app

| # | Dataset column | App / model usage |
|---|---|---|
| 1 | `record_id` | Row identifier (not used in model) |
| 2 | `heat_index` | From PAGASA / manual dev input → `heatIndex` |
| 3 | `age` | Setup screen → `age` |
| 4 | `health_condition` | Setup screen → `healthCondition` |
| 5 | `activity_level` | Setup screen → `activityLevel` |
| 6 | `hydration_status` | Setup screen → `hydrationStatus` |
| 7 | `risk_level` | **Target label** for Python training → app output |
| 8 | `pagasa_band` | Reference column (do not use as model input) |
| 9 | `notes` | Reference column (do not use as model input) |

**Model inputs (6 features):** columns 2–6  
**Model output (1 label):** column 7

---

## Sample rows (preview)

| record_id | heat_index | age | health_condition | activity_level | hydration_status | risk_level | pagasa_band |
|---|---:|---:|---|---|---|---|---|
| HH-001 | 22 | 25 | None | Low | Well hydrated | LOW | Below caution (<27) |
| HH-002 | 30 | 65 | Hypertension | High | Dehydrated | HIGH | Caution (27–32) |
| HH-003 | 38 | 35 | None | Moderate | Well hydrated | HIGH | Extreme caution (33–41) |
| HH-004 | 45 | 28 | None | Low | Well hydrated | EXTREME | Danger (42–51) |
| HH-005 | 54 | 70 | Diabetes | High | Dehydrated | EXTREME | Extreme danger (≥52) |
| HH-006 | 28 | 16 | None | High | Moderately hydrated | HIGH | Caution (27–32) |
| HH-007 | 26 | 62 | None | Low | Well hydrated | MODERATE | Below caution (<27) |
| HH-008 | 41 | 48 | Asthma | Moderate | Dehydrated | EXTREME | Extreme caution (33–41) |

Open the CSV/Excel file for the full dataset (~120 rows).

---

## Risk level meanings (app output)

| risk_level | Meaning |
|---|---|
| LOW | Minimal heat stress for current conditions |
| MODERATE | Caution — monitor and follow basic guidance |
| HIGH | Significant risk — limit exposure, hydrate, rest |
| EXTREME | Severe risk — urgent precautions / emergency path |
