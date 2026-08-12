import AsyncStorage from '@react-native-async-storage/async-storage';

const DEVICE_ID_KEY = '@initify/device-uuid';

function generateUuid(): string {
  return `initify-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export async function getDeviceUuid(): Promise<string> {
  const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (existing) return existing;
  const created = generateUuid();
  await AsyncStorage.setItem(DEVICE_ID_KEY, created);
  return created;
}
