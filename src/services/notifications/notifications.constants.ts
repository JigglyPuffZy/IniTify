import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';

/** Shared notification channel id — no expo-notifications import (safe for Expo Go). */
export const CHECK_IN_CHANNEL_ID = 'initify-check-in';

/**
 * Expo Go (StoreClient) no longer supports remote push / full expo-notifications
 * on Android as of SDK 53. Skip loading the module entirely to avoid startup errors.
 * Native push works in development builds and production builds only.
 */
export function canUseNativeNotifications(): boolean {
  if (Platform.OS === 'web') return false;
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return false;
  if (Constants.appOwnership === 'expo') return false;
  return true;
}
