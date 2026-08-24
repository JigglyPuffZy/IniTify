import type { GeneralStatus, HydrationStatus } from '@/src/models/user';
import type { UserProfile } from '@/src/models/user';
import { getFirstAidGuidanceForConditions } from '@/src/constants/first-aid';
import { conditionHeatReminder } from './tify-knowledge';

export interface DetectedSymptom {
  id: string;
  label: string;
  severity: 'mild' | 'moderate' | 'severe';
}

const SYMPTOM_PATTERNS: {
  id: string;
  label: string;
  re: RegExp;
  severity: DetectedSymptom['severity'];
}[] = [
  {
    id: 'headache',
    label: 'headache / sakit ng ulo',
    re: /\b(headache|sakit (ng )?ulo|masakit ang ulo|sumasakit (ang )?ulo)\b/i,
    severity: 'moderate',
  },
  {
    id: 'dizziness',
    label: 'dizziness / pagkahilo',
    re: /\b(dizz|nahihilo|hilo|lightheaded|lumalabo)\b/i,
    severity: 'moderate',
  },
  {
    id: 'nausea',
    label: 'nausea / nasusuka',
    re: /\b(nausea|nasusuka|suka|nauseous|inihh?)\b/i,
    severity: 'moderate',
  },
  {
    id: 'cramps',
    label: 'muscle cramps',
    re: /\b(cramp|kram?p|pulikat|masakit (ang )?binti|leg pain)\b/i,
    severity: 'mild',
  },
  {
    id: 'fatigue',
    label: 'fatigue / pagod',
    re: /\b(tired|pagod|exhaust|weak|hina|nanghihina|walang lakas)\b/i,
    severity: 'mild',
  },
  {
    id: 'thirst',
    label: 'thirst / uhaw',
    re: /\b(thirst|uhaw|dry mouth|tuyong bibig)\b/i,
    severity: 'mild',
  },
  {
    id: 'chest',
    label: 'chest discomfort',
    re: /\b(chest|dibdib|heart|puso)\b/i,
    severity: 'severe',
  },
  {
    id: 'breathing',
    label: 'breathing difficulty',
    re: /\b(breath|hinga|hingal|wheez|asthma attack)\b/i,
    severity: 'severe',
  },
  {
    id: 'stomach',
    label: 'stomach pain',
    re: /\b(stomach|tiyan|sikmura|abdominal)\b/i,
    severity: 'moderate',
  },
  {
    id: 'body_pain',
    label: 'body pain',
    re: /\b(masakit|sakit|pain|achy|body ache)\b/i,
    severity: 'moderate',
  },
];

/** Internal reference for AI — not shown verbatim to users. */
const SYMPTOM_CLINICAL_HINTS: Record<
  string,
  { causes: string; careIdeas: string[]; watch: string }
> = {
  headache: {
    causes: 'dehydration, heat exposure, lack of rest in hot weather',
    careIdeas: ['cool shaded rest', 'slow hydration', 'cool compress on neck/forehead'],
    watch: 'sudden severe headache, confusion, persistent vomiting, high fever',
  },
  dizziness: {
    causes: 'heat exhaustion, dehydration, standing up quickly in heat',
    careIdeas: ['sit or lie down immediately', 'sip water', 'remove excess clothing, seek AC/shade'],
    watch: 'dizziness with chest pain, breathing trouble, fainting, or falls',
  },
  nausea: {
    causes: 'heat stress, especially when dehydrated',
    careIdeas: ['stop activity', 'small sips of water', 'light food only when settled'],
    watch: 'ongoing vomiting, unable to keep fluids down, worsening weakness',
  },
  cramps: {
    causes: 'heat cramps from sweat and electrolyte loss',
    careIdeas: ['gentle stretch', 'hydration/ORS if available', 'rest the muscle'],
    watch: 'cramps with dizziness, rapid heartbeat, or no improvement with rest',
  },
  fatigue: {
    causes: 'heat fatigue from hot weather and exertion',
    careIdeas: ['rest in coolest available place', 'hydrate', 'avoid peak heat hours'],
    watch: 'extreme fatigue with confusion, hot dry skin, or unresponsiveness',
  },
  thirst: {
    causes: 'early sign of needing fluids in Tuguegarao heat',
    careIdeas: ['drink water now', 'carry water when going out', 'avoid alcohol in heat'],
    watch: 'thirst with dizziness, little urine, or confusion',
  },
  stomach: {
    causes: 'possible heat stress or dehydration — not a diagnosis',
    careIdeas: ['rest', 'slow hydration', 'avoid heavy/greasy food for now'],
    watch: 'severe abdominal pain, blood in stool/vomit, persistent fever',
  },
  body_pain: {
    causes: 'heat-related muscle strain or general heat stress',
    careIdeas: ['rest', 'hydrate', 'cool compress if area feels hot'],
    watch: 'pain with chest symptoms, breathing difficulty, or rapid worsening',
  },
};

export function isSymptomUserMessage(text: string): boolean {
  const t = text.trim();
  if (t.length < 2) return false;
  return SYMPTOM_PATTERNS.some((p) => p.re.test(t));
}

export function detectSymptoms(text: string): DetectedSymptom[] {
  const found: DetectedSymptom[] = [];
  for (const p of SYMPTOM_PATTERNS) {
    if (p.re.test(text)) {
      found.push({ id: p.id, label: p.label, severity: p.severity });
    }
  }
  return found;
}

export function inferGeneralStatusFromSymptoms(
  symptoms: DetectedSymptom[],
): GeneralStatus | undefined {
  if (symptoms.some((s) => s.severity === 'severe')) return 'Not Feeling Well';
  if (symptoms.length > 0) return 'Mild Discomfort';
  return undefined;
}

export function inferHydrationFromSymptoms(
  symptoms: DetectedSymptom[],
): HydrationStatus | undefined {
  if (symptoms.some((s) => s.id === 'thirst' || s.id === 'dizziness')) {
    return 'Needs Hydration';
  }
  return undefined;
}

/**
 * Private clinical notes for the AI system prompt — Tify must rephrase situationally,
 * never paste this block to the user.
 */
export function buildSymptomContextForPrompt(params: {
  userText: string;
  profile: UserProfile;
}): string {
  const symptoms = detectSymptoms(params.userText);
  if (symptoms.length === 0) return '';

  const fa = getFirstAidGuidanceForConditions(
    params.profile.riskFactors.healthConditions,
    params.profile.riskFactors.healthCondition,
  );
  const conditionTip = conditionHeatReminder(params.profile);
  const conditionSection = fa.conditionBlocks[0]?.sections[0];

  const lines: string[] = [
    '## Latest user message (respond to THIS — unique reply, no template)',
    `"${params.userText.trim()}"`,
    `Symptoms detected: ${symptoms.map((s) => s.label).join(', ')}`,
    'Use these clinical ideas only as background — weave into a natural, situational reply:',
  ];

  for (const symptom of symptoms) {
    const hint = SYMPTOM_CLINICAL_HINTS[symptom.id] ?? SYMPTOM_CLINICAL_HINTS.body_pain;
    lines.push(
      `- ${symptom.label}: possible heat link — ${hint.causes}; care ideas: ${hint.careIdeas.join(', ')}; escalate if: ${hint.watch}`,
    );
  }

  if (conditionTip) lines.push(`User condition angle: ${conditionTip}`);
  if (conditionSection) {
    lines.push(`Condition first-aid note: ${conditionSection.heading} — ${conditionSection.body}`);
  }

  return lines.join('\n');
}
