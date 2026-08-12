import type { HeatRiskLevel } from '@/src/models/risk';

export const RISK_LEVEL_LABELS: Record<HeatRiskLevel, string> = {
  LOW: 'Low',
  MODERATE: 'Moderate',
  HIGH: 'High',
  EXTREME: 'Extreme',
};

export const RISK_LEVEL_COLORS: Record<HeatRiskLevel, string> = {
  LOW: '#22c55e',
  MODERATE: '#eab308',
  HIGH: '#f97316',
  EXTREME: '#ef4444',
};

export const DISCLAIMER =
  'IniTify is a decision-support and early-warning tool. It is NOT a medical diagnostic or treatment device.';
