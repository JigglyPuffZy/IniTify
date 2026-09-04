import { appConfig } from '@/src/config/app.config';
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
  buildTifySystemPrompt,
  isEmergencyUserMessage,
  shouldOfferNearestHospital,
  TIFY_EMERGENCY_SCRIPT,
  tifyQuickRepliesForDraft,
} from './tify-system-prompt';
import {
  buildSymptomContextForPrompt,
  detectSymptoms,
  inferGeneralStatusFromSymptoms,
  inferHydrationFromSymptoms,
} from './tify-symptom-guide';
import type { LiveWeatherFacts } from '@/src/utils/live-heat';
import { formatHeatIndexC, formatTempC } from '@/src/utils/live-heat';
import {
  classifyHydrationFromText,
  formatHydrationClassification,
  WATER_INTAKE_QUICK_REPLIES,
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
  const n = normalize(text);
  if (/(not well|unwell|sick|bad|awful|terrible|worse)/.test(n)) return 'Not Feeling Well';
  if (/(mild|discomfort|headache|nausea|tired|dizzy)/.test(n)) return 'Mild Discomfort';
  if (/(well|good|fine|okay|ok|great|better)/.test(n)) return 'Feeling Well';
  return matchOption(text, GENERAL_STATUSES);
}

function isSkipNotes(text: string): boolean {
  const n = normalize(text);
  return /^(no|none|nope|nothing|skip|n\/a|na|all good|i'm good)$/.test(n);
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

function buildAiGreeting(profile: UserProfile, weather: LiveWeatherFacts | null): string {
  const firstName = profile.name.split(' ')[0] || profile.name;
  const heat = weather?.heatIndexLabel ?? formatHeatIndexC(weather?.heatIndexC ?? null);
  const temp = weather?.tempLabel ?? formatTempC(weather?.tempC ?? null);
  if (heat != null && temp != null) {
    return `Hi ${firstName}. I'm Tify, your personal AI companion for heat safety. Right now in Tuguegarao it's ${temp}°C (air) with a heat index of ${heat}°C — same as your Home dashboard.`;
  }
  if (heat != null) {
    return `Hi ${firstName}. I'm Tify, your personal AI companion for heat safety. Current heat index is ${heat}°C (same as your Home dashboard).`;
  }
  return `Hi ${firstName}. I'm Tify, your personal AI companion for heat safety.`;
}

function buildSummary(draft: CheckInChatDraft): string {
  const hydrationLine =
    draft.waterIntakeLiters != null
      ? `Hydration: ${draft.hydrationStatus ?? '—'} (${draft.waterIntakeLiters} L today)`
      : `Hydration: ${draft.hydrationStatus ?? '—'}`;
  return [
    hydrationLine,
    `Activity: ${draft.activityLevel ?? '—'}`,
    `How you feel: ${draft.generalStatus ?? '—'}`,
    draft.notes ? `Notes: ${draft.notes}` : null,
  ]
    .filter(Boolean)
    .join('\n');
}

function greetingMessage(
  profile: UserProfile,
  weather: LiveWeatherFacts | null,
  usesAi: boolean,
): CheckInChatMessage {
  const firstName = profile.name.split(' ')[0] || profile.name;
  const intro = usesAi
    ? buildAiGreeting(profile, weather)
    : `Hi ${firstName}. I'm Tify, your personal AI companion for heat safety.`;

  const waterPrompt =
    '\n\nHow much water have you drunk so far today? Tell me in cups or liters (e.g. 4 cups or 1 L).';
  return msg('assistant', intro + waterPrompt);
}

function stepQuickReplies(step: CheckInChatDraft['step']): string[] | undefined {
  switch (step) {
    case 'hydration':
      return [...WATER_INTAKE_QUICK_REPLIES];
    case 'activity':
      return [...ACTIVITY_LEVELS];
    case 'feeling':
      return [...GENERAL_STATUSES];
    case 'notes':
      return ['No symptoms', 'Sakit ng ulo', 'Nahihilo', 'Masakit katawan'];
    case 'confirm':
      return ['Save check-in', 'Start over'];
    default:
      return undefined;
  }
}

function advanceScriptedTurn(userText: string, draft: CheckInChatDraft): CheckInChatTurnResult {
  const text = userText.trim();

  if (draft.step === 'confirm') {
    if (/start over|restart|reset/.test(normalize(text))) {
      const reset: CheckInChatDraft = { step: 'hydration' };
      return {
        assistantMessage: msg(
          'assistant',
          "No problem — let's start fresh. How much water have you drunk so far today? (cups or liters)",
        ),
        draft: reset,
        quickReplies: stepQuickReplies('hydration'),
        readyToSave: false,
        usesAi: false,
      };
    }
    if (/save|yes|confirm|ok|okay|done/.test(normalize(text))) {
      return {
        assistantMessage: msg(
          'assistant',
          'Perfect — saving your check-in now. Stay cool and hydrated!',
        ),
        draft: { ...draft, step: 'done' },
        readyToSave: true,
        usesAi: false,
      };
    }
  }

  if (draft.step === 'greeting' || draft.step === 'hydration') {
    const hydration = parseHydration(text);
    if (!hydration) {
      return {
        assistantMessage: msg(
          'assistant',
          "I didn't quite catch that. How much water have you had today? Example: 4 cups (1 L) or 2 liters.",
        ),
        draft: { ...draft, step: 'hydration' },
        quickReplies: stepQuickReplies('hydration'),
        readyToSave: false,
        usesAi: false,
      };
    }
    const hydrationAck = hydration.classificationLine
      ? hydration.classificationLine
      : `Got it — ${hydration.status.toLowerCase()}.`;
    return {
      assistantMessage: msg(
        'assistant',
        `${hydrationAck}\n\nWhat activity level have you had today?`,
      ),
      draft: {
        ...draft,
        step: 'activity',
        hydrationStatus: hydration.status,
        waterIntakeLiters: hydration.liters,
      },
      quickReplies: stepQuickReplies('activity'),
      readyToSave: false,
      usesAi: false,
    };
  }

  if (draft.step === 'activity') {
    const activity = parseActivity(text);
    if (!activity) {
      return {
        assistantMessage: msg(
          'assistant',
          'Was your activity mostly low, moderate, or high today?',
        ),
        draft,
        quickReplies: stepQuickReplies('activity'),
        readyToSave: false,
        usesAi: false,
      };
    }
    return {
      assistantMessage: msg(
        'assistant',
        `${activity} activity — noted.\n\nHow are you feeling overall right now?`,
      ),
      draft: { ...draft, step: 'feeling', activityLevel: activity },
      quickReplies: stepQuickReplies('feeling'),
      readyToSave: false,
      usesAi: false,
    };
  }

  if (draft.step === 'feeling') {
    const feeling = parseFeeling(text);
    if (!feeling) {
      return {
        assistantMessage: msg(
          'assistant',
          'Are you feeling well, mild discomfort, or not feeling well?',
        ),
        draft,
        quickReplies: stepQuickReplies('feeling'),
        readyToSave: false,
        usesAi: false,
      };
    }
    return {
      assistantMessage: msg(
        'assistant',
        `Thanks for sharing.\n\nAno ang masakit o anong nararamdaman mo sa init? (headache, dizziness, nausea — or say "none")`,
      ),
      draft: { ...draft, step: 'notes', generalStatus: feeling },
      quickReplies: stepQuickReplies('notes'),
      readyToSave: false,
      usesAi: false,
    };
  }

  if (draft.step === 'notes') {
    const notes = isSkipNotes(text) ? '' : text;
    const nextDraft: CheckInChatDraft = {
      ...draft,
      step: 'confirm',
      notes: notes || undefined,
    };
    return {
      assistantMessage: msg(
        'assistant',
        `Here's your check-in summary:\n\n${buildSummary(nextDraft)}\n\nTap Save check-in when this looks right, or Start over to redo.`,
      ),
      draft: nextDraft,
      quickReplies: stepQuickReplies('confirm'),
      readyToSave: false,
      usesAi: false,
    };
  }

  return {
    assistantMessage: msg('assistant', 'Your check-in is ready — tap Save check-in below.'),
    draft,
    quickReplies: stepQuickReplies('confirm'),
    readyToSave: false,
    usesAi: false,
  };
}

const CHECK_IN_DATA_RE = /CHECK_IN_DATA:\s*(\{[\s\S]*?\})/i;

function parseAiExtract(content: string): {
  display: string;
  data: Partial<CheckInChatDraft> | null;
} {
  const match = content.match(CHECK_IN_DATA_RE);
  if (!match) {
    return { display: content.trim(), data: null };
  }

  const display = content.replace(CHECK_IN_DATA_RE, '').trim();
  try {
    const raw = JSON.parse(match[1]) as Record<string, string | boolean>;
    const draft: Partial<CheckInChatDraft> = {};
    if (raw.hydrationStatus) draft.hydrationStatus = raw.hydrationStatus as HydrationStatus;
    if (raw.activityLevel) draft.activityLevel = raw.activityLevel as ActivityLevel;
    if (raw.generalStatus) draft.generalStatus = raw.generalStatus as GeneralStatus;
    if (raw.notes) draft.notes = String(raw.notes);
    if (raw.readyToSave === true || raw.readyToSave === 'true') draft.step = 'done';
    return { display: display || 'Thanks — I updated your check-in.', data: draft };
  } catch {
    return { display: content.trim(), data: null };
  }
}

function buildAiSystemPrompt(
  profile: UserProfile,
  heatIndexC: number | null,
  riskLevel: string | null,
  draft: CheckInChatDraft,
  userText: string,
  weather: LiveWeatherFacts | null,
): string {
  return buildTifySystemPrompt({
    profile,
    heatIndexC: weather?.heatIndexC ?? heatIndexC,
    riskLevel,
    draft,
    latestUserMessage: userText,
    symptomContext: buildSymptomContextForPrompt({ userText, profile }),
    weather,
  });
}

async function callCheckInAi(params: {
  profile: UserProfile;
  heatIndexC: number | null;
  riskLevel: string | null;
  draft: CheckInChatDraft;
  messages: CheckInChatMessage[];
  userText: string;
  weather: LiveWeatherFacts | null;
}): Promise<string | null> {
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
      temperature: 0.7,
      frequency_penalty: 0.4,
      presence_penalty: 0.3,
      max_tokens: 720,
      messages: [
        {
          role: 'system',
          content: buildAiSystemPrompt(
            params.profile,
            params.heatIndexC,
            params.riskLevel,
            params.draft,
            params.userText,
            params.weather,
          ),
        },
        ...params.messages.map((m) => ({ role: m.role, content: m.content })),
      ],
    }),
  });
  logAiResponseTime({
    endpoint: 'check-in-ai',
    durationMs: Date.now() - startedAt,
    ok: response.ok,
    status: response.status,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(errText || `AI request failed (${response.status})`);
  }

  const json = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return json.choices?.[0]?.message?.content?.trim() ?? null;
}

