import { Linking, PermissionsAndroid, Platform } from 'react-native';
import type { HeatRiskLevel } from '@/src/models/risk';
import type { ServiceResult } from '@/src/models/service-result';
import {
  CHECK_IN_CHANNEL_ID,
  EMERGENCY_CHANNEL_ID,
  HEAT_CHANNEL_ID,
  canUseNativeNotifications,
} from '@/src/services/notifications/notifications.constants';
import { CHECK_IN_NOTIFICATION_TYPE } from '@/src/services/check-in/reminder-scheduler.service';

export type NotificationPermissionStatus = 'granted' | 'denied' | 'undetermined' | 'unavailable';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExpoNotifications = any;

function unavailableMessage(): string {
  return canUseNativeNotifications()
    ? 'Phone notifications could not start. Check Settings → Apps → IniTify → Notifications.'
    : 'Phone notifications need the release APK (not Expo Go). Alerts still appear in the Notifications tab.';
}

async function getNative(): Promise<ExpoNotifications | null> {
  if (!canUseNativeNotifications()) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('@/src/services/notifications/notifications.native') as {
      getNotificationsModule: () => Promise<ExpoNotifications | null>;
    };
    return mod.getNotificationsModule();
  } catch {
    return null;
  }
}

/** Android 13+ needs POST_NOTIFICATIONS; channels must exist before the system prompt. */
async function ensureAndroidPostNotificationsPermission(): Promise<boolean> {
  if (Platform.OS !== 'android' || Platform.Version < 33) return true;
  try {
    const already = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );
    if (already) return true;
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      {
        title: 'Allow IniTify notifications',
        message:
          'IniTify needs notification permission to show heat alerts, check-in reminders, and emergencies on your phone.',
        buttonPositive: 'Allow',
        buttonNegative: 'Not now',
      },
    );
    return result === PermissionsAndroid.RESULTS.GRANTED;
  } catch {
    return false;
  }
}

async function ensurePermission(N: ExpoNotifications): Promise<{
  granted: boolean;
  canAskAgain: boolean;
  status: NotificationPermissionStatus;
}> {
  // Android 13: create channels BEFORE requesting, or the OS prompt never appears.
  await ensureAndroidPostNotificationsPermission();

  const current = await N.getPermissionsAsync();
  if (current.status === 'granted' || current.granted === true) {
    return { granted: true, canAskAgain: true, status: 'granted' };
  }

  const requested = await N.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
    },
  });

  const granted = requested.status === 'granted' || requested.granted === true;
  const canAskAgain = requested.canAskAgain !== false;
  return {
    granted,
    canAskAgain,
    status: granted ? 'granted' : 'denied',
  };
}

async function presentImmediate(params: {
  title: string;
  body: string;
  data: Record<string, unknown>;
  channelId: string;
  priority?: 'default' | 'high' | 'max';
}): Promise<ServiceResult<string>> {
  const N = await getNative();
  if (!N) {
    return { status: 'unavailable', data: null, message: unavailableMessage() };
  }

  const permission = await ensurePermission(N);
  if (!permission.granted) {
    return {
      status: 'permission_denied',
      data: null,
      message: permission.canAskAgain
        ? 'Notification permission not granted yet. Tap Enable phone notifications.'
        : 'Notifications are blocked. Open phone Settings → Apps → IniTify → Notifications and turn them on.',
    };
  }

  const priority =
    params.priority === 'max'
      ? N.AndroidNotificationPriority?.MAX
      : params.priority === 'high'
        ? N.AndroidNotificationPriority?.HIGH
        : N.AndroidNotificationPriority?.DEFAULT;

  try {
    const id = await N.scheduleNotificationAsync({
      content: {
        title: params.title,
        body: params.body,
        data: params.data,
        sound: true,
        priority,
        ...(params.channelId ? { channelId: params.channelId } : {}),
      },
      trigger: null,
    });
    return {
      status: 'success',
      data: id,
      message: 'Phone notification sent.',
    };
  } catch (error) {
    return {
      status: 'error',
      data: null,
      message: error instanceof Error ? error.message : 'Could not show phone notification.',
    };
  }
}

