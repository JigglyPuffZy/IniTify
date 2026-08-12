/** Documented individual risk factors */
export interface UserRiskFactors {
  age: number | null;
  healthCondition: string | null;
  activityLevel: string | null;
  hydrationStatus: string | null;
}

export interface UserProfile {
  name: string;
  riskFactors: UserRiskFactors;
}

/** Documented emergency contact notification fields */
export interface EmergencyContact {
  name: string;
  phone: string;
}

/** Documented activity levels — HeatHits Definition of Terms: low, moderate, or high */
export const ACTIVITY_LEVELS = ['Low', 'Moderate', 'High'] as const;

export const HYDRATION_STATUSES = [
  'Well hydrated',
  'Moderately hydrated',
  'Dehydrated',
] as const;

export type ActivityLevel = (typeof ACTIVITY_LEVELS)[number];
export type HydrationStatus = (typeof HYDRATION_STATUSES)[number];
