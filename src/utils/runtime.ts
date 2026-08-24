import Constants from 'expo-constants';

const EXPO_GO_MESSAGE =
  'Notifications are limited in Expo Go. Use a development build for full alert support.';

/** Push APIs are not available in Expo Go (SDK 53+). */
export function isExpoGoRuntime(): boolean {
  return Constants.appOwnership === 'expo';
}

export function getExpoGoNotificationMessage(): string {
  return EXPO_GO_MESSAGE;
}
