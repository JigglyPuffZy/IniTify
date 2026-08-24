import type { CheckInChatDraft } from '@/src/models/check-in-chat';
import type { HeatRiskLevel } from '@/src/models/risk';
import { formatConditionLabel, getActiveHealthConditions } from '@/src/constants/health-conditions';
import type { UserProfile } from '@/src/models/user';

/** Topics Tify is allowed to discuss — everything else gets a polite redirect. */
export const TIFY_ALLOWED_TOPICS = [
  'IniTify app (check-in, heat risk, safety tips, emergency, weather, profile)',
  'Heat index and heat risk levels (LOW, MODERATE, HIGH, EXTREME) in Tuguegarao',
  'Hydration, activity level, and how the user feels in hot weather',
  'Heat safety for the user\'s health conditions (not general medical advice)',
  'When to rest, drink water, seek shade, or call emergency hotlines',
  'Symptoms related to heat (headache, dizziness, nausea, cramps, exhaustion)',
  'Body pain / masakit — with practical suggestions (not a formal diagnosis)',
  'What hurts, where it hurts, and what to do while waiting for a real doctor',
] as const;

/** Topics Tify must refuse and redirect. */
export const TIFY_FORBIDDEN_TOPICS = [
  'Homework, exams, math, coding, essays, unrelated school work',
  'Politics, religion, gossip, dating, entertainment, sports scores',
  'Diagnosing diseases or prescribing specific medicines/dosages',
  'Legal, financial, or investment advice',
  'General ChatGPT tasks unrelated to heat safety',
  'Other apps or products unrelated to IniTify',
] as const;

const OFF_TOPIC_PATTERNS = [
  /\b(homework|assignment|essay|thesis chapter|solve this|write (a|me) (code|program|essay))/i,
  /\b(president|election|politics|religion|bible|quran)\b/i,
  /\b(recipe|cooking|movie|song|lyrics|nba|football)\b/i,
  /\b(bitcoin|stock|invest|crypto)\b/i,
  /\b(who is|what is the capital|tell me a joke|pick up line)\b/i,
  /\b(chatgpt|gpt-4|openai)\b/i,
];

const HEAT_RELATED =
  /\b(heat|init|initify|tify|hydrat|water|uhaw|mainit|check-?in|tuguegarao|pagasa|risk|safety|emergency|asthma|diabetes|hypertension|dizz|headache|nausea|cramp|sun|weather|feeling|activity|rest|shade|masakit|sakit|sick|symptom|pain|hilo|nahihilo|puso|dibdib|tiyan|ulo|pagod|weak)\b/i;

export function isOffTopicUserMessage(text: string): boolean {
  const t = text.trim();
  if (t.length < 3) return false;
  if (HEAT_RELATED.test(t)) return false;
  return OFF_TOPIC_PATTERNS.some((re) => re.test(t));
}

export function getOffTopicRedirect(draft: CheckInChatDraft): string {
  if (!draft.hydrationStatus) {
    return (
      "Medyo labas 'yan sa scope ko — ako si Tify, heat-safety assistant mo sa IniTify lang. " +
      'Hindi ako general chatbot. Focus tayo sa check-in mo ngayon.\n\n' +
      'Una: Kumusta hydration mo? Well hydrated, needs water, o dehydrated?'
    );
  }
  if (!draft.activityLevel) {
    return (
      'Sagot ko lang ang heat safety at check-in dito sa IniTify. ' +
      'Balik tayo — anong activity level mo today? Low, Moderate, o High?'
    );
  }
  if (!draft.generalStatus) {
    return (
      'IniTify heat check-in lang ang topic ko. ' +
      'How are you feeling overall? Feeling Well, Mild Discomfort, o Not Feeling Well?'
    );
  }
  return (
    'Tify lang ako para sa heat safety sa Tuguegarao — hindi general Q&A. ' +
    'May symptoms ka ba sa init, o ready ka nang i-save ang check-in?'
  );
}

const CONDITION_HEAT_LINES: Record<string, string> = {
  'Hypertension / High Blood Pressure':
    'Sa init, mas mahalaga ang pahinga at hydration — iwasan ang bigat na activity sa peak heat.',
  Diabetes:
    'Sa diabetes, bantayan ang uhaw at pagkapagod sa init — may glucose at tubig ka ba malapit?',
  Asthma:
    'Sa asthma, mainit at humid na hangin puede mas mahirap huminga — nandiyan ba inhaler mo?',
  'Chronic Respiratory Disease':
    'Sa respiratory condition, limitahan outdoor sa mainit na oras at manatili sa cool na lugar.',
  'Heart Disease':
    'Sa heart condition, iwasan strenuous work sa high heat at uminom ng tubig kung pinapayag ng doktor mo.',
  'Kidney Disease':
    'Sa kidney concerns, sundin fluid guidance ng doktor mo — huwag mag-overhydrate nang walang payo.',
  'Heat Sensitivity':
    'Sensitive ka sa init — mas maiksi ang outdoor time at mag-rest sa shade.',
};

