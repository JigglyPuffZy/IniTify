# DOST-PAGASA News — Automatic Collection (No Manual Entry)

## Implementation plan (existing architecture)

| Layer | Already exists | Change |
|-------|----------------|--------|
| Official sources | `server/pagasa-news/sources.js` | HTML listing pages on pagasa.dost.gov.ph + page fetch |
| Collector | `server/pagasa-news/collector.js` | Full auto extract, dedupe, save |
| Page reader | `server/pagasa-news/page-fetcher.js` | Opens each official publication URL |
| AI | `server/pagasa-news/ai-processor.js` | Summarize/classify — extract only |
| Scheduler | `server/pagasa-news/scheduler.js` | Every 30 min, runs on server start |
| Retry | `server/pagasa-news/retry-processor.js` | Re-runs failed AI processing |
| Database | `pagasa_updates` in Supabase | All fields auto-filled |
| App feed | `app/pagasa-updates.tsx` | PH date-based Today / Previous / Archive |
| Admin | `server/routes/admin-pagasa-news.js` | **Review only** — no manual news form |

## What you do NOT do

- Type titles, content, dates, categories, or URLs manually
- Hardcode news in the app
- Approve every item (unless `PAGASA_NEWS_REQUIRE_ADMIN_APPROVE=true`)

## Automatic flow

```
Official PAGASA RSS (/feed/rss/*) returns 404. Primary method: scrape official listing pages, then open each publication URL.
→ AI summarize/classify → save to Supabase (status=approved) → app shows under Today (by published_at PH)
```

## Run the collector

```bash
cd server
npm start
```

Manual trigger: `POST http://localhost:3001/api/pagasa-news/collect`

## Admin (optional review only)

See `docs/ADMIN_PAGASA_NEWS.md` — view, approve/reject, edit summary, delete duplicates. **No create/news-entry endpoint.**
