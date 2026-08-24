import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useIniTify } from '@/src/context/IniTifyContext';
import {
  notificationService,
  type NotificationPermissionStatus,
} from '@/src/services/notifications/notification.service';
import { DEFAULT_REMINDER_SETTINGS } from '@/src/models/check-in';
import { useAppTheme } from '@/src/theme/useAppTheme';
import { cardShadow, fonts, radius, spacing, typography } from '@/src/theme';
import type { AppPalette } from '@/src/theme/palettes';

export function NotificationPromptCard() {
  const router = useRouter();
  const { reminderSettings, updateReminderSettings } = useIniTify();
  const { palette, isDark } = useAppTheme();
  const styles = useMemo(() => createStyles(palette, isDark), [palette, isDark]);
  const shadow = useMemo(() => cardShadow(), []);

  const [permission, setPermission] = useState<NotificationPermissionStatus>('undetermined');
  const [enabling, setEnabling] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const refreshPermission = useCallback(async () => {
    const status = await notificationService.getPermissionStatus();
    setPermission(status);
  }, []);

  useEffect(() => {
    void refreshPermission();
  }, [refreshPermission, reminderSettings.remindersEnabled]);

  const remindersOn =
    reminderSettings.remindersEnabled && reminderSettings.frequency !== 'disabled';
  const needsSetup = permission !== 'granted' || !remindersOn;

  if (Platform.OS === 'web' || !needsSetup) {
    return null;
  }

  async function handleEnable() {
    setEnabling(true);
    setMessage(null);
    try {
      const perm = await notificationService.requestPermission();
      await refreshPermission();

      if (perm.status !== 'success') {
        setMessage(perm.message);
        return;
      }

      const next = {
        ...DEFAULT_REMINDER_SETTINGS,
        ...reminderSettings,
        remindersEnabled: true,
        frequency:
          reminderSettings.frequency === 'disabled' ? 'every_6h' : reminderSettings.frequency,
        updatedAt: new Date().toISOString(),
      };
      await updateReminderSettings(next);
      setMessage('Check-in reminders are on. You will get phone alerts.');
    } finally {
      setEnabling(false);
    }
  }

  const title = permission === 'denied' ? 'Allow notifications' : 'Turn on check-in alerts';
  const body =
    permission === 'denied'
      ? 'IniTify needs notification permission to remind you about heat safety check-ins.'
      : 'Get reminded to check how you feel during hot days in Tuguegarao.';

  return (
    <View style={[styles.card, shadow]}>
      <View style={styles.iconWrap}>
        <Ionicons name="notifications" size={22} color={palette.primary} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{body}</Text>
        {message ? <Text style={styles.success}>{message}</Text> : null}
      </View>
      <View style={styles.actions}>
        <Pressable
          onPress={() => void handleEnable()}
          disabled={enabling}
          style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
          accessibilityRole="button"
        >
          {enabling ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.primaryBtnText}>Enable alerts</Text>
          )}
        </Pressable>
        <Pressable
          onPress={() => router.push('/reminder-settings')}
          style={({ pressed }) => [styles.linkBtn, pressed && styles.pressed]}
          accessibilityRole="button"
        >
          <Text style={styles.linkBtnText}>Reminder settings</Text>
        </Pressable>
      </View>
    </View>
  );
}

function createStyles(p: AppPalette, isDark: boolean) {
  return StyleSheet.create({
    card: {
      backgroundColor: p.surface,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: isDark ? p.border : 'rgba(37,99,235,0.14)',
      padding: spacing.lg,
      marginBottom: spacing.xxl,
      gap: spacing.md,
    },
    iconWrap: {
      width: 44,
      height: 44,
      borderRadius: radius.md,
      backgroundColor: p.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    copy: { gap: spacing.xs },
    title: {
      fontFamily: fonts.headerSemi,
      fontSize: 16,
      color: p.text,
    },
    body: {
      ...typography.bodySm,
      color: p.textSecondary,
      lineHeight: 20,
    },
    note: {
      ...typography.caption,
      color: p.textMuted,
      lineHeight: 17,
      marginTop: spacing.xs,
    },
    success: {
      ...typography.caption,
      color: p.success,
      marginTop: spacing.xs,
    },
    actions: {
      gap: spacing.sm,
    },
    primaryBtn: {
      backgroundColor: p.primary,
      borderRadius: radius.lg,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.lg,
    },
    primaryBtnText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 15,
      color: '#FFFFFF',
    },
    linkBtn: {
      alignItems: 'center',
      paddingVertical: spacing.xs,
    },
    linkBtnText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 14,
      color: p.primary,
    },
    pressed: { opacity: 0.88 },
  });
}
