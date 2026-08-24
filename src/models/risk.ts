/** Documented Decision Tree output categories */
export type HeatRiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME';

export interface RiskAssessmentInput {
  heatIndex: number | null;
  humidityPercent?: number | null;
  age: number | null;
  healthCondition: string | null;
  healthConditions?: string[];
  activityLevel: string | null;
  hydrationStatus: string | null;
  generalStatus?: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface RiskAssessmentResult {
  level: HeatRiskLevel | null;
  assessedAt: string;
  inputs: RiskAssessmentInput;
  source: 'decision-tree' | 'unavailable';
  message?: string;
  riskScore?: number;
  environmentalLevel?: HeatRiskLevel;
  vulnerabilityScore?: number;
  primaryRiskFactors?: string[];
  reason?: string;
  recommendedAction?: string;
}

export const HEAT_RISK_LEVELS: HeatRiskLevel[] = [
  'LOW',
  'MODERATE',
  'HIGH',
  'EXTREME',
];
