/**
 * Native phone notification helpers for development / EAS builds.
 * Loaded only when canUseNativeNotifications() is true (never in Expo Go).
 */
import { Platform } from 'react-native';
import {
  CHECK_IN_CHANNEL_ID,
  EMERGENCY_CHANNEL_ID,
  HEAT_CHANNEL_ID,
  canUseNativeNotifications,
} from '@/src/services/notifications/notifications.constants';

export {
  CHECK_IN_CHANNEL_ID,
  EMERGENCY_CHANNEL_ID,
  HEAT_CHANNEL_ID,
  canUseNativeNotifications,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExpoNotifications = any;

let Notifications: ExpoNotifications | null = null;
let handlerConfigured = false;
let channelsConfigured = false;

async function loadExpoNotifications(): Promise<ExpoNotifications | null> {
  if (!canUseNativeNotifications()) return null;
  if (Notifications) return Notifications;

  try {
    // Dynamic require — avoids Metro "unknown module" when Expo Go blocks the package.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    Notifications = require('expo-notifications');
    return Notifications;
  } catch {
    return null;
  }
}

export async function bootstrapNotifications(): Promise<void> {
  const N = await loadExpoNotifications();
  if (!N) return;

  if (!handlerConfigured) {
    N.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    handlerConfigured = true;
  }

  if (Platform.OS === 'android' && !channelsConfigured) {
    await N.setNotificationChannelAsync(CHECK_IN_CHANNEL_ID, {
      name: 'Check-in reminders',
      description: 'Heat safety check-in reminders from Tify',
      importance: N.AndroidImportance?.HIGH ?? 4,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#2563EB',
      sound: 'default',
      enableVibrate: true,
      showBadge: true,
    });

    await N.setNotificationChannelAsync(HEAT_CHANNEL_ID, {
      name: 'Heat & weather alerts',
      description: 'High heat index and weather safety alerts',
      importance: N.AndroidImportance?.HIGH ?? 4,
      vibrationPattern: [0, 300, 200, 300],
      lightColor: '#F59E0B',
      sound: 'default',
      enableVibrate: true,
      showBadge: true,
    });

    await N.setNotificationChannelAsync(EMERGENCY_CHANNEL_ID, {
      name: 'Emergency alerts',
      description: 'Heat emergency alerts — highest priority',
      importance: N.AndroidImportance?.MAX ?? 5,
      vibrationPattern: [0, 500, 250, 500],
      lightColor: '#DC2626',
      sound: 'default',
      enableVibrate: true,
      showBadge: true,
    });

    channelsConfigured = true;
  }
}

export async function getNotificationsModule(): Promise<ExpoNotifications | null> {
  await bootstrapNotifications();
  return loadExpoNotifications();
}
