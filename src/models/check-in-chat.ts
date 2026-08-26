import type { ActivityLevel, GeneralStatus, HydrationStatus } from '@/src/models/user';

export type CheckInChatRole = 'assistant' | 'user';

export interface CheckInChatMessage {
  id: string;
  role: CheckInChatRole;
  content: string;
  createdAt: string;
}

export type CheckInChatStep =
  | 'greeting'
  | 'hydration'
  | 'activity'
  | 'feeling'
  | 'notes'
  | 'confirm'
  | 'done';

export interface CheckInChatDraft {
  step: CheckInChatStep;
  hydrationStatus?: HydrationStatus;
  /** Reported fluid intake today (liters), when user gives cups/ml/L. */
  waterIntakeLiters?: number;
  activityLevel?: ActivityLevel;
  generalStatus?: GeneralStatus;
  notes?: string;
}

export interface CheckInChatTurnResult {
  assistantMessage: CheckInChatMessage;
  draft: CheckInChatDraft;
  quickReplies?: string[];
  readyToSave: boolean;
  usesAi: boolean;
  /** Show nearest-hospital CTA when emergency / severe / high heat + unwell. */
  showHospitalCta?: boolean;
}
