import { View, Text, StyleSheet } from 'react-native';
import type { HeatRiskLevel } from '@/src/models/risk';
import { RISK_LEVEL_COLORS, RISK_LEVEL_LABELS } from '@/src/constants/risk-levels';

interface RiskLevelBadgeProps {
  level: HeatRiskLevel | null;
  size?: 'small' | 'large';
}

export function RiskLevelBadge({ level, size = 'large' }: RiskLevelBadgeProps) {
  if (!level) {
    return (
      <View style={[styles.badge, styles.unavailable]}>
        <Text style={styles.unavailableText}>UNAVAILABLE</Text>
        <Text style={styles.subtext}>Assessment pending</Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: RISK_LEVEL_COLORS[level] },
        size === 'small' && styles.small,
      ]}
    >
      <Text style={[styles.label, size === 'small' && styles.smallLabel]}>
        {RISK_LEVEL_LABELS[level].toUpperCase()}
      </Text>
    </View>
  );
}

export function DataSourceBanner({
  source,
}: {
  source: 'live' | 'cached' | 'unavailable' | 'dev_manual';
}) {
  if (source === 'live') {
    return null;
  }
  const message =
    source === 'dev_manual'
      ? 'DEVELOPMENT TEST DATA — manual heat index. NOT live DOST-PAGASA data.'
      : source === 'cached'
        ? 'Viewing cached information — not live data.'
        : 'Live data unavailable — connect to refresh.';

  return (
    <View
      style={[
        styles.sourceBanner,
        source === 'dev_manual'
          ? styles.devManual
          : source === 'cached'
            ? styles.cached
            : styles.unavailableBanner,
      ]}
    >
      <Text style={styles.sourceText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  small: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  label: {
    fontSize: 32,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 2,
  },
  smallLabel: {
    fontSize: 14,
    letterSpacing: 1,
  },
  unavailable: {
    backgroundColor: '#e2e8f0',
  },
  unavailableText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#64748b',
  },
  subtext: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
  },
  sourceBanner: {
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  cached: {
    backgroundColor: '#dbeafe',
  },
  devManual: {
    backgroundColor: '#fce7f3',
  },
  unavailableBanner: {
    backgroundColor: '#fef3c7',
  },
  sourceText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '500',
  },
});
