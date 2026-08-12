import * as Notifications from 'expo-notifications';
import type { HeatRiskLevel } from '@/src/models/risk';
import type { ServiceResult } from '@/src/models/service-result';
import { RISK_LEVEL_LABELS } from '@/src/constants/risk-levels';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const notificationService = {
  async requestPermission(): Promise<ServiceResult<boolean>> {
    try {
      const { status: existing } = await Notifications.getPermissionsAsync();
      let finalStatus = existing;
      if (existing !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        return {
          status: 'permission_denied',
          data: false,
          message: 'Notification permission denied.',
        };
      }
      return { status: 'success', data: true, message: 'Notifications enabled.' };
    } catch {
      return {
        status: 'error',
        data: false,
        message: 'Unable to request notification permission.',
      };
    }
  },

  async sendHeatRiskAlert(
    level: HeatRiskLevel,
    precautionSummary: string,
  ): Promise<ServiceResult<string>> {
    const permission = await this.requestPermission();
    if (permission.status !== 'success') {
      return {
        status: permission.status,
        data: null,
        message: permission.message,
      };
    }

    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: `Heat Risk: ${RISK_LEVEL_LABELS[level]}`,
          body: precautionSummary,
          data: { level, type: 'heat-risk-alert' },
        },
        trigger: null,
      });
      return {
        status: 'success',
        data: id,
        message: 'Heat-risk alert notification sent.',
      };
    } catch {
      return {
        status: 'error',
        data: null,
        message: 'Failed to send notification.',
      };
    }
  },
};
