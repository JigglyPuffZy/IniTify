import { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { layout, radius, spacing, typography, cardShadow } from '@/src/theme';
import { useAppTheme } from '@/src/theme/useAppTheme';
import type { AppPalette } from '@/src/theme/palettes';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

interface ButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: IconName;
  fullWidth?: boolean;
  size?: 'md' | 'sm';
}

export function Button({
  label,
  onPress,
  disabled,
  loading,
  variant = 'primary',
  icon,
  fullWidth = true,
  size = 'md',
}: ButtonProps) {
  const { palette } = useAppTheme();
  const buttonStyles = useMemo(() => createButtonStyles(palette), [palette]);
  const isDisabled = disabled || loading;
  const onTintedBg = variant === 'primary' || variant === 'danger';

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={({ pressed }) => [
        buttonStyles.base,
        size === 'sm' && buttonStyles.sm,
        variant === 'primary' && buttonStyles.primary,
        variant === 'secondary' && buttonStyles.secondary,
        variant === 'ghost' && buttonStyles.ghost,
        variant === 'danger' && buttonStyles.danger,
        fullWidth && buttonStyles.fullWidth,
        isDisabled && buttonStyles.disabled,
        pressed && !isDisabled && buttonStyles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={onTintedBg ? '#FFFFFF' : palette.primary} />
      ) : icon ? (
        <Ionicons
          name={icon}
          size={size === 'sm' ? 16 : 18}
          color={onTintedBg ? '#FFFFFF' : palette.primary}
        />
      ) : null}
      <Text
        style={[
          buttonStyles.label,
          size === 'sm' && buttonStyles.labelSm,
          variant === 'secondary' && buttonStyles.secondaryLabel,
          variant === 'ghost' && buttonStyles.ghostLabel,
          (variant === 'primary' || variant === 'danger') && buttonStyles.lightLabel,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function createButtonStyles(p: AppPalette) {
  return StyleSheet.create({
    base: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      minHeight: layout.buttonHeight,
      paddingHorizontal: spacing.lg,
      borderRadius: radius.md,
    },
    sm: { minHeight: 40, paddingHorizontal: spacing.md },
    fullWidth: { width: '100%' },
    primary: { backgroundColor: p.primary },
    secondary: {
      backgroundColor: p.surfaceMuted,
      borderWidth: 1,
      borderColor: p.border,
    },
    ghost: { backgroundColor: p.primarySoft },
    danger: { backgroundColor: p.danger },
    disabled: { opacity: 0.5 },
    pressed: { opacity: 0.88 },
    label: { ...typography.button, color: '#FFFFFF' },
    labelSm: { fontSize: 14 },
    lightLabel: { color: '#FFFFFF' },
    secondaryLabel: { color: p.text },
    ghostLabel: { color: p.primary },
  });
}

interface NavRowProps {
  title: string;
  description?: string;
  href: string;
  icon: IconName;
  iconColor?: string;
  iconBg?: string;
}

export function NavRow({
  title,
  description,
  href,
  icon,
  iconColor,
  iconBg,
}: NavRowProps) {
  const router = useRouter();
  const { palette } = useAppTheme();
  const navStyles = useMemo(() => createNavStyles(palette), [palette]);
  const fg = iconColor ?? palette.primary;
  const bg = iconBg ?? palette.primarySoft;

  return (
    <Pressable
      onPress={() => router.push(href as never)}
      style={({ pressed }) => [navStyles.navRow, pressed && navStyles.pressed]}
      accessibilityRole="button"
    >
      <View style={navStyles.rowInner}>
        <View style={[navStyles.navIcon, { backgroundColor: bg }]}>
          <Ionicons name={icon} size={20} color={fg} />
        </View>
        <View style={navStyles.navText}>
          <Text style={navStyles.navTitle}>{title}</Text>
          {description ? (
            <Text style={navStyles.navDesc} numberOfLines={2}>
              {description}
            </Text>
          ) : null}
        </View>
        <Ionicons name="chevron-forward" size={18} color={palette.textMuted} />
      </View>
    </Pressable>
  );
}

function createNavStyles(p: AppPalette) {
  return StyleSheet.create({
    navRow: {
      width: '100%',
    },
    rowInner: {
      flexDirection: 'row',
      alignItems: 'center',
      width: '100%',
      gap: spacing.md,
      backgroundColor: p.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: p.border,
      padding: layout.cardPadding,
      ...cardShadow(),
    },
    navIcon: {
      width: 40,
      height: 40,
      borderRadius: radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    navText: { flex: 1, minWidth: 0 },
    navTitle: { ...typography.h3, color: p.text },
    navDesc: { ...typography.caption, color: p.textSecondary, marginTop: 2 },
    pressed: { opacity: 0.88 },
  });
}

interface MetricProps {
  label: string;
  value: string;
  hint?: string;
  icon?: IconName;
}

export function MetricTile({ label, value, hint, icon }: MetricProps) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createMetricStyles(palette), [palette]);

  return (
    <View style={styles.metric}>
      {icon ? (
        <View style={styles.metricIcon}>
          <Ionicons name={icon} size={16} color={palette.primary} />
        </View>
      ) : null}
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      {hint ? <Text style={styles.metricHint} numberOfLines={2}>{hint}</Text> : null}
    </View>
  );
}

export function RecommendationCard({ title, description }: { title: string; description: string }) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createMetricStyles(palette), [palette]);

  return (
    <View style={styles.recCard}>
      <View style={styles.recAccent} />
      <View style={styles.recBody}>
        <Text style={styles.recTitle}>{title}</Text>
        <Text style={styles.recDescription}>{description}</Text>
      </View>
    </View>
  );
}

