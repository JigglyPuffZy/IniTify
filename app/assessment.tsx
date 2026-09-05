import { Screen } from '@/src/components/layout/Screen';
import { RiskLevelBadge } from '@/src/components/RiskLevelBadge';
import { EmptyState, SectionHeader, SurfaceCard } from '@/src/components/ScreenContainer';
import { Button } from '@/src/components/UiComponents';
import { RISK_LEVEL_LABELS } from '@/src/constants/risk-levels';
import { useIniTify } from '@/src/context/IniTifyContext';
import { radius, spacing, typography } from '@/src/theme';
import type { LegacyThemeColors } from '@/src/theme/legacy-colors';
import { useAppTheme } from '@/src/theme/useAppTheme';
import { useResponsive } from '@/src/utils/responsive';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function AssessmentScreen() {
  const router = useRouter();
  const { profile, assessment, runAssessment } = useIniTify();
  const { horizontalPadding } = useResponsive();
  const { colors, isDark } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  if (!profile) return <Redirect href="/" />;

  return (
    <Screen
      overline="Assessment"
      title="Heat risk"
      subtitle="How IniTify evaluated your current risk"
      back
      horizontalPadding={horizontalPadding}
    >
      <RiskLevelBadge level={assessment?.level ?? null} />

      {!assessment ? (
        <EmptyState
          title="No assessment yet"
          message="Run a risk check from Home to see your personalized heat-risk level."
          icon="speedometer-outline"
          actionLabel="Go to Home"
          onAction={() => router.push('/home')}
        />
      ) : (
        <>
          {assessment.reason ? (
            <SurfaceCard style={styles.reasonCard}>
              <Text style={styles.reasonLabel}>Why this level</Text>
              <Text style={styles.reasonText}>{assessment.reason}</Text>
            </SurfaceCard>
          ) : assessment.message ? (
            <View>
              <Text style={styles.message}>{assessment.message}</Text>
            </View>
          ) : null}

          {assessment.riskScore != null ? (
            <View style={styles.scoreRow}>
              <View style={styles.scoreChip}>
                <Text style={styles.scoreLabel}>Risk score</Text>
                <Text style={styles.scoreValue}>{assessment.riskScore}</Text>
              </View>
              {assessment.environmentalLevel ? (
                <View style={styles.scoreChip}>
                  <Text style={styles.scoreLabel}>Environmental</Text>
                  <Text style={styles.scoreValue}>
                    {RISK_LEVEL_LABELS[assessment.environmentalLevel]}
                  </Text>
                </View>
              ) : null}
              {assessment.vulnerabilityScore != null ? (
                <View style={styles.scoreChip}>
                  <Text style={styles.scoreLabel}>Vulnerability</Text>
                  <Text style={styles.scoreValue}>{assessment.vulnerabilityScore}</Text>
                </View>
              ) : null}
            </View>
          ) : null}

          <Text style={styles.timestamp}>
            Last checked {new Date(assessment.assessedAt).toLocaleString()}
          </Text>

          {assessment.primaryRiskFactors && assessment.primaryRiskFactors.length > 0 ? (
            <View>
              <SectionHeader title="Primary risk factors" subtitle="What influenced this result" />
              <SurfaceCard>
                {assessment.primaryRiskFactors.map((factor, index) => (
                  <View
                    key={factor}
                    style={[
                      styles.factorRow,
                      index < assessment.primaryRiskFactors!.length - 1 && styles.row,
                    ]}
                  >
                    <Ionicons name="ellipse" size={6} color={colors.primary} />
                    <Text style={styles.factorText}>{factor}</Text>
                  </View>
                ))}
              </SurfaceCard>
            </View>
          ) : null}

          {assessment.recommendedAction ? (
            <View>
              <SectionHeader title="Recommended action" />
              <SurfaceCard style={styles.actionCard}>
                <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
                <Text style={styles.actionText}>{assessment.recommendedAction}</Text>
              </SurfaceCard>
            </View>
          ) : null}

          <View>
            <SectionHeader title="Inputs used" subtitle="Data behind this result" />
            <SurfaceCard>
              <InputRow styles={styles} label="Heat index" value={formatValue(assessment.inputs.heatIndex, '°C')} />
              <InputRow
                styles={styles}
                label="Humidity"
                value={
                  assessment.inputs.humidityPercent != null
                    ? `${Math.round(assessment.inputs.humidityPercent)}%`
                    : '—'
                }
              />
              <InputRow styles={styles} label="Age" value={formatValue(assessment.inputs.age, ' yrs')} />
              <InputRow styles={styles} label="Health" value={assessment.inputs.healthCondition ?? '—'} />
              <InputRow styles={styles} label="Activity" value={assessment.inputs.activityLevel ?? '—'} />
              <InputRow styles={styles} label="Hydration" value={assessment.inputs.hydrationStatus ?? '—'} />
              <InputRow
                styles={styles}
                label="How you feel"
                value={assessment.inputs.generalStatus ?? '—'}
                last
              />
            </SurfaceCard>
          </View>

          <View style={styles.actions}>
            <Button label="Check again" onPress={runAssessment} icon="refresh" />
            <Button
              label="View safety tips"
              variant="secondary"
              onPress={() => router.push('/recommendations')}
              icon="heart-outline"
            />
          </View>
        </>
      )}
    </Screen>
  );
}

function formatValue(value: number | null, suffix: string) {
  return value !== null ? `${value}${suffix}` : '—';
}

function InputRow({
  label,
  value,
  last,
  styles,
}: {
  label: string;
  value: string;
  last?: boolean;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={[styles.row, last && styles.rowLast]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function createStyles(colors: LegacyThemeColors, isDark: boolean) {
  return StyleSheet.create({
    message: {
      ...typography.body,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    reasonCard: { marginBottom: spacing.md },
    reasonLabel: {
      ...typography.overline,
      color: colors.textMuted,
      marginBottom: spacing.sm,
    },
    reasonText: {
      ...typography.body,
      color: colors.text,
      lineHeight: 22,
    },
    scoreRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginBottom: spacing.sm,
    },
    scoreChip: {
      flex: 1,
      minWidth: 96,
      backgroundColor: colors.primarySoft,
      borderRadius: radius.md,
      padding: spacing.md,
      alignItems: 'center',
    },
    scoreLabel: { ...typography.caption, color: colors.textMuted },
    scoreValue: {
      ...typography.h3,
      color: isDark ? colors.text : colors.primary,
      marginTop: 2,
      fontSize: 16,
    },
    timestamp: {
      ...typography.caption,
      color: colors.textLight,
      textAlign: 'center',
      marginBottom: spacing.lg,
    },
    factorRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      paddingVertical: spacing.xs,
    },
    factorText: {
      ...typography.bodySm,
      color: colors.textSecondary,
      flex: 1,
      lineHeight: 20,
    },
    actionCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.md,
    },
    actionText: {
      ...typography.bodySm,
      color: colors.textSecondary,
      flex: 1,
      lineHeight: 20,
    },
    actions: { gap: spacing.md },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.borderLight,
    },
    rowLast: { borderBottomWidth: 0, paddingBottom: 0 },
    rowLabel: { ...typography.bodySm, color: colors.textMuted },
    rowValue: { ...typography.bodySm, fontWeight: '700', color: colors.text },
  });
}
