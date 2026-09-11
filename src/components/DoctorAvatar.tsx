import { useMemo } from 'react';
import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DOCTOR_REMINDER, doctorAvatarImageUrl } from '@/src/constants/doctor-reminder';
import { useAppTheme } from '@/src/theme/useAppTheme';

interface DoctorAvatarProps {
  size?: number;
  showBadge?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function DoctorAvatar({ size = 48, showBadge = true, style }: DoctorAvatarProps) {
  const { palette } = useAppTheme();
  const uri = useMemo(() => doctorAvatarImageUrl(size * 2), [size]);
  const badgeSize = Math.max(14, Math.round(size * 0.34));

  return (
    <View
      style={[styles.wrap, { width: size + 6, height: size + 6 }, style]}
      accessibilityRole="image"
      accessibilityLabel={DOCTOR_REMINDER.name}
    >
      <View
        style={[
          styles.ring,
          {
            width: size + 6,
            height: size + 6,
            borderRadius: (size + 6) / 2,
            borderColor: `${DOCTOR_REMINDER.avatarRing}55`,
            backgroundColor: palette.surface,
          },
        ]}
      >
        <Image
          source={{ uri }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          resizeMode="cover"
        />
      </View>
      {showBadge ? (
        <View
          style={[
            styles.badge,
            {
              width: badgeSize + 8,
              height: badgeSize + 8,
              borderRadius: (badgeSize + 8) / 2,
              borderColor: palette.surface,
            },
          ]}
        >
          <Ionicons name="medkit" size={badgeSize} color="#FFFFFF" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    overflow: 'hidden',
  },
  badge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    backgroundColor: '#0EA5E9',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
