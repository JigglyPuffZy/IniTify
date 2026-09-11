import type { UserProfile } from '@/src/models/user';

/** Cartoon avatar character ids — stored on profile.avatarId */
export type ProfileAvatarId =
  | 'person'
  | 'leo'
  | 'maya'
  | 'kai'
  | 'nina'
  | 'sam'
  | 'zoe'
  | 'rio'
  | 'alex'
  | 'jade'
  | 'emma'
  | 'noah'
  | 'luna'
  | 'marco'
  | 'aria'
  | 'finn';

export interface ProfileAvatarOption {
  id: ProfileAvatarId;
  label: string;
  /** DiceBear seed for a consistent cartoon portrait */
  seed: string;
  /** Accent ring behind the portrait */
  ring: string;
}

export const DEFAULT_PROFILE_AVATAR_ID: ProfileAvatarId = 'person';

/** Play-style cartoon picks (DiceBear avataaars — friendly illustrated faces) */
export const PROFILE_AVATARS: ProfileAvatarOption[] = [
  { id: 'person', label: 'You', seed: 'initify-you', ring: '#3B82F6' },
  { id: 'leo', label: 'Leo', seed: 'leo-warm', ring: '#F59E0B' },
  { id: 'maya', label: 'Maya', seed: 'maya-cool', ring: '#10B981' },
  { id: 'kai', label: 'Kai', seed: 'kai-active', ring: '#8B5CF6' },
  { id: 'nina', label: 'Nina', seed: 'nina-care', ring: '#EC4899' },
  { id: 'sam', label: 'Sam', seed: 'sam-safe', ring: '#0EA5E9' },
  { id: 'zoe', label: 'Zoe', seed: 'zoe-star', ring: '#6366F1' },
  { id: 'rio', label: 'Rio', seed: 'rio-heat', ring: '#EF4444' },
  { id: 'alex', label: 'Alex', seed: 'alex-sky', ring: '#0284C7' },
  { id: 'jade', label: 'Jade', seed: 'jade-mint', ring: '#14B8A6' },
  { id: 'emma', label: 'Emma', seed: 'emma-rose', ring: '#F472B6' },
  { id: 'noah', label: 'Noah', seed: 'noah-calm', ring: '#64748B' },
  { id: 'luna', label: 'Luna', seed: 'luna-night', ring: '#7C3AED' },
  { id: 'marco', label: 'Marco', seed: 'marco-bold', ring: '#EA580C' },
  { id: 'aria', label: 'Aria', seed: 'aria-bright', ring: '#EAB308' },
  { id: 'finn', label: 'Finn', seed: 'finn-chill', ring: '#22C55E' },
];

/** Map legacy icon-based ids from earlier builds */
const LEGACY_AVATAR_MAP: Record<string, ProfileAvatarId> = {
  sun: 'leo',
  leaf: 'maya',
  heart: 'nina',
  fitness: 'kai',
  shield: 'sam',
  flame: 'rio',
  star: 'zoe',
};

export function isProfileAvatarId(value: string | null | undefined): value is ProfileAvatarId {
  return PROFILE_AVATARS.some((a) => a.id === value);
}

export function normalizeProfileAvatarId(value: string | null | undefined): ProfileAvatarId {
  if (isProfileAvatarId(value)) return value;
  if (value && LEGACY_AVATAR_MAP[value]) return LEGACY_AVATAR_MAP[value];
  return DEFAULT_PROFILE_AVATAR_ID;
}

export function resolveProfileAvatarId(profile: Pick<UserProfile, 'avatarId'>): ProfileAvatarId {
  return normalizeProfileAvatarId(profile.avatarId);
}

export function getProfileAvatarOption(id: ProfileAvatarId | null | undefined): ProfileAvatarOption {
  const normalized = normalizeProfileAvatarId(id ?? null);
  return PROFILE_AVATARS.find((a) => a.id === normalized) ?? PROFILE_AVATARS[0];
}

export function profileInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

/** Cartoon portrait URL (Google Play–style illustrated avatar). */
export function profileAvatarImageUrl(
  avatarId: ProfileAvatarId | null | undefined,
  name: string,
  size = 128,
): string {
  const option = getProfileAvatarOption(avatarId);
  const seed =
    option.id === 'person'
      ? (name.trim() || 'IniTify User')
      : option.seed;
  const bg = option.ring.replace('#', '');
  return `https://api.dicebear.com/9.x/avataaars/png?seed=${encodeURIComponent(seed)}&size=${size}&backgroundColor=${bg}`;
}
