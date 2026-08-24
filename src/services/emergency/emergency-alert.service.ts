import { Alert } from 'react-native';
import type { EmergencyState } from '@/src/models/emergency';
import type { EmergencyContact } from '@/src/models/user';
import type { HeatRiskLevel } from '@/src/models/risk';
import type { UserLocation } from '@/src/models/location';
import { EMERGENCY_HOTLINES } from '@/src/config/emergency.config';
import { dialPhoneNumber } from '@/src/services/emergency/emergency-hotline.service';
import { emergencyContactService } from '@/src/services/emergency/emergency.service';
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
  options?: {
    userName?: string;
    contact?: EmergencyContact | null;
    heatRiskLevel?: HeatRiskLevel | null;
    location?: UserLocation | null;
  },
): Promise<void> {
  const reasons = triggeredIndicatorLabels(state).join(', ');
  const primaryHotline = EMERGENCY_HOTLINES[0];
  const contact = options?.contact;

  try {
    await notificationService.sendEmergencyActiveAlert(reasons);
  } catch {
    /* ignore */
  }

  const buttons: {
    text: string;
    onPress?: () => void;
    style?: 'cancel' | 'default' | 'destructive';
  }[] = [
    {
      text: `Call ${primaryHotline.label}`,
      onPress: () => {
        void dialPhoneNumber(primaryHotline.phone);
      },
    },
  ];

  if (contact?.phone && options?.userName) {
    buttons.push({
      text: `Text ${contact.name}`,
      onPress: () => {
        void emergencyContactService.prepareNotification({
          userName: options.userName!,
          heatRiskLevel: options.heatRiskLevel ?? null,
          lastKnownLocation: options.location ?? null,
          contact,
          openSms: true,
        });
      },
    });
  }

  buttons.push(
    {
      text: 'Open Emergency Screen',
      onPress: onOpenEmergency,
    },
    { text: 'Dismiss', style: 'cancel' },
  );

  Alert.alert(
    'Emergency ACTIVE',
    `IniTify detected a serious heat emergency (${reasons}). Seek help immediately.` +
      (contact?.phone
        ? `\n\nYou can text ${contact.name} now — Messages will open; tap Send.`
        : '\n\nAdd an emergency contact in Profile/Setup so IniTify can text them.'),
    buttons,
    { cancelable: false },
  );
}

/** Opens Tuguegarao City emergency hotline from alert actions */
export async function callPrimaryEmergencyHotline(): Promise<void> {
  const primary = EMERGENCY_HOTLINES[0];
  await dialPhoneNumber(primary.phone);
}
