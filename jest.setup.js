jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

process.env.EXPO_PUBLIC_HOSPITAL_DATA_PROVIDER = 'static-tuguegarao';
process.env.EXPO_PUBLIC_MAPS_PROVIDER = 'google';
process.env.EXPO_PUBLIC_DEV_MANUAL_HEAT = 'false';
process.env.EXPO_PUBLIC_EMERGENCY_DEV_MODE = 'false';

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return Object.setPrototypeOf(
    {
      Linking: {
        canOpenURL: jest.fn(async () => true),
        openURL: jest.fn(async () => undefined),
      },
      Alert: {
        alert: jest.fn(),
      },
    },
    RN,
  );
});

jest.mock('expo-location', () => ({
  PermissionStatus: { GRANTED: 'granted', DENIED: 'denied' },
  Accuracy: { Balanced: 3 },
  requestForegroundPermissionsAsync: jest.fn(),
  getForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
}));

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    appOwnership: null,
    executionEnvironment: 'standalone',
    expoConfig: {},
  },
  ExecutionEnvironment: {
    StoreClient: 'storeClient',
    Standalone: 'standalone',
    Bare: 'bare',
  },
}));

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  requestPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  scheduleNotificationAsync: jest.fn(async () => 'test-notification-id'),
  cancelScheduledNotificationAsync: jest.fn(async () => undefined),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  setNotificationChannelAsync: jest.fn(async () => undefined),
  AndroidImportance: { HIGH: 4, MAX: 5 },
  AndroidNotificationPriority: { DEFAULT: 'default', HIGH: 'high', MAX: 'max' },
  SchedulableTriggerInputTypes: { DATE: 'date', TIME_INTERVAL: 'timeInterval' },
}));
