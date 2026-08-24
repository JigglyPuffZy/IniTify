import type { HeatRiskLevel } from '@/src/models/risk';

export const RISK_LEVEL_LABELS: Record<HeatRiskLevel, string> = {
  LOW: 'Low',
  MODERATE: 'Moderate',
  HIGH: 'High',
  EXTREME: 'Extreme',
};

/** Blue monochromatic scale — intensity conveys severity */
export const RISK_LEVEL_COLORS: Record<HeatRiskLevel, string> = {
  LOW: '#93C5FD',
  MODERATE: '#60A5FA',
  HIGH: '#3B82F6',
  EXTREME: '#1D4ED8',
};

export const DISCLAIMER =
  'IniTify is a decision-support and early-warning tool. It is NOT a medical diagnostic or treatment device.';
