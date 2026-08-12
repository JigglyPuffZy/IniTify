const express = require('express');
const repository = require('../pagasa-news/repository');
const { safeRun } = require('../pagasa-news/scheduler');
const { partitionUpdatesByPhDate, PH_TIMEZONE } = require('../pagasa-news/date-utils');

const router = express.Router();

router.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'pagasa-news', timezone: PH_TIMEZONE });
});

router.get('/updates', async (req, res) => {
  try {
    const limit = Math.min(Number.parseInt(req.query.limit, 10) || 30, 100);
    const rows = await repository.listUpdates({ status: 'approved', limit });
    res.json({ ok: true, updates: rows });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/feed', async (req, res) => {
  try {
    const limit = Math.min(Number.parseInt(req.query.limit, 10) || 100, 100);
    const rows = await repository.listUpdates({ status: 'approved', limit });
    const feed = partitionUpdatesByPhDate(rows);
    res.json({
      ok: true,
      feed: { ...feed, timezone: PH_TIMEZONE },
      message: feed.hasTodayUpdates
        ? `${feed.today.length} update(s) published on ${feed.todayLabel}.`
        : 'No new DOST-PAGASA updates have been published today.',
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/updates/today', async (_req, res) => {
  try {
    const rows = await repository.listUpdates({ status: 'approved', limit: 100 });
    const feed = partitionUpdatesByPhDate(rows);
    res.json({
      ok: true,
      updates: feed.today,
      hasTodayUpdates: feed.hasTodayUpdates,
      todayLabel: feed.todayLabel,
      timezone: PH_TIMEZONE,
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post('/collect', async (_req, res) => {
  try {
    await safeRun();
    res.json({ ok: true, message: 'Collection cycle triggered.' });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
