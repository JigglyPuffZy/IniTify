-- =============================================================================
-- IniTify — Health Safety Knowledge Base (PostgreSQL / Supabase)
-- Run in Supabase SQL Editor AFTER initify_supabase_schema.sql
--
-- IMPORTANT — Supabase SQL Editor splits on every semicolon (;), even inside
-- string literals. This file must NOT contain semicolons inside 'quotes'.
-- If you still get errors, run in two parts:
--   Part A: lines 1–704 (tables through section 7)
--   Part B: lines 706–end (section 7b matrix + verify)
--
-- Purpose: Personalized preventive safety guidance (not diagnosis or treatment).
-- Pairs user health profiles with weather hazards → actionable tips for the app.
-- Complements in-app first-aid content (src/constants/first-aid.ts).
--
-- Medical disclaimer: General public-health guidance only. Users should follow
-- their healthcare provider's plan and seek professional care when needed.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. REFERENCE TABLES
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS health_conditions (
  id SMALLSERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL UNIQUE,
  description TEXT NOT NULL,
  severity_level SMALLINT NOT NULL CHECK (severity_level BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE health_conditions IS
  'Known health profiles used to personalize weather-related safety guidance.';
COMMENT ON COLUMN health_conditions.severity_level IS
  'Relative vulnerability in adverse weather (1=lower, 5=higher). Not a clinical score.';

CREATE TABLE IF NOT EXISTS weather_hazards (
  id SMALLSERIAL PRIMARY KEY,
  name VARCHAR(80) NOT NULL UNIQUE,
  description TEXT NOT NULL,
  severity_level SMALLINT NOT NULL CHECK (severity_level BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE weather_hazards IS
  'Weather and environmental hazards that may affect health and safety.';
COMMENT ON COLUMN weather_hazards.severity_level IS
  'Typical hazard intensity for prioritization (1=lower, 5=higher).';

CREATE TABLE IF NOT EXISTS health_safety_tips (
  id BIGSERIAL PRIMARY KEY,
  health_condition_id SMALLINT NOT NULL REFERENCES health_conditions(id) ON DELETE CASCADE,
  weather_hazard_id SMALLINT NOT NULL REFERENCES weather_hazards(id) ON DELETE CASCADE,
  title VARCHAR(160) NOT NULL,
  safety_tip TEXT NOT NULL,
  warning_signs TEXT NOT NULL,
  emergency_advice TEXT NOT NULL,
  priority SMALLINT NOT NULL DEFAULT 2 CHECK (priority BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_health_safety_tip UNIQUE (health_condition_id, weather_hazard_id, title)
);

COMMENT ON TABLE health_safety_tips IS
  'Preventive guidance linking a health profile to a weather hazard. Not medical advice.';
COMMENT ON COLUMN health_safety_tips.priority IS
  'Display order (1=show first). Lower number = higher priority.';

-- ---------------------------------------------------------------------------
-- 2. INDEXES
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_health_safety_tips_condition
  ON health_safety_tips(health_condition_id);

CREATE INDEX IF NOT EXISTS idx_health_safety_tips_hazard
  ON health_safety_tips(weather_hazard_id);

CREATE INDEX IF NOT EXISTS idx_health_safety_tips_lookup
  ON health_safety_tips(health_condition_id, weather_hazard_id, priority);

-- ---------------------------------------------------------------------------
-- 3. HELPER VIEW — easy mobile/API queries
-- ---------------------------------------------------------------------------

CREATE OR REPLACE VIEW v_personalized_safety_tips AS
SELECT
  hc.id   AS health_condition_id,
  hc.name AS health_condition,
  wh.id   AS weather_hazard_id,
  wh.name AS weather_hazard,
  hst.id  AS tip_id,
  hst.title,
  hst.safety_tip,
  hst.warning_signs,
  hst.emergency_advice,
  hst.priority
FROM health_safety_tips hst
JOIN health_conditions hc ON hc.id = hst.health_condition_id
JOIN weather_hazards wh ON wh.id = hst.weather_hazard_id
ORDER BY hc.name, wh.name, hst.priority;

-- ---------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY — mobile app reads guidance; writes via service role
-- ---------------------------------------------------------------------------

ALTER TABLE health_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE weather_hazards ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_safety_tips ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS health_conditions_public_read ON health_conditions;
CREATE POLICY health_conditions_public_read ON health_conditions
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS weather_hazards_public_read ON weather_hazards;
CREATE POLICY weather_hazards_public_read ON weather_hazards
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS health_safety_tips_public_read ON health_safety_tips;
CREATE POLICY health_safety_tips_public_read ON health_safety_tips
  FOR SELECT TO anon, authenticated USING (true);

GRANT SELECT ON health_conditions TO anon, authenticated;
GRANT SELECT ON weather_hazards TO anon, authenticated;
GRANT SELECT ON health_safety_tips TO anon, authenticated;
GRANT SELECT ON v_personalized_safety_tips TO anon, authenticated;
GRANT ALL ON health_conditions TO service_role;
GRANT ALL ON weather_hazards TO service_role;
GRANT ALL ON health_safety_tips TO service_role;
GRANT USAGE, SELECT ON SEQUENCE health_conditions_id_seq TO service_role;
GRANT USAGE, SELECT ON SEQUENCE weather_hazards_id_seq TO service_role;
GRANT USAGE, SELECT ON SEQUENCE health_safety_tips_id_seq TO service_role;

-- ---------------------------------------------------------------------------
-- 5. SEED — HEALTH CONDITIONS
-- ---------------------------------------------------------------------------

INSERT INTO health_conditions (name, description, severity_level) VALUES
  ('Hypertension / High Blood Pressure', 'Elevated blood pressure that may be affected by heat, cold, and physical stress.', 3),
  ('Heart Disease', 'Heart or cardiovascular conditions that may increase sensitivity to weather-related stress.', 4),
  ('Asthma', 'Asthma or reactive airway disease that may worsen with air quality or weather changes.', 3),
  ('Diabetes', 'Diabetes mellitus. Heat and illness can affect hydration and how someone feels.', 3),
  ('Chronic Respiratory Disease', 'Long-term lung conditions such as COPD or chronic bronchitis.', 4),
  ('Kidney Disease', 'Chronic kidney disease. Fluid balance may need extra care in extreme weather.', 4),
  ('Heat Sensitivity', 'Increased difficulty tolerating hot environments.', 3),
  ('Cold Sensitivity', 'Increased difficulty tolerating cold or rapid temperature drops.', 2),
  ('Elderly / Older Adults', 'Older adults who may have reduced heat/cold tolerance or slower recovery.', 3),
  ('Children', 'Young children who depend on caregivers for safety during severe weather.', 3),
  ('Pregnancy', 'Pregnancy may increase need for hydration and temperature comfort.', 3),
  ('General / No Known Condition', 'No known condition — general preventive guidance for everyone.', 1)
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  severity_level = EXCLUDED.severity_level;

-- ---------------------------------------------------------------------------
-- 6. SEED — WEATHER HAZARDS
-- ---------------------------------------------------------------------------

INSERT INTO weather_hazards (name, description, severity_level) VALUES
  ('Extreme Heat', 'Very high air temperature with increased risk of heat-related illness.', 5),
  ('High Heat Index', 'Feels-like temperature combining heat and humidity. Harder on the body.', 4),
  ('Thunderstorm', 'Thunderstorms with rain, wind, lightning, and rapid weather changes.', 3),
  ('Heavy Rain', 'Prolonged or intense rainfall that may affect travel and safety.', 3),
  ('Flood', 'Flooding or standing water creating safety and health risks.', 5),
  ('Strong Winds', 'Damaging or disruptive wind that may affect mobility and safety.', 3),
  ('Typhoon', 'Tropical cyclone with strong wind, heavy rain, and storm surge risk.', 5),
  ('Extreme Cold', 'Very low temperatures increasing cold exposure risk.', 4),
  ('Poor Air Quality', 'Elevated air pollution, smoke, or irritants that affect breathing.', 4),
  ('High Humidity', 'High moisture in the air that can make heat feel more intense.', 3),
  ('Lightning', 'Active lightning risk during thunderstorms.', 4)
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  severity_level = EXCLUDED.severity_level;

-- ---------------------------------------------------------------------------
-- 7. SEED — SAFETY TIPS (preventive guidance, not diagnosis or treatment)
-- Uses subqueries so IDs stay consistent across re-runs.
-- ---------------------------------------------------------------------------

-- Helper macro pattern: INSERT ... SELECT hc.id, wh.id, ... WHERE hc.name = ? AND wh.name = ?

-- ===================== HYPERTENSION =====================
INSERT INTO health_safety_tips (health_condition_id, weather_hazard_id, title, safety_tip, warning_signs, emergency_advice, priority)
SELECT hc.id, wh.id,
  'Heat and blood pressure comfort',
  'Stay hydrated according to guidance from the person''s healthcare provider. Avoid prolonged exposure to extreme heat. Limit strenuous outdoor activity during the hottest part of the day. Rest in a cool, shaded, or air-conditioned place when possible. Follow the person''s existing treatment plan.',
  'Unusual dizziness, weakness, confusion, severe headache, chest discomfort, or fainting.',
  'If symptoms are sudden, severe, or not improving with rest and cooling, seek urgent medical care. Call local emergency services if the person is unresponsive or very confused.',
  1
FROM health_conditions hc, weather_hazards wh
WHERE hc.name = 'Hypertension / High Blood Pressure' AND wh.name = 'Extreme Heat'
ON CONFLICT (health_condition_id, weather_hazard_id, title) DO UPDATE SET
  safety_tip = EXCLUDED.safety_tip, warning_signs = EXCLUDED.warning_signs,
  emergency_advice = EXCLUDED.emergency_advice, priority = EXCLUDED.priority;

INSERT INTO health_safety_tips (health_condition_id, weather_hazard_id, title, safety_tip, warning_signs, emergency_advice, priority)
SELECT hc.id, wh.id,
  'High heat index precautions',
  'When the heat index is high, shorten time outdoors and take frequent breaks in a cool place. Wear light, breathable clothing and a hat. Drink fluids as appropriate for the person''s health plan. Avoid heavy exertion in peak afternoon heat.',
  'Persistent dizziness, nausea, rapid heartbeat, or swelling that seems worse than usual.',
  'Contact a healthcare professional if warning signs appear. Seek emergency care for chest pain, difficulty breathing, or loss of consciousness.',
  1
FROM health_conditions hc, weather_hazards wh
WHERE hc.name = 'Hypertension / High Blood Pressure' AND wh.name = 'High Heat Index'
ON CONFLICT (health_condition_id, weather_hazard_id, title) DO UPDATE SET
  safety_tip = EXCLUDED.safety_tip, warning_signs = EXCLUDED.warning_signs,
  emergency_advice = EXCLUDED.emergency_advice, priority = EXCLUDED.priority;

INSERT INTO health_safety_tips (health_condition_id, weather_hazard_id, title, safety_tip, warning_signs, emergency_advice, priority)
SELECT hc.id, wh.id,
  'Cold weather circulation',
  'Dress in warm layers and limit long exposure to very cold wind. Keep hands and feet warm. Move indoors to warm up if shivering persists. Follow the person''s usual care plan.',
  'Numbness, color changes in fingers or toes, chest discomfort, or unusual shortness of breath in the cold.',
  'Seek urgent care for chest pain, severe shortness of breath, or signs of frostbite with skin injury.',
  2
FROM health_conditions hc, weather_hazards wh
WHERE hc.name = 'Hypertension / High Blood Pressure' AND wh.name = 'Extreme Cold'
ON CONFLICT (health_condition_id, weather_hazard_id, title) DO UPDATE SET
  safety_tip = EXCLUDED.safety_tip, warning_signs = EXCLUDED.warning_signs,
  emergency_advice = EXCLUDED.emergency_advice, priority = EXCLUDED.priority;

-- ===================== HEART DISEASE =====================
INSERT INTO health_safety_tips (health_condition_id, weather_hazard_id, title, safety_tip, warning_signs, emergency_advice, priority)
SELECT hc.id, wh.id,
  'Protect the heart in extreme heat',
  'Avoid prolonged heat exposure. Stay in a cool environment when temperatures are extreme. Avoid strenuous outdoor activity during peak heat. Take rest breaks and hydrate as directed by a healthcare professional. Follow the person''s existing treatment plan.',
  'Chest pain or pressure, severe shortness of breath, fainting, unusual weakness, or rapid irregular heartbeat.',
  'Call emergency services immediately for chest pain, fainting, or severe breathing difficulty. Do not delay care for sudden or worsening symptoms.',
  1
FROM health_conditions hc, weather_hazards wh
WHERE hc.name = 'Heart Disease' AND wh.name = 'Extreme Heat'
ON CONFLICT (health_condition_id, weather_hazard_id, title) DO UPDATE SET
  safety_tip = EXCLUDED.safety_tip, warning_signs = EXCLUDED.warning_signs,
  emergency_advice = EXCLUDED.emergency_advice, priority = EXCLUDED.priority;

INSERT INTO health_safety_tips (health_condition_id, weather_hazard_id, title, safety_tip, warning_signs, emergency_advice, priority)
SELECT hc.id, wh.id,
  'Heat index and cardiovascular strain',
  'High heat index days can increase physical strain. Plan outdoor tasks for cooler hours. Use air conditioning or fans when available. Pace activity and rest often.',
  'Chest discomfort, unusual fatigue, leg swelling, or breathing difficulty during heat.',
  'Seek urgent medical attention for chest pain, fainting, or severe shortness of breath.',
  1
FROM health_conditions hc, weather_hazards wh
WHERE hc.name = 'Heart Disease' AND wh.name = 'High Heat Index'
ON CONFLICT (health_condition_id, weather_hazard_id, title) DO UPDATE SET
  safety_tip = EXCLUDED.safety_tip, warning_signs = EXCLUDED.warning_signs,
  emergency_advice = EXCLUDED.emergency_advice, priority = EXCLUDED.priority;

INSERT INTO health_safety_tips (health_condition_id, weather_hazard_id, title, safety_tip, warning_signs, emergency_advice, priority)
SELECT hc.id, wh.id,
  'Storm stress and heart safety',
  'During typhoons or strong winds, stay indoors in a safe area. Avoid unnecessary physical exertion while securing property. Keep medications and emergency contacts accessible. Rest and stay warm and dry.',
  'Chest pain, severe breathlessness, or fainting during or after storm activity.',
  'Use emergency services for sudden cardiac symptoms. Follow local evacuation guidance for flood or typhoon risk.',
  2
FROM health_conditions hc, weather_hazards wh
WHERE hc.name = 'Heart Disease' AND wh.name = 'Typhoon'
ON CONFLICT (health_condition_id, weather_hazard_id, title) DO UPDATE SET
  safety_tip = EXCLUDED.safety_tip, warning_signs = EXCLUDED.warning_signs,
  emergency_advice = EXCLUDED.emergency_advice, priority = EXCLUDED.priority;

-- ===================== ASTHMA =====================
INSERT INTO health_safety_tips (health_condition_id, weather_hazard_id, title, safety_tip, warning_signs, emergency_advice, priority)
SELECT hc.id, wh.id,
  'Asthma and poor air quality',
  'Reduce outdoor exposure when air quality is poor. Follow the individual''s existing asthma action plan. Keep prescribed rescue medication available as directed by their healthcare professional. Consider staying indoors with windows closed when pollution or smoke is high.',
  'Increased wheezing, chest tightness, coughing, or need for rescue inhaler more often than usual.',
  'Seek urgent care if breathing is difficult despite using rescue medication as directed, or if lips or fingernails look bluish.',
  1
FROM health_conditions hc, weather_hazards wh
WHERE hc.name = 'Asthma' AND wh.name = 'Poor Air Quality'
ON CONFLICT (health_condition_id, weather_hazard_id, title) DO UPDATE SET
  safety_tip = EXCLUDED.safety_tip, warning_signs = EXCLUDED.warning_signs,
  emergency_advice = EXCLUDED.emergency_advice, priority = EXCLUDED.priority;

INSERT INTO health_safety_tips (health_condition_id, weather_hazard_id, title, safety_tip, warning_signs, emergency_advice, priority)
SELECT hc.id, wh.id,
  'Asthma and thunderstorms',
  'Thunderstorms can stir pollen and allergens. Stay indoors before and during storms when possible. Follow the person''s asthma action plan. Keep rescue medication nearby.',
  'Sudden increase in wheezing, shortness of breath, or chest tightness after weather changes.',
  'Get emergency help if breathing becomes severely difficult or rescue treatment does not help as expected.',
  1
FROM health_conditions hc, weather_hazards wh
WHERE hc.name = 'Asthma' AND wh.name = 'Thunderstorm'
ON CONFLICT (health_condition_id, weather_hazard_id, title) DO UPDATE SET
  safety_tip = EXCLUDED.safety_tip, warning_signs = EXCLUDED.warning_signs,
  emergency_advice = EXCLUDED.emergency_advice, priority = EXCLUDED.priority;

INSERT INTO health_safety_tips (health_condition_id, weather_hazard_id, title, safety_tip, warning_signs, emergency_advice, priority)
SELECT hc.id, wh.id,
  'Humidity and breathing comfort',
  'High humidity can make breathing feel harder. Prefer cool, well-ventilated indoor spaces. Avoid heavy outdoor exertion. Follow the asthma action plan.',
  'Persistent cough, wheeze, or reduced ability to speak in full sentences due to breathlessness.',
  'Seek urgent medical care for severe breathing difficulty.',
  2
FROM health_conditions hc, weather_hazards wh
WHERE hc.name = 'Asthma' AND wh.name = 'High Humidity'
ON CONFLICT (health_condition_id, weather_hazard_id, title) DO UPDATE SET
  safety_tip = EXCLUDED.safety_tip, warning_signs = EXCLUDED.warning_signs,
  emergency_advice = EXCLUDED.emergency_advice, priority = EXCLUDED.priority;

-- ===================== DIABETES =====================
INSERT INTO health_safety_tips (health_condition_id, weather_hazard_id, title, safety_tip, warning_signs, emergency_advice, priority)
SELECT hc.id, wh.id,
  'Diabetes and extreme heat',
  'Take precautions against dehydration and heat-related illness. Follow the person''s established diabetes management plan. Check blood sugar as usually directed by their healthcare team. Wear light clothing and rest in cool areas.',
  'Unusual weakness, dizziness, confusion, excessive thirst, nausea, or feeling unwell in heat.',
  'Seek medical care if the person is confused, vomiting, or not improving with rest and fluids. Use emergency services for loss of consciousness.',
  1
FROM health_conditions hc, weather_hazards wh
WHERE hc.name = 'Diabetes' AND wh.name = 'Extreme Heat'
ON CONFLICT (health_condition_id, weather_hazard_id, title) DO UPDATE SET
  safety_tip = EXCLUDED.safety_tip, warning_signs = EXCLUDED.warning_signs,
  emergency_advice = EXCLUDED.emergency_advice, priority = EXCLUDED.priority;

INSERT INTO health_safety_tips (health_condition_id, weather_hazard_id, title, safety_tip, warning_signs, emergency_advice, priority)
SELECT hc.id, wh.id,
  'High heat index and diabetes care',
  'On high heat index days, limit outdoor activity and plan meals and hydration consistently with usual diabetes care guidance. Carry fast-acting glucose if normally used. Protect insulin and supplies from extreme heat when traveling.',
  'Shakiness, sweating, confusion, or symptoms that may suggest very high or very low blood sugar.',
  'Contact a healthcare professional or emergency services according to the person''s diabetes sick-day or emergency plan.',
  1
FROM health_conditions hc, weather_hazards wh
WHERE hc.name = 'Diabetes' AND wh.name = 'High Heat Index'
ON CONFLICT (health_condition_id, weather_hazard_id, title) DO UPDATE SET
  safety_tip = EXCLUDED.safety_tip, warning_signs = EXCLUDED.warning_signs,
  emergency_advice = EXCLUDED.emergency_advice, priority = EXCLUDED.priority;

INSERT INTO health_safety_tips (health_condition_id, weather_hazard_id, title, safety_tip, warning_signs, emergency_advice, priority)
SELECT hc.id, wh.id,
  'Floods and diabetes supplies',
  'Keep diabetes supplies dry and accessible in waterproof bags. Store backup snacks and medication in a safe place. Avoid wading in floodwater due to injury and contamination risk.',
  'Foot injury, infection signs, or inability to access usual meals or medication during flooding.',
  'Seek medical care for foot wounds after flood exposure or if usual diabetes care cannot be maintained.',
  2
FROM health_conditions hc, weather_hazards wh
WHERE hc.name = 'Diabetes' AND wh.name = 'Flood'
ON CONFLICT (health_condition_id, weather_hazard_id, title) DO UPDATE SET
  safety_tip = EXCLUDED.safety_tip, warning_signs = EXCLUDED.warning_signs,
  emergency_advice = EXCLUDED.emergency_advice, priority = EXCLUDED.priority;

-- ===================== CHRONIC RESPIRATORY DISEASE =====================
INSERT INTO health_safety_tips (health_condition_id, weather_hazard_id, title, safety_tip, warning_signs, emergency_advice, priority)
SELECT hc.id, wh.id,
  'Lung health and air quality',
  'Limit outdoor activity when air quality is poor. Use air filtration indoors if available. Follow the person''s respiratory care plan and keep prescribed inhalers or oxygen as directed.',
  'Worsening cough, increased sputum, shortness of breath at rest, or bluish lips.',
  'Seek urgent care for severe breathlessness or confusion. Call emergency services if the person cannot speak comfortably due to breathing difficulty.',
  1
FROM health_conditions hc, weather_hazards wh
WHERE hc.name = 'Chronic Respiratory Disease' AND wh.name = 'Poor Air Quality'
ON CONFLICT (health_condition_id, weather_hazard_id, title) DO UPDATE SET
  safety_tip = EXCLUDED.safety_tip, warning_signs = EXCLUDED.warning_signs,
  emergency_advice = EXCLUDED.emergency_advice, priority = EXCLUDED.priority;

INSERT INTO health_safety_tips (health_condition_id, weather_hazard_id, title, safety_tip, warning_signs, emergency_advice, priority)
SELECT hc.id, wh.id,
  'Heat and breathing effort',
  'Heat and humidity can make breathing feel harder. Stay in cool, ventilated spaces. Use fans or air conditioning when possible. Pace activity and rest frequently.',
  'Rapid breathing, chest tightness, dizziness, or increased need for rescue inhaler or oxygen.',
  'Get emergency help for severe or sudden breathing difficulty.',
  1
FROM health_conditions hc, weather_hazards wh
WHERE hc.name = 'Chronic Respiratory Disease' AND wh.name = 'High Humidity'
ON CONFLICT (health_condition_id, weather_hazard_id, title) DO UPDATE SET
  safety_tip = EXCLUDED.safety_tip, warning_signs = EXCLUDED.warning_signs,
  emergency_advice = EXCLUDED.emergency_advice, priority = EXCLUDED.priority;

INSERT INTO health_safety_tips (health_condition_id, weather_hazard_id, title, safety_tip, warning_signs, emergency_advice, priority)
SELECT hc.id, wh.id,
  'Typhoon indoor air safety',
  'Stay indoors with windows and doors closed during dusty or smoky storm conditions if advised locally. Keep medications and power backups for oxygen devices ready if used.',
  'Worsening breathlessness, chest pain, or inability to sleep flat due to breathing.',
  'Follow evacuation orders and seek emergency care for severe respiratory distress.',
  2
FROM health_conditions hc, weather_hazards wh
WHERE hc.name = 'Chronic Respiratory Disease' AND wh.name = 'Typhoon'
ON CONFLICT (health_condition_id, weather_hazard_id, title) DO UPDATE SET
  safety_tip = EXCLUDED.safety_tip, warning_signs = EXCLUDED.warning_signs,
  emergency_advice = EXCLUDED.emergency_advice, priority = EXCLUDED.priority;

-- ===================== KIDNEY DISEASE =====================
INSERT INTO health_safety_tips (health_condition_id, weather_hazard_id, title, safety_tip, warning_signs, emergency_advice, priority)
SELECT hc.id, wh.id,
  'Kidney health in extreme heat',
  'Heat increases fluid needs for many people, but some individuals with kidney disease have fluid restrictions. Follow the person''s healthcare provider guidance on fluids. Stay cool and avoid heavy exertion in extreme heat.',
  'Unusual swelling, dizziness, confusion, very low urine output, or feeling severely unwell in heat.',
  'Contact the person''s kidney care team or seek urgent care for concerning symptoms. Use emergency services for confusion or collapse.',
  1
FROM health_conditions hc, weather_hazards wh
WHERE hc.name = 'Kidney Disease' AND wh.name = 'Extreme Heat'
ON CONFLICT (health_condition_id, weather_hazard_id, title) DO UPDATE SET
  safety_tip = EXCLUDED.safety_tip, warning_signs = EXCLUDED.warning_signs,
  emergency_advice = EXCLUDED.emergency_advice, priority = EXCLUDED.priority;

INSERT INTO health_safety_tips (health_condition_id, weather_hazard_id, title, safety_tip, warning_signs, emergency_advice, priority)
SELECT hc.id, wh.id,
  'Humidity and hydration balance',
  'High humidity can worsen heat stress. Rest in cool areas. Follow individualized fluid guidance from a healthcare professional rather than drinking large amounts without advice.',
  'Shortness of breath with swelling, chest discomfort, or sudden weight gain.',
  'Seek medical attention for breathing difficulty or symptoms that may suggest fluid overload.',
  2
FROM health_conditions hc, weather_hazards wh
WHERE hc.name = 'Kidney Disease' AND wh.name = 'High Humidity'
ON CONFLICT (health_condition_id, weather_hazard_id, title) DO UPDATE SET
  safety_tip = EXCLUDED.safety_tip, warning_signs = EXCLUDED.warning_signs,
  emergency_advice = EXCLUDED.emergency_advice, priority = EXCLUDED.priority;

-- ===================== HEAT SENSITIVITY =====================
INSERT INTO health_safety_tips (health_condition_id, weather_hazard_id, title, safety_tip, warning_signs, emergency_advice, priority)
SELECT hc.id, wh.id,
  'Managing heat sensitivity',
  'Plan outdoor time for early morning or evening. Use shade, hats, and light clothing. Take cool breaks every 15–30 minutes in extreme heat. Drink fluids as appropriate for personal health guidance.',
  'Headache, nausea, muscle cramps, dizziness, or feeling faint in heat.',
  'Move to a cool place and rest. Seek medical care if symptoms worsen or do not improve within 30 minutes.',
  1
FROM health_conditions hc, weather_hazards wh
WHERE hc.name = 'Heat Sensitivity' AND wh.name = 'Extreme Heat'
ON CONFLICT (health_condition_id, weather_hazard_id, title) DO UPDATE SET
  safety_tip = EXCLUDED.safety_tip, warning_signs = EXCLUDED.warning_signs,
  emergency_advice = EXCLUDED.emergency_advice, priority = EXCLUDED.priority;

INSERT INTO health_safety_tips (health_condition_id, weather_hazard_id, title, safety_tip, warning_signs, emergency_advice, priority)
SELECT hc.id, wh.id,
  'High heat index awareness',
  'When heat index is high, treat it as a high-risk day even if air temperature seems moderate. Stay indoors in air conditioning when possible. Avoid strenuous tasks.',
  'Hot dry skin, confusion, or stopped sweating in very hot conditions.',
  'Call emergency services for heat stroke warning signs such as confusion, seizures, or unconsciousness.',
  1
FROM health_conditions hc, weather_hazards wh
WHERE hc.name = 'Heat Sensitivity' AND wh.name = 'High Heat Index'
ON CONFLICT (health_condition_id, weather_hazard_id, title) DO UPDATE SET
  safety_tip = EXCLUDED.safety_tip, warning_signs = EXCLUDED.warning_signs,
  emergency_advice = EXCLUDED.emergency_advice, priority = EXCLUDED.priority;

-- ===================== COLD SENSITIVITY =====================
INSERT INTO health_safety_tips (health_condition_id, weather_hazard_id, title, safety_tip, warning_signs, emergency_advice, priority)
SELECT hc.id, wh.id,
  'Cold exposure protection',
  'Wear layered clothing, hat, and gloves. Limit time outdoors in extreme cold. Keep dry and warm up indoors frequently.',
  'Intense shivering, numbness, confusion, or slurred speech in cold conditions.',
  'Seek warm shelter immediately. Get emergency help for hypothermia signs or unresponsiveness.',
  1
FROM health_conditions hc, weather_hazards wh
WHERE hc.name = 'Cold Sensitivity' AND wh.name = 'Extreme Cold'
ON CONFLICT (health_condition_id, weather_hazard_id, title) DO UPDATE SET
  safety_tip = EXCLUDED.safety_tip, warning_signs = EXCLUDED.warning_signs,
  emergency_advice = EXCLUDED.emergency_advice, priority = EXCLUDED.priority;

INSERT INTO health_safety_tips (health_condition_id, weather_hazard_id, title, safety_tip, warning_signs, emergency_advice, priority)
SELECT hc.id, wh.id,
  'Typhoon cold rain exposure',
  'After rain and wind, wet clothing increases heat loss. Change into dry clothes promptly. Stay in a sheltered, warm area.',
  'Persistent shivering, clumsiness, or drowsiness after cold/wet exposure.',
  'Seek medical care if warming does not improve symptoms.',
  2
FROM health_conditions hc, weather_hazards wh
WHERE hc.name = 'Cold Sensitivity' AND wh.name = 'Typhoon'
ON CONFLICT (health_condition_id, weather_hazard_id, title) DO UPDATE SET
  safety_tip = EXCLUDED.safety_tip, warning_signs = EXCLUDED.warning_signs,
  emergency_advice = EXCLUDED.emergency_advice, priority = EXCLUDED.priority;

-- ===================== ELDERLY =====================
INSERT INTO health_safety_tips (health_condition_id, weather_hazard_id, title, safety_tip, warning_signs, emergency_advice, priority)
SELECT hc.id, wh.id,
  'Older adults in extreme heat',
  'Encourage staying in a cool environment. Drink fluids appropriately unless a healthcare professional has given different fluid restrictions. Avoid strenuous activity during peak heat. Check on older adults regularly during extreme weather.',
  'Confusion, dizziness, falls, reduced urination, or weakness in heat.',
  'Seek urgent medical care for confusion, fainting, or not improving after cooling and rest.',
  1
FROM health_conditions hc, weather_hazards wh
WHERE hc.name = 'Elderly / Older Adults' AND wh.name = 'Extreme Heat'
ON CONFLICT (health_condition_id, weather_hazard_id, title) DO UPDATE SET
  safety_tip = EXCLUDED.safety_tip, warning_signs = EXCLUDED.warning_signs,
  emergency_advice = EXCLUDED.emergency_advice, priority = EXCLUDED.priority;

INSERT INTO health_safety_tips (health_condition_id, weather_hazard_id, title, safety_tip, warning_signs, emergency_advice, priority)
SELECT hc.id, wh.id,
  'Flood safety for older adults',
  'Help plan evacuation routes in advance. Keep medications, glasses, and mobility aids in an easy-to-reach bag. Avoid walking through floodwater.',
  'Injury, exhaustion, or inability to reach help during flooding.',
  'Follow local evacuation orders. Call emergency services if someone is trapped or injured.',
  1
FROM health_conditions hc, weather_hazards wh
WHERE hc.name = 'Elderly / Older Adults' AND wh.name = 'Flood'
ON CONFLICT (health_condition_id, weather_hazard_id, title) DO UPDATE SET
  safety_tip = EXCLUDED.safety_tip, warning_signs = EXCLUDED.warning_signs,
  emergency_advice = EXCLUDED.emergency_advice, priority = EXCLUDED.priority;

INSERT INTO health_safety_tips (health_condition_id, weather_hazard_id, title, safety_tip, warning_signs, emergency_advice, priority)
SELECT hc.id, wh.id,
  'Typhoon preparedness',
  'Stock several days of food, water, and medications. Keep a charged phone and emergency contacts handy. Stay indoors away from windows during peak winds.',
  'Injury from falls, dehydration, or missed medications during prolonged storms.',
  'Use emergency services for injury or medical crisis. Follow PAGASA and local government advisories.',
  2
FROM health_conditions hc, weather_hazards wh
WHERE hc.name = 'Elderly / Older Adults' AND wh.name = 'Typhoon'
ON CONFLICT (health_condition_id, weather_hazard_id, title) DO UPDATE SET
  safety_tip = EXCLUDED.safety_tip, warning_signs = EXCLUDED.warning_signs,
  emergency_advice = EXCLUDED.emergency_advice, priority = EXCLUDED.priority;

-- ===================== CHILDREN =====================
INSERT INTO health_safety_tips (health_condition_id, weather_hazard_id, title, safety_tip, warning_signs, emergency_advice, priority)
SELECT hc.id, wh.id,
  'Children in extreme heat',
  'Never leave children in parked vehicles. Schedule outdoor play for cooler hours. Offer frequent water breaks and shade. Dress children in light, breathable clothing.',
  'Fussiness with hot dry skin, vomiting, dizziness, or unusual sleepiness in heat.',
  'Seek medical care if a child is not alert, not drinking, or symptoms worsen. Call emergency services for collapse or seizures.',
  1
FROM health_conditions hc, weather_hazards wh
WHERE hc.name = 'Children' AND wh.name = 'Extreme Heat'
ON CONFLICT (health_condition_id, weather_hazard_id, title) DO UPDATE SET
  safety_tip = EXCLUDED.safety_tip, warning_signs = EXCLUDED.warning_signs,
  emergency_advice = EXCLUDED.emergency_advice, priority = EXCLUDED.priority;

INSERT INTO health_safety_tips (health_condition_id, weather_hazard_id, title, safety_tip, warning_signs, emergency_advice, priority)
SELECT hc.id, wh.id,
  'Lightning safety for children',
  'When thunder roars, go indoors. Keep children away from open fields, tall trees, and water during lightning risk. Wait 30 minutes after the last thunder before returning outside.',
  'Burns, confusion, or collapse after a lightning strike (rare but serious).',
  'Call emergency services immediately if a child is struck or found unconscious outdoors during a storm.',
  1
FROM health_conditions hc, weather_hazards wh
WHERE hc.name = 'Children' AND wh.name = 'Lightning'
ON CONFLICT (health_condition_id, weather_hazard_id, title) DO UPDATE SET
  safety_tip = EXCLUDED.safety_tip, warning_signs = EXCLUDED.warning_signs,
  emergency_advice = EXCLUDED.emergency_advice, priority = EXCLUDED.priority;

INSERT INTO health_safety_tips (health_condition_id, weather_hazard_id, title, safety_tip, warning_signs, emergency_advice, priority)
SELECT hc.id, wh.id,
  'Flood safety for children',
  'Keep children away from floodwater, drains, and fast-flowing water. Supervise closely near swollen rivers or urban flooding.',
  'Cuts, fever after water exposure, or near-drowning events.',
  'Seek emergency care for breathing problems after submersion or major injury.',
  2
FROM health_conditions hc, weather_hazards wh
WHERE hc.name = 'Children' AND wh.name = 'Flood'
ON CONFLICT (health_condition_id, weather_hazard_id, title) DO UPDATE SET
  safety_tip = EXCLUDED.safety_tip, warning_signs = EXCLUDED.warning_signs,
  emergency_advice = EXCLUDED.emergency_advice, priority = EXCLUDED.priority;

-- ===================== PREGNANCY =====================
INSERT INTO health_safety_tips (health_condition_id, weather_hazard_id, title, safety_tip, warning_signs, emergency_advice, priority)
SELECT hc.id, wh.id,
  'Pregnancy and extreme heat',
  'Stay cool and hydrated according to prenatal care guidance. Avoid prolonged standing in heat and heavy exertion. Rest in shaded or air-conditioned areas. Wear loose, light clothing.',
  'Dizziness, painful contractions, decreased fetal movement (as advised by prenatal provider), severe headache, or swelling with headache.',
  'Contact prenatal care provider or emergency services for severe symptoms, bleeding, or concerns about fetal movement per provider instructions.',
  1
FROM health_conditions hc, weather_hazards wh
WHERE hc.name = 'Pregnancy' AND wh.name = 'Extreme Heat'
ON CONFLICT (health_condition_id, weather_hazard_id, title) DO UPDATE SET
  safety_tip = EXCLUDED.safety_tip, warning_signs = EXCLUDED.warning_signs,
  emergency_advice = EXCLUDED.emergency_advice, priority = EXCLUDED.priority;

INSERT INTO health_safety_tips (health_condition_id, weather_hazard_id, title, safety_tip, warning_signs, emergency_advice, priority)
SELECT hc.id, wh.id,
  'Pregnancy and poor air quality',
  'Limit outdoor time when air quality is poor. Use indoor air filtration if available. Follow prenatal provider guidance for activity and masking if recommended locally.',
  'Shortness of breath beyond usual pregnancy changes, chest pain, or severe headache.',
  'Seek urgent prenatal or emergency care for severe or sudden symptoms.',
  2
FROM health_conditions hc, weather_hazards wh
WHERE hc.name = 'Pregnancy' AND wh.name = 'Poor Air Quality'
ON CONFLICT (health_condition_id, weather_hazard_id, title) DO UPDATE SET
  safety_tip = EXCLUDED.safety_tip, warning_signs = EXCLUDED.warning_signs,
  emergency_advice = EXCLUDED.emergency_advice, priority = EXCLUDED.priority;

-- ===================== GENERAL — one tip per major hazard =====================
INSERT INTO health_safety_tips (health_condition_id, weather_hazard_id, title, safety_tip, warning_signs, emergency_advice, priority)
SELECT hc.id, wh.id,
  'General heat safety',
  'Drink water regularly, take breaks in shade or air conditioning, and wear light clothing. Limit strenuous outdoor work during the hottest hours. Check local weather advisories.',
  'Heavy sweating then stopped sweating, confusion, nausea, or fainting in heat.',
  'Move to a cool place and seek medical help if symptoms are severe or persistent.',
  1
FROM health_conditions hc, weather_hazards wh
WHERE hc.name = 'General / No Known Condition' AND wh.name = 'Extreme Heat'
ON CONFLICT (health_condition_id, weather_hazard_id, title) DO UPDATE SET
  safety_tip = EXCLUDED.safety_tip, warning_signs = EXCLUDED.warning_signs,
  emergency_advice = EXCLUDED.emergency_advice, priority = EXCLUDED.priority;

INSERT INTO health_safety_tips (health_condition_id, weather_hazard_id, title, safety_tip, warning_signs, emergency_advice, priority)
SELECT hc.id, wh.id,
  'General high heat index safety',
  'When heat index is high, pace activity and hydrate. Use fans or air conditioning. Schedule errands for cooler parts of the day.',
  'Dizziness, muscle cramps, or headache during outdoor activity.',
  'Rest, cool down, and hydrate. Seek care if symptoms worsen.',
  1
FROM health_conditions hc, weather_hazards wh
WHERE hc.name = 'General / No Known Condition' AND wh.name = 'High Heat Index'
ON CONFLICT (health_condition_id, weather_hazard_id, title) DO UPDATE SET
  safety_tip = EXCLUDED.safety_tip, warning_signs = EXCLUDED.warning_signs,
  emergency_advice = EXCLUDED.emergency_advice, priority = EXCLUDED.priority;

INSERT INTO health_safety_tips (health_condition_id, weather_hazard_id, title, safety_tip, warning_signs, emergency_advice, priority)
SELECT hc.id, wh.id,
  'General thunderstorm safety',
  'Stay indoors away from windows. Unplug sensitive electronics if safe to do so. Avoid open fields and tall isolated trees.',
  'Nearby lightning, sudden strong wind, or flying debris.',
  'Call emergency services for injuries. Wait for official all-clear before going outdoors.',
  1
FROM health_conditions hc, weather_hazards wh
WHERE hc.name = 'General / No Known Condition' AND wh.name = 'Thunderstorm'
ON CONFLICT (health_condition_id, weather_hazard_id, title) DO UPDATE SET
  safety_tip = EXCLUDED.safety_tip, warning_signs = EXCLUDED.warning_signs,
  emergency_advice = EXCLUDED.emergency_advice, priority = EXCLUDED.priority;

INSERT INTO health_safety_tips (health_condition_id, weather_hazard_id, title, safety_tip, warning_signs, emergency_advice, priority)
SELECT hc.id, wh.id,
  'General heavy rain safety',
  'Avoid low-lying roads and areas prone to pooling. Use headlights and reduce driving speed. Do not walk through moving water.',
  'Rising water, landslide warnings, or stranded vehicles.',
  'Move to higher ground if flooding develops. Follow local rescue guidance.',
  1
FROM health_conditions hc, weather_hazards wh
WHERE hc.name = 'General / No Known Condition' AND wh.name = 'Heavy Rain'
ON CONFLICT (health_condition_id, weather_hazard_id, title) DO UPDATE SET
  safety_tip = EXCLUDED.safety_tip, warning_signs = EXCLUDED.warning_signs,
  emergency_advice = EXCLUDED.emergency_advice, priority = EXCLUDED.priority;

INSERT INTO health_safety_tips (health_condition_id, weather_hazard_id, title, safety_tip, warning_signs, emergency_advice, priority)
SELECT hc.id, wh.id,
  'General flood safety',
  'Know evacuation routes. Move valuables higher. Avoid floodwater due to depth, current, and contamination.',
  'Water entering home, fast current, or inability to evacuate.',
  'Call emergency services if trapped. Never drive into flooded roads.',
  1
FROM health_conditions hc, weather_hazards wh
WHERE hc.name = 'General / No Known Condition' AND wh.name = 'Flood'
ON CONFLICT (health_condition_id, weather_hazard_id, title) DO UPDATE SET
  safety_tip = EXCLUDED.safety_tip, warning_signs = EXCLUDED.warning_signs,
  emergency_advice = EXCLUDED.emergency_advice, priority = EXCLUDED.priority;

INSERT INTO health_safety_tips (health_condition_id, weather_hazard_id, title, safety_tip, warning_signs, emergency_advice, priority)
SELECT hc.id, wh.id,
  'General strong wind safety',
  'Secure loose outdoor items. Stay away from damaged structures and power lines. Use face protection from dust if needed.',
  'Falling debris, downed wires, or structural damage.',
  'Report downed power lines to authorities. Seek shelter if structures are unsafe.',
  1
FROM health_conditions hc, weather_hazards wh
WHERE hc.name = 'General / No Known Condition' AND wh.name = 'Strong Winds'
ON CONFLICT (health_condition_id, weather_hazard_id, title) DO UPDATE SET
  safety_tip = EXCLUDED.safety_tip, warning_signs = EXCLUDED.warning_signs,
  emergency_advice = EXCLUDED.emergency_advice, priority = EXCLUDED.priority;

INSERT INTO health_safety_tips (health_condition_id, weather_hazard_id, title, safety_tip, warning_signs, emergency_advice, priority)
SELECT hc.id, wh.id,
  'General typhoon preparedness',
  'Prepare food, water, lights, and first-aid supplies. Charge devices. Follow PAGASA bulletins and local government orders. Stay indoors during peak winds.',
  'Rising floodwater, building damage, or injury during cleanup.',
  'Evacuate when ordered. Use emergency hotlines for rescue needs.',
  1
FROM health_conditions hc, weather_hazards wh
WHERE hc.name = 'General / No Known Condition' AND wh.name = 'Typhoon'
ON CONFLICT (health_condition_id, weather_hazard_id, title) DO UPDATE SET
  safety_tip = EXCLUDED.safety_tip, warning_signs = EXCLUDED.warning_signs,
  emergency_advice = EXCLUDED.emergency_advice, priority = EXCLUDED.priority;

INSERT INTO health_safety_tips (health_condition_id, weather_hazard_id, title, safety_tip, warning_signs, emergency_advice, priority)
SELECT hc.id, wh.id,
  'General cold weather safety',
  'Dress in layers, protect extremities, and limit prolonged outdoor exposure. Keep homes safely heated and ventilated if using heaters.',
  'Numbness, shivering that stops, confusion, or slurred speech.',
  'Warm gradually and seek medical care for hypothermia signs.',
  1
FROM health_conditions hc, weather_hazards wh
WHERE hc.name = 'General / No Known Condition' AND wh.name = 'Extreme Cold'
ON CONFLICT (health_condition_id, weather_hazard_id, title) DO UPDATE SET
  safety_tip = EXCLUDED.safety_tip, warning_signs = EXCLUDED.warning_signs,
  emergency_advice = EXCLUDED.emergency_advice, priority = EXCLUDED.priority;

INSERT INTO health_safety_tips (health_condition_id, weather_hazard_id, title, safety_tip, warning_signs, emergency_advice, priority)
SELECT hc.id, wh.id,
  'General air quality safety',
  'Reduce strenuous outdoor activity when air quality is poor. Keep windows closed and use filtration if available. Consider a mask if recommended locally.',
  'Eye irritation, cough, or shortness of breath outdoors.',
  'Move indoors and seek care if breathing difficulty is significant.',
  1
FROM health_conditions hc, weather_hazards wh
WHERE hc.name = 'General / No Known Condition' AND wh.name = 'Poor Air Quality'
ON CONFLICT (health_condition_id, weather_hazard_id, title) DO UPDATE SET
  safety_tip = EXCLUDED.safety_tip, warning_signs = EXCLUDED.warning_signs,
  emergency_advice = EXCLUDED.emergency_advice, priority = EXCLUDED.priority;

INSERT INTO health_safety_tips (health_condition_id, weather_hazard_id, title, safety_tip, warning_signs, emergency_advice, priority)
SELECT hc.id, wh.id,
  'General high humidity comfort',
  'High humidity makes heat feel stronger. Take more breaks, drink water, and use ventilation or air conditioning when possible.',
  'Fatigue, headache, or cramps in humid heat.',
  'Cool down and hydrate. Seek help if feeling faint or confused.',
  1
FROM health_conditions hc, weather_hazards wh
WHERE hc.name = 'General / No Known Condition' AND wh.name = 'High Humidity'
ON CONFLICT (health_condition_id, weather_hazard_id, title) DO UPDATE SET
  safety_tip = EXCLUDED.safety_tip, warning_signs = EXCLUDED.warning_signs,
  emergency_advice = EXCLUDED.emergency_advice, priority = EXCLUDED.priority;

INSERT INTO health_safety_tips (health_condition_id, weather_hazard_id, title, safety_tip, warning_signs, emergency_advice, priority)
SELECT hc.id, wh.id,
  'General lightning safety',
  'Go indoors when thunder is heard. Avoid open areas, water, and tall isolated objects. Wait after the storm before resuming outdoor activities.',
  'Thunder immediately overhead or visible strikes nearby.',
  'If someone is struck, call emergency services and provide first aid if trained.',
  1
FROM health_conditions hc, weather_hazards wh
WHERE hc.name = 'General / No Known Condition' AND wh.name = 'Lightning'
ON CONFLICT (health_condition_id, weather_hazard_id, title) DO UPDATE SET
  safety_tip = EXCLUDED.safety_tip, warning_signs = EXCLUDED.warning_signs,
  emergency_advice = EXCLUDED.emergency_advice, priority = EXCLUDED.priority;

-- ---------------------------------------------------------------------------
-- 7b. COMPLETE MATRIX — run as Part B if the full file fails in SQL Editor
-- ---------------------------------------------------------------------------

INSERT INTO health_safety_tips (
  health_condition_id, weather_hazard_id, title, safety_tip, warning_signs, emergency_advice, priority
)
SELECT
  hc.id,
  wh.id,
  'Safety guidance: ' || wh.name,
  CASE wh.name
    WHEN 'Extreme Heat' THEN
      CASE hc.name
        WHEN 'Hypertension / High Blood Pressure' THEN 'Stay cool, hydrate per provider guidance, avoid peak heat exertion, and follow your treatment plan.'
        WHEN 'Heart Disease' THEN 'Avoid prolonged heat exposure. Rest in cool spaces and follow your cardiovascular care plan.'
        WHEN 'Asthma' THEN 'Heat can worsen breathing effort. Stay cool, pace activity, and follow your asthma action plan.'
        WHEN 'Diabetes' THEN 'Prevent dehydration. Follow your diabetes management plan and monitor how you feel in heat.'
        WHEN 'Chronic Respiratory Disease' THEN 'Stay in cool ventilated areas. Avoid heavy exertion and follow your respiratory care plan.'
        WHEN 'Kidney Disease' THEN 'Follow your provider''s fluid guidance. Stay cool and avoid strenuous heat exposure.'
        WHEN 'Heat Sensitivity' THEN 'Limit outdoor time in peak heat. Use shade, fans, or air conditioning and take frequent cool breaks.'
        WHEN 'Cold Sensitivity' THEN 'Even in heat waves, avoid rapid temperature swings. Cool down gradually and stay hydrated.'
        WHEN 'Elderly / Older Adults' THEN 'Stay in cool spaces, drink fluids as appropriate, and avoid strenuous activity during peak heat.'
        WHEN 'Children' THEN 'Never leave children in vehicles. Offer water and shade frequently during hot weather.'
        WHEN 'Pregnancy' THEN 'Stay cool and hydrated per prenatal guidance. Avoid prolonged standing in heat.'
        ELSE 'Stay hydrated, seek shade or air conditioning, and limit strenuous outdoor activity during extreme heat.'
      END
    WHEN 'High Heat Index' THEN
      CASE hc.name
        WHEN 'Hypertension / High Blood Pressure' THEN 'High heat index days increase strain. Shorten outdoor time and rest in cool areas.'
        WHEN 'Heart Disease' THEN 'Plan activities for cooler hours. Avoid heavy exertion when heat index is high.'
        WHEN 'Asthma' THEN 'Humid heat may feel harder on breathing. Stay indoors when possible and follow your action plan.'
        WHEN 'Diabetes' THEN 'Monitor hydration and how you feel. Follow your usual diabetes sick-day or heat guidance.'
        WHEN 'Chronic Respiratory Disease' THEN 'Use cool indoor spaces. Keep rescue inhalers or oxygen available as directed.'
        WHEN 'Kidney Disease' THEN 'Follow individualized fluid advice. Avoid overheating and heavy outdoor work.'
        WHEN 'Heat Sensitivity' THEN 'Treat high heat index days as high risk. Minimize outdoor exertion.'
        WHEN 'Cold Sensitivity' THEN 'Dress lightly but protect from sudden indoor AC extremes after outdoor heat.'
        WHEN 'Elderly / Older Adults' THEN 'Check indoor cooling. Encourage rest and fluids during high heat index periods.'
        WHEN 'Children' THEN 'Schedule play in cooler hours. Watch for fussiness, flushed skin, or tiredness.'
        WHEN 'Pregnancy' THEN 'Limit time outdoors on high heat index days. Rest and hydrate per prenatal advice.'
        ELSE 'When heat index is high, pace activity, hydrate, and use cool indoor spaces.'
      END
    WHEN 'Thunderstorm' THEN
      CASE hc.name
        WHEN 'Asthma' THEN 'Stay indoors. Storms can stir allergens. Follow your asthma action plan and keep rescue medication nearby.'
        WHEN 'Chronic Respiratory Disease' THEN 'Remain indoors with windows closed if dust or pollen increases. Follow your care plan.'
        WHEN 'Heart Disease' THEN 'Avoid strenuous storm cleanup. Rest indoors and keep medications accessible.'
        WHEN 'Children' THEN 'Keep children indoors away from windows. Explain thunder calmly and stay together.'
        WHEN 'Elderly / Older Adults' THEN 'Stay indoors. Keep flashlight, medications, and phone within reach.'
        ELSE 'Go indoors when thunderstorms approach. Avoid open fields, tall trees, and water.'
      END
    WHEN 'Heavy Rain' THEN
      CASE hc.name
        WHEN 'Diabetes' THEN 'Keep supplies dry. Plan meals and medication access if travel is disrupted.'
        WHEN 'Kidney Disease' THEN 'Follow fluid guidance. Avoid wading in floodwater and keep medications dry.'
        WHEN 'Elderly / Older Adults' THEN 'Avoid slippery surfaces. Use support when walking and keep emergency contacts handy.'
        WHEN 'Children' THEN 'Supervise near pooled water. Keep children away from fast-flowing drainage areas.'
        ELSE 'Avoid flooded roads. Use caution on wet surfaces and monitor local advisories.'
      END
    WHEN 'Flood' THEN
      CASE hc.name
        WHEN 'Diabetes' THEN 'Store insulin and supplies in waterproof bags. Avoid floodwater due to injury and contamination.'
        WHEN 'Kidney Disease' THEN 'Protect medications and follow provider advice on fluids if access to care is disrupted.'
        WHEN 'Heart Disease' THEN 'Avoid strenuous evacuation activity if possible. Seek help moving to safer ground.'
        WHEN 'Asthma' THEN 'Mold and dampness after floods may affect breathing. Follow your action plan if symptoms worsen.'
        WHEN 'Children' THEN 'Keep children away from floodwater. Never let them play in standing or moving water.'
        WHEN 'Elderly / Older Adults' THEN 'Evacuate early if advised. Carry medications, glasses, and mobility aids.'
        ELSE 'Move to higher ground if needed. Never drive into flooded roads.'
      END
    WHEN 'Strong Winds' THEN
      CASE hc.name
        WHEN 'Asthma' THEN 'Dust and debris may irritate airways. Consider a mask outdoors and follow your action plan.'
        WHEN 'Chronic Respiratory Disease' THEN 'Limit outdoor exposure to dusty wind. Stay indoors when air irritants are high.'
        WHEN 'Heart Disease' THEN 'Avoid strenuous outdoor securing work. Ask for help with heavy tasks.'
        WHEN 'Elderly / Older Adults' THEN 'Stay indoors. Reduce fall risk and keep walking paths clear indoors.'
        WHEN 'Children' THEN 'Keep children indoors. Secure outdoor toys and stay away from windows.'
        ELSE 'Stay away from damaged structures and downed power lines. Shelter indoors.'
      END
    WHEN 'Typhoon' THEN
      CASE hc.name
        WHEN 'Hypertension / High Blood Pressure' THEN 'Prepare medications and rest indoors. Avoid overexertion during preparation or cleanup.'
        WHEN 'Diabetes' THEN 'Stock food, water, and diabetes supplies. Keep items dry and accessible.'
        WHEN 'Kidney Disease' THEN 'Prepare medications and follow provider fluid guidance during prolonged sheltering.'
        WHEN 'Asthma' THEN 'Keep rescue inhaler available. Stay indoors with windows closed if outdoor air quality worsens.'
        WHEN 'Pregnancy' THEN 'Prepare go-bag with prenatal records. Avoid strenuous preparation tasks.'
        WHEN 'Children' THEN 'Keep family together indoors. Explain safety rules and monitor for distress.'
        ELSE 'Follow PAGASA and local orders. Shelter indoors and avoid travel during peak winds.'
      END
    WHEN 'Extreme Cold' THEN
      CASE hc.name
        WHEN 'Hypertension / High Blood Pressure' THEN 'Dress warmly. Cold can affect circulation. Limit long outdoor exposure.'
        WHEN 'Heart Disease' THEN 'Cold air may increase physical stress. Warm up gradually and avoid sudden heavy exertion.'
        WHEN 'Asthma' THEN 'Cold dry air may trigger symptoms. Breathe through a scarf and follow your action plan.'
        WHEN 'Diabetes' THEN 'Keep hands and feet warm. Protect insulin from freezing and monitor for unusual symptoms.'
        WHEN 'Chronic Respiratory Disease' THEN 'Cold air may worsen breathing. Cover mouth/nose outdoors and stay warm indoors.'
        WHEN 'Kidney Disease' THEN 'Stay warm and follow provider guidance on fluids and activity in cold weather.'
        WHEN 'Heat Sensitivity' THEN 'Dress in layers for cold snaps. Avoid rapid temperature changes when moving indoors/outdoors.'
        WHEN 'Elderly / Older Adults' THEN 'Use heating safely. Check on older adults and prevent falls on icy or wet surfaces.'
        WHEN 'Children' THEN 'Ensure warm clothing. Limit outdoor time in extreme cold and watch for shivering or confusion.'
        WHEN 'Pregnancy' THEN 'Dress warmly. Avoid prolonged cold exposure and seek warm shelter.'
        ELSE 'Wear layers, protect extremities, and limit prolonged outdoor exposure in extreme cold.'
      END
    WHEN 'Poor Air Quality' THEN
      CASE hc.name
        WHEN 'Hypertension / High Blood Pressure' THEN 'Reduce strenuous outdoor activity when air quality is poor. Rest indoors with windows closed if advised.'
        WHEN 'Heart Disease' THEN 'Poor air quality can increase physical stress. Favor indoor rest and follow your care plan.'
        WHEN 'Diabetes' THEN 'Limit outdoor exertion in polluted air. Monitor how you feel and stay hydrated indoors.'
        WHEN 'Kidney Disease' THEN 'Stay indoors when air quality is poor. Follow your usual care plan and avoid unnecessary exertion.'
        WHEN 'Heat Sensitivity' THEN 'Combine heat and poor air quality cautiously. Stay in filtered indoor spaces when possible.'
        WHEN 'Cold Sensitivity' THEN 'Limit outdoor time. Use indoor air filtration if available during smoke or pollution events.'
        WHEN 'Elderly / Older Adults' THEN 'Remain indoors when air quality is poor. Seek care if breathing becomes difficult.'
        WHEN 'Children' THEN 'Keep children indoors during poor air quality. Watch for cough or breathing difficulty.'
        WHEN 'Pregnancy' THEN 'Limit outdoor exposure. Follow prenatal provider guidance for activity and masking if recommended.'
        ELSE 'Reduce outdoor activity. Keep windows closed and use filtration when available.'
      END
    WHEN 'High Humidity' THEN
      CASE hc.name
        WHEN 'Hypertension / High Blood Pressure' THEN 'Humid heat increases discomfort. Rest often in cool spaces and hydrate appropriately.'
        WHEN 'Heart Disease' THEN 'High humidity adds strain. Pace activity and stay in ventilated or air-conditioned areas.'
        WHEN 'Diabetes' THEN 'Drink fluids as appropriate for your plan. Monitor for dizziness or weakness in humid heat.'
        WHEN 'Kidney Disease' THEN 'Follow provider fluid guidance. Avoid overheating in humid conditions.'
        WHEN 'Heat Sensitivity' THEN 'Humidity makes heat feel worse. Schedule outdoor tasks for cooler, drier periods if possible.'
        WHEN 'Cold Sensitivity' THEN 'Humid cool conditions can feel colder. Dress in dry layers and warm up indoors.'
        WHEN 'Elderly / Older Adults' THEN 'Encourage cool indoor breaks. Monitor for confusion or weakness in humid weather.'
        WHEN 'Children' THEN 'Offer frequent water breaks. Limit active play in humid midday heat.'
        WHEN 'Pregnancy' THEN 'Rest in cool ventilated spaces. Hydrate per prenatal guidance during humid heat.'
        ELSE 'Take extra breaks in humid heat. Hydrate and use ventilation or air conditioning.'
      END
    WHEN 'Lightning' THEN
      CASE hc.name
        WHEN 'Heart Disease' THEN 'When thunder roars, go indoors. Avoid being the tallest object outdoors during storms.'
        WHEN 'Hypertension / High Blood Pressure' THEN 'Shelter indoors during lightning. Avoid using wired electronics during close strikes if safe to unplug.'
        WHEN 'Asthma' THEN 'Stay indoors during lightning risk. Rapid weather changes may affect breathing for some individuals.'
        WHEN 'Diabetes' THEN 'Do not shelter under isolated trees. Wait 30 minutes after last thunder before going outside.'
        WHEN 'Chronic Respiratory Disease' THEN 'Remain indoors during active lightning. Keep rescue medication accessible.'
        WHEN 'Kidney Disease' THEN 'Go indoors when storms approach. Avoid open water and high ground.'
        WHEN 'Heat Sensitivity' THEN 'Lightning often accompanies storms. Move indoors early when skies darken.'
        WHEN 'Cold Sensitivity' THEN 'Seek sturdy indoor shelter. Change out of wet clothing after storms.'
        WHEN 'Elderly / Older Adults' THEN 'Help older adults reach safe indoor shelter quickly when lightning is nearby.'
        WHEN 'Pregnancy' THEN 'Stay indoors during lightning. Avoid open areas and metal structures outdoors.'
        ELSE 'When thunder roars, go indoors. Wait 30 minutes after the last thunder before resuming outdoor activities.'
      END
    ELSE 'Follow local weather advisories and take sensible precautions for your health situation.'
  END,
  CASE wh.name
    WHEN 'Extreme Heat' THEN 'Dizziness, confusion, nausea, muscle cramps, hot dry skin, or fainting.'
    WHEN 'High Heat Index' THEN 'Headache, weakness, rapid pulse, or feeling faint during outdoor activity.'
    WHEN 'Thunderstorm' THEN 'Nearby lightning, sudden strong wind, or breathing difficulty after dust exposure.'
    WHEN 'Heavy Rain' THEN 'Rising water, slippery falls, or inability to reach shelter or medications.'
    WHEN 'Flood' THEN 'Fast-moving water, injury, or worsening health symptoms during evacuation.'
    WHEN 'Strong Winds' THEN 'Flying debris, falls, or breathing irritation from dust.'
    WHEN 'Typhoon' THEN 'Structural damage, injury during cleanup, or missed medications during prolonged sheltering.'
    WHEN 'Extreme Cold' THEN 'Shivering that stops, confusion, numbness, or slurred speech.'
    WHEN 'Poor Air Quality' THEN 'Worsening cough, chest tightness, or shortness of breath.'
    WHEN 'High Humidity' THEN 'Fatigue, cramps, dizziness, or confusion in humid heat.'
    WHEN 'Lightning' THEN 'Burns, collapse, or unconsciousness after a strike (rare but serious).'
    ELSE 'Any sudden or severe symptom that concerns you or your caregiver.'
  END,
  CASE hc.name
    WHEN 'Heart Disease' THEN 'Seek urgent care for chest pain, severe shortness of breath, or fainting. Call emergency services for life-threatening symptoms.'
    WHEN 'Asthma' THEN 'Use rescue medication as directed. Seek urgent care if breathing does not improve. Call emergency services for severe distress.'
    WHEN 'Chronic Respiratory Disease' THEN 'Seek urgent care for severe breathlessness or bluish lips. Call emergency services if unable to breathe comfortably.'
    WHEN 'Diabetes' THEN 'Follow your diabetes emergency plan. Seek care for confusion, persistent vomiting, or inability to keep fluids down.'
    WHEN 'Kidney Disease' THEN 'Contact your kidney care team or seek urgent care for severe swelling, breathing difficulty, or confusion.'
    WHEN 'Pregnancy' THEN 'Contact your prenatal provider or emergency services for severe headache, bleeding, painful contractions, or reduced fetal movement per provider instructions.'
    WHEN 'Children' THEN 'Seek urgent care if a child is not alert, not drinking, or has breathing difficulty. Call emergency services for collapse or seizures.'
    WHEN 'Elderly / Older Adults' THEN 'Check on older adults promptly. Seek urgent care for confusion, falls, or failure to improve after cooling or warming.'
    ELSE 'Move to safety, rest, and seek professional medical care if symptoms are severe, sudden, or not improving.'
  END,
  2
FROM health_conditions hc
CROSS JOIN weather_hazards wh
WHERE NOT EXISTS (
  SELECT 1
  FROM health_safety_tips existing
  WHERE existing.health_condition_id = hc.id
    AND existing.weather_hazard_id = wh.id
)
ON CONFLICT (health_condition_id, weather_hazard_id, title) DO UPDATE SET
  safety_tip = EXCLUDED.safety_tip,
  warning_signs = EXCLUDED.warning_signs,
  emergency_advice = EXCLUDED.emergency_advice,
  priority = EXCLUDED.priority;

-- ---------------------------------------------------------------------------
-- 8. VERIFICATION QUERIES (run after seed)
-- ---------------------------------------------------------------------------

SELECT 'health_conditions' AS table_name, COUNT(*)::text AS row_count FROM health_conditions
UNION ALL
SELECT 'weather_hazards', COUNT(*)::text FROM weather_hazards
UNION ALL
SELECT 'health_safety_tips', COUNT(*)::text FROM health_safety_tips;

-- Every condition should have 11 tips (one per hazard):
SELECT hc.name AS health_condition, COUNT(hst.id)::int AS tip_count
FROM health_conditions hc
LEFT JOIN health_safety_tips hst ON hst.health_condition_id = hc.id
GROUP BY hc.name
ORDER BY hc.name;

-- Example personalized query for the mobile app:
-- SELECT * FROM v_personalized_safety_tips
-- WHERE health_condition = 'Asthma' AND weather_hazard = 'Poor Air Quality'
-- ORDER BY priority;

