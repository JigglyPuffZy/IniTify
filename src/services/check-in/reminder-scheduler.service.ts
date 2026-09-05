import type { ReminderSettings } from '@/src/models/check-in';
import { frequencyToMinutes } from '@/src/models/check-in';
import type { HealthCheckIn } from '@/src/models/check-in';
import type { UserProfile } from '@/src/models/user';
import type { HeatRiskLevel } from '@/src/models/risk';
import { PAGASA_HEAT_INDEX_THRESHOLDS } from '@/src/config/risk-assessment.config';

const CHECK_IN_NOTIFICATION_TYPE = 'health-check-in';

function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(':').map((v) => Number.parseInt(v, 10));
  return (h ?? 0) * 60 + (m ?? 0);
}

export function isInsideQuietHours(now: Date, settings: ReminderSettings): boolean {
  if (!settings.quietHoursEnabled) return false;
  const minutes = now.getHours() * 60 + now.getMinutes();
  const start = parseTimeToMinutes(settings.quietHoursStart);
  const end = parseTimeToMinutes(settings.quietHoursEnd);
  if (start === end) return false;
  if (start < end) {
    return minutes >= start && minutes < end;
  }
  return minutes >= start || minutes < end;
}

export function computeNextReminderAt(
  settings: ReminderSettings,
  from: Date = new Date(),
  lastCheckIn: HealthCheckIn | null = null,
): Date | null {
  if (!settings.remindersEnabled || settings.frequency === 'disabled') {
    return null;
  }
  const intervalMs = frequencyToMinutes(settings) * 60 * 1000;
  const firstReminderMs = lastCheckIn ? intervalMs : Math.min(intervalMs, 30 * 60 * 1000);
  let candidate = new Date(from.getTime() + firstReminderMs);

  for (let i = 0; i < 48; i++) {
    if (!isInsideQuietHours(candidate, settings)) {
      return candidate;
    }
    candidate = new Date(candidate.getTime() + 15 * 60 * 1000);
  }
  return candidate;
}

export function shouldSendPeriodicReminder(params: {
  settings: ReminderSettings;
  lastCheckIn: HealthCheckIn | null;
  now?: Date;
}): boolean {
  const now = params.now ?? new Date();
  const { settings, lastCheckIn } = params;

  if (!settings.remindersEnabled || settings.frequency === 'disabled') {
    return false;
  }
  if (isInsideQuietHours(now, settings)) {
    return false;
  }

  const intervalHours = frequencyToMinutes(settings) / 60;
  const hoursSinceCheckIn = lastCheckIn
    ? (now.getTime() - new Date(lastCheckIn.checkInTime).getTime()) / (1000 * 60 * 60)
    : Number.POSITIVE_INFINITY;

  if (hoursSinceCheckIn < intervalHours) {
    return false;
  }

  if (settings.lastReminderSentAt) {
    const hoursSinceReminder =
      (now.getTime() - new Date(settings.lastReminderSentAt).getTime()) / (1000 * 60 * 60);
    if (hoursSinceReminder < intervalHours * 0.9) {
      return false;
    }
  }

  if (settings.nextReminderAt) {
    const due = new Date(settings.nextReminderAt).getTime();
    if (now.getTime() < due - 60 * 1000) {
      return false;
    }
  }

  return true;
}

export function shouldShowWeatherSafetyAlert(params: {
  heatIndexC: number | null;
  riskLevel: HeatRiskLevel | null;
  profile: UserProfile;
  lastCheckIn: HealthCheckIn | null;
  lastAck: { acknowledgedAt: string } | null;
  now?: Date;
}): boolean {
  const now = params.now ?? new Date();
  const { heatIndexC, riskLevel, profile, lastCheckIn, lastAck } = params;

  const elevated =
    riskLevel === 'HIGH' ||
    riskLevel === 'EXTREME' ||
    riskLevel === 'CRITICAL' ||
    (heatIndexC !== null && heatIndexC >= 38);

  if (!elevated) return false;

  if (lastAck) {
    const hoursSinceAck =
      (now.getTime() - new Date(lastAck.acknowledgedAt).getTime()) / (1000 * 60 * 60);
    if (hoursSinceAck < 3) return false;
  }

  const hoursSinceCheckIn = lastCheckIn
    ? (now.getTime() - new Date(lastCheckIn.checkInTime).getTime()) / (1000 * 60 * 60)
    : Number.POSITIVE_INFINITY;

  const hydration = profile.riskFactors.hydrationStatus;
  const activity = profile.riskFactors.activityLevel;
  const needsHydration =
    hydration === 'Needs Hydration' || hydration === 'Dehydrated / Concerning';

  if (hoursSinceCheckIn >= 6) return true;
  if (needsHydration && hoursSinceCheckIn >= 3) return true;
  if (activity === 'High' && needsHydration && hoursSinceCheckIn >= 2) return true;

  return false;
}

export function mapWeatherToHazard(params: {
  heatIndexC: number | null;
  conditionText?: string | null;
}): string {
  const { heatIndexC, conditionText } = params;
  const c = (conditionText ?? '').toLowerCase();

  if (c.includes('thunder')) return 'Thunderstorm';
  if (c.includes('flood')) return 'Flood';
  if (c.includes('typhoon') || c.includes('cyclone')) return 'Typhoon';
  if (c.includes('rain')) return 'Heavy Rain';
  if (c.includes('wind')) return 'Strong Winds';
  if (c.includes('lightning')) return 'Lightning';

  if (heatIndexC !== null && heatIndexC >= PAGASA_HEAT_INDEX_THRESHOLDS.extremeDangerMin) {
    return 'Extreme Heat';
  }
  if (heatIndexC !== null && heatIndexC >= PAGASA_HEAT_INDEX_THRESHOLDS.dangerMin) {
    return 'Extreme Heat';
  }
  if (heatIndexC !== null && heatIndexC >= PAGASA_HEAT_INDEX_THRESHOLDS.extremeCautionMin) {
    return 'High Heat Index';
  }
  if (c.includes('humid')) return 'High Humidity';

  return 'Extreme Heat';
}

export { CHECK_IN_NOTIFICATION_TYPE };
