import { useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/src/components/UiComponents';
import { layout, radius, spacing, typography, cardShadow } from '@/src/theme';
import { useAppTheme } from '@/src/theme/useAppTheme';
import type { AppPalette } from '@/src/theme/palettes';

export function SectionHeader({
  title,
  subtitle,
  action,
  onActionPress,
}: {
  title: string;
  subtitle?: string;
  action?: string;
  onActionPress?: () => void;
}) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette, false), [palette]);

  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTextWrap}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      </View>
      {action && onActionPress ? (
        <Pressable
          onPress={onActionPress}
          style={({ pressed }) => [styles.sectionActionWrap, pressed && styles.sectionActionPressed]}
          hitSlop={8}
        >
          <Text style={styles.sectionAction}>{action}</Text>
          <Ionicons name="chevron-forward" size={14} color={palette.textMuted} />
        </Pressable>
      ) : action ? (
        <Text style={styles.sectionAction}>{action}</Text>
      ) : null}
    </View>
  );
}

export function SurfaceCard({
  children,
  style,
  elevated,
  padding = 'default',
  variant = 'default',
}: {
  children: React.ReactNode;
  style?: object;
  elevated?: boolean;
  padding?: 'default' | 'none' | 'compact' | 'large';
  variant?: 'default' | 'featured' | 'inset';
}) {
  const { palette, isDark } = useAppTheme();
  const styles = useMemo(() => createStyles(palette, isDark), [palette, isDark]);

  return (
    <View
      style={[
        styles.surfaceCard,
        variant === 'featured' && styles.surfaceCardFeatured,
        variant === 'inset' && styles.surfaceCardInset,
        elevated && styles.surfaceCardElevated,
        padding === 'compact' && styles.surfaceCardCompact,
        padding === 'large' && styles.surfaceCardLarge,
        padding === 'none' && styles.surfaceCardFlush,
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function LoadingState({ message = 'Loading…' }: { message?: string }) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette, false), [palette]);

  return (
    <SafeAreaView style={styles.loadingSafe}>
      <ActivityIndicator size="large" color={palette.primary} />
      <Text style={styles.loadingText}>{message}</Text>
    </SafeAreaView>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette, false), [palette]);

  return (
    <View style={styles.errorBox}>
      <Ionicons name="alert-circle-outline" size={22} color={palette.primary} />
      <Text style={styles.errorTitle}>Something went wrong</Text>
      <Text style={styles.errorMessage}>{message}</Text>
      {onRetry ? <Button label="Try again" onPress={onRetry} variant="secondary" /> : null}
    </View>
  );
}

export function EmptyState({
  title,
  message,
  icon = 'folder-open-outline',
  actionLabel,
  onAction,
}: {
  title?: string;
  message: string;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  actionLabel?: string;
  onAction?: () => void;
}) {
  const { palette, isDark } = useAppTheme();
  const styles = useMemo(() => createStyles(palette, isDark), [palette, isDark]);

  return (
    <View style={styles.emptyBox}>
      <View style={styles.emptyIconWrap}>
        <Ionicons name={icon} size={26} color={palette.primary} />
      </View>
      {title ? <Text style={styles.emptyTitle}>{title}</Text> : null}
      <Text style={styles.emptyMessage}>{message}</Text>
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} variant="secondary" fullWidth={false} />
      ) : null}
    </View>
  );
}

export function InfoBanner({
  message,
  variant = 'info',
  title,
}: {
  message: string;
  variant?: 'info' | 'warning' | 'cached' | 'emergency';
  title?: string;
}) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette, false), [palette]);

  const palettes = {
    info: { bg: palette.primarySoft, border: palette.primary, title: palette.text, icon: 'information-circle' as const },
    warning: { bg: palette.warningSoft, border: palette.warning, title: palette.warning, icon: 'warning' as const },
    cached: { bg: palette.primarySoft, border: palette.primary, title: palette.primary, icon: 'time' as const },
    emergency: { bg: palette.primarySoft, border: palette.primary, title: palette.primary, icon: 'alert-circle' as const },
  };
  const bannerPalette = palettes[variant];

  return (
    <View style={[styles.banner, { backgroundColor: bannerPalette.bg, borderColor: bannerPalette.border }]}>
      <View style={styles.bannerRow}>
        <Ionicons name={bannerPalette.icon} size={20} color={bannerPalette.border} />
        <View style={styles.bannerContent}>
          {title ? <Text style={[styles.bannerTitle, { color: bannerPalette.title }]}>{title}</Text> : null}
          <Text style={styles.bannerText}>{message}</Text>
        </View>
      </View>
    </View>
  );
}

function createStyles(p: AppPalette, isDark: boolean) {
  return StyleSheet.create({
    loadingSafe: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.lg,
      backgroundColor: p.background,
    },
    loadingText: { ...typography.bodySm, color: p.textMuted },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.md,
      gap: spacing.md,
    },
    sectionTextWrap: { flex: 1, minWidth: 0 },
    sectionTitle: {
      ...typography.h2,
      color: p.text,
    },
    sectionSubtitle: { ...typography.caption, color: p.textMuted, marginTop: 3 },
    sectionActionWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      paddingVertical: 4,
      paddingLeft: spacing.sm,
    },
    sectionActionPressed: { opacity: 0.75 },
    sectionAction: { ...typography.caption, color: p.textMuted, fontWeight: '600' },
    surfaceCard: {
      backgroundColor: p.surface,
      borderRadius: radius.xl,
      padding: layout.cardPadding,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: p.borderLight,
      ...cardShadow(),
    },
    surfaceCardFeatured: {
      backgroundColor: p.surface,
      borderColor: 'transparent',
      ...cardShadow(),
    },
    surfaceCardInset: {
      backgroundColor: p.surfaceInset,
      borderColor: 'transparent',
      ...cardShadow(),
    },
    surfaceCardCompact: { padding: spacing.md },
    surfaceCardLarge: { padding: layout.cardPaddingLg },
    surfaceCardFlush: { padding: 0, overflow: 'hidden' },
    surfaceCardElevated: {
      borderColor: 'transparent',
      ...cardShadow(),
    },
    emptyBox: {
      backgroundColor: p.surface,
      borderRadius: radius.xl,
      paddingVertical: spacing.xxl,
      paddingHorizontal: spacing.xl,
      borderWidth: 1,
      borderColor: p.borderLight,
      alignItems: 'center',
      gap: spacing.md,
      ...cardShadow(),
    },
    emptyIconWrap: {
      width: 56,
      height: 56,
      borderRadius: radius.pill,
      backgroundColor: p.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyTitle: { ...typography.h3, color: p.text, textAlign: 'center' },
    emptyMessage: { ...typography.bodySm, color: p.textMuted, textAlign: 'center', lineHeight: 20 },
    errorBox: {
      backgroundColor: p.primarySoft,
      borderRadius: radius.lg,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(37,99,235,0.25)' : 'rgba(37,99,235,0.2)',
      gap: spacing.sm,
      alignItems: 'flex-start',
    },
    errorTitle: { ...typography.h3, color: p.primary },
    errorMessage: { ...typography.bodySm, color: p.textSecondary },
    banner: {
      borderRadius: radius.lg,
      padding: spacing.lg,
      borderWidth: 1,
    },
    bannerRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
    bannerContent: { flex: 1 },
    bannerTitle: { ...typography.label, marginBottom: spacing.xs },
    bannerText: { ...typography.bodySm, color: p.textSecondary },
  });
}
