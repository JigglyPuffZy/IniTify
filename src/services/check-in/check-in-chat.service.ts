import { appConfig } from '@/src/config/app.config';
import {
  tifyGreetingLine,
  type TifyLanguagePreference,
} from '@/src/constants/tify-language-preference';
import {
  ACTIVITY_LEVELS,
  GENERAL_STATUSES,
  HYDRATION_STATUSES,
  type ActivityLevel,
  type GeneralStatus,
  type HydrationStatus,
  type UserProfile,
} from '@/src/models/user';
import type {
  CheckInChatDraft,
  CheckInChatMessage,
  CheckInChatTurnResult,
} from '@/src/models/check-in-chat';
import {
  buildGuidedCheckInGreetingPrompt,
  buildGuidedCheckInReplyPrompt,
  isEmergencyUserMessage,
  shouldOfferNearestHospital,
  TIFY_EMERGENCY_SCRIPT,
} from './tify-system-prompt';
import {
  buildSymptomContextForPrompt,
  detectSymptoms,
  inferGeneralStatusFromSymptoms,
  inferHydrationFromSymptoms,
} from './tify-symptom-guide';
import type { LiveWeatherFacts } from '@/src/utils/live-heat';
import { formatHeatIndexC } from '@/src/utils/live-heat';
import {
  classifyHydrationFromText,
  formatHydrationClassification,
} from '@/src/utils/hydration-volume';
import { logAiResponseTime } from '@/src/utils/network-latency-log';

function withHospitalCta(
  result: CheckInChatTurnResult,
  params: { userText: string; riskLevel: string | null },
): CheckInChatTurnResult {
  if (result.showHospitalCta) return result;
  const symptoms = detectSymptoms(params.userText);
  const show = shouldOfferNearestHospital({
    userText: params.userText,
    riskLevel: params.riskLevel,
    generalStatus: result.draft.generalStatus,
    hydrationStatus: result.draft.hydrationStatus,
    hasSevereSymptoms: symptoms.some((s) => s.severity === 'severe'),
  });
  return show ? { ...result, showHospitalCta: true } : result;
}

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function msg(role: CheckInChatMessage['role'], content: string): CheckInChatMessage {
  return { id: newId(), role, content, createdAt: nowIso() };
}

function normalize(text: string): string {
  return text.trim().toLowerCase();
}

function matchOption<T extends string>(text: string, options: readonly T[]): T | null {
  const n = normalize(text);
  if (!n) return null;

  const exact = options.find((o) => normalize(o) === n);
  if (exact) return exact;

  for (const option of options) {
    if (n.includes(normalize(option))) return option;
  }

  return null;
}

function parseHydration(text: string): {
  status: HydrationStatus;
  liters?: number;
  classificationLine?: string;
} | null {
  const fromVolume = classifyHydrationFromText(text);
  if (fromVolume) {
    return {
      status: fromVolume.status,
      liters: fromVolume.intake.liters,
      classificationLine: formatHydrationClassification(fromVolume.status, fromVolume.intake),
    };
  }

  const n = normalize(text);
  if (/(well|good|fine|okay|ok|hydrated)/.test(n) && !/dehydrat|thirst|need/.test(n)) {
    return { status: 'Well Hydrated' };
  }
  if (/(dehydrat|very thirsty|dizzy|dry mouth)/.test(n)) {
    return { status: 'Dehydrated / Concerning' };
  }
  if (/(thirst|need water|not enough|little water)/.test(n)) {
    return { status: 'Needs Hydration' };
  }
  const matched = matchOption(text, HYDRATION_STATUSES);
  return matched ? { status: matched } : null;
}

function parseActivity(text: string): ActivityLevel | null {
  const n = normalize(text);
  if (/\b(low|rest|sitting|idle)\b/.test(n)) return 'Low';
  if (/\b(high|strenuous|heavy|intense)\b/.test(n)) return 'High';
  if (/\b(moderate|medium|walking|normal)\b/.test(n)) return 'Moderate';
  return matchOption(text, ACTIVITY_LEVELS);
}

