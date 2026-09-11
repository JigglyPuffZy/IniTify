import { HeatIndexClassificationCard } from '@/src/components/HeatIndexClassificationCard';
import { Screen } from '@/src/components/layout/Screen';
import { RiskLevelBadge } from '@/src/components/RiskLevelBadge';
import { EmptyState, SectionHeader, SurfaceCard } from '@/src/components/ScreenContainer';
import { Button } from '@/src/components/UiComponents';
import {
  formatHeatIndexAssessmentLine,
  RISK_LEVEL_LABELS,
} from '@/src/constants/risk-levels';
import { useIniTify } from '@/src/context/IniTifyContext';
import { useRelativeTime } from '@/src/hooks/useRelativeTime';
import { radius, spacing, typography, fonts } from '@/src/theme';
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
  const responsive = useResponsive();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (!profile) return <Redirect href="/" />;

  const activeLevel = assessment?.level ?? null;
  const environmentalLevel = assessment?.environmentalLevel ?? activeLevel;
  const heatIndexC = assessment?.inputs.heatIndex ?? null;
  const humidity = assessment?.inputs.humidityPercent;
  const factLine = formatHeatIndexAssessmentLine(heatIndexC, environmentalLevel);
  const assessedLabel = useRelativeTime(assessment?.assessedAt);
  const personalEscalated =
    environmentalLevel != null && activeLevel != null && environmentalLevel !== activeLevel;

  const { healthConditions, activityLevel, hydrationStatus, generalStatus, age } = profile.riskFactors;
  const vulnerabilityScore = assessment?.vulnerabilityScore;

  return (
    <Screen
      overline="Assessment"
      title="Your heat risk"
      subtitle="Live heat index adapted to your health profile"
      back
      horizontalPadding={responsive.horizontalPadding}
    >
      {!assessment || !activeLevel ? (
        <EmptyState
          title="No assessment yet"
          message="Open Home and wait for live weather, or pull down to refresh."
          icon="speedometer-outline"
          actionLabel="Go to Home"
          onAction={() => router.push('/home')}
        />
      ) : (
        <>
          <View style={styles.badgeWrap}>
            <RiskLevelBadge level={activeLevel} />
            {personalEscalated && environmentalLevel ? (
              <Text style={styles.escalationNote}>
                Higher than outdoor level ({RISK_LEVEL_LABELS[environmentalLevel]}) due to your
                health profile
              </Text>
            ) : null}
          </View>

          <SurfaceCard style={styles.factCard}>
            <Text style={styles.factText}>{assessment.reason ?? factLine}</Text>
            {vulnerabilityScore != null ? (
              <Text style={styles.vulnerabilityLine}>
                Total vulnerability score: {vulnerabilityScore}
              </Text>
            ) : null}
            <Text style={styles.factMeta}>Updated {assessedLabel}</Text>
          </SurfaceCard>

          <HeatIndexClassificationCard
            activeLevel={environmentalLevel ?? activeLevel}
            heatIndexC={heatIndexC}
            style={styles.classificationCard}
          />

          {assessment.recommendedAction ? (
            <View style={styles.section}>
              <SectionHeader title="What to do" />
              <SurfaceCard style={styles.actionCard}>
                <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
                <Text style={styles.actionText}>{assessment.recommendedAction}</Text>
              </SurfaceCard>
            </View>
          ) : null}

          {assessment.primaryRiskFactors && assessment.primaryRiskFactors.length > 0 ? (
            <View style={styles.section}>
              <SectionHeader title="Risk factors" subtitle="What shaped this assessment" />
              <SurfaceCard>
                {assessment.primaryRiskFactors.map((factor, index) => (
                  <View
                    key={factor}
                    style={[
                      styles.factorRow,
                      index === assessment.primaryRiskFactors!.length - 1 && styles.factorRowLast,
                    ]}
                  >
                    <Ionicons name="alert-circle-outline" size={16} color={colors.primary} />
                    <Text style={styles.factorText}>{factor}</Text>
                  </View>
                ))}
              </SurfaceCard>
            </View>
          ) : null}

          <View style={styles.section}>
            <SectionHeader
              title="Decision tree inputs"
              subtitle="Age, health, activity & hydration — per manuscript factors"
            />
            <SurfaceCard>
              <InputRow styles={styles} label="Age" value={age != null ? `${age} years` : 'Not set'} />
              <InputRow
                styles={styles}
                label="Hydration"
                value={hydrationStatus ?? 'Not set'}
                highlight={
                  hydrationStatus === 'Needs Hydration' ||
                  hydrationStatus === 'Dehydrated / Concerning'
                }
              />
              <InputRow
                styles={styles}
                label="Conditions"
                value={
                  healthConditions?.filter((c) => c !== 'None').join(', ') ||
                  profile.riskFactors.healthCondition ||
                  'None'
                }
              />
              <InputRow styles={styles} label="Activity" value={activityLevel ?? 'Not set'} last />
            </SurfaceCard>
          </View>

          <View style={styles.section}>
            <SectionHeader
              title="Tify check-in"
              subtitle="General status is tracked for check-ins — not scored in the decision tree"
            />
            <SurfaceCard>
              <InputRow
                styles={styles}
                label="How you feel"
                value={generalStatus ?? 'Not set'}
                last
              />
            </SurfaceCard>
          </View>

          <View style={styles.section}>
            <SectionHeader title="Live weather" subtitle="Outdoor heat level" />
            <SurfaceCard>
              <InputRow
                styles={styles}
                label="Heat index"
                value={heatIndexC != null ? `${Number(heatIndexC.toFixed(1))}°C` : '—'}
              />
              <InputRow
                styles={styles}
                label="Outdoor level"
                value={environmentalLevel ? RISK_LEVEL_LABELS[environmentalLevel] : '—'}
              />
              <InputRow
                styles={styles}
                label="Humidity"
                value={humidity != null ? `${Math.round(humidity)}%` : '—'}
                last
              />
            </SurfaceCard>
          </View>

          <View style={styles.actions}>
            <Button label="Refresh assessment" onPress={runAssessment} icon="refresh" />
            <Button
              label="Update health profile"
              variant="secondary"
              onPress={() => router.push('/health-profile')}
              icon="person-outline"
            />
            <Button
              label="Check in with Tify"
              variant="secondary"
              onPress={() => router.push('/check-in')}
              icon="pulse-outline"
            />
          </View>
        </>
      )}
    </Screen>
  );
}

