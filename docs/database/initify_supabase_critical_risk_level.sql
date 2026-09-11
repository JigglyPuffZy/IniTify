-- =============================================================================
-- IniTify — add CRITICAL to risk_level enum (52°C+ PAGASA Extreme Danger band)
-- Run in Supabase SQL Editor if assessments fail to sync at CRITICAL level
-- =============================================================================

ALTER TYPE public.risk_level ADD VALUE IF NOT EXISTS 'CRITICAL';

-- Verify
SELECT unnest(enum_range(NULL::public.risk_level)) AS risk_level;
