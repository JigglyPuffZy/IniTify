import type { HeatRiskLevel } from './risk';
import type { UserLocation } from './location';

/** Documented emergency activation indicators */
export interface EmergencyIndicators {
  extremeHeatRisk: boolean;
  repeatedFailedSafetyPrompts: boolean;
  prolongedInactivity: boolean;
}

export interface EmergencyState {
  isActive: boolean;
  activatedAt: string | null;
  indicators: EmergencyIndicators;
  missingConfiguration: string[];
}

/** Documented emergency contact notification payload */
export interface EmergencyContactNotification {
  userName: string;
  heatRiskLevel: HeatRiskLevel | null;
  lastKnownLocation: UserLocation | null;
  nearestHospital: string | null;
  estimatedTravelTime: string | null;
  sentAt: string;
  isDevelopmentMode: boolean;
}
