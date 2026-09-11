import { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  getProfileAvatarOption,
  profileAvatarImageUrl,
  profileInitials,
  type ProfileAvatarId,
} from '@/src/constants/profile-avatars';
import { fonts, radius } from '@/src/theme';

const SIZES = {
  sm: { box: 40, text: 14, ring: 2 },
  md: { box: 52, text: 18, ring: 2 },
  lg: { box: 64, text: 22, ring: 3 },
} as const;

export function ProfileAvatar({
  name,
  avatarId,
  size = 'md',
  onPress,
  showEditBadge,
  style,
  accessibilityLabel,
}: {
  name: string;
  avatarId?: ProfileAvatarId | null;
  size?: keyof typeof SIZES;
  onPress?: () => void;
  showEditBadge?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const dims = SIZES[size];
  const option = getProfileAvatarOption(avatarId);
  const uri = profileAvatarImageUrl(avatarId, name, dims.box * 3);
  const [imageFailed, setImageFailed] = useState(false);
  const styles = useMemo(() => createStyles(dims, option.ring), [dims, option.ring]);

  const content = (
    <View style={[styles.wrap, style]}>
      <View style={styles.ring}>
        {!imageFailed ? (
          <Image
            source={{ uri }}
            style={styles.image}
            onError={() => setImageFailed(true)}
            accessibilityIgnoresInvertColors
          />
        ) : (
          <View style={styles.fallback}>
            <Text style={styles.initials}>{profileInitials(name)}</Text>
          </View>
        )}
      </View>
      {showEditBadge ? (
        <View style={styles.editBadge}>
          <Ionicons name="pencil" size={10} color="#FFFFFF" />
        </View>
      ) : null}
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? 'Change profile avatar'}
    >
      {content}
    </Pressable>
  );
}

function createStyles(dims: { box: number; text: number; ring: number }, ringColor: string) {
  return StyleSheet.create({
    wrap: {
      width: dims.box,
      height: dims.box,
      position: 'relative',
    },
    ring: {
      width: dims.box,
      height: dims.box,
      borderRadius: radius.pill,
      padding: dims.ring,
      backgroundColor: ringColor,
      overflow: 'hidden',
    },
    image: {
      width: '100%',
      height: '100%',
      borderRadius: radius.pill,
      backgroundColor: '#E2E8F0',
    },
    fallback: {
      flex: 1,
      borderRadius: radius.pill,
      backgroundColor: ringColor,
      alignItems: 'center',
      justifyContent: 'center',
    },
    initials: {
      fontFamily: fonts.headerSemi,
      fontSize: dims.text,
      color: '#FFFFFF',
    },
    editBadge: {
      position: 'absolute',
      right: -2,
      bottom: -2,
      width: 20,
      height: 20,
      borderRadius: radius.pill,
      backgroundColor: '#2563EB',
      borderWidth: 2,
      borderColor: '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
    },
    pressed: { opacity: 0.88 },
  });
}
