import { Alert, Linking } from 'react-native';
import type { EmergencyState } from '@/src/models/emergency';
import { EMERGENCY_HOTLINES } from '@/src/config/emergency.config';
import { notificationService } from '@/src/services/notifications/notification.service';
import { dialPhoneNumber } from '@/src/services/emergency/emergency-hotline.service';

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

  await notificationService.sendEmergencyActiveAlert(reasons);

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
