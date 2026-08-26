/**
 * Offline fallback safety tips when Supabase KB is unavailable.
 * Names align with initify_supabase_health_safety_kb.sql seed data.
 * Quantifiable amounts support adviser feedback (cups, minutes, liters).
 */
import type { PersonalizedSafetyTip } from '@/src/services/health-safety/health-safety-kb.service';
import {
  formatConditionLabel,
  getActiveHealthConditions,
  isOtherConditionDetail,
  toKbHealthConditionName,
} from '@/src/constants/health-conditions';

type LocalTipSeed = Omit<PersonalizedSafetyTip, 'tipId'>;

const HEAT_TIPS: Record<string, LocalTipSeed[]> = {
  'Hypertension / High Blood Pressure': [
    {
      healthCondition: 'Hypertension / High Blood Pressure',
      weatherHazard: 'Extreme Heat',
      title: 'Blood pressure and extreme heat',
      safetyTip:
        'Stay in cool areas (≤25°C if possible), drink about 250 ml (1 cup) water every 15–20 minutes unless your doctor limits fluids, and avoid heavy outdoor work from 10:00 AM–3:00 PM. Heat can raise strain on the heart and blood vessels.',
      warningSigns: 'Severe headache, chest pain, dizziness, or fainting.',
      emergencyAdvice: 'Call emergency services if chest pain, confusion, or fainting occurs.',
      priority: 1,
    },
    {
      healthCondition: 'Hypertension / High Blood Pressure',
      weatherHazard: 'High Heat Index',
      title: 'High heat index days',
      safetyTip:
        'Limit continuous outdoor time to 20–30 minutes, take 5–10 minute rests in shade or AC every 30–45 minutes, and continue prescribed blood pressure medicines on schedule.',
      warningSigns: 'Worsening headache, nausea, or unusual fatigue.',
      emergencyAdvice: 'Seek urgent care if symptoms are severe or sudden.',
      priority: 2,
    },
  ],
  Diabetes: [
    {
      healthCondition: 'Diabetes',
      weatherHazard: 'Extreme Heat',
      title: 'Diabetes and extreme heat',
      safetyTip:
        'Aim for at least 2–3 L total fluids on hot days (unless restricted). Check blood sugar if your plan requires it every 2–4 hours in heat, and keep fast-acting glucose available if prescribed.',
      warningSigns: 'Confusion, excessive thirst, weakness, or vomiting.',
      emergencyAdvice: 'Seek urgent care for unresponsiveness or persistent vomiting.',
      priority: 1,
    },
    {
      healthCondition: 'Diabetes',
      weatherHazard: 'High Heat Index',
      title: 'High heat index with diabetes',
      safetyTip:
        'Drink ~250 ml water every 15–20 minutes during outdoor activity. Heat can affect how you feel and how medicines work — follow your sick-day or heat guidance.',
      warningSigns: 'Shakiness, sweating, confusion, or fruity breath.',
      emergencyAdvice: 'Use emergency services if the person cannot stay awake or swallow safely.',
      priority: 2,
    },
  ],
  Asthma: [
    {
      healthCondition: 'Asthma',
      weatherHazard: 'High Humidity',
      title: 'Asthma and humid heat',
      safetyTip:
        'Humid heat can make breathing feel harder. Stay indoors when possible; limit outdoor exertion to ≤15–20 minutes at a time and follow your asthma action plan.',
      warningSigns: 'Increased wheezing, chest tightness, or rescue inhaler use more than every 4 hours.',
      emergencyAdvice: 'Call emergency services if breathing does not improve after rescue medicine.',
      priority: 1,
    },
    {
      healthCondition: 'Asthma',
      weatherHazard: 'Poor Air Quality',
      title: 'Asthma and poor air quality',
      safetyTip:
        'Limit outdoor activity to ≤30 minutes when air quality is poor. Keep rescue inhaler within arm’s reach and avoid smoke or dust.',
      warningSigns: 'Persistent cough, wheezing, or shortness of breath.',
      emergencyAdvice: 'Seek urgent care if speaking in full sentences is difficult.',
      priority: 2,
    },
  ],
  'Heart Disease': [
    {
      healthCondition: 'Heart Disease',
      weatherHazard: 'Extreme Heat',
      title: 'Heart disease and heat',
      safetyTip:
        'Heat increases heart workload. Rest 5–10 minutes every 20–30 minutes outdoors, drink 250 ml water every 15–20 minutes if allowed, and take medicines as prescribed.',
      warningSigns: 'Chest pain, pressure, irregular heartbeat, or sudden shortness of breath.',
      emergencyAdvice: 'Call emergency services immediately for chest pain or fainting.',
      priority: 1,
    },
  ],
  'Chronic Respiratory Disease': [
    {
      healthCondition: 'Chronic Respiratory Disease',
      weatherHazard: 'High Heat Index',
      title: 'Breathing and high heat',
      safetyTip:
        'Stay cool and drink ~250 ml fluids every 15–20 minutes unless on fluid restriction. Avoid smoke and dust. Use prescribed inhalers or oxygen as directed.',
      warningSigns: 'Worsening breathlessness or blue lips.',
      emergencyAdvice: 'Seek emergency care if breathing is severely labored.',
      priority: 1,
    },
  ],
  'Kidney Disease': [
    {
      healthCondition: 'Kidney Disease',
      weatherHazard: 'Extreme Heat',
      title: 'Kidney disease and dehydration',
      safetyTip:
        'Follow your doctor’s daily fluid limit exactly (often 1–1.5 L/day for some patients — confirm yours). Avoid overheating; rest in cool spaces ≥15 minutes every hour during extreme heat.',
      warningSigns: 'Little urine, swelling, confusion, or chest pain.',
      emergencyAdvice: 'Seek urgent medical care for these warning signs.',
      priority: 1,
    },
  ],
  'Heat Sensitivity': [
    {
      healthCondition: 'Heat Sensitivity',
      weatherHazard: 'Extreme Heat',
      title: 'Extra caution in extreme heat',
      safetyTip:
        'Plan outdoor tasks before 10:00 AM or after 4:00 PM. Take 10–15 minute breaks in AC or shade every 20–30 minutes outdoors and cool down at the first sign of dizziness.',
      warningSigns: 'Nausea, headache, rapid pulse, or feeling faint.',
      emergencyAdvice: 'Move to a cool place and seek help if symptoms worsen within 15–30 minutes.',
      priority: 1,
    },
  ],
  'Cold Sensitivity': [
    {
      healthCondition: 'Cold Sensitivity',
      weatherHazard: 'Extreme Cold',
      title: 'Cold sensitivity after heat exposure',
      safetyTip:
        'Warm up gradually over 10–15 minutes after cooling down. Sudden cold can stress the body if you are heat-sensitive.',
      warningSigns: 'Numbness, shivering, or color changes in fingers or toes.',
      emergencyAdvice: 'Seek care if numbness persists or skin color does not return.',
      priority: 1,
    },
  ],
  'General / No Known Condition': [
    {
      healthCondition: 'General / No Known Condition',
      weatherHazard: 'Extreme Heat',
      title: 'General heat safety',
      safetyTip:
        'Drink about 250 ml (1 cup) water every 15–20 minutes in the heat — aim for 2–3 L total on hot days. Wear light clothing and limit strenuous activity from 10:00 AM–3:00 PM.',
      warningSigns: 'Dizziness, nausea, confusion, or hot dry skin.',
      emergencyAdvice: 'Call emergency services for severe or worsening symptoms.',
      priority: 1,
    },
  ],
};

