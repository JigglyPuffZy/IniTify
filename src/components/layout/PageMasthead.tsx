import { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { radius, spacing, typography, fonts } from '@/src/theme';
import { useAppTheme } from '@/src/theme/useAppTheme';
import type { AppPalette } from '@/src/theme/palettes';
import { useResponsive } from '@/src/utils/responsive';

export function HeaderIconButton({
  icon,
  onPress,
  accessibilityLabel,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
  accessibilityLabel: string;
}) {
  const { palette, isDark } = useAppTheme();
  const { mastheadTitleSize, isCompact } = useResponsive();
  const styles = useMemo(
    () => createStyles(palette, isDark, mastheadTitleSize, isCompact),
    [palette, isDark, mastheadTitleSize, isCompact],
  );

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.headerIconBtn, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={6}
    >
      <Ionicons name={icon} size={20} color={palette.primary} />
    </Pressable>
  );
}

export interface PageMastheadProps {
  overline?: string;
  title: string;
  subtitle?: string;
  /** Shows a live indicator beside subtitle */
  live?: boolean;
  back?: boolean;
  onBackPress?: () => void;
  headerRight?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** Premium editorial page header — rectangle frame + large title */
export function PageMasthead({
  overline,
  title,
  subtitle,
  live,
  back,
  onBackPress,
  headerRight,
  style,
}: PageMastheadProps) {
  const router = useRouter();
  const { palette, isDark } = useAppTheme();
  const { mastheadTitleSize, isCompact } = useResponsive();
  const styles = useMemo(
    () => createStyles(palette, isDark, mastheadTitleSize, isCompact),
    [palette, isDark, mastheadTitleSize, isCompact],
  );

  function handleBack() {
    if (onBackPress) {
      onBackPress();
      return;
    }
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/home');
  }

  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.frameOuter}>
        <View style={styles.frameGhost} pointerEvents="none" />
        <View style={styles.frameRect}>
          {back ? (
            <Pressable
              onPress={handleBack}
              style={({ pressed }) => [styles.backPill, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              hitSlop={6}
            >
              <Ionicons name="chevron-back" size={20} color={palette.text} />
            </Pressable>
          ) : null}

          <View style={styles.rectAccent} pointerEvents="none" />

          <View style={styles.titleRow}>
            <View style={styles.textBlock}>
              {overline ? <Text style={styles.overline}>{overline}</Text> : null}
              <Text style={styles.title} accessibilityRole="header" numberOfLines={2}>
                {title}
              </Text>
            </View>
            {headerRight ? <View style={styles.headerRight}>{headerRight}</View> : null}
          </View>

          {subtitle || live ? (
            <View style={[styles.metaRow, styles.metaRowInset]}>
              {live ? <View style={styles.liveDot} /> : null}
              {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
              {live && !subtitle ? <Text style={styles.subtitle}>Live</Text> : null}
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

export interface HomeMastheadProps {
  greeting: string;
  name: string;
  location: string;
  isLive?: boolean;
  avatarLetter: string;
  onProfilePress: () => void;
  style?: StyleProp<ViewStyle>;
}

/** Home tab masthead — greeting + name + avatar */
export function HomeMasthead({
  greeting,
  name,
  location,
  isLive,
  avatarLetter,
  onProfilePress,
  style,
}: HomeMastheadProps) {
  const { palette, isDark } = useAppTheme();
  const { mastheadTitleSize, isCompact } = useResponsive();
  const styles = useMemo(
    () => createStyles(palette, isDark, mastheadTitleSize, isCompact),
    [palette, isDark, mastheadTitleSize, isCompact],
  );

  return (
    <View style={[styles.homeWrap, style]}>
      <View style={styles.frameOuter}>
        <View style={styles.frameGhost} pointerEvents="none" />
        <View style={styles.frameRect}>
          <View style={styles.rectAccent} pointerEvents="none" />

          <View style={styles.homeRow}>
            <View style={styles.textBlock}>
              <Text style={styles.greeting}>{greeting}</Text>
              <Text style={styles.title} accessibilityRole="header" numberOfLines={1}>
                {name}
              </Text>
              <View style={styles.metaRow}>
                <Ionicons name="location-sharp" size={12} color={palette.primary} />
                <Text style={styles.subtitle} numberOfLines={1}>
                  {location}
                </Text>
                {isLive ? (
                  <>
                    <Text style={styles.metaDot}>·</Text>
                    <View style={styles.liveDot} />
                    <Text style={[styles.subtitle, styles.liveLabel]}>Live</Text>
                  </>
                ) : null}
              </View>
            </View>

            <Pressable
              onPress={onProfilePress}
              style={({ pressed }) => [styles.avatarBtn, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Open profile"
            >
              <LinearGradient colors={['#3B82F6', '#1D4ED8']} style={styles.avatar}>
                <Text style={styles.avatarLetter}>{avatarLetter}</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

/** Subtle blue wash behind page headers */
export function ScreenTopAccent() {
  const { palette, isDark } = useAppTheme();

  return (
    <LinearGradient
      colors={
        isDark
          ? ['rgba(37,99,235,0.35)', 'rgba(37,99,235,0.08)', 'transparent']
          : ['rgba(147,197,253,0.55)', 'rgba(147,197,253,0.15)', 'transparent']
      }
      style={accentStyles.gradient}
      pointerEvents="none"
    />
  );
}

const accentStyles = StyleSheet.create({
  gradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
    pointerEvents: 'none',
  },
});

function createStyles(
  p: AppPalette,
  isDark: boolean,
  mastheadTitleSize: number,
  isCompact: boolean,
) {
  return StyleSheet.create({
    wrap: {
      marginBottom: spacing.xl,
    },
    homeWrap: {
      marginBottom: spacing.xl,
    },
    frameOuter: {
      position: 'relative',
      marginTop: spacing.md,
    },
    frameGhost: {
      position: 'absolute',
      top: -6,
      left: 10,
      right: -10,
      bottom: 6,
      borderRadius: radius.lg,
      borderWidth: 1.5,
      borderColor: isDark ? 'rgba(59,130,246,0.35)' : 'rgba(37,99,235,0.22)',
      backgroundColor: 'transparent',
    },
    frameRect: {
      backgroundColor: p.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: p.border,
      paddingVertical: isCompact ? spacing.md : spacing.lg,
      paddingHorizontal: isCompact ? spacing.md : spacing.lg,
      gap: spacing.sm,
      overflow: 'hidden',
    },
    rectAccent: {
      position: 'absolute',
      top: 0,
      left: 0,
      width: 4,
      height: '100%',
      backgroundColor: p.primary,
      borderTopLeftRadius: radius.lg,
      borderBottomLeftRadius: radius.lg,
    },
    backPill: {
      width: 40,
      height: 40,
      borderRadius: radius.sm,
      backgroundColor: p.surfaceInset,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: p.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.xs,
      marginLeft: spacing.xs,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.md,
      flexWrap: 'wrap',
    },
    homeRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: spacing.md,
    },
    textBlock: { flex: 1, minWidth: 0, gap: 4, paddingLeft: spacing.sm },
    headerRight: {
      flexShrink: 0,
      marginTop: 4,
    },
    headerIconBtn: {
      width: 40,
      height: 40,
      borderRadius: radius.sm,
      backgroundColor: p.surfaceInset,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: p.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    overline: {
      ...typography.overline,
      color: p.primary,
    },
    greeting: {
      ...typography.overline,
      color: p.textMuted,
      textTransform: 'capitalize',
    },
    title: {
      fontFamily: fonts.header,
      fontSize: mastheadTitleSize,
      letterSpacing: -1,
      lineHeight: mastheadTitleSize + 6,
      color: p.text,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      flexWrap: 'wrap',
    },
    metaRowInset: {
      paddingLeft: spacing.sm,
    },
    metaDot: { color: p.textLight, fontSize: 12 },
    liveDot: {
      width: 6,
      height: 6,
      borderRadius: radius.pill,
      backgroundColor: p.primary,
    },
    liveLabel: { color: p.primary },
    subtitle: {
      ...typography.caption,
      fontFamily: fonts.bodyMedium,
      color: p.textSecondary,
    },
    avatarBtn: { flexShrink: 0, marginTop: 4 },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarLetter: {
      fontFamily: fonts.headerSemi,
      fontSize: 18,
      color: '#FFF',
    },
    pressed: { opacity: 0.88 },
  });
}
