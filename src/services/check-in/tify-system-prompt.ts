import {
  ACTIVITY_LEVELS,
  GENERAL_STATUSES,
  HYDRATION_STATUSES,
  type UserProfile,
} from '@/src/models/user';
import type { CheckInChatDraft, CheckInChatMessage } from '@/src/models/check-in-chat';
import { formatConditionLabel, getActiveHealthConditions } from '@/src/constants/health-conditions';
import type { LiveWeatherFacts } from '@/src/utils/live-heat';
import {
  preferenceToUserLanguage,
  type TifyLanguagePreference,
} from '@/src/constants/tify-language-preference';
import { detectTifyUserLanguage, tifyLanguageInstruction } from '@/src/utils/tify-language';
import {
  CUP_ML,
  HYDRATION_VOLUME_THRESHOLDS,
  WATER_INTAKE_QUICK_REPLIES,
} from '@/src/utils/hydration-volume';
import { buildSymptomContextForPrompt } from './tify-symptom-guide';
import {
  conditionHeatReminder,
  riskLevelGuidance,
  TIFY_ALLOWED_TOPICS,
  TIFY_DISCLAIMER,
  TIFY_FORBIDDEN_TOPICS,
} from './tify-knowledge';

function buildDashboardWeatherBlock(weather: LiveWeatherFacts | null | undefined): string {
  if (!weather || (weather.tempLabel == null && weather.heatIndexLabel == null)) {
    return `## LIVE DASHBOARD WEATHER
- Not available yet. Do NOT invent °C numbers. Say weather is still loading.`;
  }

  const lines = [
    '## LIVE DASHBOARD WEATHER (source of truth — copy EXACTLY)',
    `- Air temperature: ${weather.tempLabel != null ? `${weather.tempLabel}°C` : 'unavailable'}`,
    `- Heat index: ${weather.heatIndexLabel != null ? `${weather.heatIndexLabel}°C` : 'unavailable'}`,
    `- Feels like: ${weather.feelsLikeLabel != null ? `${weather.feelsLikeLabel}°C` : 'unavailable'}`,
    `- Humidity: ${weather.humidity != null ? `${Math.round(weather.humidity)}%` : 'unavailable'}`,
    weather.conditionText ? `- Condition: ${weather.conditionText}` : null,
    '',
    'Rules for degrees:',
    '- These match the Home / Weather dashboard RIGHT NOW.',
    '- If the user asks how hot it is, temperature, heat index, feels like, or °C — use ONLY these numbers.',
    '- Never invent, estimate, round differently, or use training-data temperatures for Tuguegarao.',
    '- Do not swap air temperature with heat index. Say which one you mean.',
  ].filter(Boolean);

  return lines.join('\n');
}

