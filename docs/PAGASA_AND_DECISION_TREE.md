# DOST-PAGASA & Decision Tree Integration

## DOST-PAGASA (Environmental Heat Data)

### Official data sources

| Source | Type | Heat Index |
|---|---|---|
| **iHeatMap** | Web portal only | Direct HI — no public API |
| **TenDay Weather Forecast API** | Official DOST-PAGASA API | Temperature + humidity — HI computed |
| **Custom endpoint** | Your approved backend | Direct HI if endpoint provides it |

### TenDay API setup

1. Request API access: [tenday.pagasa.dost.gov.ph](https://tenday.pagasa.dost.gov.ph)
2. Receive approved `token` via email
3. Configure `.env`:

```env
EXPO_PUBLIC_PAGASA_PROVIDER=tenday
EXPO_PUBLIC_PAGASA_API_KEY=your_approved_token
EXPO_PUBLIC_PAGASA_PROVINCE=Metro Manila
EXPO_PUBLIC_PAGASA_MUNICITY=Quezon City
```

4. Restart Expo: `npm start`

### How heat index is obtained (TenDay)

TenDay returns `tmean`, `tmax`, `humidity` — **not** direct heat index.

IniTify computes heat index using the Rothfusz regression (NWS/NOAA standard) and labels the result:

> "Heat index computed from DOST-PAGASA TenDay forecast..."

This is **for guidance only**, consistent with PAGASA product disclaimers.

### Custom endpoint setup

If you have a direct PAGASA heat-index feed (e.g. institutional proxy):

```env
EXPO_PUBLIC_PAGASA_PROVIDER=custom
EXPO_PUBLIC_PAGASA_API_URL=https://your-endpoint/heat-index
EXPO_PUBLIC_PAGASA_HEAT_INDEX_FIELD=heatIndex
EXPO_PUBLIC_PAGASA_API_KEY=optional_token
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

1. **TenDay API token** — from PAGASA approval process
2. **Decision tree rules** — from your research document (paste into `decision-tree.rules.ts`)

Without these, heat data fetch and risk classification will show configuration warnings on the dashboard.
