import type { HeatRiskLevel } from '@/src/models/risk';

/** PAGASA / NOAA heat-index band labels (DOST-PAGASA adapted from NWS NOAA). */
export const RISK_LEVEL_LABELS: Record<HeatRiskLevel, string> = {
  LOW: 'Below Caution',
  MODERATE: 'Caution',
  HIGH: 'Extreme Caution',
  EXTREME: 'Danger',
  CRITICAL: 'Extreme Danger',
};

/** Poster-aligned severity colors — yellow → orange → red scale. */
export const RISK_LEVEL_COLORS: Record<HeatRiskLevel, string> = {
  LOW: '#86EFAC',
  MODERATE: '#FACC15',
  HIGH: '#FB923C',
  EXTREME: '#EA580C',
  CRITICAL: '#DC2626',
};

export const DISCLAIMER =
  'IniTify is a decision-support and early-warning tool. It is NOT a medical diagnostic or treatment device.';