interface QuickActionProps {
  label: string;
  icon: IconName;
  href: string;
  tint?: string;
}

export function QuickAction({ label, icon, href, tint }: QuickActionProps) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createQuickActionStyles(palette), [palette]);
  const color = tint ?? palette.primary;
  const softBg = `${color}24`;

  return (
    <Link href={href as never} asChild>
      <Pressable
        style={({ pressed }) => [styles.quickAction, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <View style={[styles.quickActionIcon, { backgroundColor: softBg }]}>
          <Ionicons name={icon} size={22} color={color} />
        </View>
        <Text style={styles.quickActionLabel}>{label}</Text>
      </Pressable>
    </Link>
  );
}

function createQuickActionStyles(p: AppPalette) {
  return StyleSheet.create({
    quickAction: {
      alignItems: 'center',
      gap: spacing.sm,
      minWidth: 72,
      padding: spacing.md,
      borderRadius: radius.lg,
      backgroundColor: p.surface,
      borderWidth: 1,
      borderColor: p.borderLight,
      ...cardShadow(),
    },
    quickActionIcon: {
      width: 44,
      height: 44,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    quickActionLabel: { ...typography.label, color: p.text, fontSize: 14 },
    pressed: { opacity: 0.88 },
  });
}

function createMetricStyles(p: AppPalette) {
  return StyleSheet.create({
    metric: {
      flex: 1,
      minWidth: 100,
      backgroundColor: p.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: p.borderLight,
      padding: layout.cardPadding,
      ...cardShadow(),
    },
    metricIcon: {
      width: 32,
      height: 32,
      borderRadius: radius.sm,
      backgroundColor: p.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.sm,
    },
    metricLabel: { ...typography.caption, color: p.textMuted, fontWeight: '600' },
    metricValue: {
      fontSize: 22,
      fontWeight: '700',
      color: p.text,
      letterSpacing: -0.4,
      marginTop: 2,
    },
    metricHint: { ...typography.caption, color: p.textLight, marginTop: 4 },
    recCard: {
      flexDirection: 'row',
      backgroundColor: p.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: p.borderLight,
      overflow: 'hidden',
      ...cardShadow(),
    },
    recAccent: {
      width: 3,
      backgroundColor: p.primary,
    },
    recBody: { flex: 1, padding: layout.cardPadding },
    recTitle: { ...typography.h3, color: p.text, marginBottom: spacing.xs },
    recDescription: { ...typography.bodySm, color: p.textMuted },
  });
}
