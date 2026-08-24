import { Alert } from 'react-native';
import type { EmergencyState } from '@/src/models/emergency';
import { EMERGENCY_HOTLINES } from '@/src/config/emergency.config';
import { dialPhoneNumber } from '@/src/services/emergency/emergency-hotline.service';
import { notificationService } from '@/src/services/notifications/notification.service';

function triggeredIndicatorLabels(state: EmergencyState): string[] {
  const labels: string[] = [];
  if (state.indicators.extremeHeatRisk) labels.push('Extreme heat risk');
  if (state.indicators.repeatedFailedSafetyPrompts) {
    labels.push('Repeated failed safety prompts');
  }
  if (state.indicators.prolongedInactivity) labels.push('Prolonged inactivity');
  return labels;
}

export async function notifyEmergencyActive(
  state: EmergencyState,
  onOpenEmergency: () => void,
): Promise<void> {
  const reasons = triggeredIndicatorLabels(state).join(', ');
  const primaryHotline = EMERGENCY_HOTLINES[0];

  // Best-effort phone push (no-op in Expo Go). Always show Alert below.
  try {
    await notificationService.sendEmergencyActiveAlert(reasons);
  } catch {
    /* ignore */
  }

  Alert.alert(
    'Emergency ACTIVE',
    `IniTify detected a serious heat emergency (${reasons}). Seek help immediately.`,
    [
      {
        text: `Call ${primaryHotline.label}`,
        onPress: () => {
          void dialPhoneNumber(primaryHotline.phone);
        },
      },
      {
        text: 'Open Emergency Screen',
        onPress: onOpenEmergency,
      },
      { text: 'Dismiss', style: 'cancel' },
    ],
    { cancelable: false },
  );
}

/** Opens Tuguegarao City emergency hotline from alert actions */
export async function callPrimaryEmergencyHotline(): Promise<void> {
  const primary = EMERGENCY_HOTLINES[0];
  await dialPhoneNumber(primary.phone);
}
