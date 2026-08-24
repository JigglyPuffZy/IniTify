import type { ReminderSettings } from '@/src/models/check-in';
import type { UserProfile } from '@/src/models/user';
import { checkInService } from '@/src/services/check-in/check-in.service';
import { computeNextReminderAt } from '@/src/services/check-in/reminder-scheduler.service';
import { databaseService } from '@/src/services/database/database.service';
import { notificationService } from '@/src/services/notifications/notification.service';
import { canUseNativeNotifications } from '@/src/services/notifications/notifications.constants';

/**
 * Schedules check-in reminders (in-app timestamp + phone notification when available).
 */
export const reminderManager = {
  async reschedule(
    userId: string,
    profile: UserProfile,
    settings: ReminderSettings,
  ): Promise<ReminderSettings> {
    const lastCheckIn = await checkInService.getLastCheckIn(userId);
    let next: ReminderSettings = { ...settings };

    await notificationService.cancelScheduledNotification(settings.scheduledNotificationId);

    if (!settings.remindersEnabled || settings.frequency === 'disabled') {
      next = {
        ...next,
        nextReminderAt: null,
        scheduledNotificationId: null,
      };
    } else {
      const nextDate = computeNextReminderAt(settings, new Date(), lastCheckIn);
      next.nextReminderAt = nextDate?.toISOString() ?? null;
      next.scheduledNotificationId = null;

      if (nextDate && canUseNativeNotifications()) {
        const scheduled = await notificationService.scheduleHealthCheckInReminder(nextDate);
        if (scheduled.status === 'success' && scheduled.data) {
          next.scheduledNotificationId = scheduled.data;
        }
      }
    }

    const saved = await checkInService.saveReminderSettings(userId, next);
    void databaseService.sync.syncReminderSettings(profile, saved);
    return saved;
  },

  async onReminderFired(
    userId: string,
    profile: UserProfile,
    settings: ReminderSettings,
  ): Promise<ReminderSettings> {
    const now = new Date().toISOString();
    const updated: ReminderSettings = {
      ...settings,
      lastReminderSentAt: now,
    };
    const saved = await checkInService.saveReminderSettings(userId, updated);
    return this.reschedule(userId, profile, saved);
  },
};
