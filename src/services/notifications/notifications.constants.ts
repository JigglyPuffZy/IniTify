import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';

/** Android notification channels */
export const CHECK_IN_CHANNEL_ID = 'initify-check-in';
export const HEAT_CHANNEL_ID = 'initify-heat';
export const EMERGENCY_CHANNEL_ID = 'initify-emergency';

/**
 * Expo Go (StoreClient) no longer supports full expo-notifications on Android (SDK 53+).
 * Native phone notifications work in development builds and EAS release APKs only.
 */
export function canUseNativeNotifications(): boolean {
  if (Platform.OS === 'web') return false;
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return false;
  if (Constants.appOwnership === 'expo') return false;
  return true;
}
