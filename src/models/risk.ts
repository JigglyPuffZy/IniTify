/** Documented Decision Tree output categories */
export type HeatRiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME';

export interface RiskAssessmentInput {
  heatIndex: number | null;
  age: number | null;
  healthCondition: string | null;
  activityLevel: string | null;
  hydrationStatus: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface RiskAssessmentResult {
  level: HeatRiskLevel | null;
  assessedAt: string;
  inputs: RiskAssessmentInput;
  source: 'decision-tree' | 'unavailable';
  message?: string;
}

export const HEAT_RISK_LEVELS: HeatRiskLevel[] = [
  'LOW',
  'MODERATE',
  'HIGH',
  'EXTREME',
];
