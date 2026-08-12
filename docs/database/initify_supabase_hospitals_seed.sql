-- Full major hospital list for Tuguegarao City, Cagayan
-- Run in Supabase SQL Editor (safe to re-run)

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
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  phone = EXCLUDED.phone;

SELECT COUNT(*) AS hospital_count FROM hospitals;
SELECT id, name, phone FROM hospitals ORDER BY name;
