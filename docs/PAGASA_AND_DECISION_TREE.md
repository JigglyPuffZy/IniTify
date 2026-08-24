# Weather Data & Decision Tree

## Live heat index (Open-Meteo)

IniTify uses **[Open-Meteo](https://open-meteo.com/)** for live temperature, humidity, and heat index in Tuguegarao City. **No API key** is required.

Endpoint:

```
https://api.open-meteo.com/v1/forecast?latitude=17.6132&longitude=121.727&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&timezone=Asia/Manila
```

Heat index is computed from temperature + humidity (Rothfusz regression — `heat-index-calculator.ts`), with Open-Meteo `apparent_temperature` as a fallback.

Manual fallback (dev only):

```env
EXPO_PUBLIC_DEV_MANUAL_HEAT=true
```

---

## Decision Tree AI

### Rules file

Edit: `src/config/decision-tree.rules.ts`

Set `enabled: true` **only** after copying verified rules from your IniTify research document.

### Rules format

```typescript
{
  enabled: true,
  version: '1.0.0',
  source: 'IniTify Research Document — Section X',
  root: {
    type: 'split',
    feature: 'heatIndex',
    operator: '>=',
    value: 41,
    true: { type: 'leaf', level: 'HIGH' },
    false: {
      type: 'split',
      feature: 'age',
      operator: '>=',
      value: 65,
      true: { type: 'leaf', level: 'MODERATE' },
      false: { type: 'leaf', level: 'LOW' },
    },
  },
}
```

### Supported features

- `heatIndex` (number)
- `age` (number)
- `healthCondition` (string — use `in` operator for categories)
- `activityLevel` (string)
- `hydrationStatus` (string)

### Supported operators

`>`, `>=`, `<`, `<=`, `==`, `!=`, `in`, `not_in`

### Output levels

`LOW` | `MODERATE` | `HIGH` | `EXTREME`

---

## What you must provide

1. **Open-Meteo** — free current weather for Tuguegarao (no key)
2. **Decision tree rules** — from your research document (paste into `decision-tree.rules.ts`)

Without these, heat data fetch and risk classification will show configuration warnings on the dashboard.