function conditionKeys(conditions: string[]): string[] {
  const keys = conditions.map((c) => {
    if (isOtherConditionDetail(c) || c === 'Other') return 'General / No Known Condition';
    return toKbHealthConditionName(c);
  });
  return [...new Set(keys)];
}

export function getLocalSafetyTips(params: {
  healthConditions: string[];
  healthCondition?: string | null;
  weatherHazard: string;
  limit?: number;
}): PersonalizedSafetyTip[] {
  const active = getActiveHealthConditions(params.healthConditions, params.healthCondition);
  const keys = conditionKeys(active.length ? active : ['None']);
  const hazard = params.weatherHazard;
  const heatHazards = new Set(['Extreme Heat', 'High Heat Index', 'High Humidity', 'General']);

  let tipId = 1;
  const tips: PersonalizedSafetyTip[] = [];

  for (const key of keys) {
    const seeds = HEAT_TIPS[key] ?? HEAT_TIPS['General / No Known Condition'] ?? [];
    const label =
      active.find((c) => toKbHealthConditionName(c) === key) ?? key;

    const matched = seeds.filter(
      (seed) =>
        seed.weatherHazard === hazard ||
        (heatHazards.has(hazard) && heatHazards.has(seed.weatherHazard)),
    );

    const picks = (matched.length ? matched : seeds).slice(0, 2);

    for (const seed of picks) {
      tips.push({
        ...seed,
        tipId: tipId++,
        healthCondition: formatConditionLabel(label),
      });
    }
  }

  const limit = params.limit ?? tips.length;
  return tips.sort((a, b) => a.priority - b.priority).slice(0, limit);
}
