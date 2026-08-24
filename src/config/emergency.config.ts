/**
 * Emergency thresholds (confirm final numbers with research adviser if needed).
 */
export interface EmergencyThresholdConfig {
  failedSafetyPromptCount: number | null;
  inactivityDurationMinutes: number | null;
  safetyPromptIntervalMinutes: number | null;
}

export const emergencyThresholdConfig: EmergencyThresholdConfig = {
  failedSafetyPromptCount: 3,
  inactivityDurationMinutes: 15,
  safetyPromptIntervalMinutes: 5,
};

/** Tuguegarao City hotlines — https://tuguegaraocity.gov.ph/contact-us */
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

/** true = log only; false/unset = open real SMS in Messages app */
export const EMERGENCY_DEV_MODE =
  process.env.EXPO_PUBLIC_EMERGENCY_DEV_MODE === 'true';
