-- =============================================================================
-- IniTify — SUPABASE SAMPLE DATA (PostgreSQL)
-- Run AFTER initify_supabase_schema.sql + initify_supabase_permissions.sql
-- Paste in Supabase SQL Editor → Run
-- =============================================================================

DO $$
DECLARE
  v_user_id BIGINT;
  v_heat_id BIGINT;
  v_assessment_id BIGINT;
  v_hospital_id INT;
BEGIN
  INSERT INTO users (device_uuid, display_name)
  VALUES ('demo-device-001', 'Juan Dela Cruz')
  ON CONFLICT (device_uuid) DO UPDATE SET display_name = EXCLUDED.display_name
  RETURNING id INTO v_user_id;

  UPDATE user_risk_profiles SET is_current = FALSE WHERE user_id = v_user_id;

  INSERT INTO user_risk_profiles (
    user_id, age, health_condition, activity_level, hydration_status, is_current
  ) VALUES (
    v_user_id, 25, 'None', 'Moderate', 'Well hydrated', TRUE
  );

  DELETE FROM emergency_contacts WHERE user_id = v_user_id;

  INSERT INTO emergency_contacts (user_id, contact_name, contact_phone, is_primary)
  VALUES (v_user_id, 'Maria Dela Cruz', '09171234567', TRUE);

  INSERT INTO heat_index_readings (
    user_id, heat_index_c, data_source, latitude, longitude, is_cached, retrieved_at
  ) VALUES (
    v_user_id, 38.00, 'dev_manual', 17.6131000, 121.7269000, FALSE, NOW()
  )
  RETURNING id INTO v_heat_id;

  INSERT INTO risk_assessments (
    user_id, heat_reading_id, risk_level, assessment_source, message,
    heat_index_c, input_age, input_health_condition, input_activity_level,
    input_hydration_status, input_latitude, input_longitude,
    decision_tree_version, assessed_at
  ) VALUES (
    v_user_id, v_heat_id, 'HIGH', 'decision-tree', 'Decision Tree evaluation complete.',
    38.00, 25, 'None', 'Moderate', 'Well hydrated', 17.6131000, 121.7269000,
    '1.0.0-trained', NOW()
  )
  RETURNING id INTO v_assessment_id;

  INSERT INTO recommendation_logs (
    user_id, assessment_id, risk_level, recommendation_type, title, description, viewed_at
  ) VALUES
    (v_user_id, v_assessment_id, 'HIGH', 'hydration', 'Increase fluid intake', 'Drink water regularly.', NOW()),
    (v_user_id, v_assessment_id, 'HIGH', 'rest', 'Take rest breaks', 'Rest in shade periodically.', NOW());

  INSERT INTO heat_alert_logs (user_id, assessment_id, risk_level, summary, delivery_status, sent_at)
  VALUES (
    v_user_id, v_assessment_id, 'HIGH', 'Monitor heat exposure; hydrate and rest.', 'sent', NOW()
  );

  INSERT INTO emergency_events (
    user_id, assessment_id, is_active, activated_at,
    indicator_extreme_heat, indicator_failed_prompts, indicator_inactivity,
    failed_prompt_threshold, inactivity_threshold_min
  ) VALUES (
    v_user_id, v_assessment_id, FALSE, NULL, FALSE, FALSE, FALSE, 3, 15
  );

  INSERT INTO location_logs (user_id, latitude, longitude, accuracy_m, context, recorded_at)
  VALUES (v_user_id, 17.6131000, 121.7269000, 12.5, 'dashboard', NOW());

  SELECT id INTO v_hospital_id FROM hospitals WHERE name LIKE 'Cagayan Valley%' LIMIT 1;

  IF v_hospital_id IS NOT NULL THEN
    INSERT INTO hospital_lookups (
      user_id, hospital_id, provider, hospital_name, hospital_address,
      hospital_latitude, hospital_longitude, user_latitude, user_longitude,
      distance_km, estimated_travel_time, maps_provider, looked_up_at
    ) VALUES (
      v_user_id, v_hospital_id, 'static-tuguegarao', 'Cagayan Valley Medical Center (CVMC)',
      'Carig Sur, Tuguegarao City, Cagayan', 17.6097000, 121.7283000,
      17.6131000, 121.7269000, 0.5, '~5 min (estimate)', 'google', NOW()
    );
  END IF;

  INSERT INTO offline_cache_snapshots (user_id, heat_reading_id, assessment_id, snapshot_at, notes)
  VALUES (v_user_id, v_heat_id, v_assessment_id, NOW(), 'Demo offline snapshot');
END $$;

-- Should return row counts (NOT empty)
SELECT 'users' AS tbl, COUNT(*) AS rows FROM users
UNION ALL SELECT 'hospitals', COUNT(*) FROM hospitals
UNION ALL SELECT 'system_config', COUNT(*) FROM system_config
UNION ALL SELECT 'risk_assessments', COUNT(*) FROM risk_assessments
UNION ALL SELECT 'heat_index_readings', COUNT(*) FROM heat_index_readings
ORDER BY tbl;