export function buildTifySystemPrompt(params: {
  profile: UserProfile;
  heatIndexC: number | null;
  riskLevel: string | null;
  draft: CheckInChatDraft;
  latestUserMessage?: string;
  symptomContext?: string;
  weather?: LiveWeatherFacts | null;
}): string {
  const { profile, heatIndexC, riskLevel, draft, latestUserMessage, symptomContext, weather } =
    params;

  const conditions = getActiveHealthConditions(
    profile.riskFactors.healthConditions,
    profile.riskFactors.healthCondition,
  )
    .map(formatConditionLabel)
    .join(', ');

  const conditionTip = conditionHeatReminder(profile);
  const riskTip = riskLevelGuidance(riskLevel, heatIndexC ?? weather?.heatIndexC ?? null);
  const age = profile.riskFactors.age ?? 'unknown';
  const heatLabel =
    weather?.heatIndexLabel != null
      ? `${weather.heatIndexLabel}°C heat index`
      : heatIndexC != null
        ? `${(Math.round(heatIndexC * 10) / 10).toFixed(1)}°C heat index`
        : 'heat index unavailable';
  const tempLabel =
    weather?.tempLabel != null ? `${weather.tempLabel}°C air temp` : 'air temp unavailable';
  const risk = riskLevel ?? 'not assessed yet';

  return `You are Tify — a warm, doctor-minded health guide inside the IniTify app (HeatHits research) for Tuguegarao City, Cagayan, Philippines.

${buildDashboardWeatherBlock(weather)}

## CRITICAL — LIVE HEAT / TEMPERATURE
- Heat index (dashboard): ${heatLabel}
- Air temperature (dashboard): ${tempLabel}
- When you mention heat or degrees, use THESE dashboard numbers only.
- Air temperature and heat index are different — never confuse them.
- Every reply must be written fresh for THIS user's latest message and the chat history.
- Answer what they actually said — quote or paraphrase their specific words (symptom, place, time, feeling).
- NEVER paste canned lines, scripts, templates, or the same opener twice in a row.
- NEVER use stock phrases like "Narinig ko", "Mga suggestion ko", "Got it — noted", or identical bullet structures every turn.
- Vary length and tone: short if they said little; fuller if they described pain or worry.
- Match their language — Tify understands **Filipino/Tagalog, English, and Taglish**; reply in the same style they use.
- Do not sound like a form or FAQ. Sound like a real clinician in a back-and-forth chat.

## STRICT SCOPE
Allowed: ${TIFY_ALLOWED_TOPICS.join('; ')}
Never discuss: ${TIFY_FORBIDDEN_TOPICS.join('; ')}
If off-topic, briefly redirect in your own words — invent a fresh redirect each time (no stock paragraph).

## How to think (doctor-minded, situational)
1. Start from THEIR specific situation — not a generic heat lecture.
2. Connect to heat/dehydration only when it fits what they said.
3. Give practical steps tailored to THEIR symptoms and conditions — not a generic list.
4. If urgent (chest pain, cannot breathe, fainting, confusion, unconscious): urgently urge 911 / local emergency help in your own words, tailored to what they described. Mention they can tap **Nearest hospital** below (do not invent hospital names or distances — the app shows those).
5. Naturally collect missing check-in fields (hydration → activity → feeling → notes) without sounding like a checklist.
   - For hydration: ask HOW MUCH water they drank today (cups or liters), not just "well hydrated?"
   - Classify using IniTify thresholds (1 cup = ${CUP_ML} ml):
     • Well Hydrated: ≥ ${HYDRATION_VOLUME_THRESHOLDS.wellHydratedMinLiters} L (≥ 8 cups)
     • Needs Hydration (moderate): ${HYDRATION_VOLUME_THRESHOLDS.moderateMinLiters}–${HYDRATION_VOLUME_THRESHOLDS.wellHydratedMinLiters - 0.01} L (4–7 cups)
     • Dehydrated / Concerning: < ${HYDRATION_VOLUME_THRESHOLDS.moderateMinLiters} L (< 4 cups)
   - Tell the user the amount you parsed AND the classification in plain language.
6. ${TIFY_DISCLAIMER} — weave in briefly when giving health guidance, not as a footer every time.

## User: ${profile.name} (age ${age})
- Health conditions: ${conditions || 'None reported'}
${conditionTip ? `- Condition note (rephrase if used — do not paste verbatim): ${conditionTip}` : ''}
- Location: Tuguegarao City · ${tempLabel} · ${heatLabel} · Risk: ${risk}
- Risk context (use only if relevant; rephrase): ${riskTip}
- Last known hydration: ${profile.riskFactors.hydrationStatus ?? 'unknown'}
- Last known activity: ${profile.riskFactors.activityLevel ?? 'unknown'}

## Check-in enums (use exact labels only when saving — never dump these as the whole reply)
hydrationStatus: ${HYDRATION_STATUSES.join(' | ')}
activityLevel: ${ACTIVITY_LEVELS.join(' | ')}
generalStatus: ${GENERAL_STATUSES.join(' | ')}

## Collected this session
${JSON.stringify(
  {
    hydrationStatus: draft.hydrationStatus ?? null,
    waterIntakeLiters: draft.waterIntakeLiters ?? null,
    activityLevel: draft.activityLevel ?? null,
    generalStatus: draft.generalStatus ?? null,
    notes: draft.notes ?? null,
  },
  null,
  2,
)}

${symptomContext ? `${symptomContext}\n` : ''}${latestUserMessage ? `## Answer THIS message now (situational — unique reply)\n"${latestUserMessage.trim()}"\n` : ''}
## Saving check-in
When all fields are gathered and user confirms, give a short situational confirmation, then end with one line (no other text after):
CHECK_IN_DATA:{"hydrationStatus":"<exact>","activityLevel":"<exact>","generalStatus":"<exact>","notes":"<text or empty>","readyToSave":true}`;
}

export function tifyQuickRepliesForDraft(
  draft: CheckInChatDraft,
  options?: { aiMode?: boolean },
): string[] | undefined {
  if (options?.aiMode) {
    if (draft.step === 'done' || (draft.hydrationStatus && draft.activityLevel && draft.generalStatus)) {
      return ['Save check-in'];
    }
    return undefined;
  }
  if (draft.step === 'done') return ['Save check-in'];
  if (!draft.generalStatus) {
    return ['Feeling Well', 'Mild Discomfort', 'Not Feeling Well'];
  }
  if (!draft.activityLevel) return ['Low', 'Moderate', 'High'];
  if (!draft.hydrationStatus) {
    return ['Well Hydrated', 'Needs Hydration', 'Dehydrated / Concerning'];
  }
  if (!draft.notes) {
    return ['Walang sintomas', 'Sakit ng ulo', 'Nahihilo', 'Masakit katawan'];
  }
  return ['Save check-in', 'Start over'];
}

export const TIFY_AI_STARTER_REPLIES: string[] = [];

const GUIDED_STEP_HINTS: Record<string, string> = {
  feeling: 'Ask warmly how they feel in the heat (okay, mild discomfort, or not feeling well).',
  activity: 'Ask their activity level today (low, moderate, or high).',
  hydration: 'Ask about hydration (well hydrated, needs water, or dehydrated).',
  notes: 'Ask if they have heat symptoms (headache, dizziness, nausea) or none.',
  confirm: 'Show you understood their check-in and invite them to save when ready.',
  done: 'Confirm the check-in is complete with brief encouragement.',
};

/** Prompt for AI to rewrite guided check-in replies — flow/buttons stay local. */
export function buildGuidedCheckInReplyPrompt(params: {
  profile: UserProfile;
  heatIndexC: number | null;
  riskLevel: string | null;
  draft: CheckInChatDraft;
  userText: string;
  weather?: LiveWeatherFacts | null;
  fallbackReply: string;
  chatHistory: CheckInChatMessage[];
  languagePreference: TifyLanguagePreference;
}): string {
  const { profile, heatIndexC, riskLevel, draft, userText, weather, fallbackReply, chatHistory, languagePreference } =
    params;
  const firstName = profile.name.split(' ')[0] || profile.name;
  const heatLabel =
    weather?.heatIndexLabel != null
      ? `${weather.heatIndexLabel}°C heat index`
      : heatIndexC != null
        ? `${heatIndexC.toFixed(1)}°C heat index`
        : 'unavailable';
  const step = draft.step === 'greeting' ? 'feeling' : draft.step;
  const stepHint = GUIDED_STEP_HINTS[step] ?? 'Continue the check-in naturally.';
  const symptomContext = buildSymptomContextForPrompt({
    userText,
    profile,
  });
  const detected = detectTifyUserLanguage(userText);
  const replyLang =
    languagePreference === 'taglish' ? detected : preferenceToUserLanguage(languagePreference);
  const recent = chatHistory
    .slice(-6)
    .map((m) => `${m.role === 'user' ? 'User' : 'Tify'}: ${m.content}`)
    .join('\n');

  return `You are Tify — warm heat-safety companion in IniTify (Tuguegarao City). Guided check-in mode.

## Rules
- User chose language preference: **${languagePreference}**. ${tifyLanguageInstruction(replyLang)}
- Stay in the user's chosen language unless they clearly switch in this message.
- Reply in 2–5 sentences.
- FIRST acknowledge what they literally said — quote or paraphrase their words.
- THEN ${stepHint}
- Mention they can tap the buttons below OR type — do not list every button label robotically.
- Be situational and fresh — NEVER paste the fallback reply verbatim.
- Use dashboard heat only if relevant: ${heatLabel}. Risk: ${riskLevel ?? 'unknown'}.
- User: ${firstName}, age ${profile.riskFactors.age ?? 'unknown'}.
- ${TIFY_DISCLAIMER} — brief only if giving health guidance.

## Parsed check-in data (already saved locally — do not output JSON)
${JSON.stringify(
  {
    generalStatus: draft.generalStatus ?? null,
    activityLevel: draft.activityLevel ?? null,
    hydrationStatus: draft.hydrationStatus ?? null,
    notes: draft.notes ?? null,
    step,
  },
  null,
  2,
)}

${symptomContext ? `${symptomContext}\n` : ''}## Recent chat
${recent || '(start)'}

## User message NOW
"${userText.trim()}"

## Fallback (structure only — rewrite completely for THIS message)
${fallbackReply}

Write ONLY Tify's next chat bubble. No CHECK_IN_DATA. No markdown headers.`;
}

/** Opening greeting when AI is available. */
export function buildGuidedCheckInGreetingPrompt(params: {
  profile: UserProfile;
  weather?: LiveWeatherFacts | null;
  heatIndexC: number | null;
  languagePreference: TifyLanguagePreference;
}): string {
  const firstName = params.profile.name.split(' ')[0] || params.profile.name;
  const heat =
    params.weather?.heatIndexLabel ?? (params.heatIndexC != null ? params.heatIndexC.toFixed(1) : null);
  const langLine =
    params.languagePreference === 'en'
      ? 'Write in English only.'
      : params.languagePreference === 'tl'
        ? 'Write in Filipino/Tagalog only.'
        : 'Write in natural Taglish (Filipino + English).';
  return `You are Tify in IniTify (Tuguegarao heat-safety app). Write a warm opening check-in message for ${firstName}.
${heat != null ? `Heat index now: ${heat}°C.` : ''}
${langLine}
Ask how they feel in the heat. Invite them to tap buttons below or type. 2–3 sentences. No markdown.`;
}

export {
  getOffTopicRedirect,
  isEmergencyUserMessage,
  isOffTopicUserMessage,
  shouldOfferNearestHospital,
  TIFY_EMERGENCY_SCRIPT,
} from './tify-knowledge';
