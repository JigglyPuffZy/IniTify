# IniTify

Heat-risk monitoring app for Tuguegarao City (Expo + TypeScript + Supabase).

## Quick start

```bash
npm install
npx expo start
```

Use your real `.env` (Supabase URL/key, optional AI key).

## APK release

```bash
eas login
npm run eas:env:push
npm run build:apk
```

## Important paths

| Path | Description |
|------|-------------|
| `src/config/decision-tree.rules.ts` | Heat-risk decision tree |
| `docs/database/SUPABASE_SETUP.md` | SQL setup order |
| `docs/INITIFY_FEATURES_FOR_PAPER.rtf` | Features list for papers |
| `ml/` | Optional ML training |
