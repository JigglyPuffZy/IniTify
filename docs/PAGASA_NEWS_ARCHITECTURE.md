# DOST-PAGASA AI News & Updates — System Architecture

## Overview

IniTify **no longer uses the DOST-PAGASA TenDay API**. Instead, a backend **AI News Collector** gathers official DOST-PAGASA publications, processes them with strict extract-only AI rules, stores them in Supabase, and the mobile app displays verified updates.

```
Official DOST-PAGASA Sources (RSS links to each post)
        ↓
Collector opens each official publication URL (pagasa.dost.gov.ph only)
        ↓
Page text extracted → sent to AI (summarize/classify — extract only)
        ↓
Supabase: pagasa_updates (+ pagasa_collection_logs)
        ↓
Mobile App: DOST-PAGASA Updates screen (approved items only)
        ↓
User sees Today's Updates + Official Source links
```

## Date logic (Philippines)

- **Today** = `published_at` calendar date in **Asia/Manila** (not `collected_at`)
- **Previous** = last 14 days, excluding today
- **Archive** = older than 14 days
- When the clock passes midnight PH time, items automatically leave Today's section
- No hardcoded dates in the app — `new Date()` + `Intl` timezone formatting

The AI layer **must NOT invent weather data**. It may only:

- Extract facts present in the source
- Summarize in plain language
- Classify category
- List affected locations mentioned in the text

Every item keeps `source_url`, `source_name`, and `original_content`.

## Components

| Layer | Location | Role |
|-------|----------|------|
| Official sources config | `server/pagasa-news/sources.js` | Whitelist of pagasa.dost.gov.ph feeds |
| Collector | `server/pagasa-news/collector.js` | Scheduled fetch, dedupe, persist |
| Classifier | `server/pagasa-news/classifier.js` | Keyword category mapping |
| AI processor | `server/pagasa-news/ai-processor.js` | OpenAI summarization (optional) |
| Repository | `server/pagasa-news/repository.js` | Supabase read/write |
| Scheduler | `server/pagasa-news/scheduler.js` | node-cron automatic runs |
| Public API | `server/routes/pagasa-news.js` | App/backend feed endpoints |
| Admin API | `server/routes/admin-pagasa-news.js` | Review, approve, edit, delete |
| App service | `src/services/pagasa-news/` | Read approved updates from Supabase |
| App UI | `app/pagasa-updates.tsx` | News feed + Today's section |
| Database | `docs/database/initify_supabase_pagasa_news.sql` | Tables + RLS |

## Heat index / risk assessment

The decision tree still needs a **numeric heat index**. Without the PAGASA API:

- Use **manual dev heat entry** (thesis demo) or cached values
- DOST-PAGASA **news does not auto-fill heat index** unless explicitly stated in an official update (future extraction)

## Environment variables

### Mobile (`.env`)

- `EXPO_PUBLIC_DATABASE_PROVIDER=supabase`
- `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_ANON_KEY`
- `EXPO_PUBLIC_NEWS_API_URL` — optional; defaults to Supabase direct read
- `EXPO_PUBLIC_DEV_MANUAL_HEAT=true` — manual heat for assessment demo

### Server (`server/.env`)

- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY` — optional; without it, summaries use extract-only fallback
- `ADMIN_API_KEY` — protects admin review routes
- `PAGASA_NEWS_CRON` — default `*/30 * * * *` (every 30 minutes)
- `PAGASA_NEWS_REQUIRE_ADMIN_APPROVE=false` — auto-publish after official source validation (default)

## Admin workflow

1. Collector inserts rows with `status = pending`
2. Admin calls `PATCH /admin/pagasa-updates/:id` with `ADMIN_API_KEY`
3. Approve → `status = approved` → visible in app
4. Reject / delete incorrect or duplicate entries

## Duplicate prevention

- Unique `source_url`
- Unique `content_hash` (SHA-256 of normalized title + body)

## Failure handling

- Source unreachable → logged in `pagasa_collection_logs`, no fake articles
- AI failure → row saved with `ai_processing_status = failed`, summary = truncated original