function InputRow({
  label,
  value,
  last,
  highlight,
  styles,
}: {
  label: string;
  value: string;
  last?: boolean;
  highlight?: boolean;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={[styles.row, last && styles.rowLast]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, highlight && styles.rowValueWarn]}>{value}</Text>
    </View>
  );
}

function createStyles(colors: LegacyThemeColors) {
  return StyleSheet.create({
    badgeWrap: {
      width: '100%',
      marginBottom: spacing.md,
      gap: spacing.sm,
    },
    escalationNote: {
      ...typography.caption,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    factCard: {
      marginBottom: spacing.lg,
      gap: spacing.sm,
    },
    factText: {
      ...typography.body,
      fontWeight: '600',
      color: colors.text,
      lineHeight: 22,
    },
    factMeta: {
      ...typography.caption,
      color: colors.textMuted,
      lineHeight: 18,
    },
    vulnerabilityLine: {
      ...typography.bodySm,
      fontFamily: fonts.bodySemiBold,
      color: colors.primary,
      lineHeight: 20,
    },
    classificationCard: {
      marginBottom: spacing.lg,
    },
    section: {
      marginBottom: spacing.md,
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
    factorRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      paddingVertical: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.borderLight,
    },
    factorRowLast: {
      borderBottomWidth: 0,
      paddingBottom: 0,
    },
    factorText: {
      ...typography.bodySm,
      color: colors.textSecondary,
      flex: 1,
      lineHeight: 18,
    },
    actions: { gap: spacing.md, marginTop: spacing.sm },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.borderLight,
    },
    rowLast: { borderBottomWidth: 0, paddingBottom: 0 },
    rowLabel: {
      ...typography.bodySm,
      color: colors.textMuted,
      flexShrink: 0,
      minWidth: 88,
    },
    rowValue: {
      ...typography.bodySm,
      fontFamily: fonts.bodySemiBold,
      color: colors.text,
      flex: 1,
      textAlign: 'right',
    },
    rowValueWarn: {
      color: '#D97706',
    },
  });
}
