/**
 * Emergency thresholds — NOT SPECIFIED in research documentation.
 * Values are null until provided by project configuration.
 */
export interface EmergencyThresholdConfig {
  /** Number of failed safety prompt responses before emergency indicator */
  failedSafetyPromptCount: number | null;
  /** Duration of inactivity in minutes before emergency indicator */
  inactivityDurationMinutes: number | null;
  /** Safety prompt interval in minutes */
  safetyPromptIntervalMinutes: number | null;
}

export const emergencyThresholdConfig: EmergencyThresholdConfig = {
  failedSafetyPromptCount: null,
  inactivityDurationMinutes: null,
  safetyPromptIntervalMinutes: null,
};

/** Safe development mode — prevents real emergency messages */
export const EMERGENCY_DEV_MODE = true;
