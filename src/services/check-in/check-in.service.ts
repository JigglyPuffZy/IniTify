import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  HealthCheckIn,
  ReminderSettings,
  WeatherSafetyAcknowledgment,
} from '@/src/models/check-in';
import { DEFAULT_REMINDER_SETTINGS } from '@/src/models/check-in';
import type { UserProfile } from '@/src/models/user';
import { hydrationStatusToDb } from '@/src/models/user';
import { databaseService } from '@/src/services/database/database.service';

const LEGACY_KEYS = {
  checkIns: '@initify/check-ins',
  reminderSettings: '@initify/reminder-settings',
  weatherAck: '@initify/weather-safety-ack',
  weatherAlertSent: '@initify/weather-alert-sent',
} as const;

function keysForUser(userId: string) {
  return {
    checkIns: `@initify/check-ins:${userId}`,
    reminderSettings: `@initify/reminder-settings:${userId}`,
    weatherAck: `@initify/weather-safety-ack:${userId}`,
    weatherAlertSent: `@initify/weather-alert-sent:${userId}`,
  };
}

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

async function readJson<T>(key: string, fallback: T): Promise<T> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

/** Drop unscoped legacy keys so Account A data is never shown to Account B. */
async function discardLegacySharedCheckInData(): Promise<void> {
  await AsyncStorage.multiRemove(Object.values(LEGACY_KEYS));
}

export const checkInService = {
  async getCheckIns(userId: string): Promise<HealthCheckIn[]> {
    await discardLegacySharedCheckInData();
    const list = await readJson<HealthCheckIn[]>(keysForUser(userId).checkIns, []);
    return list.sort(
      (a, b) => new Date(b.checkInTime).getTime() - new Date(a.checkInTime).getTime(),
    );
  },

  async getLastCheckIn(userId: string): Promise<HealthCheckIn | null> {
    const list = await this.getCheckIns(userId);
    return list[0] ?? null;
  },

  async saveCheckIn(
    userId: string,
    profile: UserProfile,
    input: Omit<HealthCheckIn, 'id' | 'checkInTime' | 'createdAt'>,
  ): Promise<HealthCheckIn> {
    const now = new Date().toISOString();
    const record: HealthCheckIn = {
      id: newId(),
      ...input,
      checkInTime: now,
      createdAt: now,
    };
    const key = keysForUser(userId).checkIns;
    const existing = await readJson<HealthCheckIn[]>(key, []);
    const next = [record, ...existing].slice(0, 200);
    await writeJson(key, next);
    await discardLegacySharedCheckInData();
    void databaseService.sync.syncCheckIn(profile, record);
    return record;
  },

  async getReminderSettings(userId: string): Promise<ReminderSettings> {
    await discardLegacySharedCheckInData();
    return readJson(keysForUser(userId).reminderSettings, { ...DEFAULT_REMINDER_SETTINGS });
  },

  async saveReminderSettings(userId: string, settings: ReminderSettings): Promise<ReminderSettings> {
    const next = { ...settings, updatedAt: new Date().toISOString() };
    await writeJson(keysForUser(userId).reminderSettings, next);
    await discardLegacySharedCheckInData();
    return next;
  },

  async getWeatherAcknowledgment(userId: string): Promise<WeatherSafetyAcknowledgment | null> {
    return readJson<WeatherSafetyAcknowledgment | null>(keysForUser(userId).weatherAck, null);
  },

  async saveWeatherAcknowledgment(
    userId: string,
    profile: UserProfile,
    ack: WeatherSafetyAcknowledgment,
  ): Promise<void> {
    await writeJson(keysForUser(userId).weatherAck, ack);
    void databaseService.sync.syncWeatherSafetyAck(profile, ack);
  },

  async getLastWeatherAlertSentAt(userId: string): Promise<string | null> {
    return readJson<string | null>(keysForUser(userId).weatherAlertSent, null);
  },

  async saveLastWeatherAlertSentAt(userId: string, sentAt: string): Promise<void> {
    await writeJson(keysForUser(userId).weatherAlertSent, sentAt);
  },

  hoursSinceLastCheckIn(last: HealthCheckIn | null): number {
    if (!last) return Number.POSITIVE_INFINITY;
    return (Date.now() - new Date(last.checkInTime).getTime()) / (1000 * 60 * 60);
  },

  mapCheckInToProfileRiskFactors(
    profile: UserProfile,
    checkIn: Pick<HealthCheckIn, 'hydrationStatus' | 'activityLevel' | 'generalStatus'>,
  ): UserProfile['riskFactors'] {
    return {
      ...profile.riskFactors,
      hydrationStatus: checkIn.hydrationStatus,
      activityLevel: checkIn.activityLevel,
      generalStatus: checkIn.generalStatus,
    };
  },

  hydrationStatusForDb(value: string | null): string {
    return hydrationStatusToDb(value);
  },
};
