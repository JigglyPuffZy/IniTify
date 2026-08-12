import { useEffect, useState } from 'react';
import { ScrollView, Text, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import { useIniTify } from '@/src/context/IniTifyContext';
import {
  ScreenContainer,
  InfoBanner,
  EmptyState,
} from '@/src/components/ScreenContainer';
import { offlineCacheService } from '@/src/services/offline-cache/offline-cache.service';
import { FIRST_AID_GUIDANCE } from '@/src/constants/first-aid';
import type { HeatIndexReading } from '@/src/models/environmental';
import type { RiskAssessmentResult } from '@/src/models/risk';

export default function OfflineScreen() {
  const { profile } = useIniTify();
  const [cachedHeat, setCachedHeat] = useState<HeatIndexReading | null>(null);
  const [cachedAssessment, setCachedAssessment] =
    useState<RiskAssessmentResult | null>(null);

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

  const hasData = cachedHeat || cachedAssessment;

  return (
    <ScrollView style={styles.scroll}>
      <ScreenContainer title="Offline / Cached Data">
        <InfoBanner
          message="You are viewing cached information. Real-time updates, emergency notifications, and hospital navigation require an active internet connection."
          variant="cached"
        />

        {!hasData ? (
          <EmptyState message="No cached data available yet." />
        ) : null}

        {cachedHeat ? (
          <>
            <Text style={styles.section}>Cached Heat-Risk Information</Text>
            <Text style={styles.item}>
              Heat Index: {cachedHeat.heatIndex}°C
            </Text>
            <Text style={styles.item}>
              Retrieved: {new Date(cachedHeat.retrievedAt).toLocaleString()}
            </Text>
            <Text style={styles.item}>Source: {cachedHeat.source}</Text>
          </>
        ) : null}

        {cachedAssessment ? (
          <>
            <Text style={styles.section}>Cached Assessment</Text>
            <Text style={styles.item}>
              Level: {cachedAssessment.level ?? 'Unavailable'}
            </Text>
            <Text style={styles.item}>
              Assessed: {new Date(cachedAssessment.assessedAt).toLocaleString()}
            </Text>
          </>
        ) : null}

        <Text style={styles.section}>Essential Emergency Information</Text>
        <Text style={styles.item}>{FIRST_AID_GUIDANCE.title}</Text>
        {!FIRST_AID_GUIDANCE.isApproved ? (
          <Text style={styles.notice}>{FIRST_AID_GUIDANCE.notice}</Text>
        ) : null}
      </ScreenContainer>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  section: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 16,
    marginBottom: 8,
  },
  item: { fontSize: 14, color: '#334155', marginBottom: 4 },
  notice: { fontSize: 12, color: '#64748b', fontStyle: 'italic', marginTop: 4 },
});
