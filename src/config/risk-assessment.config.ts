import type { HeatRiskLevel } from '@/src/models/risk';

/**
 * PAGASA / NOAA heat-index bands (°C) — DOST-PAGASA adapted from NWS NOAA.
 * Caution 27–32 | Extreme Caution 33–41 | Danger 42–51 | Extreme Danger 52+
 */
export const PAGASA_HEAT_INDEX_THRESHOLDS = {
  cautionMin: 27,
  extremeCautionMin: 33,
  dangerMin: 42,
  extremeDangerMin: 52,
} as const;

/** PAGASA iHeatMap heat-index bands (°C) — authoritative environmental baseline. */
export interface HeatIndexBand {
  readonly maxExclusive: number;
  readonly level: HeatRiskLevel;
  readonly label: string;
}

export interface RiskAssessmentConfig {
  readonly version: string;
  readonly environmental: {
    readonly heatIndexBands: readonly HeatIndexBand[];
    readonly humidity: {
      /** When humidity is high, environmental risk may bump one step (never above CRITICAL). */
      readonly enabled: boolean;
      readonly highThresholdPercent: number;
      /** Only bump when current environmental level is at or below this index. */
      readonly bumpWhenEnvironmentalAtMost: HeatRiskLevel;
    };
  };
  readonly vulnerability: {
    readonly age: {
      readonly childMaxAge: number;
      readonly childPoints: number;
      readonly elderlyMinAge: number;
      readonly elderlyPoints: number;
    };
    readonly activity: Record<'Low' | 'Moderate' | 'High', number>;
    readonly hydration: Record<'Well hydrated' | 'Moderately hydrated' | 'Dehydrated', number>;
    readonly generalStatus: Record<
      'Feeling Well' | 'Mild Discomfort' | 'Not Feeling Well',
      number
    >;
    /** Added per extra active condition beyond the highest-severity one. */
    readonly additionalConditionPoints: number;
  };
  /**
   * At each environmental baseline, vulnerability score can escalate the final level.
   * Keys are minimum score to reach that level (cumulative max).
   */
  readonly combine: Record<
    HeatRiskLevel,
    Partial<Record<'MODERATE' | 'HIGH' | 'EXTREME' | 'CRITICAL', number>>
  >;
  readonly criticalOverrides: {
    readonly dehydratedMinEnvironmental: HeatRiskLevel;
    readonly highActivityWithHealthMinEnvironmental: HeatRiskLevel;
    readonly elderlyWithHealthMinEnvironmental: HeatRiskLevel;
    readonly notFeelingWellMinEnvironmental: HeatRiskLevel;
    readonly minHealthSeverityForActivityOverride: number;
    readonly minHealthSeverityForAgeOverride: number;
  };
  readonly recommendations: Record<HeatRiskLevel, string>;
}

export const riskAssessmentConfig: RiskAssessmentConfig = {
  version: '2.1.0-pagasa-noaa-bands',
  environmental: {
    heatIndexBands: [
      { maxExclusive: PAGASA_HEAT_INDEX_THRESHOLDS.cautionMin, level: 'LOW', label: 'Below Caution' },
      { maxExclusive: PAGASA_HEAT_INDEX_THRESHOLDS.extremeCautionMin, level: 'MODERATE', label: 'Caution' },
      { maxExclusive: PAGASA_HEAT_INDEX_THRESHOLDS.dangerMin, level: 'HIGH', label: 'Extreme Caution' },
      { maxExclusive: PAGASA_HEAT_INDEX_THRESHOLDS.extremeDangerMin, level: 'EXTREME', label: 'Danger' },
      { maxExclusive: Number.POSITIVE_INFINITY, level: 'CRITICAL', label: 'Extreme Danger' },
    ],
    humidity: {
      enabled: true,
      highThresholdPercent: 70,
      bumpWhenEnvironmentalAtMost: 'MODERATE',
    },
  },
  vulnerability: {
    age: {
      childMaxAge: 12,
      childPoints: 2,
      elderlyMinAge: 60,
      elderlyPoints: 3,
    },
    activity: { Low: 0, Moderate: 1, High: 3 },
    hydration: {
      'Well hydrated': 0,
      'Moderately hydrated': 2,
      Dehydrated: 5,
    },
    generalStatus: {
      'Feeling Well': 0,
      'Mild Discomfort': 2,
      'Not Feeling Well': 5,
    },
    additionalConditionPoints: 1,
  },
  combine: {
    LOW: { MODERATE: 2, HIGH: 6, EXTREME: 12, CRITICAL: 15 },
    MODERATE: { HIGH: 3, EXTREME: 10, CRITICAL: 14 },
    HIGH: { EXTREME: 5, CRITICAL: 10 },
    EXTREME: { CRITICAL: 3 },
    CRITICAL: {},
  },
  criticalOverrides: {
    dehydratedMinEnvironmental: 'HIGH',
    highActivityWithHealthMinEnvironmental: 'HIGH',
    elderlyWithHealthMinEnvironmental: 'HIGH',
    notFeelingWellMinEnvironmental: 'HIGH',
    minHealthSeverityForActivityOverride: 3,
    minHealthSeverityForAgeOverride: 3,
  },
  recommendations: {
    LOW: 'Conditions look favorable. Drink about 250 ml water every 1–2 hours outdoors and monitor how you feel.',
    MODERATE:
      'Take a 5–10 min rest every 30–45 min outdoors, drink ~250 ml every 15–20 min in the heat, and limit continuous sun exposure to under 30–45 minutes.',
    HIGH:
      'Reduce outdoor exertion (≤20–30 continuous minutes). Seek shade/AC within 5 minutes if unwell. Hydrate ~250 ml every 15–20 min and watch for dizziness or nausea.',
    EXTREME:
      'Avoid strenuous outdoor activity from ~10:00 AM–3:00 PM. Move to a cool place immediately, drink 250–500 ml water in the next 15–20 minutes (unless fluid-restricted), and seek help if you feel unwell.',
    CRITICAL:
      'Extreme danger heat — stay indoors in air conditioning if possible. Do not work or exercise outdoors. Drink 250–500 ml water every 15–20 minutes (unless fluid-restricted). Seek medical help immediately if you feel unwell.',
  },
};
