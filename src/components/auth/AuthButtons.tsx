import { useMemo } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { brand } from '@/src/components/auth/auth-brand';
import { useAppTheme } from '@/src/theme/useAppTheme';
import { cardShadow, fonts, layout, radius, spacing, typography } from '@/src/theme';
import type { AppPalette } from '@/src/theme/palettes';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

interface AuthButtonProps {
  label: string;
  onPress: () => void;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function AuthGradientButton({
  label,
  onPress,
  icon,
  loading,
  disabled,
  style,
}: AuthButtonProps) {
  const shadow = useMemo(() => cardShadow(), []);
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={({ pressed }) => [
        styles.gradientWrap,
        shadow,
        style,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
      ]}
    >
      <LinearGradient
        colors={['#1E40AF', '#2563EB', '#3B82F6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <View style={styles.gradientContent}>
            {icon ? <Ionicons name={icon} size={20} color="#FFFFFF" /> : null}
            <Text style={styles.gradientLabel}>{label}</Text>
          </View>
        )}
      </LinearGradient>
    </Pressable>
  );
}

export function AuthSoftButton({
  label,
  onPress,
  icon,
  loading,
  disabled,
  style,
}: AuthButtonProps) {
  const { palette, isDark } = useAppTheme();
  const styles = useMemo(() => createSoftStyles(palette, isDark), [palette, isDark]);
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={({ pressed }) => [
        styles.soft,
        style,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isDark ? '#FFFFFF' : palette.primary} />
      ) : (
        <>
          <View style={styles.softContent}>
            {icon ? (
              <Ionicons
                name={icon}
                size={20}
                color={isDark ? brand.onDark : palette.primary}
              />
            ) : null}
            <Text style={styles.softLabel}>{label}</Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={18}
            color={isDark ? brand.onDarkFaint : palette.textMuted}
            style={styles.softChevron}
          />
        </>
      )}
    </Pressable>
  );
}

export function AuthOrDivider() {
  const { palette, isDark } = useAppTheme();
  const lineColor = isDark ? 'rgba(255,255,255,0.18)' : palette.border;

  return (
    <View style={styles.orRow}>
      <View style={[styles.orLine, { backgroundColor: lineColor }]} />
      <Text style={[styles.orText, { color: isDark ? brand.onDarkFaint : palette.textMuted }]}>
        or
      </Text>
      <View style={[styles.orLine, { backgroundColor: lineColor }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  gradientWrap: {
    width: '100%',
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  gradient: {
    width: '100%',
    minHeight: layout.buttonHeight + 6,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md + 2,
  },
  gradientContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    maxWidth: '100%',
  },
  gradientLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 17,
    lineHeight: 22,
    color: '#FFFFFF',
    letterSpacing: 0.15,
    textAlign: 'center',
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : null),
  },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginVertical: spacing.xs,
  },
  orLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  orText: {
    ...typography.caption,
    textTransform: 'lowercase',
    fontFamily: fonts.bodyMedium,
  },
  disabled: { opacity: 0.55 },
  pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
});

function createSoftStyles(p: AppPalette, isDark: boolean) {
  return StyleSheet.create({
    soft: {
      width: '100%',
      minHeight: layout.buttonHeight + 4,
      borderRadius: radius.lg,
      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#FFFFFF',
      borderWidth: isDark ? 1.5 : 1,
      borderColor: isDark ? 'rgba(255,255,255,0.28)' : 'rgba(37,99,235,0.14)',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md + 2,
      ...(isDark
        ? {}
        : {
            shadowColor: '#1E3A8A',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.08,
            shadowRadius: 12,
            elevation: 3,
          }),
    },
    softContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.lg,
    },
    softLabel: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 17,
      lineHeight: 22,
      color: isDark ? brand.onDark : p.primary,
      letterSpacing: 0.15,
      flexShrink: 0,
      textAlign: 'center',
      ...(Platform.OS === 'android' ? { includeFontPadding: false } : null),
    },
    softChevron: {
      position: 'absolute',
      right: spacing.lg,
    },
    disabled: { opacity: 0.55 },
    pressed: { opacity: 0.92, transform: [{ scale: 0.99 }] },
  });
}
