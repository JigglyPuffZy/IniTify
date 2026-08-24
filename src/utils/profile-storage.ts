import AsyncStorage from '@react-native-async-storage/async-storage';
import type { EmergencyContact, UserProfile } from '@/src/models/user';
import { normalizeProfile } from '@/src/models/user';

const LEGACY_PROFILE_KEY = '@initify/profile';
const LEGACY_CONTACT_KEY = '@initify/emergency-contact';

function profileKey(userId: string): string {
  return `@initify/profile:${userId}`;
}

function contactKey(userId: string): string {
  return `@initify/emergency-contact:${userId}`;
}

/** One-time removal of shared legacy keys that leaked profiles across accounts. */
async function discardSharedLegacyProfile(): Promise<void> {
  await AsyncStorage.multiRemove([LEGACY_PROFILE_KEY, LEGACY_CONTACT_KEY]);
}

export function isProfileComplete(profile: UserProfile | null): boolean {
  if (!profile?.name?.trim()) return false;
  const rf = profile.riskFactors;
  return Boolean(
    rf.age != null &&
      rf.activityLevel &&
      rf.hydrationStatus &&
      (rf.healthConditions?.length ?? 0) > 0,
  );
}

export async function loadLocalProfile(userId: string): Promise<UserProfile | null> {
  const scoped = await AsyncStorage.getItem(profileKey(userId));
  if (scoped) {
    // Drop orphaned shared keys so they never attach to another login.
    void discardSharedLegacyProfile();
    return normalizeProfile(JSON.parse(scoped));
  }

  // Do NOT migrate legacy shared profile onto this user — that caused the wrong
  // name (e.g. "Ralph") to appear after switching accounts.
  await discardSharedLegacyProfile();
  return null;
}

export async function saveLocalProfile(userId: string, profile: UserProfile): Promise<void> {
  const normalized = normalizeProfile(profile);
  await AsyncStorage.setItem(profileKey(userId), JSON.stringify(normalized));
  await discardSharedLegacyProfile();
}

export async function loadLocalEmergencyContact(userId: string): Promise<EmergencyContact | null> {
  const scoped = await AsyncStorage.getItem(contactKey(userId));
  if (scoped) {
    void discardSharedLegacyProfile();
    return JSON.parse(scoped) as EmergencyContact;
  }

  await discardSharedLegacyProfile();
  return null;
}

export async function saveLocalEmergencyContact(
  userId: string,
  contact: EmergencyContact,
): Promise<void> {
  await AsyncStorage.setItem(contactKey(userId), JSON.stringify(contact));
  await discardSharedLegacyProfile();
}

export async function clearLocalUserData(userId: string): Promise<void> {
  await AsyncStorage.multiRemove([profileKey(userId), contactKey(userId)]);
}
