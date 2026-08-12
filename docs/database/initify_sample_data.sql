-- =============================================================================
-- IniTify — SAMPLE TEST DATA (run AFTER initify_mysql_schema.sql)
-- Use for thesis demo / SQL editor verification only — not real patient data
-- =============================================================================

USE initify_db;

-- Sample user (matches a typical Setup form)
INSERT INTO users (device_uuid, display_name) VALUES
  ('demo-device-001', 'Juan Dela Cruz');

SET @user_id = LAST_INSERT_ID();

INSERT INTO user_risk_profiles (user_id, age, health_condition, activity_level, hydration_status) VALUES
  (@user_id, 25, 'None', 'Moderate', 'Well hydrated');

INSERT INTO emergency_contacts (user_id, contact_name, contact_phone) VALUES
  (@user_id, 'Maria Dela Cruz', '09171234567');

INSERT INTO heat_index_readings (user_id, heat_index_c, data_source, latitude, longitude, is_cached, retrieved_at) VALUES
  (@user_id, 38.00, 'dev_manual', 17.6131000, 121.7269000, 0, NOW());

SET @heat_id = LAST_INSERT_ID();

INSERT INTO risk_assessments (
  user_id, heat_reading_id, risk_level, assessment_source, message,
  heat_index_c, input_age, input_health_condition, input_activity_level,
  input_hydration_status, input_latitude, input_longitude,
  decision_tree_version, assessed_at
) VALUES (
  @user_id, @heat_id, 'HIGH', 'decision-tree', 'Decision Tree evaluation complete.',
  38.00, 25, 'None', 'Moderate', 'Well hydrated', 17.6131000, 121.7269000,
  '1.0.0-trained', NOW()
);

SET @assessment_id = LAST_INSERT_ID();

INSERT INTO recommendation_logs (
  user_id, assessment_id, risk_level, recommendation_type, title, description, viewed_at
) VALUES
  (@user_id, @assessment_id, 'HIGH', 'hydration', 'Increase fluid intake', 'Drink water regularly.', NOW()),
  (@user_id, @assessment_id, 'HIGH', 'rest', 'Take rest breaks', 'Rest in shade periodically.', NOW());

INSERT INTO heat_alert_logs (user_id, assessment_id, risk_level, summary, delivery_status, sent_at) VALUES
  (@user_id, @assessment_id, 'HIGH', 'Monitor heat exposure; hydrate and rest.', 'sent', NOW());

INSERT INTO emergency_events (
  user_id, assessment_id, is_active, activated_at,
  indicator_extreme_heat, indicator_failed_prompts, indicator_inactivity,
  failed_prompt_threshold, inactivity_threshold_min
) VALUES (
  @user_id, @assessment_id, 0, NULL, 0, 0, 0, 3, 15
);

INSERT INTO location_logs (user_id, latitude, longitude, accuracy_m, context, recorded_at) VALUES
  (@user_id, 17.6131000, 121.7269000, 12.5, 'dashboard', NOW());

INSERT INTO hospital_lookups (
  user_id, hospital_id, provider, hospital_name, hospital_address,
  hospital_latitude, hospital_longitude, user_latitude, user_longitude,
  distance_km, estimated_travel_time, maps_provider, looked_up_at
) VALUES (
  @user_id, 1, 'static-tuguegarao', 'Cagayan Valley Medical Center (CVMC)',
  'Carig Sur, Tuguegarao City, Cagayan', 17.6097000, 121.7283000,
  17.6131000, 121.7269000, 0.5, '~5 min (estimate)', 'google', NOW()
);

INSERT INTO offline_cache_snapshots (user_id, heat_reading_id, assessment_id, snapshot_at, notes) VALUES
  (@user_id, @heat_id, @assessment_id, NOW(), 'Demo offline snapshot');

-- Verify
SELECT 'users' AS tbl, COUNT(*) AS rows FROM users
UNION ALL SELECT 'risk_assessments', COUNT(*) FROM risk_assessments
UNION ALL SELECT 'hospitals', COUNT(*) FROM hospitals
UNION ALL SELECT 'system_config', COUNT(*) FROM system_config;
