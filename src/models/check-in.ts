import type { ActivityLevel, HydrationStatus, GeneralStatus } from '@/src/models/user';

export type ReminderFrequency =
  | 'every_2h'
  | 'every_4h'
  | 'every_6h'
  | 'every_12h'
  | 'daily'
  | 'custom'
  | 'disabled';

export interface HealthCheckIn {
  id: string;
  hydrationStatus: HydrationStatus;
  activityLevel: ActivityLevel;
  generalStatus: GeneralStatus;
  notes?: string | null;
  checkInTime: string;
  createdAt: string;
}

export interface ReminderSettings {
  remindersEnabled: boolean;
  frequency: ReminderFrequency;
  /** Used when frequency === 'custom' (minutes between reminders) */
  customIntervalMinutes: number;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  lastReminderSentAt: string | null;
  nextReminderAt: string | null;
  scheduledNotificationId: string | null;
  updatedAt: string;
}

export interface WeatherSafetyAcknowledgment {
  acknowledgedAt: string;
  heatIndexC: number | null;
  riskLevel: string | null;
}

export const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  remindersEnabled: true,
  frequency: 'every_6h',
  customIntervalMinutes: 360,
  quietHoursEnabled: true,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
  lastReminderSentAt: null,
  nextReminderAt: null,
  scheduledNotificationId: null,
  updatedAt: new Date().toISOString(),
};

export const REMINDER_FREQUENCY_OPTIONS: {
  value: ReminderFrequency;
  label: string;
  minutes: number;
}[] = [
  { value: 'every_2h', label: 'Every 2 hours', minutes: 120 },
  { value: 'every_4h', label: 'Every 4 hours', minutes: 240 },
  { value: 'every_6h', label: 'Every 6 hours', minutes: 360 },
  { value: 'every_12h', label: 'Every 12 hours', minutes: 720 },
  { value: 'daily', label: 'Once a day', minutes: 1440 },
  { value: 'custom', label: 'Custom', minutes: 0 },
  { value: 'disabled', label: 'Disable reminders', minutes: 0 },
];

export function frequencyToMinutes(settings: ReminderSettings): number {
  if (settings.frequency === 'disabled') return 0;
  if (settings.frequency === 'custom') {
    return Math.max(30, settings.customIntervalMinutes);
  }
  const found = REMINDER_FREQUENCY_OPTIONS.find((o) => o.value === settings.frequency);
  return found?.minutes ?? 360;
}
