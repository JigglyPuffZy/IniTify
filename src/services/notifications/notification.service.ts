import type { HeatRiskLevel } from '@/src/models/risk';
import type { ServiceResult } from '@/src/models/service-result';
import { canUseNativeNotifications } from '@/src/services/notifications/notifications.constants';

/**
 * Phone / OS notification facade.
 *
 * In Expo Go (SDK 53+), remote/local push via expo-notifications is unsupported and
 * must never be imported — it crashes Metro with "unknown module" / Expo Go errors.
 * IniTify uses the in-app Notifications tab instead.
 *
 * Development/production builds can still enable native push later by wiring a
 * separate native module; this service stays a safe no-op until then.
 */

export type NotificationPermissionStatus = 'granted' | 'denied' | 'undetermined' | 'unavailable';

function unavailableMessage(): string {
  return canUseNativeNotifications()
    ? 'Phone notifications are not wired in this build. Use the in-app Notifications tab.'
    : 'Phone push is unavailable in Expo Go. Use the in-app Notifications tab.';
}

function unavailableBool(): ServiceResult<boolean> {
  return { status: 'unavailable', data: false, message: unavailableMessage() };
}

function unavailableId(): ServiceResult<string> {
  return { status: 'unavailable', data: null, message: unavailableMessage() };
}

export const notificationService = {
  async initialize(): Promise<void> {
    /* no-op — Expo Go safe */
  },

  async getPermissionStatus(): Promise<NotificationPermissionStatus> {
    return 'unavailable';
  },

  async requestPermission(): Promise<ServiceResult<boolean>> {
    return unavailableBool();
  },

  async sendHeatRiskAlert(
    _level: HeatRiskLevel,
    _precautionSummary: string,
  ): Promise<ServiceResult<string>> {
    return unavailableId();
  },

  async sendEmergencyActiveAlert(_reasons: string): Promise<ServiceResult<string>> {
    return unavailableId();
  },

  async cancelScheduledNotification(_notificationId: string | null): Promise<void> {
    /* no-op */
  },

  async scheduleHealthCheckInReminder(_triggerDate: Date): Promise<ServiceResult<string>> {
    return unavailableId();
  },

  async sendHealthCheckInReminderNow(): Promise<ServiceResult<string>> {
    return unavailableId();
  },

  async sendTestNotification(_delaySeconds = 5): Promise<ServiceResult<string>> {
    return unavailableId();
  },

  async sendWeatherSafetyReminder(_body: string): Promise<ServiceResult<string>> {
    return unavailableId();
  },

  async addNotificationReceivedListener(
    _onReceived: (data: Record<string, unknown>) => void,
  ): Promise<(() => void) | null> {
    return null;
  },

  async addNotificationResponseListener(
    _onResponse: (data: Record<string, unknown>) => void,
  ): Promise<(() => void) | null> {
    return null;
  },
};
