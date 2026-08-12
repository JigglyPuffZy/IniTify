const express = require('express');
const repository = require('../pagasa-news/repository');

const router = express.Router();

function requireAdmin(req, res, next) {
  const key = req.headers['x-admin-key'] || req.query.adminKey;
  if (!process.env.ADMIN_API_KEY) {
    return res.status(503).json({
      ok: false,
      error: 'ADMIN_API_KEY not configured on server.',
    });
  }
  if (key !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }
  return next();
}

router.use(requireAdmin);

router.get('/updates', async (req, res) => {
  try {
    const status = req.query.status || undefined;
    const rows = await repository.listUpdates({ status, limit: 100 });
    res.json({ ok: true, updates: rows });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/updates/:id', async (req, res) => {
  try {
    const row = await repository.getUpdateById(req.params.id);
    res.json({ ok: true, update: row });
  } catch (err) {
    res.status(404).json({ ok: false, error: err.message });
  }
});

router.patch('/updates/:id', async (req, res) => {
  try {
    const allowed = [
      'ai_summary',
      'category',
      'status',
      'is_important',
      'admin_notes',
      'severity',
      'affected_locations',
    ];
    const patch = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) patch[key] = req.body[key];
    }
    const row = await repository.updateById(req.params.id, patch);
    res.json({ ok: true, update: row });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.delete('/updates/:id', async (req, res) => {
  try {
    await repository.deleteById(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/collection-logs', async (_req, res) => {
  try {
    const { getSupabaseAdmin } = require('../supabase');
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('pagasa_collection_logs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    res.json({ ok: true, logs: data });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