function parseFeeling(text: string): GeneralStatus | null {
  const matched = matchOption(text, GENERAL_STATUSES);
  if (matched) return matched;

  const n = normalize(text);
  if (
    /(not feeling well|not well|unwell|sick|bad|awful|terrible|worse|hindi mabuti|masama ang pakiramdam|masama pakiramdam|ayaw maganda|hindi okay|di okay|di mabuti)/.test(
      n,
    )
  ) {
    return 'Not Feeling Well';
  }
  if (
    /(mild discomfort|mild|discomfort|headache|nausea|tired|dizzy|nahihilo|hilo|masakit|sakit ng ulo|pagod|mahina)/.test(
      n,
    )
  ) {
    return 'Mild Discomfort';
  }
  if (
    /\b(well|good|fine|okay|ok|great|better|mabuti|okay ako|maayos|maganda)\b/.test(n) &&
    !/\b(not|hindi|di|ayaw|masama)\b/.test(n)
  ) {
    return 'Feeling Well';
  }
  return null;
}

/** Simple hydration chips for guided check-in (no cup math required). */
const HYDRATION_QUICK_REPLIES: readonly HydrationStatus[] = [
  'Well Hydrated',
  'Needs Hydration',
  'Dehydrated / Concerning',
];

function parseHydrationChoice(text: string): HydrationStatus | null {
  const matched = matchOption(text, HYDRATION_STATUSES);
  if (matched) return matched;
  const parsed = parseHydration(text);
  return parsed?.status ?? null;
}

