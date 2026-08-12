-- DOST-PAGASA AI News & Updates tables (Supabase PostgreSQL)
-- Run in Supabase SQL Editor AFTER initify_supabase_schema.sql

DO $$ BEGIN
  CREATE TYPE pagasa_update_category AS ENUM (
    'Weather Advisory',
    'Tropical Cyclone',
    'Rainfall Warning',
    'Thunderstorm Advisory',
    'Flood Advisory',
    'Severe Weather',
    'Earthquake',
    'Climate',
    'Public Advisory',
    'General News',
    'Other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE pagasa_update_status AS ENUM (
    'pending',
    'approved',
    'rejected',
    'failed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE pagasa_update_severity AS ENUM (
    'info',
    'low',
    'moderate',
    'high',
    'critical',
    'unknown'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS pagasa_updates (
  id BIGSERIAL PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  original_content TEXT NOT NULL,
  ai_summary TEXT,
  category pagasa_update_category NOT NULL DEFAULT 'Other',
  source_name VARCHAR(120) NOT NULL DEFAULT 'DOST-PAGASA',
  source_url TEXT NOT NULL,
  published_at TIMESTAMPTZ,
  collected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  affected_locations TEXT[] DEFAULT '{}',
  severity pagasa_update_severity NOT NULL DEFAULT 'info',
  status pagasa_update_status NOT NULL DEFAULT 'pending',
  content_hash VARCHAR(64) NOT NULL,
  is_important BOOLEAN NOT NULL DEFAULT FALSE,
  ai_processing_status VARCHAR(40) NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_pagasa_updates_source_url UNIQUE (source_url),
  CONSTRAINT uq_pagasa_updates_content_hash UNIQUE (content_hash)
);

CREATE INDEX IF NOT EXISTS idx_pagasa_updates_published ON pagasa_updates(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_pagasa_updates_status ON pagasa_updates(status);
CREATE INDEX IF NOT EXISTS idx_pagasa_updates_category ON pagasa_updates(category);

CREATE TABLE IF NOT EXISTS pagasa_collection_logs (
  id BIGSERIAL PRIMARY KEY,
  source_id VARCHAR(80) NOT NULL,
  source_name VARCHAR(120),
  source_url TEXT,
  run_status VARCHAR(40) NOT NULL,
  items_found INT NOT NULL DEFAULT 0,
  items_new INT NOT NULL DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL,
  finished_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_pagasa_collection_logs_started ON pagasa_collection_logs(started_at DESC);

-- Mobile app: read approved updates only
ALTER TABLE pagasa_updates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pagasa_updates_public_read ON pagasa_updates;
CREATE POLICY pagasa_updates_public_read ON pagasa_updates
  FOR SELECT TO anon, authenticated
  USING (status = 'approved');

GRANT SELECT ON pagasa_updates TO anon, authenticated;
GRANT SELECT ON pagasa_collection_logs TO anon, authenticated;
GRANT ALL ON pagasa_updates TO service_role;
GRANT ALL ON pagasa_collection_logs TO service_role;
GRANT USAGE, SELECT ON SEQUENCE pagasa_updates_id_seq TO service_role;
GRANT USAGE, SELECT ON SEQUENCE pagasa_collection_logs_id_seq TO service_role;
