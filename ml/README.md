# HeatHits Decision Tree — Python ML

Expert-labeled synthetic dataset for training the IniTify Decision Tree.

## Files

| File | Purpose |
|---|---|
| `data/heat_risk_dataset.csv` | Training data (open in Excel) |
| `data/heat_risk_dataset.xlsx` | Same data, formatted for Excel |
| `data/LABELING_GUIDE.md` | How each column and label is defined |
| `data/DATASET_TABLE.md` | Column map + sample rows |
| `generate_dataset.py` | Regenerate CSV/Excel after rule changes |
| `train_decision_tree.py` | Train sklearn tree, export rules + diagram |

## Quick start

```powershell
cd "c:\Users\Jan Leianelle\OneDrive\Desktop\IniTify\ml"
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install pandas scikit-learn matplotlib openpyxl
python generate_dataset.py
python train_decision_tree.py
```

Outputs go to `ml/output/`:
- `rules.txt` — text rules for thesis + IniTify conversion
- `tree.png` — decision tree diagram
- `sample_predictions.csv` — test-set predictions

## Next step (IniTify app)

Ask Cursor to convert `ml/output/rules.txt` into `src/config/decision-tree.rules.ts`.
