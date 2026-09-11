import { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ProfileAvatar } from '@/src/components/ProfileAvatar';
import { liveIndicatorColors } from '@/src/constants/live-indicator';
import type { ProfileAvatarId } from '@/src/constants/profile-avatars';
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
  avatarId?: ProfileAvatarId | null;
  onProfilePress: () => void;
  onAvatarPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

/** Home tab masthead — greeting + name + avatar */
export function HomeMasthead({
  greeting,
  name,
  location,
  isLive,
  avatarId,
  onProfilePress,
  onAvatarPress,
  style,
}: HomeMastheadProps) {
  const { palette, isDark } = useAppTheme();
  const { mastheadTitleSize, isCompact } = useResponsive();
  const styles = useMemo(
    () => createStyles(palette, isDark, mastheadTitleSize, isCompact),
    [palette, isDark, mastheadTitleSize, isCompact],
  );
  const live = liveIndicatorColors(isDark);

  return (
    <View style={[styles.homeWrap, style]}>
      <LinearGradient
        colors={isDark ? ['#1E3A8A', '#1E40AF'] : ['#EFF6FF', '#DBEAFE']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.welcomeCard}
      >
        <View style={styles.homeRow}>
          <View style={styles.textBlock}>
            <Text style={styles.greeting}>{greeting},</Text>
            <Text style={styles.title} accessibilityRole="header" numberOfLines={1}>
              {name}
            </Text>
            <Text style={styles.welcomeHint} numberOfLines={2}>
              Stay heat-safe in Tuguegarao today
            </Text>
            <View style={styles.metaRow}>
              <Ionicons name="location-sharp" size={12} color={palette.primary} />
              <Text style={styles.subtitle} numberOfLines={1}>{location}</Text>
              {isLive ? (
                <View style={styles.livePill}>
                  <View style={[styles.livePillDot, { backgroundColor: live.dot, borderColor: live.dotRing }]} />
                  <Text style={[styles.livePillText, { color: live.text }]}>Live</Text>
                </View>
              ) : null}
            </View>
          </View>

          <View style={styles.avatarCol}>
            <ProfileAvatar
              name={name}
              avatarId={avatarId}
              size="lg"
              showEditBadge
              onPress={onAvatarPress ?? onProfilePress}
              accessibilityLabel="Change profile avatar"
            />
            <Pressable
              onPress={onProfilePress}
              style={({ pressed }) => [styles.profileLink, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Open profile"
            >
              <Text style={styles.profileLinkText}>Profile</Text>
            </Pressable>
          </View>
        </View>
      </LinearGradient>
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
    welcomeCard: {
      borderRadius: radius.xxl,
      paddingVertical: isCompact ? spacing.lg : spacing.xl,
      paddingHorizontal: isCompact ? spacing.lg : spacing.xl,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(59,130,246,0.35)' : 'rgba(37,99,235,0.15)',
      overflow: 'hidden',
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
    textBlock: { flex: 1, minWidth: 0, gap: 4 },
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
      fontFamily: fonts.bodyMedium,
      fontSize: 15,
      color: isDark ? 'rgba(191,219,254,0.9)' : p.textSecondary,
      letterSpacing: 0.2,
    },
    title: {
      fontFamily: fonts.header,
      fontSize: mastheadTitleSize + 2,
      letterSpacing: -1,
      lineHeight: mastheadTitleSize + 8,
      color: isDark ? '#FFFFFF' : p.text,
    },
    welcomeHint: {
      ...typography.caption,
      color: isDark ? 'rgba(191,219,254,0.8)' : p.textMuted,
      lineHeight: 17,
      marginTop: 2,
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
    livePill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: radius.pill,
      backgroundColor: isDark ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.65)',
      marginLeft: 4,
    },
    livePillDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      borderWidth: 1,
    },
    livePillText: {
      fontSize: 10,
      fontFamily: fonts.bodySemiBold,
      letterSpacing: 0.3,
    },
    subtitle: {
      ...typography.caption,
      fontFamily: fonts.bodyMedium,
      color: isDark ? 'rgba(191,219,254,0.85)' : p.textSecondary,
    },
    avatarCol: {
      alignItems: 'center',
      gap: spacing.xs,
      flexShrink: 0,
    },
    profileLink: {
      paddingVertical: 2,
      paddingHorizontal: spacing.sm,
    },
    profileLinkText: {
      ...typography.caption,
      fontFamily: fonts.bodySemiBold,
      color: p.primary,
    },
    pressed: { opacity: 0.88 },
  });
}
