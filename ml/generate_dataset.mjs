import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'data');

const HEALTH = ['None', 'Healthy', 'Hypertension', 'Diabetes', 'Asthma', 'Heart disease'];
const ACTIVITY = ['Low', 'Moderate', 'High'];
const HYDRATION = ['Well hydrated', 'Moderately hydrated', 'Dehydrated'];

function pagasaBand(h) {
  if (h >= 52) return 'Extreme danger (>=52)';
  if (h >= 42) return 'Danger (42-51)';
  if (h >= 33) return 'Extreme caution (33-41)';
  if (h >= 27) return 'Caution (27-32)';
  return 'Below caution (<27)';
}

function hasHealthRisk(h) {
  return !['none', 'n/a', 'no condition', 'healthy', ''].includes(
    String(h).trim().toLowerCase(),
  );
}

function countFactors(age, health, activity, hydration) {
  let c = 0;
  if (age >= 60) c++;
  if (hasHealthRisk(health)) c++;
  if (activity === 'High') c++;
  if (hydration === 'Dehydrated') c++;
  return c;
}

function labelRisk(heat, age, health, activity, hydration) {
  if (heat >= 42) return 'EXTREME';
  const f = countFactors(age, health, activity, hydration);
  if (heat >= 33) return f >= 1 ? 'EXTREME' : 'HIGH';
  if (heat >= 27) return f >= 1 ? 'HIGH' : 'MODERATE';
  return f >= 1 ? 'MODERATE' : 'LOW';
}

const profiles = [
  ['None', 'Low', 'Well hydrated', 'Typical low-exposure profile'],
  ['None', 'Moderate', 'Moderately hydrated', 'Average daily activity'],
  ['None', 'High', 'Moderately hydrated', 'Outdoor worker no comorbidity'],
  ['Hypertension', 'Low', 'Well hydrated', 'Controlled condition indoor'],
  ['Diabetes', 'Moderate', 'Moderately hydrated', 'Chronic condition'],
  ['Asthma', 'High', 'Dehydrated', 'High exposure dehydration'],
  ['Heart disease', 'Moderate', 'Dehydrated', 'Cardiac vulnerability'],
  ['None', 'High', 'Dehydrated', 'Dehydrated active youth'],
  ['Healthy', 'Low', 'Dehydrated', 'Dehydration without comorbidity'],
];

const heats = [22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 41, 43, 45, 48, 52, 55];
const ages = [8, 16, 25, 35, 48, 55, 62, 71, 78];

const allRows = [];
const seen = new Set();
let id = 1;

for (const heat of heats) {
  for (const age of ages) {
    for (const [h, a, hy, n] of profiles) {
      const key = [heat, age, h, a, hy].join('|');
      if (seen.has(key)) continue;
      seen.add(key);
      allRows.push({
        record_id: `HH-${String(id++).padStart(3, '0')}`,
        heat_index: heat,
        age,
        health_condition: h,
        activity_level: a,
        hydration_status: hy,
        risk_level: labelRisk(heat, age, h, a, hy),
        pagasa_band: pagasaBand(heat),
        notes: n,
      });
    }
  }
}

// Pick a balanced subset (~120 rows) covering all bands and risk levels
const TARGET = 120;
const byRisk = {};
for (const r of allRows) {
  (byRisk[r.risk_level] ||= []).push(r);
}

function pickBalanced(pool, n) {
  const step = Math.max(1, Math.floor(pool.length / n));
  const out = [];
  for (let i = 0; i < pool.length && out.length < n; i += step) out.push(pool[i]);
  return out;
}

const perLevel = Math.floor(TARGET / 4);
const rows = [
  ...pickBalanced(byRisk.LOW || [], perLevel),
  ...pickBalanced(byRisk.MODERATE || [], perLevel),
  ...pickBalanced(byRisk.HIGH || [], perLevel),
  ...pickBalanced(byRisk.EXTREME || [], perLevel),
];

let seed = 42;
function rnd() {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
}

const rowKeys = new Set(rows.map((r) => [r.heat_index, r.age, r.health_condition, r.activity_level, r.hydration_status].join('|')));
id = rows.length + 1;

while (rows.length < TARGET) {
  const candidate = allRows[Math.floor(rnd() * allRows.length)];
  const key = [candidate.heat_index, candidate.age, candidate.health_condition, candidate.activity_level, candidate.hydration_status].join('|');
  if (rowKeys.has(key)) continue;
  rowKeys.add(key);
  rows.push({ ...candidate, record_id: `HH-${String(id++).padStart(3, '0')}` });
}

rows.sort((a, b) => a.record_id.localeCompare(b.record_id));
rows.forEach((r, i) => {
  r.record_id = `HH-${String(i + 1).padStart(3, '0')}`;
});

const headers = [
  'record_id',
  'heat_index',
  'age',
  'health_condition',
  'activity_level',
  'hydration_status',
  'risk_level',
  'pagasa_band',
  'notes',
];

const esc = (v) => `"${String(v).replace(/"/g, '""')}"`;
const csv = [headers.join(',')]
  .concat(rows.map((r) => headers.map((h) => esc(r[h])).join(',')))
  .join('\n');

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.writeFileSync(path.join(DATA_DIR, 'heat_risk_dataset.csv'), csv, 'utf8');

try {
  const XLSX = (await import('xlsx')).default;
  const sheet = XLSX.utils.json_to_sheet(rows, { header: headers });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, 'Heat Risk Dataset');
  XLSX.writeFile(wb, path.join(DATA_DIR, 'heat_risk_dataset.xlsx'));
  console.log('Wrote Excel -> ml/data/heat_risk_dataset.xlsx');
} catch {
  console.log('Excel skipped (CSV opens in Excel). Run: npm install xlsx');
}

const counts = {};
for (const r of rows) counts[r.risk_level] = (counts[r.risk_level] || 0) + 1;
console.log(`Wrote ${rows.length} rows -> ml/data/heat_risk_dataset.csv`);
console.log('Risk distribution:', counts);
