import { ScrollView, Text, StyleSheet, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useIniTify } from '@/src/context/IniTifyContext';
import { ScreenContainer, EmptyState } from '@/src/components/ScreenContainer';
import { RiskLevelBadge, DataSourceBanner } from '@/src/components/RiskLevelBadge';
import { DISCLAIMER } from '@/src/constants/risk-levels';

export default function AssessmentScreen() {
  const { profile, assessment, heatDataSource } = useIniTify();

  if (!profile) return <Redirect href="/" />;

  return (
    <ScrollView style={styles.scroll}>
      <ScreenContainer title="Heat-Risk Assessment">
        <DataSourceBanner source={heatDataSource} />

        <View style={styles.center}>
          <RiskLevelBadge level={assessment?.level ?? null} />
        </View>

        {!assessment ? (
          <EmptyState message="No assessment available. Run assessment from the dashboard." />
        ) : (
          <>
            {assessment.message ? (
              <Text style={styles.message}>{assessment.message}</Text>
            ) : null}
            <Text style={styles.timestamp}>
              Assessed: {new Date(assessment.assessedAt).toLocaleString()}
            </Text>
            <Text style={styles.source}>
              Source: {assessment.source === 'decision-tree' ? 'Decision Tree AI' : 'Unavailable'}
            </Text>

            <Text style={styles.inputsHeading}>Assessment Inputs</Text>
            <InputRow label="Heat Index" value={formatValue(assessment.inputs.heatIndex, '°C')} />
            <InputRow label="Age" value={formatValue(assessment.inputs.age, ' years')} />
            <InputRow label="Health Condition" value={assessment.inputs.healthCondition ?? '—'} />
            <InputRow label="Activity Level" value={assessment.inputs.activityLevel ?? '—'} />
            <InputRow label="Hydration Status" value={assessment.inputs.hydrationStatus ?? '—'} />
            <InputRow
              label="GPS"
              value={
                assessment.inputs.latitude !== null
                  ? `${assessment.inputs.latitude.toFixed(4)}, ${assessment.inputs.longitude?.toFixed(4)}`
                  : 'Unavailable'
              }
            />
          </>
        )}

        <Text style={styles.disclaimer}>{DISCLAIMER}</Text>
      </ScreenContainer>
    </ScrollView>
  );
}

function formatValue(value: number | null, suffix: string) {
  return value !== null ? `${value}${suffix}` : 'Unavailable';
}

function InputRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  center: { alignItems: 'center', marginVertical: 20 },
  message: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 12,
  },
  timestamp: { fontSize: 12, color: '#94a3b8', textAlign: 'center' },
  source: { fontSize: 12, color: '#94a3b8', textAlign: 'center', marginBottom: 20 },
  inputsHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  rowLabel: { fontSize: 13, color: '#64748b' },
  rowValue: { fontSize: 13, fontWeight: '600', color: '#0f172a' },
  disclaimer: {
    fontSize: 11,
    color: '#94a3b8',
    fontStyle: 'italic',
    marginTop: 20,
    lineHeight: 16,
  },
});
