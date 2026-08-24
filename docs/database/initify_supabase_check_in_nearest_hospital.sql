-- =============================================================================
-- IniTify — Check-in Nearest Hospital (Tify CTA)
-- File: initify_supabase_check_in_nearest_hospital.sql
-- =============================================================================
-- IMPORTANT (Supabase SQL Editor):
--   "Failed to fetch" = browser cannot reach your project (network / project paused).
--   Fix first: Dashboard → Project → confirm green / not paused → retry Wi‑Fi / disable VPN.
--
-- Also run in TWO steps (enum ADD VALUE cannot share a DO-block / same txn issues).
-- =============================================================================

-- =============================================================================
-- STEP 1 — Run this alone, then click Run. Wait for Success.
-- =============================================================================
ALTER TYPE location_context ADD VALUE IF NOT EXISTS 'check_in';

-- =============================================================================
-- STEP 2 — New query (or clear editor), paste ONLY from here down, then Run.
-- =============================================================================

ALTER TABLE hospital_lookups
  ADD COLUMN IF NOT EXISTS lookup_source VARCHAR(40) NOT NULL DEFAULT 'hospital_tab';

COMMENT ON COLUMN hospital_lookups.lookup_source IS
  'Where nearest hospital was offered: hospital_tab | emergency | check_in_ai';

CREATE INDEX IF NOT EXISTS idx_hospital_lookups_source
  ON hospital_lookups (lookup_source, looked_up_at DESC);

INSERT INTO hospitals (name, address, city, province, latitude, longitude, phone) VALUES
  ('Cagayan Valley Medical Center (CVMC)', 'Maharlika Highway, Carig Sur, Tuguegarao City, Cagayan', 'Tuguegarao City', 'Cagayan', 17.6097000, 121.7283000, '(078) 302-0000'),
  ('Tuguegarao City People''s General Hospital', 'Luna Street, Centro 6, Tuguegarao City, Cagayan', 'Tuguegarao City', 'Cagayan', 17.6131000, 121.7269000, '(078) 304-1114'),
  ('St. Paul Hospital of Tuguegarao', 'Luna Street Extension, Ugac Norte, Tuguegarao City, Cagayan', 'Tuguegarao City', 'Cagayan', 17.6139700, 121.7072700, '(078) 844-2520'),
  ('Divine Mercy Wellness Center', 'Arellano cor. Burgos Street, Centro 6, Tuguegarao City, Cagayan', 'Tuguegarao City', 'Cagayan', 17.6156160, 121.7293090, '(078) 844-4624'),
  ('Holy Infant Hospital', '54 Washington Street, Tuguegarao City, Cagayan', 'Tuguegarao City', 'Cagayan', 17.6159530, 121.7258450, '(078) 844-1039'),
  ('Cagayan United Doctors Medical Center (CUDMC)', '7 Bagay Road, Caritan Centro, Tuguegarao City, Cagayan', 'Tuguegarao City', 'Cagayan', 17.6035000, 121.7178000, '(078) 304-8888'),
  ('Dr. Ronald P. Guzman Medical Center', 'Enrile Boulevard, Carig, Tuguegarao City, Cagayan', 'Tuguegarao City', 'Cagayan', 17.6008000, 121.7195000, '(078) 304-0925'),
  ('Raphael General Hospital', 'Bagay Road, Atulayan Sur, Tuguegarao City, Cagayan', 'Tuguegarao City', 'Cagayan', 17.5988000, 121.7135000, '(078) 846-0815'),
  ('Maricar Hospital', 'Bagay Road, Tuguegarao City, Cagayan', 'Tuguegarao City', 'Cagayan', 17.6012000, 121.7154000, NULL),
  ('ACE Medical Center - Tuguegarao', 'Pallua Road, Pallua Norte, Tuguegarao City, Cagayan', 'Tuguegarao City', 'Cagayan', 17.6285000, 121.7320000, '(078) 846-8888')
ON CONFLICT (name) DO UPDATE SET
  address = EXCLUDED.address,
  city = EXCLUDED.city,
  province = EXCLUDED.province,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  phone = EXCLUDED.phone,
  is_active = TRUE;

-- Verify
SELECT e.enumlabel AS location_context_values
FROM pg_enum e
JOIN pg_type t ON e.enumtypid = t.oid
WHERE t.typname = 'location_context'
ORDER BY e.enumsortorder;

SELECT COUNT(*) AS hospital_count FROM hospitals WHERE is_active = TRUE;

SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'hospital_lookups'
  AND column_name = 'lookup_source';
