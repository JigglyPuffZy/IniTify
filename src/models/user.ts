import type { ProfileAvatarId } from '@/src/constants/profile-avatars';
import { normalizeProfileAvatarId } from '@/src/constants/profile-avatars';

/** Documented individual risk factors */
export interface UserRiskFactors {
  age: number | null;
  /** Primary condition — kept for decision tree / legacy sync */
  healthCondition: string | null;
  /** Multi-select health profile (KB-linked names) */
  healthConditions: string[];
  activityLevel: string | null;
  hydrationStatus: string | null;
  generalStatus: string | null;
}

export interface UserProfile {
  name: string;
  /** Optional avatar icon shown on Home and Profile */
  avatarId?: ProfileAvatarId | null;
  riskFactors: UserRiskFactors;
}

/** Documented emergency contact notification fields */
export interface EmergencyContact {
  name: string;
  phone: string;
}

/** Documented activity levels — HeatHits Definition of Terms: low, moderate, or high */
export const ACTIVITY_LEVELS = ['Low', 'Moderate', 'High'] as const;

export const HYDRATION_STATUSES = [
  'Well Hydrated',
  'Needs Hydration',
  'Dehydrated / Concerning',
] as const;

export const GENERAL_STATUSES = [
  'Feeling Well',
  'Mild Discomfort',
  'Not Feeling Well',
] as const;

export type ActivityLevel = (typeof ACTIVITY_LEVELS)[number];
export type HydrationStatus = (typeof HYDRATION_STATUSES)[number];
export type GeneralStatus = (typeof GENERAL_STATUSES)[number];

/** Map app hydration labels → Supabase enum (legacy schema) */
export function hydrationStatusToDb(value: string | null): string {
  switch (value) {
    case 'Well Hydrated':
      return 'Well hydrated';
    case 'Needs Hydration':
      return 'Moderately hydrated';
    case 'Dehydrated / Concerning':
      return 'Dehydrated';
    case 'Well hydrated':
    case 'Moderately hydrated':
    case 'Dehydrated':
      return value;
    default:
      return 'Well hydrated';
  }
}

/** Normalize stored / legacy values to current app labels */
export function normalizeHydrationStatus(value: string | null): HydrationStatus | null {
  if (!value) return null;
  const map: Record<string, HydrationStatus> = {
    'Well hydrated': 'Well Hydrated',
    'Well Hydrated': 'Well Hydrated',
    'Moderately hydrated': 'Needs Hydration',
    'Needs Hydration': 'Needs Hydration',
    Dehydrated: 'Dehydrated / Concerning',
    'Dehydrated / Concerning': 'Dehydrated / Concerning',
  };
  return map[value] ?? null;
}

export function normalizeProfile(profile: UserProfile): UserProfile {
  const rf = profile.riskFactors;
  const healthConditions =
    rf.healthConditions?.length > 0
      ? rf.healthConditions
      : rf.healthCondition
        ? [rf.healthCondition]
        : ['None'];
  const healthCondition =
    rf.healthCondition ?? healthConditions.find((c) => c !== 'None') ?? 'None';
  return {
    ...profile,
    avatarId: normalizeProfileAvatarId(profile.avatarId),
    riskFactors: {
      ...rf,
      healthConditions,
      healthCondition,
      hydrationStatus: normalizeHydrationStatus(rf.hydrationStatus),
      generalStatus: rf.generalStatus ?? 'Feeling Well',
    },
  };
}
