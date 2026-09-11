import type { HeatRiskLevel } from '@/src/models/risk';

/** PAGASA / NOAA heat-index band labels (DOST-PAGASA adapted from NWS NOAA). */
export const RISK_LEVEL_LABELS: Record<HeatRiskLevel, string> = {
  LOW: 'Low Risk',
  MODERATE: 'Caution',
  HIGH: 'Extreme Caution',
  EXTREME: 'Danger',
  CRITICAL: 'Extreme Danger',
};

/** Compact labels for tight UI (pills, chips). */
export const RISK_LEVEL_SHORT_LABELS: Record<HeatRiskLevel, string> = {
  LOW: 'Low Risk',
  MODERATE: 'Caution',
  HIGH: 'Ext. Caution',
  EXTREME: 'Danger',
  CRITICAL: 'Ext. Danger',
};

export const HEAT_INDEX_CLASSIFICATION_BANDS: ReadonlyArray<{
  level: HeatRiskLevel;
  label: string;
  rangeLabel: string;
}> = [
  { level: 'LOW', label: 'Low Risk', rangeLabel: 'Below 27°C' },
  { level: 'MODERATE', label: 'Caution', rangeLabel: '27–32°C' },
  { level: 'HIGH', label: 'Extreme Caution', rangeLabel: '33–41°C' },
  { level: 'EXTREME', label: 'Danger', rangeLabel: '42–51°C' },
  { level: 'CRITICAL', label: 'Extreme Danger', rangeLabel: '52°C and beyond' },
];

export function riskLevelLabelFontSize(label: string, base = 28): number {
  if (label.length > 15) return Math.min(base, 20);
  if (label.length > 11) return Math.min(base, 22);
  if (label.length > 8) return Math.min(base, 24);
  return base;
}

export function getHeatIndexBand(level: HeatRiskLevel) {
  return HEAT_INDEX_CLASSIFICATION_BANDS.find((band) => band.level === level);
}

/** One factual line — heat index maps to PAGASA band only (no health modifiers). */
export function formatHeatIndexAssessmentLine(
  heatIndexC: number | null | undefined,
  level: HeatRiskLevel | null | undefined,
): string {
  if (heatIndexC == null || level == null) {
    return 'Waiting for live heat index data.';
  }
  const band = getHeatIndexBand(level);
  const hi = Number(heatIndexC.toFixed(1));
  const range = band?.rangeLabel ?? '';
  const label = RISK_LEVEL_LABELS[level];
  return `${hi}°C heat index → ${label} (${range}).`;
}

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
