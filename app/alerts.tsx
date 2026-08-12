import { useState } from 'react';
import { ScrollView, Text, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import { useIniTify, useRecommendations } from '@/src/context/IniTifyContext';
import {
  ScreenContainer,
  EmptyState,
  InfoBanner,
} from '@/src/components/ScreenContainer';
import { PrimaryButton } from '@/src/components/UiComponents';
import { notificationService } from '@/src/services/notifications/notification.service';
import { DISCLAIMER } from '@/src/constants/risk-levels';

export default function AlertsScreen() {
  const { profile, assessment } = useIniTify();
  const recommendations = useRecommendations();
  const [status, setStatus] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  if (!profile) return <Redirect href="/" />;

  async function handleSendAlert() {
    if (!assessment?.level) {
      setStatus('Complete a risk assessment before sending alerts.');
      return;
    }
    setSending(true);
    const summary =
      recommendations.length > 0
        ? recommendations.map((r) => r.title).join(', ')
        : 'Monitor your heat exposure and stay safe.';
    const result = await notificationService.sendHeatRiskAlert(
      assessment.level,
      summary,
    );
    setStatus(result.message);
    setSending(false);
  }

  async function handleRequestPermission() {
    const result = await notificationService.requestPermission();
    setStatus(result.message);
  }

  return (
    <ScrollView style={styles.scroll}>
      <ScreenContainer title="Heat Alerts">
        <InfoBanner
          message="Alerts are based on your current risk assessment result."
          variant="info"
        />

        {!assessment?.level ? (
          <EmptyState message="No risk level available. Run assessment from dashboard." />
        ) : (
          <Text style={styles.level}>
            Current level: {assessment.level}
          </Text>
        )}

        <PrimaryButton
          label="Request Notification Permission"
          onPress={handleRequestPermission}
          variant="secondary"
        />
        <PrimaryButton
          label={sending ? 'Sending...' : 'Send Heat-Risk Alert'}
          onPress={handleSendAlert}
          disabled={sending || !assessment?.level}
        />

        {status ? <Text style={styles.status}>{status}</Text> : null}
        <Text style={styles.disclaimer}>{DISCLAIMER}</Text>
      </ScreenContainer>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  level: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 16,
    textAlign: 'center',
  },
  status: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 12,
    textAlign: 'center',
  },
  disclaimer: {
    fontSize: 11,
    color: '#94a3b8',
    fontStyle: 'italic',
    marginTop: 16,
    lineHeight: 16,
  },
});
