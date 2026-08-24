import type { HeatRiskLevel } from '@/src/models/risk';

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
      /** When humidity is high, environmental risk may bump one step (never above EXTREME). */
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
    Partial<Record<'MODERATE' | 'HIGH' | 'EXTREME', number>>
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
  version: '2.0.0-vulnerability-aware',
  environmental: {
    heatIndexBands: [
      { maxExclusive: 27, level: 'LOW', label: 'Below caution' },
      { maxExclusive: 33, level: 'MODERATE', label: 'Caution' },
      { maxExclusive: 42, level: 'HIGH', label: 'Extreme caution' },
      { maxExclusive: Number.POSITIVE_INFINITY, level: 'EXTREME', label: 'Danger' },
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
    LOW: { MODERATE: 2, HIGH: 6, EXTREME: 12 },
    MODERATE: { HIGH: 3, EXTREME: 10 },
    HIGH: { EXTREME: 5 },
    EXTREME: {},
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
    LOW: 'Conditions look favorable. Stay hydrated and monitor how you feel if you go outdoors.',
    MODERATE:
      'Take regular breaks, drink water, and limit prolonged sun exposure — especially if you have health conditions.',
    HIGH:
      'Reduce outdoor exertion, seek shade or air-conditioning, hydrate often, and watch for dizziness or nausea.',
    EXTREME:
      'Avoid strenuous outdoor activity. Move to a cool place, hydrate immediately, and seek help if you feel unwell.',
  },
};