export const notificationService = {
  async initialize(): Promise<void> {
    // Creates Android channels so later permission prompts can appear.
    await getNative();
  },

  async getPermissionStatus(): Promise<NotificationPermissionStatus> {
    const N = await getNative();
    if (!N) return 'unavailable';
    try {
      if (Platform.OS === 'android' && Platform.Version >= 33) {
        const nativeGranted = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        );
        if (!nativeGranted) return 'denied';
      }
      const { status, granted } = await N.getPermissionsAsync();
      if (status === 'granted' || granted === true) return 'granted';
      if (status === 'denied') return 'denied';
      return 'undetermined';
    } catch {
      return 'unavailable';
    }
  },

  async requestPermission(): Promise<ServiceResult<boolean>> {
    const N = await getNative();
    if (!N) {
      return { status: 'unavailable', data: false, message: unavailableMessage() };
    }
    try {
      const result = await ensurePermission(N);
      if (result.granted) {
        return { status: 'success', data: true, message: 'Phone notifications enabled.' };
      }
      return {
        status: 'permission_denied',
        data: false,
        message: result.canAskAgain
          ? 'Permission not granted. Tap Allow when Android asks.'
          : 'Notifications blocked. Open Settings to enable them for IniTify.',
      };
    } catch (error) {
      return {
        status: 'error',
        data: false,
        message:
          error instanceof Error ? error.message : 'Could not request notification permission.',
      };
    }
  },

  async openSystemNotificationSettings(): Promise<void> {
    try {
      await Linking.openSettings();
    } catch {
      /* ignore */
    }
  },

  async sendHeatRiskAlert(
    level: HeatRiskLevel,
    precautionSummary: string,
  ): Promise<ServiceResult<string>> {
    return presentImmediate({
      title: `${level} heat risk`,
      body: precautionSummary || 'Your heat risk increased. Stay hydrated and review safety tips.',
      data: { type: 'heat-risk', level, href: '/safety-tips' },
      channelId: HEAT_CHANNEL_ID,
      priority: level === 'EXTREME' || level === 'CRITICAL' ? 'max' : 'high',
    });
  },

  async sendEmergencyActiveAlert(reasons: string): Promise<ServiceResult<string>> {
    return presentImmediate({
      title: 'Emergency active',
      body: reasons || 'Heat emergency detected. Open IniTify for hotlines and first aid.',
      data: { type: 'emergency', href: '/(tabs)/emergency' },
      channelId: EMERGENCY_CHANNEL_ID,
      priority: 'max',
    });
  },

  async cancelScheduledNotification(notificationId: string | null): Promise<void> {
    if (!notificationId) return;
    const N = await getNative();
    if (!N) return;
    try {
      await N.cancelScheduledNotificationAsync(notificationId);
    } catch {
      /* ignore */
    }
  },

  async scheduleHealthCheckInReminder(triggerDate: Date): Promise<ServiceResult<string>> {
    const N = await getNative();
    if (!N) {
      return { status: 'unavailable', data: null, message: unavailableMessage() };
    }

    const permission = await this.requestPermission();
    if (!permission.data) {
      return {
        status: permission.status,
        data: null,
        message: permission.message,
      };
    }

    const when = triggerDate.getTime();
    if (Number.isNaN(when) || when <= Date.now() + 1500) {
      return this.sendHealthCheckInReminderNow();
    }

    try {
      const id = await N.scheduleNotificationAsync({
        content: {
          title: 'Time to check in',
          body: "Tify: how's your hydration and how are you feeling in the heat?",
          data: { type: CHECK_IN_NOTIFICATION_TYPE, href: '/check-in' },
          sound: true,
          channelId: CHECK_IN_CHANNEL_ID,
        },
        trigger: {
          type: N.SchedulableTriggerInputTypes?.DATE ?? 'date',
          date: triggerDate,
          channelId: CHECK_IN_CHANNEL_ID,
        },
      });
      return {
        status: 'success',
        data: id,
        message: `Check-in reminder scheduled for ${triggerDate.toLocaleString()}.`,
      };
    } catch (error) {
      return {
        status: 'error',
        data: null,
        message: error instanceof Error ? error.message : 'Could not schedule reminder.',
      };
    }
  },

  async sendHealthCheckInReminderNow(): Promise<ServiceResult<string>> {
    return presentImmediate({
      title: 'Time to check in',
      body: "Tify: how's your hydration and how are you feeling in the heat?",
      data: { type: CHECK_IN_NOTIFICATION_TYPE, href: '/check-in' },
      channelId: CHECK_IN_CHANNEL_ID,
      priority: 'high',
    });
  },

  async sendTestNotification(delaySeconds = 2): Promise<ServiceResult<string>> {
    const N = await getNative();
    if (!N) {
      return { status: 'unavailable', data: null, message: unavailableMessage() };
    }
    const permission = await this.requestPermission();
    if (!permission.data) {
      return { status: permission.status, data: null, message: permission.message };
    }
    try {
      const id = await N.scheduleNotificationAsync({
        content: {
          title: 'IniTify test',
          body: 'Phone notifications are working. You will see heat and check-in alerts here.',
          data: { type: 'system' },
          sound: true,
          channelId: CHECK_IN_CHANNEL_ID,
        },
        trigger:
          delaySeconds > 0
            ? {
                type: N.SchedulableTriggerInputTypes?.TIME_INTERVAL ?? 'timeInterval',
                seconds: delaySeconds,
                channelId: CHECK_IN_CHANNEL_ID,
              }
            : null,
      });
      return {
        status: 'success',
        data: id,
        message:
          delaySeconds > 0
            ? `Test notification in ${delaySeconds}s — check your notification shade.`
            : 'Test notification sent.',
      };
    } catch (error) {
      return {
        status: 'error',
        data: null,
        message: error instanceof Error ? error.message : 'Test notification failed.',
      };
    }
  },

  async sendWeatherSafetyReminder(body: string): Promise<ServiceResult<string>> {
    return presentImmediate({
      title: 'High heat alert',
      body:
        body ||
        'Elevated heat risk detected. Tap to update your hydration and how you feel.',
      data: { type: 'weather-safety', href: '/check-in' },
      channelId: HEAT_CHANNEL_ID,
      priority: 'high',
    });
  },

  async addNotificationReceivedListener(
    onReceived: (data: Record<string, unknown>) => void,
  ): Promise<(() => void) | null> {
    const N = await getNative();
    if (!N) return null;
    const sub = N.addNotificationReceivedListener(
      (notification: { request?: { content?: { data?: Record<string, unknown> } } }) => {
        onReceived(notification.request?.content?.data ?? {});
      },
    );
    return () => sub.remove();
  },

  async addNotificationResponseListener(
    onResponse: (data: Record<string, unknown>) => void,
  ): Promise<(() => void) | null> {
    const N = await getNative();
    if (!N) return null;
    const sub = N.addNotificationResponseReceivedListener(
      (response: {
        notification?: { request?: { content?: { data?: Record<string, unknown> } } };
      }) => {
        onResponse(response.notification?.request?.content?.data ?? {});
      },
    );
    return () => sub.remove();
  },
};