export function conditionHeatReminder(profile: UserProfile): string | null {
  const conditions = getActiveHealthConditions(
    profile.riskFactors.healthConditions,
    profile.riskFactors.healthCondition,
  );
  for (const c of conditions) {
    const label = formatConditionLabel(c);
    const line = CONDITION_HEAT_LINES[c] ?? CONDITION_HEAT_LINES[label];
    if (line) return line;
  }
  return null;
}

export function riskLevelGuidance(
  risk: string | null,
  heatIndexC: number | null,
): string {
  const level = risk as HeatRiskLevel | null;
  if (level === 'EXTREME' || (heatIndexC != null && heatIndexC >= 42)) {
    return (
      'Extreme heat risk — limitahan ang labas, uminom ng tubig, mag-rest sa pinaka-cool na lugar. ' +
      'Kung may sintomas (pagkahilo, kalituhan), tumawag sa emergency hotline.'
    );
  }
  if (level === 'HIGH' || (heatIndexC != null && heatIndexC >= 33)) {
    return (
      'High heat risk — uminom ng tubig, mag-break sa shade, iwasan heavy activity sa tanghali. ' +
      'Tingnan ang Safety Tips sa app para sa condition mo.'
    );
  }
  if (level === 'MODERATE' || (heatIndexC != null && heatIndexC >= 27)) {
    return 'Moderate heat — stay hydrated at magpahinga kung nanghihina ka sa init.';
  }
  return 'Lower heat risk ngayon — hydrated pa rin at mag-check-in regularly.';
}

export const TIFY_EMERGENCY_SCRIPT =
  'Ito ay maaaring emergency. Tumawag kaagad sa 911 o local emergency hotline. ' +
  'Huwag hintayin ang chat — kumuha ng medical help ngayon. ' +
  'May button sa baba para sa **pinakamalapit na hospital** based sa location mo. ' +
  'IniTify ay hindi replacement sa doctor.';

export const TIFY_DISCLAIMER =
  'Paalala: IniTify at si Tify ay decision-support lang — hindi medical diagnosis o treatment.';

export const TIFY_STEP_SCRIPTS = {
  greeting: (name: string, _heatLine: string) =>
    `Hi ${name}. I'm Tify, your personal AI companion for heat safety.`,

  hydrationAck: (status: string) =>
    `Noted — **${status}**.\n\nSunod: **Anong activity level mo today?** (Low / Moderate / High)`,

  activityAck: (level: string) =>
    `Got it — **${level}** activity.\n\n**How are you feeling overall?** (Feeling Well / Mild Discomfort / Not Feeling Well)`,

  feelingAck: () =>
    'Salamat. Sabihin mo kung **ano ang masakit** o anong nararamdaman mo sa init — headache, dizziness, nausea, o "none". Pwede mo i-describe freely; bibigyan kita ng suggestions.',

  summaryConfirm: (summary: string) =>
    `Ito ang check-in summary mo:\n\n${summary}\n\n**Tama ba?** Sabihin "save" o tap Save check-in.`,

  saved: () =>
    'Check-in saved! Stay cool, hydrated, at buksan ang **Safety Tips** sa app kung kailangan mo ng guidance.',
} as const;

const EMERGENCY_USER_PATTERNS =
  /\b(chest pain|heart attack|can't breathe|cannot breathe|hindi makahinga|nanghihina na|unconscious|natumba|seizure|stroke|matay|dying|emergency na)\b/i;

const DANGEROUS_FEELING_PATTERNS =
  /\b(not feeling well|dehydrated|delikado|emergency|hospital|nanghihina|hindi okay|hindi ok|seryoso|serious|need help|tulong)\b/i;

export function isEmergencyUserMessage(text: string): boolean {
  return EMERGENCY_USER_PATTERNS.test(text);
}

/** When true, check-in UI should offer nearest hospital from location. */
export function shouldOfferNearestHospital(params: {
  userText: string;
  riskLevel?: string | null;
  generalStatus?: string | null;
  hydrationStatus?: string | null;
  hasSevereSymptoms?: boolean;
}): boolean {
  if (isEmergencyUserMessage(params.userText)) return true;
  if (params.hasSevereSymptoms) return true;

  const highHeat = params.riskLevel === 'HIGH' || params.riskLevel === 'EXTREME';
  if (DANGEROUS_FEELING_PATTERNS.test(params.userText) && highHeat) return true;
  if (params.generalStatus === 'Not Feeling Well' && highHeat) return true;
  if (params.hydrationStatus === 'Dehydrated / Concerning' && highHeat) return true;
  return false;
}
