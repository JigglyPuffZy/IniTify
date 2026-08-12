# IniTify

HeatHits / IniTify — mobile AI-assisted heat-risk monitoring app (Expo + TypeScript).

## Stack

- Expo SDK 52 · React Native · Expo Router
- Decision tree risk assessment (PAGASA heat index + user risk factors)
- Python ML training in `ml/`

## Quick start

```bash
npm install
cp .env.example .env
npx expo start
```

## Key paths

| Path | Description |
|------|-------------|
| `src/config/decision-tree.rules.ts` | App decision tree rules |
| `ml/data/heat_risk_dataset.csv` | Training dataset |
| `ml/output/tree.png` | Tree diagram |
| `ml/output/TRAINING_RESULTS.md` | Model metrics |

## Docs

See `docs/` for research summary, PAGASA setup, and missing items.
