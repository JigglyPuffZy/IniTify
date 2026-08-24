import { useEffect } from 'react';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useIniTify } from '@/src/context/IniTifyContext';
import { useAuth } from '@/src/context/AuthContext';
import { checkInService } from '@/src/services/check-in/check-in.service';
import { reminderManager } from '@/src/services/check-in/reminder-manager.service';
import { notificationService } from '@/src/services/notifications/notification.service';
import { CHECK_IN_NOTIFICATION_TYPE } from '@/src/services/check-in/reminder-scheduler.service';

/**
 * Wires scheduled check-in reminders to the OS notification layer.
 * No in-app banners — reminders arrive as device notifications.
 */
export function NotificationReminderHandler() {
  const router = useRouter();
  const { user } = useAuth();
  const { profile } = useIniTify();

  useEffect(() => {
    if (Platform.OS === 'web' || !user || !profile) return undefined;

    let removeReceived: (() => void) | null = null;
    let removeResponse: (() => void) | null = null;

    void (async () => {
      removeReceived = await notificationService.addNotificationReceivedListener(async (data) => {
        const type = data.type as string | undefined;
        if (type !== CHECK_IN_NOTIFICATION_TYPE) return;
        const settings = await checkInService.getReminderSettings(user.id);
        await reminderManager.onReminderFired(user.id, profile, settings);
      });

      removeResponse = await notificationService.addNotificationResponseListener((data) => {
        const type = data.type as string | undefined;
        if (type === CHECK_IN_NOTIFICATION_TYPE || type === 'weather-safety-check') {
          router.push('/check-in');
        }
      });
    })();

    return () => {
      removeReceived?.();
      removeResponse?.();
    };
  }, [user, profile, router]);

  return null;
}
