import { useAuth } from '@/src/context/AuthContext';
import { useIniTify } from '@/src/context/IniTifyContext';
import { checkInService } from '@/src/services/check-in/check-in.service';
import { reminderManager } from '@/src/services/check-in/reminder-manager.service';
import { CHECK_IN_NOTIFICATION_TYPE } from '@/src/services/check-in/reminder-scheduler.service';
import { inAppNotificationService } from '@/src/services/notifications/in-app-notification.service';
import { notificationService } from '@/src/services/notifications/notification.service';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

/**
 * Wires phone notifications: request permission, open the right screen on tap,
 * and refresh the next scheduled reminder after one fires.
 */
export function NotificationReminderHandler() {
  const router = useRouter();
  const { user } = useAuth();
  const { profile, refreshInAppNotifications } = useIniTify();

  useEffect(() => {
    if (Platform.OS === 'web' || !user || !profile) return undefined;

    let removeReceived: (() => void) | null = null;
    let removeResponse: (() => void) | null = null;

    void (async () => {
      // Create channels first; delay briefly so the UI is ready before Android prompt.
      await notificationService.initialize();
      await new Promise((resolve) => setTimeout(resolve, 800));
      await notificationService.requestPermission();

      removeReceived = await notificationService.addNotificationReceivedListener(async (data) => {
        const type = data.type as string | undefined;
        if (type !== CHECK_IN_NOTIFICATION_TYPE) return;
        const settings = await checkInService.getReminderSettings(user.id);
        await reminderManager.onReminderFired(user.id, profile, settings);
        await inAppNotificationService.add(user.id, {
          type: 'check-in-reminder',
          title: 'Time to check in',
          body: "Tify: how's your hydration and how are you feeling in the heat?",
          href: '/check-in',
          dedupeMinutes: 30,
        });
        await refreshInAppNotifications();
      });

      removeResponse = await notificationService.addNotificationResponseListener((data) => {
        const type = data.type as string | undefined;
        const href = typeof data.href === 'string' ? data.href : null;
        if (href) {
          router.push(href as never);
          return;
        }
        if (
          type === CHECK_IN_NOTIFICATION_TYPE ||
          type === 'weather-safety' ||
          type === 'heat-risk'
        ) {
          router.push(type === 'heat-risk' ? '/safety-tips' : '/check-in');
        } else if (type === 'emergency') {
          router.push('/(tabs)/emergency');
        }
      });
    })();

    return () => {
      removeReceived?.();
      removeResponse?.();
    };
  }, [user, profile, router, refreshInAppNotifications]);

  return null;
}
