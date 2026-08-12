import { useState } from 'react';
import { ScrollView, Text, StyleSheet, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useIniTify } from '@/src/context/IniTifyContext';
import {
  ScreenContainer,
  InfoBanner,
  ErrorState,
} from '@/src/components/ScreenContainer';
import { PrimaryButton } from '@/src/components/UiComponents';
import {
  emergencyContactService,
} from '@/src/services/emergency/emergency.service';
import { FIRST_AID_GUIDANCE } from '@/src/constants/first-aid';
import { EMERGENCY_DEV_MODE } from '@/src/config/emergency.config';
import { DISCLAIMER } from '@/src/constants/risk-levels';

export default function EmergencyScreen() {
  const {
    profile,
    assessment,
    location,
    emergencyContact,
    emergencyState,
    recordSafetyPromptResponse,
  } = useIniTify();
  const [notifyResult, setNotifyResult] = useState<string | null>(null);

  if (!profile) return <Redirect href="/" />;

  async function handleNotifyContact() {
    const result = await emergencyContactService.prepareNotification({
      userName: profile!.name,
      heatRiskLevel: assessment?.level ?? null,
      lastKnownLocation: location,
      contact: emergencyContact,
    });
    if (result.error) {
      setNotifyResult(result.error);
    } else if (result.notification?.isDevelopmentMode) {
      setNotifyResult(
        'Development mode: notification prepared but NOT sent. Review payload below.',
      );
    } else {
      setNotifyResult(result.sent ? 'Notification sent.' : 'Notification not sent.');
    }
  }

  return (
    <ScrollView style={styles.scroll}>
      <ScreenContainer title="Emergency Assistance">
        {EMERGENCY_DEV_MODE ? (
          <InfoBanner
            message="Development mode active — emergency messages are NOT sent to real contacts."
            variant="warning"
          />
        ) : null}

        <View style={styles.statusBox}>
          <Text style={styles.statusLabel}>Emergency Status</Text>
          <Text
            style={[
              styles.statusValue,
              emergencyState.isActive && styles.active,
            ]}
          >
            {emergencyState.isActive ? 'ACTIVE' : 'Not Active'}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Emergency Indicators</Text>
        <IndicatorRow
          label="Extreme heat-risk level"
          active={emergencyState.indicators.extremeHeatRisk}
        />
        <IndicatorRow
          label="Repeated failed safety prompts"
          active={emergencyState.indicators.repeatedFailedSafetyPrompts}
        />
        <IndicatorRow
          label="Prolonged inactivity"
          active={emergencyState.indicators.prolongedInactivity}
        />

        {emergencyState.missingConfiguration.length > 0 ? (
          <InfoBanner
            message={`Missing thresholds: ${emergencyState.missingConfiguration.join(', ')}. These values are NOT specified in the research documentation.`}
            variant="warning"
          />
        ) : null}

        <Text style={styles.sectionTitle}>Safety Prompt</Text>
        <Text style={styles.promptText}>Are you okay? Please respond.</Text>
        <View style={styles.row}>
          <PrimaryButton
            label="I'm OK"
            onPress={() => recordSafetyPromptResponse(true)}
          />
          <PrimaryButton
            label="Need Help"
            onPress={() => recordSafetyPromptResponse(false)}
            variant="danger"
          />
        </View>

        <PrimaryButton
          label="Prepare Emergency Contact Notification"
          onPress={handleNotifyContact}
          variant="danger"
        />
        {notifyResult ? <Text style={styles.result}>{notifyResult}</Text> : null}
        {!emergencyContact ? (
          <ErrorState message="No emergency contact configured. Add one in Setup." />
        ) : null}

        <Text style={styles.sectionTitle}>First-Aid Guidance</Text>
        {!FIRST_AID_GUIDANCE.isApproved ? (
          <InfoBanner message={FIRST_AID_GUIDANCE.notice} variant="warning" />
        ) : null}
        {FIRST_AID_GUIDANCE.sections.map((section) => (
          <View key={section.heading} style={styles.firstAidSection}>
            <Text style={styles.firstAidHeading}>{section.heading}</Text>
            <Text style={styles.firstAidBody}>{section.body}</Text>
          </View>
        ))}

        <Text style={styles.disclaimer}>{DISCLAIMER}</Text>
      </ScreenContainer>
    </ScrollView>
  );
}

function IndicatorRow({ label, active }: { label: string; active: boolean }) {
  return (
    <View style={styles.indicatorRow}>
      <Text style={styles.indicatorLabel}>{label}</Text>
      <Text style={[styles.indicatorStatus, active && styles.indicatorActive]}>
        {active ? 'Triggered' : 'Not triggered'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  statusBox: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statusLabel: { fontSize: 13, color: '#64748b' },
  statusValue: { fontSize: 24, fontWeight: '800', color: '#22c55e', marginTop: 4 },
  active: { color: '#ef4444' },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 12,
    marginBottom: 8,
  },
  indicatorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  indicatorLabel: { fontSize: 13, color: '#334155' },
  indicatorStatus: { fontSize: 13, color: '#94a3b8' },
  indicatorActive: { color: '#ef4444', fontWeight: '600' },
  promptText: { fontSize: 14, color: '#64748b', marginBottom: 8 },
  row: { gap: 4 },
  result: { fontSize: 13, color: '#64748b', marginTop: 8, textAlign: 'center' },
  firstAidSection: { marginBottom: 12 },
  firstAidHeading: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  firstAidBody: { fontSize: 13, color: '#64748b', lineHeight: 20 },
  disclaimer: {
    fontSize: 11,
    color: '#94a3b8',
    fontStyle: 'italic',
    marginTop: 20,
    lineHeight: 16,
  },
});
