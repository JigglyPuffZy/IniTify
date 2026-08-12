require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { pool } = require('./db');
const pagasaNewsRoutes = require('./routes/pagasa-news');
const adminPagasaNewsRoutes = require('./routes/admin-pagasa-news');
const { startScheduler } = require('./pagasa-news/scheduler');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, database: process.env.MYSQL_DATABASE || 'initify_db' });
  } catch (err) {
    res.json({
      ok: true,
      database: 'mysql-unavailable',
      note: 'MySQL optional when using Supabase direct sync.',
      error: err.message,
    });
  }
});

app.use('/api/pagasa-news', pagasaNewsRoutes);
app.use('/admin/pagasa-news', adminPagasaNewsRoutes);

async function upsertUser(deviceUuid, displayName) {
  await pool.query(
    `INSERT INTO users (device_uuid, display_name)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE display_name = VALUES(display_name), updated_at = CURRENT_TIMESTAMP`,
    [deviceUuid, displayName],
  );
  const [rows] = await pool.query('SELECT id FROM users WHERE device_uuid = ?', [deviceUuid]);
  return rows[0].id;
}

app.post('/api/users/sync', async (req, res) => {
  try {
    const { deviceUuid, profile, emergencyContact } = req.body;
    if (!deviceUuid || !profile?.name) {
      return res.status(400).json({ ok: false, error: 'deviceUuid and profile.name required' });
    }

    const userId = await upsertUser(deviceUuid, profile.name);

    await pool.query('UPDATE user_risk_profiles SET is_current = 0 WHERE user_id = ?', [userId]);
    await pool.query(
      `INSERT INTO user_risk_profiles
       (user_id, age, health_condition, activity_level, hydration_status, is_current)
       VALUES (?, ?, ?, ?, ?, 1)`,
      [
        userId,
        profile.riskFactors.age,
        profile.riskFactors.healthCondition,
        profile.riskFactors.activityLevel,
        profile.riskFactors.hydrationStatus,
      ],
    );

    if (emergencyContact?.phone) {
      await pool.query('DELETE FROM emergency_contacts WHERE user_id = ?', [userId]);
      await pool.query(
        `INSERT INTO emergency_contacts (user_id, contact_name, contact_phone, is_primary)
         VALUES (?, ?, ?, 1)`,
        [userId, emergencyContact.name, emergencyContact.phone],
      );
    }

    res.json({ ok: true, userId });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/heat-readings', async (req, res) => {
  try {
    const { deviceUuid, displayName, reading, dataSource } = req.body;
    const userId = await upsertUser(deviceUuid, displayName || 'IniTify User');

    const [result] = await pool.query(
      `INSERT INTO heat_index_readings
       (user_id, heat_index_c, data_source, latitude, longitude, is_cached, retrieved_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        reading.heatIndex,
        dataSource || 'DOST-PAGASA',
        reading.latitude,
        reading.longitude,
        reading.isCached ? 1 : 0,
        new Date(reading.retrievedAt),
      ],
    );

    res.json({ ok: true, heatReadingId: result.insertId });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/assessments', async (req, res) => {
  try {
    const { deviceUuid, displayName, assessment, treeVersion } = req.body;
    const userId = await upsertUser(deviceUuid, displayName || 'IniTify User');
    const inputs = assessment.inputs;

    const [result] = await pool.query(
      `INSERT INTO risk_assessments
       (user_id, risk_level, assessment_source, message,
        heat_index_c, input_age, input_health_condition, input_activity_level,
        input_hydration_status, input_latitude, input_longitude,
        decision_tree_version, assessed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        assessment.level,
        assessment.source,
        assessment.message || null,
        inputs.heatIndex,
        inputs.age,
        inputs.healthCondition,
        inputs.activityLevel,
        inputs.hydrationStatus,
        inputs.latitude,
        inputs.longitude,
        treeVersion || null,
        new Date(assessment.assessedAt),
      ],
    );

    res.json({ ok: true, assessmentId: result.insertId });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/emergency-events', async (req, res) => {
  try {
    const { deviceUuid, displayName, state } = req.body;
    const userId = await upsertUser(deviceUuid, displayName || 'IniTify User');

    const [result] = await pool.query(
      `INSERT INTO emergency_events
       (user_id, is_active, activated_at, indicator_extreme_heat,
        indicator_failed_prompts, indicator_inactivity,
        failed_prompt_threshold, inactivity_threshold_min)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        state.isActive ? 1 : 0,
        state.activatedAt ? new Date(state.activatedAt) : null,
        state.indicators.extremeHeatRisk ? 1 : 0,
        state.indicators.repeatedFailedSafetyPrompts ? 1 : 0,
        state.indicators.prolongedInactivity ? 1 : 0,
        3,
        15,
      ],
    );

    res.json({ ok: true, emergencyEventId: result.insertId });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/safety-prompts', async (req, res) => {
  try {
    const { deviceUuid, displayName, respondedOk } = req.body;
    const userId = await upsertUser(deviceUuid, displayName || 'IniTify User');

    await pool.query(
      `INSERT INTO safety_prompt_responses (user_id, responded_ok, responded_at)
       VALUES (?, ?, NOW())`,
      [userId, respondedOk ? 1 : 0],
    );

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/location-logs', async (req, res) => {
  try {
    const { deviceUuid, displayName, location, context } = req.body;
    const userId = await upsertUser(deviceUuid, displayName || 'IniTify User');

    await pool.query(
      `INSERT INTO location_logs (user_id, latitude, longitude, accuracy_m, context, recorded_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        userId,
        location.latitude,
        location.longitude,
        location.accuracy,
        context || 'other',
        new Date(location.retrievedAt || Date.now()),
      ],
    );

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`IniTify API running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`PAGASA news: http://localhost:${PORT}/api/pagasa-news/updates`);
  startScheduler();
});
