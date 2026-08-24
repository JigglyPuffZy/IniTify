-- Full major hospital list for Tuguegarao City, Cagayan
-- Coordinates aligned with OpenStreetMap (Aug 2026). Safe to re-run.

INSERT INTO hospitals (name, address, city, province, latitude, longitude, phone) VALUES
  ('Cagayan Valley Medical Center (CVMC)', 'Dalan na Pagayaya, Carig Sur, Tuguegarao City, Cagayan', 'Tuguegarao City', 'Cagayan', 17.6566106, 121.7470166, '(078) 302-0000'),
  ('Tuguegarao City People''s General Hospital', 'Blumentritt Street, Centro 7, Tuguegarao City, Cagayan', 'Tuguegarao City', 'Cagayan', 17.6129003, 121.7294533, '(078) 304-1114'),
  ('St. Paul Hospital of Tuguegarao', 'Luna Street Extension, Ugac, Tuguegarao City, Cagayan', 'Tuguegarao City', 'Cagayan', 17.6140503, 121.7074356, '(078) 844-2520'),
  ('Divine Mercy Wellness Center', 'Arellano Street, Centro 6, Tuguegarao City, Cagayan', 'Tuguegarao City', 'Cagayan', 17.6112955, 121.7273876, '(078) 844-4624'),
  ('Holy Infant Hospital', 'Magallanes Street, Centro 8, Tuguegarao City, Cagayan', 'Tuguegarao City', 'Cagayan', 17.6156545, 121.7258677, '(078) 844-1039'),
  ('Dr. Domingo S. de Leon General Hospital', 'Bonifacio Street, Centro 10, Tuguegarao City, Cagayan', 'Tuguegarao City', 'Cagayan', 17.6102305, 121.7281608, NULL),
  ('Cagayan United Doctors Medical Center (CUDMC)', 'Bagay Road, Caritan Centro, Tuguegarao City, Cagayan', 'Tuguegarao City', 'Cagayan', 17.6242327, 121.7214578, '(078) 304-8888'),
  ('Dr. Ronald P. Guzman Medical Center', 'Enrile Boulevard, Carig, Tuguegarao City, Cagayan', 'Tuguegarao City', 'Cagayan', 17.6495020, 121.7559016, '(078) 304-0925'),
  ('Raphael General Hospital', 'Bagay Road, Caritan Centro, Tuguegarao City, Cagayan', 'Tuguegarao City', 'Cagayan', 17.6334666, 121.7126868, '(078) 846-0815'),
  ('ACE Medical Center - Tuguegarao', 'Ugac-Pallua Road, Pallua, Tuguegarao City, Cagayan', 'Tuguegarao City', 'Cagayan', 17.6202283, 121.7070237, '(078) 846-8888')
ON CONFLICT (name) DO UPDATE SET
  address = EXCLUDED.address,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  phone = EXCLUDED.phone;

-- Remove obsolete seed row (facility not found in Tuguegarao OSM listings)
DELETE FROM hospitals WHERE name = 'Maricar Hospital';

SELECT COUNT(*) AS hospital_count FROM hospitals;
SELECT id, name, latitude, longitude, phone FROM hospitals ORDER BY name;