function isSkipNotes(text: string): boolean {
  const n = normalize(text);
  return /^(no|none|nope|nothing|skip|n\/a|na|all good|i'm good|walang sintomas)$/.test(n);
}

function mergeDraftFromUserText(draft: CheckInChatDraft, userText: string): CheckInChatDraft {
  const text = userText.trim();
  if (!text || isSkipNotes(text)) return draft;

  const hydration = parseHydration(text);
  const activity = parseActivity(text);
  const feeling = parseFeeling(text);
  const symptoms = detectSymptoms(text);

  let notes = draft.notes;
  const isDescriptive =
    symptoms.length > 0 ||
    (text.length > 12 &&
      !hydration &&
      !activity &&
      !feeling &&
      !/^(low|moderate|high)$/i.test(text));

  if (isDescriptive) {
    notes = notes ? `${notes}; ${text}` : text;
  }

  return {
    ...draft,
    // Prefer the latest explicit parse (e.g. "1 cup" → dehydrated) over stale draft values.
    hydrationStatus:
      hydration?.status ??
      draft.hydrationStatus ??
      (symptoms.length ? inferHydrationFromSymptoms(symptoms) : undefined),
    waterIntakeLiters: hydration?.liters ?? draft.waterIntakeLiters,
    activityLevel: activity ?? draft.activityLevel,
    generalStatus:
      feeling ?? draft.generalStatus ?? inferGeneralStatusFromSymptoms(symptoms) ?? undefined,
    notes,
  };
}

function buildSummary(draft: CheckInChatDraft): string {
  const hydrationLine =
    draft.waterIntakeLiters != null
      ? `Hydration: ${draft.hydrationStatus ?? '—'} (${draft.waterIntakeLiters} L today)`
      : `Hydration: ${draft.hydrationStatus ?? '—'}`;
  return [
    `How you feel: ${draft.generalStatus ?? '—'}`,
    `Activity: ${draft.activityLevel ?? '—'}`,
    hydrationLine,
    draft.notes ? `Notes: ${draft.notes}` : null,
  ]
    .filter(Boolean)
    .join('\n');
}

function greetingMessage(
  profile: UserProfile,
  weather: LiveWeatherFacts | null,
  languagePreference: TifyLanguagePreference,
): CheckInChatMessage {
  const firstName = profile.name.split(' ')[0] || profile.name;
  const heat = weather?.heatIndexLabel ?? formatHeatIndexC(weather?.heatIndexC ?? null);
  return msg('assistant', tifyGreetingLine(firstName, heat, languagePreference));
}

function stepQuickReplies(step: CheckInChatDraft['step']): string[] | undefined {
  switch (step) {
    case 'greeting':
    case 'feeling':
      return [...GENERAL_STATUSES];
    case 'activity':
      return [...ACTIVITY_LEVELS];
    case 'hydration':
      return [...HYDRATION_QUICK_REPLIES];
    case 'notes':
      return ['Walang sintomas', 'Sakit ng ulo', 'Nahihilo', 'Masakit katawan'];
    case 'confirm':
      return ['Save check-in', 'Start over'];
    default:
      return undefined;
  }
}

function advanceScriptedTurn(userText: string, draft: CheckInChatDraft): CheckInChatTurnResult {
  const text = userText.trim();
  const step = draft.step === 'greeting' ? 'feeling' : draft.step;

  if (step === 'confirm') {
    if (/start over|restart|reset|ulit/.test(normalize(text))) {
      const reset: CheckInChatDraft = { step: 'feeling' };
      return {
        assistantMessage: msg(
          'assistant',
          'Sige, magsimula ulit tayo. Kamusta ka ngayon sa init?',
        ),
        draft: reset,
        quickReplies: stepQuickReplies('feeling'),
        readyToSave: false,
        usesAi: false,
      };
    }
    if (/save|yes|confirm|ok|okay|done|sige|save check-in/.test(normalize(text))) {
      return {
        assistantMessage: msg(
          'assistant',
          'Saved na ang check-in mo. Stay cool at hydrated!',
        ),
        draft: { ...draft, step: 'done' },
        readyToSave: true,
        usesAi: false,
      };
    }
  }

  if (step === 'feeling') {
    const feeling = parseFeeling(text);
    if (!feeling) {
      return {
        assistantMessage: msg(
          'assistant',
          'Pili lang: Okay ako, Medyo hindi okay, o Hindi maganda ang pakiramdam?',
        ),
        draft: { ...draft, step: 'feeling' },
        quickReplies: stepQuickReplies('feeling'),
        readyToSave: false,
        usesAi: false,
      };
    }
    const ack =
      feeling === 'Feeling Well'
        ? 'Okay — glad you\'re feeling well.'
        : feeling === 'Mild Discomfort'
          ? 'Noted — mild discomfort. Ingat sa init.'
          : 'Salamat sa pag-share. Ingat ka — kung lumala, hanap ng shade at tubig.';
    return {
      assistantMessage: msg(
        'assistant',
        `${ack}\n\nAnong activity level mo ngayon? Low, moderate, o high?`,
      ),
      draft: { ...draft, step: 'activity', generalStatus: feeling },
      quickReplies: stepQuickReplies('activity'),
      readyToSave: false,
      usesAi: false,
    };
  }

  if (step === 'activity') {
    const activity = parseActivity(text);
    if (!activity) {
      return {
        assistantMessage: msg(
          'assistant',
          'Activity mo ngayon — low, moderate, o high?',
        ),
        draft: { ...draft, step: 'activity' },
        quickReplies: stepQuickReplies('activity'),
        readyToSave: false,
        usesAi: false,
      };
    }
    return {
      assistantMessage: msg(
        'assistant',
        `${activity} activity — noted.\n\nKumusta ang hydration mo? Hydrated ka ba, kailangan ng tubig, o dehydrated?`,
      ),
      draft: { ...draft, step: 'hydration', activityLevel: activity },
      quickReplies: stepQuickReplies('hydration'),
      readyToSave: false,
      usesAi: false,
    };
  }

  if (step === 'hydration') {
    const hydration = parseHydrationChoice(text);
    if (!hydration) {
      return {
        assistantMessage: msg(
          'assistant',
          'Pili lang: Hydrated, Kailangan ng tubig, o Dehydrated?',
        ),
        draft: { ...draft, step: 'hydration' },
        quickReplies: stepQuickReplies('hydration'),
        readyToSave: false,
        usesAi: false,
      };
    }
    const parsedVolume = parseHydration(text);
    return {
      assistantMessage: msg(
        'assistant',
        `Hydration: ${hydration}.\n\nMay nararamdaman ka bang sintomas sa init? (headache, nahihilo — o wala)`,
      ),
      draft: {
        ...draft,
        step: 'notes',
        hydrationStatus: hydration,
        waterIntakeLiters: parsedVolume?.liters ?? draft.waterIntakeLiters,
      },
      quickReplies: stepQuickReplies('notes'),
      readyToSave: false,
      usesAi: false,
    };
  }

  if (step === 'notes') {
    const notes = isSkipNotes(text) || /^walang sintomas$/i.test(normalize(text)) ? '' : text;
    const nextDraft: CheckInChatDraft = {
      ...draft,
      step: 'confirm',
      notes: notes || undefined,
    };
    return {
      assistantMessage: msg(
        'assistant',
        `Ito ang summary:\n\n${buildSummary(nextDraft)}\n\nTap Save check-in kapag okay na.`,
      ),
      draft: nextDraft,
      quickReplies: stepQuickReplies('confirm'),
      readyToSave: false,
      usesAi: false,
    };
  }

  return {
    assistantMessage: msg('assistant', 'Ready na — tap Save check-in sa baba.'),
    draft,
    quickReplies: stepQuickReplies('confirm'),
    readyToSave: false,
    usesAi: false,
  };
}

async function callTifyAi(systemPrompt: string, messages: CheckInChatMessage[]): Promise<string | null> {
  const apiKey = appConfig.checkInAiApiKey;
  if (!apiKey) return null;

  const baseUrl = appConfig.checkInAiBaseUrl ?? 'https://api.openai.com/v1';
  const model = appConfig.checkInAiModel ?? 'gpt-4o-mini';
  const startedAt = Date.now();

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.75,
      frequency_penalty: 0.35,
      presence_penalty: 0.25,
      max_tokens: 320,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.slice(-8).map((m) => ({ role: m.role, content: m.content })),
      ],
    }),
  });

  logAiResponseTime({
    endpoint: 'check-in-ai',
    durationMs: Date.now() - startedAt,
    ok: response.ok,
    status: response.status,
  });

  if (!response.ok) return null;

  const json = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = json.choices?.[0]?.message?.content?.trim();
  return text && text.length > 0 ? text : null;
}

