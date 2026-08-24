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
import { openEmergencySms } from '@/src/services/emergency/emergency-sms.service';

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

function formatRiskLabel(level: HeatRiskLevel | null): string {
  if (!level) return 'Unknown';
  return level.charAt(0) + level.slice(1).toLowerCase();
}

function buildEmergencySmsBody(params: {
  userName: string;
  heatRiskLevel: HeatRiskLevel | null;
  lastKnownLocation: UserLocation | null;
  nearestHospital: string | null;
  estimatedTravelTime: string | null;
}): string {
  const lines = [
    'IniTify EMERGENCY ALERT',
    `${params.userName} may need help due to extreme heat.`,
    `Heat risk: ${formatRiskLabel(params.heatRiskLevel)}`,
  ];

  if (params.lastKnownLocation) {
    const { latitude, longitude } = params.lastKnownLocation;
    lines.push(`Last location: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
    lines.push(`Maps: https://maps.google.com/?q=${latitude},${longitude}`);
  } else {
    lines.push('Last location: unavailable');
  }

  if (params.nearestHospital) {
    const eta = params.estimatedTravelTime ? ` (${params.estimatedTravelTime})` : '';
    lines.push(`Nearest hospital: ${params.nearestHospital}${eta}`);
  }

  lines.push('Please check on them or call emergency services now.');
  lines.push('— Sent via IniTify');

  return lines.join('\n');
}

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
  buildSmsBody(params: {
    userName: string;
    heatRiskLevel: HeatRiskLevel | null;
    lastKnownLocation: UserLocation | null;
    nearestHospital: string | null;
    estimatedTravelTime: string | null;
  }): string {
    return buildEmergencySmsBody(params);
  },

  async prepareNotification(params: {
    userName: string;
    heatRiskLevel: HeatRiskLevel | null;
    lastKnownLocation: UserLocation | null;
    contact: EmergencyContact | null;
    /** When true, open the phone SMS app immediately (real SMS). */
    openSms?: boolean;
  }): Promise<{
    notification: EmergencyContactNotification | null;
    error: string | null;
    sent: boolean;
    smsMessage?: string | null;
  }> {
    if (!params.contact?.name || !params.contact?.phone) {
      return {
        notification: null,
        error: 'Emergency contact is missing. Add contact details in setup.',
        sent: false,
        smsMessage: null,
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

    const smsBody = buildEmergencySmsBody({
      userName: params.userName,
      heatRiskLevel: params.heatRiskLevel,
      lastKnownLocation: params.lastKnownLocation,
      nearestHospital,
      estimatedTravelTime,
    });

    if (EMERGENCY_DEV_MODE) {
      return {
        notification,
        error: null,
        sent: false,
        smsMessage:
          'Dev mode ON — SMS prepared but not opened. Set EXPO_PUBLIC_EMERGENCY_DEV_MODE=false to send real SMS.',
      };
    }

    const shouldOpenSms = params.openSms !== false;
    if (!shouldOpenSms) {
      return {
        notification,
        error: null,
        sent: false,
        smsMessage: null,
      };
    }

    const smsResult = await openEmergencySms({
      phone: params.contact.phone,
      body: smsBody,
    });

    if (smsResult.status === 'success') {
      return {
        notification: { ...notification, isDevelopmentMode: false },
        error: null,
        sent: true,
        smsMessage: smsResult.message,
      };
    }

    return {
      notification,
      error: smsResult.message,
      sent: false,
      smsMessage: smsResult.message,
    };
  },
};
