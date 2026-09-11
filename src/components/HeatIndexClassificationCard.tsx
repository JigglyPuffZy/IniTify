import { useMemo } from 'react';
import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { HeatRiskLevel } from '@/src/models/risk';
import {
  HEAT_INDEX_CLASSIFICATION_BANDS,
  RISK_LEVEL_COLORS,
} from '@/src/constants/risk-levels';
import { radius, spacing, typography } from '@/src/theme';
import { useAppTheme } from '@/src/theme/useAppTheme';
import type { AppPalette } from '@/src/theme/palettes';
import { SurfaceCard } from '@/src/components/ScreenContainer';

interface HeatIndexClassificationCardProps {
  activeLevel: HeatRiskLevel;
  heatIndexC?: number | null;
  style?: StyleProp<ViewStyle>;
}

export function HeatIndexClassificationCard({
  activeLevel,
  heatIndexC,
  style,
}: HeatIndexClassificationCardProps) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);

  const heatLabel =
    heatIndexC != null && !Number.isNaN(heatIndexC)
      ? `${Number(heatIndexC.toFixed(1))}°C`
      : null;

  return (
    <SurfaceCard style={[styles.card, style]}>
      <View style={styles.header}>
        <Text style={styles.title}>PAGASA heat index bands</Text>
        <Text style={styles.subtitle}>DOST-PAGASA · NOAA</Text>
      </View>

      {heatLabel ? (
        <View style={styles.currentRow}>
          <Ionicons name="flame" size={16} color={palette.primary} />
          <Text style={styles.currentText}>
            Current reading: <Text style={styles.currentValue}>{heatLabel}</Text>
          </Text>
        </View>
      ) : null}

      <View style={styles.bandList}>
        {HEAT_INDEX_CLASSIFICATION_BANDS.map((band) => {
          const active = band.level === activeLevel;
          const color = RISK_LEVEL_COLORS[band.level];

          return (
            <View
              key={band.level}
              style={[
                styles.bandRow,
                active && {
                  backgroundColor: `${color}14`,
                  borderColor: `${color}44`,
                },
              ]}
            >
              <View style={[styles.swatch, { backgroundColor: color }]} />
              <View style={styles.bandCopy}>
                <Text
                  style={[styles.bandLabel, active && styles.bandLabelActive]}
                  numberOfLines={2}
                >
                  {band.label}
                </Text>
                <Text style={styles.bandRange}>{band.rangeLabel}</Text>
              </View>
              {active ? (
                <Ionicons name="checkmark-circle" size={22} color={color} style={styles.check} />
              ) : null}
            </View>
          );
        })}
      </View>
    </SurfaceCard>
  );
}

function createStyles(p: AppPalette) {
  return StyleSheet.create({
    card: { gap: spacing.md },
    header: { gap: 2 },
    title: {
      ...typography.h3,
      fontSize: 17,
      color: p.text,
    },
    subtitle: {
      ...typography.caption,
      color: p.textMuted,
    },
    currentRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: radius.md,
      backgroundColor: p.primarySoft,
    },
    currentText: {
      ...typography.bodySm,
      color: p.textSecondary,
      flex: 1,
    },
    currentValue: {
      fontWeight: '700',
      color: p.primary,
    },
    bandList: { gap: spacing.sm },
    bandRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: p.borderLight,
      backgroundColor: p.surfaceMuted,
    },
    swatch: {
      width: 10,
      height: 36,
      borderRadius: radius.sm,
      flexShrink: 0,
    },
    bandCopy: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },
    bandLabel: {
      ...typography.bodySm,
      fontWeight: '700',
      color: p.textSecondary,
      lineHeight: 19,
      flexShrink: 1,
    },
    bandLabelActive: {
      color: p.text,
    },
    bandRange: {
      ...typography.caption,
      color: p.textMuted,
    },
    check: { flexShrink: 0 },
  });
}