async function adaptAssistantReply(params: {
  profile: UserProfile;
  heatIndexC: number | null;
  riskLevel: string | null;
  weather: LiveWeatherFacts | null;
  messages: CheckInChatMessage[];
  userText: string;
  scripted: CheckInChatTurnResult;
  languagePreference: TifyLanguagePreference;
}): Promise<string | null> {
  if (!appConfig.checkInAiApiKey) return null;

  const prompt = buildGuidedCheckInReplyPrompt({
    profile: params.profile,
    heatIndexC: params.weather?.heatIndexC ?? params.heatIndexC,
    riskLevel: params.riskLevel,
    draft: params.scripted.draft,
    userText: params.userText,
    weather: params.weather,
    fallbackReply: params.scripted.assistantMessage.content,
    chatHistory: [
      ...params.messages,
      { id: 'latest-user', role: 'user', content: params.userText, createdAt: nowIso() },
    ],
    languagePreference: params.languagePreference,
  });

  try {
    return await callTifyAi(prompt, params.messages);
  } catch {
    return null;
  }
}

export const checkInChatService = {
  isAiConfigured(): boolean {
    return Boolean(appConfig.checkInAiApiKey);
  },

  getStarterQuickReplies(): string[] {
    return [...GENERAL_STATUSES];
  },

  /** Exposed for tests — applies user text to check-in draft (volume parse wins). */
  applyUserTextToDraft(draft: CheckInChatDraft, userText: string): CheckInChatDraft {
    return mergeDraftFromUserText(draft, userText);
  },

  startConversation(
    profile: UserProfile,
    heatIndexC: number | null,
    weather: LiveWeatherFacts | null = null,
    languagePreference: TifyLanguagePreference = 'taglish',
  ): { messages: CheckInChatMessage[]; draft: CheckInChatDraft; quickReplies: string[] } {
    const draft: CheckInChatDraft = { step: 'feeling' };
    const facts =
      weather ??
      ({
        tempC: null,
        heatIndexC,
        feelsLikeC: null,
        humidity: null,
        conditionText: null,
        tempLabel: null,
        heatIndexLabel: formatHeatIndexC(heatIndexC),
        feelsLikeLabel: null,
      } satisfies LiveWeatherFacts);
    return {
      messages: [greetingMessage(profile, facts, languagePreference)],
      draft,
      quickReplies: stepQuickReplies('feeling') ?? [],
    };
  },

  async enrichGreeting(
    profile: UserProfile,
    heatIndexC: number | null,
    weather: LiveWeatherFacts | null = null,
    languagePreference: TifyLanguagePreference = 'taglish',
  ): Promise<string | null> {
    if (!this.isAiConfigured()) return null;
    const prompt = buildGuidedCheckInGreetingPrompt({
      profile,
      weather,
      heatIndexC,
      languagePreference,
    });
    try {
      return await callTifyAi(prompt, []);
    } catch {
      return null;
    }
  },

  async sendUserMessage(params: {
    profile: UserProfile;
    heatIndexC: number | null;
    riskLevel: string | null;
    draft: CheckInChatDraft;
    messages: CheckInChatMessage[];
    userText: string;
    weather?: LiveWeatherFacts | null;
    languagePreference: TifyLanguagePreference;
  }): Promise<CheckInChatTurnResult> {
    const weather =
      params.weather ??
      ({
        tempC: null,
        heatIndexC: params.heatIndexC,
        feelsLikeC: null,
        humidity: null,
        conditionText: null,
        tempLabel: null,
        heatIndexLabel: formatHeatIndexC(params.heatIndexC),
        feelsLikeLabel: null,
      } satisfies LiveWeatherFacts);

    const ctaParams = { userText: params.userText, riskLevel: params.riskLevel };

    if (isEmergencyUserMessage(params.userText)) {
      let emergencyText = TIFY_EMERGENCY_SCRIPT;
      if (this.isAiConfigured()) {
        const adapted = await adaptAssistantReply({
          profile: params.profile,
          heatIndexC: params.heatIndexC,
          riskLevel: params.riskLevel,
          weather,
          messages: params.messages,
          userText: params.userText,
          scripted: {
            assistantMessage: msg('assistant', TIFY_EMERGENCY_SCRIPT),
            draft: params.draft,
            readyToSave: false,
            usesAi: false,
            quickReplies: stepQuickReplies(params.draft.step),
          },
          languagePreference: params.languagePreference,
        });
        if (adapted) emergencyText = adapted;
      }

      return withHospitalCta(
        {
          assistantMessage: msg('assistant', emergencyText),
          draft: params.draft,
          readyToSave: false,
          usesAi: this.isAiConfigured(),
          quickReplies: stepQuickReplies(params.draft.step),
          showHospitalCta: true,
        },
        ctaParams,
      );
    }

    const draftWithUser = mergeDraftFromUserText(params.draft, params.userText);
    const normalizedStep = draftWithUser.step === 'greeting' ? 'feeling' : draftWithUser.step;
    const scripted = advanceScriptedTurn(params.userText, {
      ...draftWithUser,
      step: normalizedStep,
    });

    let assistantContent = scripted.assistantMessage.content;
    let usesAi = false;

    if (this.isAiConfigured()) {
      const adapted = await adaptAssistantReply({
        profile: params.profile,
        heatIndexC: params.heatIndexC,
        riskLevel: params.riskLevel,
        weather,
        messages: params.messages,
        userText: params.userText,
        scripted,
        languagePreference: params.languagePreference,
      });
      if (adapted) {
        assistantContent = adapted;
        usesAi = true;
      }
    }

    const result: CheckInChatTurnResult = {
      ...scripted,
      assistantMessage: msg('assistant', assistantContent),
      usesAi,
    };

    return withHospitalCta(result, ctaParams);
  },
};
