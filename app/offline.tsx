import { useEffect, useMemo, useState } from 'react';
import { Text, StyleSheet, View } from 'react-native';
import { Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useIniTify } from '@/src/context/IniTifyContext';
import { Screen } from '@/src/components/layout/Screen';
import { EmptyState, SectionHeader, SurfaceCard } from '@/src/components/ScreenContainer';
import { RiskLevelBadge } from '@/src/components/RiskLevelBadge';
import { offlineCacheService } from '@/src/services/offline-cache/offline-cache.service';
import { getFirstAidGuidanceForProfile } from '@/src/constants/first-aid';
import type { HeatIndexReading } from '@/src/models/environmental';
import type { RiskAssessmentResult } from '@/src/models/risk';
import { useResponsive } from '@/src/utils/responsive';
import { layout, radius, spacing, typography } from '@/src/theme';
import { useAppTheme } from '@/src/theme/useAppTheme';
import type { LegacyThemeColors } from '@/src/theme/legacy-colors';

export default function OfflineScreen() {
  const { profile } = useIniTify();
  const { horizontalPadding } = useResponsive();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [cachedHeat, setCachedHeat] = useState<HeatIndexReading | null>(null);
  const [cachedAssessment, setCachedAssessment] = useState<RiskAssessmentResult | null>(null);

  useEffect(() => {
    async function load() {
      const [heat, assessment] = await Promise.all([
        offlineCacheService.getLatestHeatReading(),
        offlineCacheService.getLatestAssessment(),
      ]);
      setCachedHeat(heat);
      setCachedAssessment(assessment);
    }
    load();
  }, []);

  if (!profile) return <Redirect href="/" />;

  const firstAid = getFirstAidGuidanceForProfile(profile);
  const hasData = cachedHeat || cachedAssessment;

  return (
    <Screen
      overline="Works offline"
      title="Saved info"
      subtitle="Your last readings and first-aid guidance, always available"
      back
      horizontalPadding={horizontalPadding}
    >
      {!hasData ? (
        <EmptyState
          title="Nothing saved yet"
          message="Use IniTify while online to save your heat readings and risk checks here."
          icon="bookmark-outline"
        />
      ) : (
        <View style={styles.grid}>
          {cachedHeat ? (
            <SurfaceCard style={styles.statCard}>
              <Text style={styles.statLabel}>Last heat reading</Text>
              <Text style={styles.statValue}>{cachedHeat.heatIndex}°C</Text>
              <Text style={styles.statMeta}>
                {new Date(cachedHeat.retrievedAt).toLocaleString()}
              </Text>
            </SurfaceCard>
          ) : null}

          {cachedAssessment ? (
            <SurfaceCard style={styles.statCard}>
              <Text style={styles.statLabel}>Last risk check</Text>
              <View style={styles.badgeWrap}>
                <RiskLevelBadge level={cachedAssessment.level} size="small" />
              </View>
              <Text style={styles.statMeta}>
                {new Date(cachedAssessment.assessedAt).toLocaleString()}
              </Text>
            </SurfaceCard>
          ) : null}
        </View>
      )}

      <View>
        <SectionHeader
          title={firstAid.title}
          subtitle="Available without internet"
        />
        <SurfaceCard>
          <Text style={styles.groupLabel}>General heat first aid</Text>
          {firstAid.generalSections.map((section, index) => (
            <View key={section.heading} style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{index + 1}</Text>
              </View>
              <View style={styles.stepBody}>
                <Text style={styles.firstAidHeading}>{section.heading}</Text>
                <Text style={styles.firstAidBody}>{section.body}</Text>
              </View>
            </View>
          ))}
          {firstAid.conditionBlocks.map((block) => (
            <View key={block.conditionKey}>
              <Text style={styles.groupLabel}>For {block.conditionLabel}</Text>
              {block.sections.map((section, index) => (
                <View key={`${block.conditionKey}-${section.heading}`} style={styles.step}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>{index + 1}</Text>
                  </View>
                  <View style={styles.stepBody}>
                    <Text style={styles.firstAidHeading}>{section.heading}</Text>
                    <Text style={styles.firstAidBody}>{section.body}</Text>
                  </View>
                </View>
              ))}
            </View>
          ))}
        </SurfaceCard>
      </View>

      <View style={styles.footer}>
        <Ionicons name="cloud-offline-outline" size={14} color={colors.textLight} />
        <Text style={styles.footerText}>Stored on this device only</Text>
      </View>
    </Screen>
  );
}

function createStyles(colors: LegacyThemeColors) {
  return StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: layout.itemGap },
  statCard: { flex: 1, minWidth: 150 },
  statLabel: { ...typography.overline, color: colors.textMuted, marginBottom: spacing.sm },
  statValue: { fontSize: 30, fontWeight: '800', color: colors.text, letterSpacing: -0.8 },
  badgeWrap: { marginVertical: 2 },
  statMeta: { ...typography.caption, color: colors.textLight, marginTop: spacing.sm },
  step: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  stepNumberText: { ...typography.caption, fontWeight: '800', color: colors.primary },
  stepBody: { flex: 1 },
  groupLabel: {
    ...typography.overline,
    color: colors.primary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  firstAidHeading: { ...typography.label, color: colors.text, marginBottom: 4 },
  firstAidBody: { ...typography.bodySm, color: colors.textSecondary, lineHeight: 20 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  footerText: { ...typography.caption, color: colors.textLight },
  });
}
