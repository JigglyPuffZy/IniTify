import {
  emergencyThresholdConfig,
  EMERGENCY_DEV_MODE,
} from '@/src/config/emergency.config';
import type {
  EmergencyContactNotification,
  EmergencyIndicators,
  EmergencyState,
} from '@/src/models/emergency';
import type { HeatRiskLevel } from '@/src/models/risk';
import type { UserLocation } from '@/src/models/location';
import type { EmergencyContact } from '@/src/models/user';
import { hospitalService } from '@/src/services/hospital/hospital.service';

interface EmergencyTracker {
  failedSafetyPrompts: number;
  lastActivityAt: string;
  lastLocation: UserLocation | null;
}

const tracker: EmergencyTracker = {
  failedSafetyPrompts: 0,
  lastActivityAt: new Date().toISOString(),
  lastLocation: null,
};

/** Documented emergency assistance logic with configurable thresholds */
export const emergencyService = {
  recordActivity(location: UserLocation | null): void {
    tracker.lastActivityAt = new Date().toISOString();
    if (location) tracker.lastLocation = location;
  },

  recordFailedSafetyPrompt(): void {
    tracker.failedSafetyPrompts += 1;
  },

  resetSafetyPromptFailures(): void {
    tracker.failedSafetyPrompts = 0;
  },

  getMissingConfiguration(): string[] {
    const missing: string[] = [];
    if (emergencyThresholdConfig.failedSafetyPromptCount === null) {
      missing.push('failedSafetyPromptCount threshold');
    }
    if (emergencyThresholdConfig.inactivityDurationMinutes === null) {
      missing.push('inactivityDurationMinutes threshold');
    }
    return missing;
  },

  evaluateIndicators(currentRiskLevel: HeatRiskLevel | null): EmergencyIndicators {
    const extremeHeatRisk = currentRiskLevel === 'EXTREME';

    let repeatedFailedSafetyPrompts = false;
    if (emergencyThresholdConfig.failedSafetyPromptCount !== null) {
      repeatedFailedSafetyPrompts =
        tracker.failedSafetyPrompts >=
        emergencyThresholdConfig.failedSafetyPromptCount;
    }

    let prolongedInactivity = false;
    if (emergencyThresholdConfig.inactivityDurationMinutes !== null) {
      const inactiveMs =
        Date.now() - new Date(tracker.lastActivityAt).getTime();
      prolongedInactivity =
        inactiveMs >= emergencyThresholdConfig.inactivityDurationMinutes * 60 * 1000;
    }

    return {
      extremeHeatRisk,
      repeatedFailedSafetyPrompts,
      prolongedInactivity,
    };
  },

  evaluateEmergency(currentRiskLevel: HeatRiskLevel | null): EmergencyState {
    const indicators = this.evaluateIndicators(currentRiskLevel);
    const missingConfiguration = this.getMissingConfiguration();

    const activeIndicators = Object.values(indicators).filter(Boolean).length;
    const isActive = activeIndicators >= 2;

    return {
      isActive,
      activatedAt: isActive ? new Date().toISOString() : null,
      indicators,
      missingConfiguration,
    };
  },
};

export const emergencyContactService = {
  async prepareNotification(params: {
    userName: string;
    heatRiskLevel: HeatRiskLevel | null;
    lastKnownLocation: UserLocation | null;
    contact: EmergencyContact | null;
  }): Promise<{
    notification: EmergencyContactNotification | null;
    error: string | null;
    sent: boolean;
  }> {
    if (!params.contact?.name || !params.contact?.phone) {
      return {
        notification: null,
        error: 'Emergency contact is missing. Add contact details in setup.',
        sent: false,
      };
    }

    let nearestHospital: string | null = null;
    let estimatedTravelTime: string | null = null;

    if (params.lastKnownLocation) {
      const hospitalResult = await hospitalService.findNearest(
        params.lastKnownLocation,
      );
      if (hospitalResult.data) {
        nearestHospital = hospitalResult.data.name;
        estimatedTravelTime = hospitalResult.data.estimatedTravelTime;
      }
    }

    const notification: EmergencyContactNotification = {
      userName: params.userName,
      heatRiskLevel: params.heatRiskLevel,
      lastKnownLocation: params.lastKnownLocation,
      nearestHospital,
      estimatedTravelTime,
      sentAt: new Date().toISOString(),
      isDevelopmentMode: EMERGENCY_DEV_MODE,
    };

    if (EMERGENCY_DEV_MODE) {
      return {
        notification,
        error: null,
        sent: false,
      };
    }

    // Real SMS/call integration requires explicit configuration — not implemented
    return {
      notification,
      error: 'Emergency contact delivery is not configured for production.',
      sent: false,
    };
  },
};
