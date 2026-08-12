# Admin — DOST-PAGASA News (Review Only)

**There is no manual news entry form.** The collector automatically fills title, content, date, category, locations, summary, and source URL from official PAGASA sources.

Admin API is for **review and maintenance only**:

- View collected items
- Approve/reject (only if `PAGASA_NEWS_REQUIRE_ADMIN_APPROVE=true`)
- Edit an AI summary if inaccurate
- Delete duplicates
- View collection logs

## Approve an update (optional — only when review gate enabled)

```bash
curl -X PATCH "http://localhost:3001/admin/pagasa-news/updates/1" \
  -H "Content-Type: application/json" \
  -H "x-admin-key: initify-admin-dev" \
  -d "{\"status\":\"approved\"}"
```

## List pending items

```bash
curl "http://localhost:3001/admin/pagasa-news/updates?status=pending" \
  -H "x-admin-key: initify-admin-dev"
```

## Reject / delete

```bash
curl -X PATCH "http://localhost:3001/admin/pagasa-news/updates/1" \
  -H "Content-Type: application/json" \
  -H "x-admin-key: initify-admin-dev" \
  -d "{\"status\":\"rejected\",\"admin_notes\":\"Duplicate entry\"}"
```

```bash
curl -X DELETE "http://localhost:3001/admin/pagasa-news/updates/1" \
  -H "x-admin-key: initify-admin-dev"
```

## Trigger collection manually

```bash
curl -X POST "http://localhost:3001/api/pagasa-news/collect"
```

## Auto-approve (thesis demo only)

Set in `.env`:

```env
PAGASA_NEWS_REQUIRE_ADMIN_APPROVE=false
```

Default: new official items **auto-publish** to the app. Set `true` only if you want a human review gate.
