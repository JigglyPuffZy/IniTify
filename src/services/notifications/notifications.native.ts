/**
 * Optional native push helpers for development/production builds.
 * Not imported by the main Expo Go app path — kept for future wiring only.
 *
 * Do not import this file from app startup code while using Expo Go (SDK 53+).
 */
import { Platform } from 'react-native';
import {
  CHECK_IN_CHANNEL_ID,
  canUseNativeNotifications,
} from '@/src/services/notifications/notifications.constants';

export { CHECK_IN_CHANNEL_ID, canUseNativeNotifications };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExpoNotifications = any;

let Notifications: ExpoNotifications | null = null;
let handlerConfigured = false;
let channelConfigured = false;

async function loadExpoNotifications(): Promise<ExpoNotifications | null> {
  if (!canUseNativeNotifications()) return null;
  if (Notifications) return Notifications;

  try {
    // Dynamic require only when not Expo Go — avoids Metro "unknown module" in Expo Go.
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
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    handlerConfigured = true;
  }

  if (Platform.OS === 'android' && !channelConfigured) {
    await N.setNotificationChannelAsync(CHECK_IN_CHANNEL_ID, {
      name: 'Check-in reminders',
      description: 'Heat safety check-in reminders from Tify',
      importance: N.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#2563EB',
      sound: 'default',
      enableVibrate: true,
      showBadge: true,
    });
    channelConfigured = true;
  }
}

export async function getNotificationsModule(): Promise<ExpoNotifications | null> {
  await bootstrapNotifications();
  return loadExpoNotifications();
}
