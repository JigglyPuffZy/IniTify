/**
 * Emergency thresholds — configurable demo values for HeatHits / IniTify.
 * Research document describes triggers but not exact numbers; confirm with adviser.
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
  failedSafetyPromptCount: 3,
  inactivityDurationMinutes: 15,
  safetyPromptIntervalMinutes: 5,
};

/**
 * Tuguegarao City emergency hotlines (study area).
 * Source: Tuguegarao City Government — https://tuguegaraocity.gov.ph/contact-us
 * Verify periodically; numbers may change.
 */
export interface EmergencyHotline {
  id: string;
  label: string;
  phone: string;
  description: string;
}

export const EMERGENCY_HOTLINES: EmergencyHotline[] = [
  {
    id: 'tuguegarao-emergency',
    label: 'Tuguegarao City Emergency Hotline',
    phone: '09168872897',
    description: 'City Command Center 24/7 — Tuguegarao City Hall',
  },
  {
    id: 'rescue-1111',
    label: 'RESCUE 1111 (TCDRRMO)',
    phone: '09066229924',
    description: 'Tuguegarao City Disaster Risk Reduction & Management Office',
  },
  {
    id: 'bfp-tuguegarao',
    label: 'BFP Tuguegarao City',
    phone: '09178113474',
    description: 'Bureau of Fire Protection — also (078) 375-4129',
  },
  {
    id: 'pnp-tuguegarao',
    label: 'PNP Tuguegarao City',
    phone: '09058005118',
    description: 'Philippine National Police — also 0917-132-8755',
  },
  {
    id: 'tcpgh',
    label: "Tuguegarao City People's General Hospital",
    phone: '0783041114',
    description: 'Medical emergencies — landline (078) 304-1114',
  },
];

/** Safe development mode — prevents real emergency messages */
export const EMERGENCY_DEV_MODE = true;
