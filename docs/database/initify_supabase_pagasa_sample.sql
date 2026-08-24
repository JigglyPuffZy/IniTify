-- Sample DOST-PAGASA updates for thesis demo (run AFTER initify_supabase_pagasa_news.sql)
-- Safe to re-run — uses unique source_url

INSERT INTO pagasa_updates (
  title,
  original_content,
  ai_summary,
  category,
  source_name,
  source_url,
  published_at,
  affected_locations,
  severity,
  status,
  content_hash,
  is_important,
  ai_processing_status
) VALUES
  (
    'Weather Advisory No. 1 for Cagayan Valley',
    'The DOST-PAGASA Weather Division is monitoring a weather system affecting Northern Luzon including Cagayan Valley. Residents are advised to monitor updates.',
    'PAGASA is monitoring weather affecting Cagayan Valley. Stay alert for heavy rain and heat advisories in Tuguegarao City.',
    'Weather Advisory',
    'DOST-PAGASA',
    'https://www.pagasa.dost.gov.ph/sample/initify-demo-advisory-1',
    NOW() - INTERVAL '2 hours',
    ARRAY['Tuguegarao City', 'Cagayan'],
    'moderate',
    'approved',
    'initify-demo-hash-advisory-1',
    TRUE,
    'completed'
  ),
  (
    'Heat Index Advisory — Northern Luzon',
    'Elevated heat index values may be experienced over inland areas of Northern Luzon during daytime hours. Limit outdoor activities and stay hydrated.',
    'High heat index possible in Northern Luzon including Tuguegarao. Limit outdoor activity and drink water regularly.',
    'Climate',
    'DOST-PAGASA',
    'https://www.pagasa.dost.gov.ph/sample/initify-demo-heat-1',
    NOW() - INTERVAL '1 day',
    ARRAY['Tuguegarao City', 'Cagayan', 'Northern Luzon'],
    'high',
    'approved',
    'initify-demo-hash-heat-1',
    TRUE,
    'completed'
  )
ON CONFLICT (source_url) DO UPDATE SET
  status = 'approved',
  ai_summary = EXCLUDED.ai_summary,
  updated_at = NOW();

SELECT id, title, status, published_at FROM pagasa_updates ORDER BY published_at DESC LIMIT 5;
