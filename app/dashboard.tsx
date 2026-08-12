import { useEffect, useState } from 'react';
import { ScrollView, Text, StyleSheet, View, TextInput } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { useIniTify } from '@/src/context/IniTifyContext';
import {
  ScreenContainer,
  InfoBanner,
  LoadingState,
} from '@/src/components/ScreenContainer';
import { RiskLevelBadge, DataSourceBanner } from '@/src/components/RiskLevelBadge';
import { NavCard, PrimaryButton } from '@/src/components/UiComponents';
import { PagasaUpdateCard } from '@/src/components/PagasaUpdateCard';
import { DISCLAIMER } from '@/src/constants/risk-levels';
import { decisionTreeService } from '@/src/services/decision-tree/decision-tree.service';
import { pagasaNewsService } from '@/src/services/pagasa-news/pagasa-news.service';
import { SetupChecklist } from '@/src/components/SetupChecklist';
import {
  getNextPriorityItem,
  getSystemSetupStatus,
} from '@/src/services/system/system-status.service';
import { appConfig } from '@/src/config/app.config';
import type { PagasaUpdate } from '@/src/models/pagasa-update';

export default function DashboardScreen() {
  const router = useRouter();
  const [manualHeat, setManualHeat] = useState('');
  const [manualMessage, setManualMessage] = useState<string | null>(null);
  const [todayUpdates, setTodayUpdates] = useState<PagasaUpdate[]>([]);
  const [todayLabel, setTodayLabel] = useState<string>('');
  const [latestOlder, setLatestOlder] = useState<PagasaUpdate | null>(null);
  const [newsMessage, setNewsMessage] = useState<string | null>(null);
  const {
    profile,
    emergencyContact,
    assessment,
    heatReading,
    heatDataSource,
    heatDataMessage,
    locationStatus,
    emergencyState,
    isLoading,
    refreshLocation,
    applyManualDevHeatIndex,
    runAssessment,
  } = useIniTify();

  useEffect(() => {
    refreshLocation();
  }, [refreshLocation]);

  useEffect(() => {
    pagasaNewsService.getFeed(new Date()).then((result) => {
      setNewsMessage(result.message);
      setTodayUpdates(result.data?.today ?? []);
      setTodayLabel(result.data?.todayLabel ?? '');
      setLatestOlder(result.data?.latestOlder ?? null);
    });
    const interval = setInterval(() => {
      pagasaNewsService.getFeed(new Date()).then((result) => {
        setNewsMessage(result.message);
        setTodayUpdates(result.data?.today ?? []);
        setTodayLabel(result.data?.todayLabel ?? '');
        setLatestOlder(result.data?.latestOlder ?? null);
      });
    }, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) return <LoadingState />;
  if (!profile) return <Redirect href="/" />;

  const treeStatus = decisionTreeService.getRulesStatus();
  const setupStatus = getSystemSetupStatus({ profile, emergencyContact });
  const nextItem = getNextPriorityItem(setupStatus);

  return (
    <ScrollView style={styles.scroll}>
      <ScreenContainer title={`Hello, ${profile.name}`}>
        <SetupChecklist
          items={setupStatus.items}
          nextItem={nextItem}
          readyForAssessment={setupStatus.readyForAssessment}
        />
        <DataSourceBanner source={heatDataSource} />
        <InfoBanner
          message="DOST-PAGASA API removed. Official updates are collected automatically — see DOST-PAGASA Updates."
          variant="info"
        />
        {!treeStatus.enabled ? (
          <InfoBanner message={treeStatus.message} variant="warning" />
        ) : null}
        {emergencyState.isActive ? (
          <InfoBanner
            message="Emergency assistance conditions detected. Go to Emergency Assistance."
            variant="emergency"
          />
        ) : null}

        <Text style={styles.sectionTitle}>
          Today&apos;s DOST-PAGASA Updates{todayLabel ? ` — ${todayLabel}` : ''}
        </Text>
        {todayUpdates.length ? (
          todayUpdates.slice(0, 2).map((item) => (
            <PagasaUpdateCard key={item.id} update={item} />
          ))
        ) : (
          <>
            <InfoBanner
              message="No new DOST-PAGASA updates have been published today."
              variant="info"
            />
            {latestOlder ? (
              <PagasaUpdateCard update={latestOlder} isOlderAdvisory />
            ) : null}
          </>
        )}
        <PrimaryButton
          label="View All DOST-PAGASA Updates"
          variant="secondary"
          onPress={() => router.push('/pagasa-updates')}
        />
        {newsMessage ? <Text style={styles.newsMessage}>{newsMessage}</Text> : null}

        <View style={styles.riskSection}>
          <Text style={styles.sectionLabel}>Current Heat-Risk Level</Text>
          <RiskLevelBadge level={assessment?.level ?? null} />
          {assessment?.message ? (
            <Text style={styles.statusMessage}>{assessment.message}</Text>
          ) : null}
        </View>

        <View style={styles.infoRow}>
          <InfoItem
            label="Heat Index"
            value={heatReading ? `${heatReading.heatIndex}°C` : 'Unavailable'}
          />
          <InfoItem
            label="GPS"
            value={locationStatus === 'granted' ? 'Active' : locationStatus}
          />
        </View>

        {heatDataMessage ? (
          <Text style={styles.heatMessage}>{heatDataMessage}</Text>
        ) : null}

        {appConfig.devManualHeatEnabled ? (
          <View style={styles.devBox}>
            <InfoBanner
              message="Enter heat index for risk assessment demo. This is NOT scraped or invented — use official DOST-PAGASA Updates for advisories."
              variant="warning"
            />
            <TextInput
              style={styles.devInput}
              value={manualHeat}
              onChangeText={setManualHeat}
              placeholder="Heat index °C (e.g. 38)"
              keyboardType="decimal-pad"
            />
            <PrimaryButton
              label="Apply Heat Index for Assessment"
              onPress={async () => {
                const value = Number.parseFloat(manualHeat);
                const result = await applyManualDevHeatIndex(value);
                setManualMessage(result.message);
              }}
              variant="secondary"
            />
            {manualMessage ? (
              <Text style={styles.manualMsg}>{manualMessage}</Text>
            ) : null}
          </View>
        ) : null}

        <PrimaryButton label="Run Risk Assessment" onPress={runAssessment} />

        <Text style={styles.disclaimer}>{DISCLAIMER}</Text>

        <Text style={styles.navHeading}>System Functions</Text>
        <NavCard
          title="DOST-PAGASA Updates"
          description="Official advisories and AI-simplified summaries"
          href="/pagasa-updates"
        />
        <NavCard
          title="Risk Assessment"
          description="View detailed heat-risk classification"
          href="/assessment"
        />
        <NavCard
          title="Recommendations"
          description="Personalized safety recommendations"
          href="/recommendations"
        />
        <NavCard
          title="Alerts"
          description="Heat-risk notifications"
          href="/alerts"
        />
        <NavCard
          title="Emergency Assistance"
          description="Emergency support and first-aid guidance"
          href="/emergency"
          variant="danger"
        />
        <NavCard
          title="Hospital & Navigation"
          description="Nearest hospital and navigation"
          href="/hospital"
        />
        <NavCard
          title="Offline Data"
          description="Cached heat-risk and emergency information"
          href="/offline"
        />
        <NavCard
          title="Update Profile"
          description="Edit risk factors and emergency contact"
          href="/setup"
        />
      </ScreenContainer>
    </ScrollView>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoItem}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 8,
    marginBottom: 8,
  },
  newsMessage: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 8,
  },
  riskSection: {
    alignItems: 'center',
    marginBottom: 20,
    gap: 8,
  },
  sectionLabel: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  statusMessage: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 16,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  infoItem: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  infoLabel: { fontSize: 12, color: '#94a3b8', marginBottom: 4 },
  infoValue: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  heatMessage: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  devBox: {
    marginVertical: 8,
    gap: 8,
  },
  devInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
  },
  manualMsg: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  disclaimer: {
    fontSize: 11,
    color: '#94a3b8',
    fontStyle: 'italic',
    marginVertical: 12,
    lineHeight: 16,
  },
  navHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 8,
    marginBottom: 12,
  },
});
