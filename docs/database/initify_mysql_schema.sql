-- =============================================================================
-- IniTify / HeatHits — MySQL Database Schema
-- ⚠️  DO NOT paste this file into SUPABASE SQL Editor — it will fail!
--     Supabase = PostgreSQL → use initify_supabase_schema.sql instead
-- Paste this ENTIRE file into MySQL Workbench, phpMyAdmin SQL tab, or HeidiSQL
-- Test location: Tuguegarao City, Cagayan
-- =============================================================================

CREATE DATABASE IF NOT EXISTS initify_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE initify_db;

-- -----------------------------------------------------------------------------
-- 1. USERS & PROFILE (Setup screen)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  device_uuid VARCHAR(64) NOT NULL COMMENT 'Mobile device ID for sync without login',
  display_name VARCHAR(120) NOT NULL,
  study_area_city VARCHAR(80) DEFAULT 'Tuguegarao City',
  study_area_province VARCHAR(80) DEFAULT 'Cagayan',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_device_uuid (device_uuid)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS user_risk_profiles (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  age TINYINT UNSIGNED NOT NULL,
  health_condition VARCHAR(120) NOT NULL,
  activity_level ENUM('Low', 'Moderate', 'High') NOT NULL,
  hydration_status ENUM('Well hydrated', 'Moderately hydrated', 'Dehydrated') NOT NULL,
  is_current TINYINT(1) NOT NULL DEFAULT 1,
  recorded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_risk_profiles_user (user_id),
  CONSTRAINT fk_risk_profiles_user
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS emergency_contacts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  contact_name VARCHAR(120) NOT NULL,
  contact_phone VARCHAR(30) NOT NULL,
  is_primary TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_emergency_contacts_user (user_id),
  CONSTRAINT fk_emergency_contacts_user
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- 2. ENVIRONMENTAL / PAGASA (Dashboard heat index)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS heat_index_readings (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  heat_index_c DECIMAL(5,2) NOT NULL,
  data_source ENUM('DOST-PAGASA', 'dev_manual', 'cached') NOT NULL DEFAULT 'DOST-PAGASA',
  pagasa_provider VARCHAR(30) NULL COMMENT 'tenday | custom',
  latitude DECIMAL(10,7) NULL,
  longitude DECIMAL(10,7) NULL,
  is_cached TINYINT(1) NOT NULL DEFAULT 0,
  retrieved_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_heat_readings_user_time (user_id, retrieved_at),
  CONSTRAINT fk_heat_readings_user
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- 3. DECISION TREE / RISK ASSESSMENT (Assessment screen)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS risk_assessments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  heat_reading_id BIGINT UNSIGNED NULL,
  risk_level ENUM('LOW', 'MODERATE', 'HIGH', 'EXTREME') NULL,
  assessment_source ENUM('decision-tree', 'unavailable') NOT NULL DEFAULT 'decision-tree',
  message TEXT NULL,
  heat_index_c DECIMAL(5,2) NULL,
  input_age TINYINT UNSIGNED NULL,
  input_health_condition VARCHAR(120) NULL,
  input_activity_level VARCHAR(20) NULL,
  input_hydration_status VARCHAR(40) NULL,
  input_latitude DECIMAL(10,7) NULL,
  input_longitude DECIMAL(10,7) NULL,
  decision_tree_version VARCHAR(60) NULL,
  assessed_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_assessments_user_time (user_id, assessed_at),
  KEY idx_assessments_level (risk_level),
  CONSTRAINT fk_assessments_user
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_assessments_heat
    FOREIGN KEY (heat_reading_id) REFERENCES heat_index_readings (id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- 4. RECOMMENDATIONS (Recommendations screen — log when generated)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS recommendation_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  assessment_id BIGINT UNSIGNED NULL,
  risk_level ENUM('LOW', 'MODERATE', 'HIGH', 'EXTREME') NOT NULL,
  recommendation_type ENUM(
    'hydration',
    'rest',
    'seek_shade',
    'limit_outdoor_activities'
  ) NOT NULL,
  title VARCHAR(160) NOT NULL,
  description TEXT NOT NULL,
  viewed_at DATETIME NOT NULL,
  PRIMARY KEY (id),
  KEY idx_recommendations_user (user_id),
  CONSTRAINT fk_recommendations_user
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_recommendations_assessment
    FOREIGN KEY (assessment_id) REFERENCES risk_assessments (id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- 5. HEAT ALERTS (Alerts screen — local push notifications)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS heat_alert_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  assessment_id BIGINT UNSIGNED NULL,
  risk_level ENUM('LOW', 'MODERATE', 'HIGH', 'EXTREME') NOT NULL,
  summary TEXT NOT NULL,
  delivery_status ENUM('scheduled', 'sent', 'failed', 'permission_denied') NOT NULL DEFAULT 'sent',
  sent_at DATETIME NOT NULL,
  PRIMARY KEY (id),
  KEY idx_heat_alerts_user (user_id),
  CONSTRAINT fk_heat_alerts_user
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_heat_alerts_assessment
    FOREIGN KEY (assessment_id) REFERENCES risk_assessments (id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- 6. EMERGENCY SYSTEM (Emergency screen — indicators, prompts, notifications)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS emergency_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  assessment_id BIGINT UNSIGNED NULL,
  is_active TINYINT(1) NOT NULL,
  activated_at DATETIME NULL,
  indicator_extreme_heat TINYINT(1) NOT NULL DEFAULT 0,
  indicator_failed_prompts TINYINT(1) NOT NULL DEFAULT 0,
  indicator_inactivity TINYINT(1) NOT NULL DEFAULT 0,
  failed_prompt_threshold INT UNSIGNED NULL,
  inactivity_threshold_min INT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_emergency_events_user (user_id),
  KEY idx_emergency_events_active (is_active),
  CONSTRAINT fk_emergency_events_user
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_emergency_events_assessment
    FOREIGN KEY (assessment_id) REFERENCES risk_assessments (id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS safety_prompt_responses (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  emergency_event_id BIGINT UNSIGNED NULL,
  responded_ok TINYINT(1) NOT NULL COMMENT '1=I am OK, 0=Need Help',
  responded_at DATETIME NOT NULL,
  PRIMARY KEY (id),
  KEY idx_safety_prompts_user (user_id),
  CONSTRAINT fk_safety_prompts_user
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_safety_prompts_event
    FOREIGN KEY (emergency_event_id) REFERENCES emergency_events (id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS emergency_active_alerts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  emergency_event_id BIGINT UNSIGNED NULL,
  triggered_reasons TEXT NOT NULL,
  alert_type ENUM('popup', 'local_notification') NOT NULL DEFAULT 'local_notification',
  delivered_at DATETIME NOT NULL,
  PRIMARY KEY (id),
  KEY idx_emergency_alerts_user (user_id),
  CONSTRAINT fk_emergency_alerts_user
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_emergency_alerts_event
    FOREIGN KEY (emergency_event_id) REFERENCES emergency_events (id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS emergency_contact_notifications (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  emergency_event_id BIGINT UNSIGNED NULL,
  contact_name VARCHAR(120) NOT NULL,
  contact_phone VARCHAR(30) NOT NULL,
  heat_risk_level ENUM('LOW', 'MODERATE', 'HIGH', 'EXTREME') NULL,
  latitude DECIMAL(10,7) NULL,
  longitude DECIMAL(10,7) NULL,
  nearest_hospital VARCHAR(200) NULL,
  estimated_travel_time VARCHAR(60) NULL,
  is_development_mode TINYINT(1) NOT NULL DEFAULT 1,
  sent_status ENUM('prepared', 'sent', 'failed') NOT NULL DEFAULT 'prepared',
  sent_at DATETIME NOT NULL,
  PRIMARY KEY (id),
  KEY idx_contact_notifications_user (user_id),
  CONSTRAINT fk_contact_notifications_user
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_contact_notifications_event
    FOREIGN KEY (emergency_event_id) REFERENCES emergency_events (id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS emergency_hotline_calls (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  hotline_label VARCHAR(160) NOT NULL,
  phone_dialed VARCHAR(30) NOT NULL,
  dialed_at DATETIME NOT NULL,
  PRIMARY KEY (id),
  KEY idx_hotline_calls_user (user_id),
  CONSTRAINT fk_hotline_calls_user
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- 7. HOSPITAL & NAVIGATION (Hospital screen)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS hospitals (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(200) NOT NULL,
  address VARCHAR(255) NOT NULL,
  city VARCHAR(80) NOT NULL DEFAULT 'Tuguegarao City',
  province VARCHAR(80) NOT NULL DEFAULT 'Cagayan',
  latitude DECIMAL(10,7) NOT NULL,
  longitude DECIMAL(10,7) NOT NULL,
  phone VARCHAR(30) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS hospital_lookups (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  hospital_id INT UNSIGNED NULL,
  provider VARCHAR(40) NOT NULL DEFAULT 'static-tuguegarao',
  hospital_name VARCHAR(200) NOT NULL,
  hospital_address VARCHAR(255) NULL,
  hospital_latitude DECIMAL(10,7) NOT NULL,
  hospital_longitude DECIMAL(10,7) NOT NULL,
  user_latitude DECIMAL(10,7) NULL,
  user_longitude DECIMAL(10,7) NULL,
  distance_km DECIMAL(6,2) NULL,
  estimated_travel_time VARCHAR(60) NULL,
  maps_provider VARCHAR(20) NULL,
  looked_up_at DATETIME NOT NULL,
  PRIMARY KEY (id),
  KEY idx_hospital_lookups_user (user_id),
  CONSTRAINT fk_hospital_lookups_user
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_hospital_lookups_hospital
    FOREIGN KEY (hospital_id) REFERENCES hospitals (id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- 8. GPS / LOCATION LOGS (all screens using GPS)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS location_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  latitude DECIMAL(10,7) NOT NULL,
  longitude DECIMAL(10,7) NOT NULL,
  accuracy_m DECIMAL(8,2) NULL,
  context ENUM('setup', 'dashboard', 'assessment', 'emergency', 'hospital', 'other') NOT NULL,
  recorded_at DATETIME NOT NULL,
  PRIMARY KEY (id),
  KEY idx_location_logs_user (user_id),
  CONSTRAINT fk_location_logs_user
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- 9. OFFLINE CACHE METADATA (Offline screen)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS offline_cache_snapshots (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  heat_reading_id BIGINT UNSIGNED NULL,
  assessment_id BIGINT UNSIGNED NULL,
  snapshot_at DATETIME NOT NULL,
  notes VARCHAR(255) NULL,
  PRIMARY KEY (id),
  KEY idx_offline_cache_user (user_id),
  CONSTRAINT fk_offline_cache_user
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_offline_cache_heat
    FOREIGN KEY (heat_reading_id) REFERENCES heat_index_readings (id) ON DELETE SET NULL,
  CONSTRAINT fk_offline_cache_assessment
    FOREIGN KEY (assessment_id) REFERENCES risk_assessments (id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- 10. SYSTEM CONFIG (thresholds, decision tree version, first-aid flag)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS system_config (
  config_key VARCHAR(80) NOT NULL,
  config_value TEXT NOT NULL,
  description VARCHAR(255) NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (config_key)
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- REFERENCE DATA: Tuguegarao hospitals (matches app static list)
-- Source: tuguegaraocity.gov.ph + app src/data/tuguegarao-hospitals.ts
-- -----------------------------------------------------------------------------
INSERT IGNORE INTO hospitals (name, address, city, province, latitude, longitude, phone) VALUES
  ('Cagayan Valley Medical Center (CVMC)', 'Maharlika Highway, Carig Sur, Tuguegarao City, Cagayan', 'Tuguegarao City', 'Cagayan', 17.6097000, 121.7283000, '(078) 302-0000'),
  ('Tuguegarao City People''s General Hospital', 'Luna Street, Centro 6, Tuguegarao City, Cagayan', 'Tuguegarao City', 'Cagayan', 17.6131000, 121.7269000, '(078) 304-1114'),
  ('St. Paul Hospital of Tuguegarao', 'Luna Street Extension, Ugac Norte, Tuguegarao City, Cagayan', 'Tuguegarao City', 'Cagayan', 17.6139700, 121.7072700, '(078) 844-2520'),
  ('Divine Mercy Wellness Center', 'Arellano cor. Burgos Street, Centro 6, Tuguegarao City, Cagayan', 'Tuguegarao City', 'Cagayan', 17.6156160, 121.7293090, '(078) 844-4624'),
  ('Holy Infant Hospital', '54 Washington Street, Tuguegarao City, Cagayan', 'Tuguegarao City', 'Cagayan', 17.6159530, 121.7258450, '(078) 844-1039'),
  ('Cagayan United Doctors Medical Center (CUDMC)', '7 Bagay Road, Caritan Centro, Tuguegarao City, Cagayan', 'Tuguegarao City', 'Cagayan', 17.6035000, 121.7178000, '(078) 304-8888'),
  ('Dr. Ronald P. Guzman Medical Center', 'Enrile Boulevard, Carig, Tuguegarao City, Cagayan', 'Tuguegarao City', 'Cagayan', 17.6008000, 121.7195000, '(078) 304-0925'),
  ('Raphael General Hospital', 'Bagay Road, Atulayan Sur, Tuguegarao City, Cagayan', 'Tuguegarao City', 'Cagayan', 17.5988000, 121.7135000, '(078) 846-0815'),
  ('Maricar Hospital', 'Bagay Road, Tuguegarao City, Cagayan', 'Tuguegarao City', 'Cagayan', 17.6012000, 121.7154000, NULL),
  ('ACE Medical Center — Tuguegarao', 'Pallua Road, Pallua Norte, Tuguegarao City, Cagayan', 'Tuguegarao City', 'Cagayan', 17.6285000, 121.7320000, '(078) 846-8888');

INSERT INTO system_config (config_key, config_value, description) VALUES
  ('decision_tree_version', '1.0.0-trained', 'Active decision tree rules version'),
  ('emergency_failed_prompt_count', '3', 'Failed safety prompts before indicator'),
  ('emergency_inactivity_minutes', '15', 'Inactivity minutes before indicator'),
  ('emergency_safety_prompt_interval_minutes', '5', 'Safety prompt interval'),
  ('emergency_dev_mode', 'true', 'SMS not sent when true'),
  ('study_area', 'Tuguegarao City, Cagayan', 'HeatHits test location'),
  ('first_aid_approved', 'true', 'First-aid content approved flag')
ON DUPLICATE KEY UPDATE config_value = VALUES(config_value);

-- -----------------------------------------------------------------------------
-- REPORTING VIEWS (optional — for thesis / admin queries)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_latest_user_assessments AS
SELECT
  u.id AS user_id,
  u.display_name,
  ra.id AS assessment_id,
  ra.risk_level,
  ra.heat_index_c,
  ra.assessed_at
FROM users u
LEFT JOIN risk_assessments ra ON ra.user_id = u.id
WHERE ra.id = (
  SELECT MAX(ra2.id) FROM risk_assessments ra2 WHERE ra2.user_id = u.id
);

CREATE OR REPLACE VIEW v_emergency_summary AS
SELECT
  u.display_name,
  ee.is_active,
  ee.activated_at,
  ee.indicator_extreme_heat,
  ee.indicator_failed_prompts,
  ee.indicator_inactivity,
  ee.created_at
FROM emergency_events ee
JOIN users u ON u.id = ee.user_id
ORDER BY ee.created_at DESC;

-- Done. Run: SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'initify_db';
-- Expected: 17 tables + 2 views