export const checkInChatService = {
  isAiConfigured(): boolean {
    return Boolean(appConfig.checkInAiApiKey);
  },

  getStarterQuickReplies(): string[] {
    return [...WATER_INTAKE_QUICK_REPLIES];
  },

  /** Exposed for tests — applies user text to check-in draft (volume parse wins). */
  applyUserTextToDraft(draft: CheckInChatDraft, userText: string): CheckInChatDraft {
    return mergeDraftFromUserText(draft, userText);
  },

  startConversation(
    profile: UserProfile,
    heatIndexC: number | null,
    weather: LiveWeatherFacts | null = null,
  ): { messages: CheckInChatMessage[]; draft: CheckInChatDraft } {
    const usesAi = this.isAiConfigured();
    const draft: CheckInChatDraft = { step: usesAi ? 'greeting' : 'hydration' };
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
      messages: [greetingMessage(profile, facts, usesAi)],
      draft,
    };
  },

  async sendUserMessage(params: {
    profile: UserProfile;
    heatIndexC: number | null;
    riskLevel: string | null;
    draft: CheckInChatDraft;
    messages: CheckInChatMessage[];
    userText: string;
    weather?: LiveWeatherFacts | null;
  }): Promise<CheckInChatTurnResult> {
    const history = params.messages;
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

    // No AI key: keep a clear fixed emergency line + hospital CTA.
    // With AI: let the model write a situational urgent reply (still show hospital CTA).
    if (!this.isAiConfigured() && isEmergencyUserMessage(params.userText)) {
      return withHospitalCta(
        {
          assistantMessage: msg('assistant', TIFY_EMERGENCY_SCRIPT),
          draft: params.draft,
          readyToSave: false,
          usesAi: false,
          quickReplies: undefined,
          showHospitalCta: true,
        },
        ctaParams,
      );
    }

    if (this.isAiConfigured()) {
      const draftWithUser = mergeDraftFromUserText(params.draft, params.userText);

      try {
        const aiContent = await callCheckInAi({
          profile: params.profile,
          heatIndexC: weather.heatIndexC ?? params.heatIndexC,
          riskLevel: params.riskLevel,
          draft: draftWithUser,
          messages: history,
          userText: params.userText,
          weather,
        });

        if (aiContent) {
          const { display, data } = parseAiExtract(aiContent);
          const merged: CheckInChatDraft = {
            ...draftWithUser,
            // Local volume/keyword parse wins over AI JSON — keeps Tify aligned with saved status.
            hydrationStatus: draftWithUser.hydrationStatus ?? data?.hydrationStatus,
            activityLevel: draftWithUser.activityLevel ?? data?.activityLevel,
            generalStatus: draftWithUser.generalStatus ?? data?.generalStatus,
            notes: draftWithUser.notes ?? data?.notes,
            step: data?.step ?? draftWithUser.step,
          };

          const readyToSave =
            merged.step === 'done' ||
            Boolean(
              merged.hydrationStatus &&
                merged.activityLevel &&
                merged.generalStatus &&
                /readyToSave["']?\s*:\s*true/i.test(aiContent),
            );

          if (readyToSave) merged.step = 'done';

          return withHospitalCta(
            {
              assistantMessage: msg('assistant', display),
              draft: merged,
              readyToSave,
              usesAi: true,
              quickReplies: readyToSave
                ? ['Save check-in']
                : tifyQuickRepliesForDraft(merged, { aiMode: true }),
              showHospitalCta: isEmergencyUserMessage(params.userText) ? true : undefined,
            },
            ctaParams,
          );
        }
      } catch {
        const fallback = advanceScriptedTurn(params.userText, {
          ...draftWithUser,
          step: draftWithUser.hydrationStatus ? draftWithUser.step : 'hydration',
        });
        return withHospitalCta(
          {
            ...fallback,
            assistantMessage: msg(
              'assistant',
              "I'm having trouble reaching the AI right now — let's continue with quick options instead.\n\n" +
                fallback.assistantMessage.content,
            ),
            usesAi: false,
          },
          ctaParams,
        );
      }

      const scripted = advanceScriptedTurn(params.userText, {
        ...draftWithUser,
        step: draftWithUser.hydrationStatus ? draftWithUser.step : 'hydration',
      });
      return withHospitalCta({ ...scripted, usesAi: false }, ctaParams);
    }

    const draftWithUser = mergeDraftFromUserText(params.draft, params.userText);
    return withHospitalCta(
      advanceScriptedTurn(params.userText, {
        ...draftWithUser,
        step: draftWithUser.hydrationStatus ? draftWithUser.step : 'hydration',
      }),
      ctaParams,
    );
  },
};
