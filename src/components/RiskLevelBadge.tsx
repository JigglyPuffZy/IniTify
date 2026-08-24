import { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { HeatRiskLevel } from '@/src/models/risk';
import { RISK_LEVEL_COLORS, RISK_LEVEL_LABELS } from '@/src/constants/risk-levels';
import { radius, spacing, typography } from '@/src/theme';
import { useAppTheme } from '@/src/theme/useAppTheme';
import type { AppPalette } from '@/src/theme/palettes';

interface RiskLevelBadgeProps {
  level: HeatRiskLevel | null;
  size?: 'small' | 'large';
  message?: string;
}

const levelIcons: Record<HeatRiskLevel, React.ComponentProps<typeof Ionicons>['name']> = {
  LOW: 'shield-checkmark',
  MODERATE: 'alert-circle',
  HIGH: 'warning',
  EXTREME: 'flame',
};

export function RiskLevelBadge({ level, size = 'large', message }: RiskLevelBadgeProps) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);

  if (!level) {
    if (size === 'small') {
      return (
        <View style={styles.pillEmpty}>
          <Ionicons name="thermometer-outline" size={13} color={palette.textSecondary} />
          <Text style={styles.pillEmptyText}>Not checked</Text>
        </View>
      );
    }
    return (
      <View style={styles.empty}>
        <View style={styles.emptyIcon}>
          <Ionicons name="thermometer-outline" size={24} color={palette.textSecondary} />
        </View>
        <Text style={styles.emptyTitle}>Heat risk not checked</Text>
        <Text style={styles.emptyHint}>Run a check to see your personalized risk level</Text>
      </View>
    );
  }

  const color = RISK_LEVEL_COLORS[level];

  if (size === 'small') {
    return (
      <View style={[styles.pill, { backgroundColor: `${color}22`, borderColor: `${color}55` }]}>
        <Ionicons name={levelIcons[level]} size={13} color={color} />
        <Text style={[styles.pillText, { color }]}>{RISK_LEVEL_LABELS[level]}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.card, { borderColor: `${color}40`, backgroundColor: `${color}12` }]}>
      <View style={[styles.iconWrap, { backgroundColor: color }]}>
        <Ionicons name={levelIcons[level]} size={24} color="#FFFFFF" />
      </View>
      <Text style={[styles.levelLabel, { color }]}>{RISK_LEVEL_LABELS[level]}</Text>
      <Text style={styles.levelCaption}>Heat risk level</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

function createStyles(p: AppPalette) {
  return StyleSheet.create({
    card: {
      alignItems: 'center',
      padding: spacing.xl,
      borderRadius: radius.lg,
      borderWidth: 1,
      gap: spacing.sm,
    },
    iconWrap: {
      width: 52,
      height: 52,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.xs,
    },
    levelLabel: {
      fontSize: 28,
      fontWeight: '700',
      letterSpacing: -0.5,
    },
    levelCaption: {
      ...typography.caption,
      color: p.textSecondary,
      fontWeight: '600',
    },
    message: {
      ...typography.bodySm,
      color: p.textSecondary,
      textAlign: 'center',
      marginTop: spacing.sm,
      lineHeight: 20,
    },
    empty: {
      alignItems: 'center',
      padding: spacing.xl,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: p.border,
      backgroundColor: p.surfaceMuted,
      gap: spacing.sm,
    },
    emptyIcon: {
      width: 52,
      height: 52,
      borderRadius: radius.pill,
      backgroundColor: p.surface,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: p.borderLight,
    },
    emptyTitle: { ...typography.h3, color: p.text },
    emptyHint: { ...typography.bodySm, color: p.textSecondary, textAlign: 'center' },
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 6,
      paddingHorizontal: spacing.md,
      paddingVertical: 6,
      borderRadius: radius.pill,
      borderWidth: 1,
    },
    pillText: { fontSize: 12, fontWeight: '700' },
    pillEmpty: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 6,
      paddingHorizontal: spacing.md,
      paddingVertical: 6,
      borderRadius: radius.pill,
      backgroundColor: p.surfaceMuted,
      borderWidth: 1,
      borderColor: p.border,
    },
    pillEmptyText: { ...typography.caption, fontWeight: '600', color: p.textSecondary },
  });
}
