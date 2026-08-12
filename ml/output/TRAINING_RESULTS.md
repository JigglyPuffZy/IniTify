# HeatHits Decision Tree — Training Results

**Date:** 2026-08-12  
**Dataset:** `ml/data/heat_risk_dataset.csv` (120 expert-labeled rows)  
**Python:** 3.12.10 · scikit-learn 1.9.0

---

## Sklearn model (thesis / evaluation)

| Metric | Value |
|--------|-------|
| Test accuracy | **79%** (24-row holdout, 80/20 split) |
| Macro F1 | 0.78 |

### Confusion matrix (test set)

|  | Pred EXTREME | Pred HIGH | Pred LOW | Pred MODERATE |
|--|:---:|:---:|:---:|:---:|
| **Actual EXTREME** | 6 | 0 | 0 | 0 |
| **Actual HIGH** | 2 | 3 | 0 | 1 |
| **Actual LOW** | 0 | 0 | 6 | 0 |
| **Actual MODERATE** | 0 | 0 | 2 | 4 |

### Classification report

| Class | Precision | Recall | F1 |
|-------|-----------|--------|-----|
| EXTREME | 0.75 | 1.00 | 0.86 |
| HIGH | 1.00 | 0.50 | 0.67 |
| LOW | 0.75 | 1.00 | 0.86 |
| MODERATE | 0.80 | 0.67 | 0.73 |

---

## IniTify app rules (production)

The mobile app uses an **explainable rule tree** in `src/config/decision-tree.rules.ts` built from:

1. DOST-PAGASA iHeatMap heat-index bands  
2. Documented HeatHits risk factors (age ≥60, health, high activity, dehydration)

**Validation:** 120/120 dataset rows match app rules (**100%**).

---

## Files for your thesis

| File | Use |
|------|-----|
| `ml/output/tree.png` | Decision tree diagram |
| `ml/output/rules.txt` | Sklearn text rules |
| `ml/output/sample_predictions.csv` | Test-set predictions |
| `ml/data/heat_risk_dataset.xlsx` | Training dataset table |
| This file | Results / metrics section |

---

## How to re-run

```powershell
cd ml
.\.venv\Scripts\Activate.ps1
python train_decision_tree.py
python validate_app_tree.py
```
