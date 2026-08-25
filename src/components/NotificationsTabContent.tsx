import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { InAppNotification, InAppNotificationType } from '@/src/models/in-app-notification';
import { PageMasthead, ScreenTopAccent } from '@/src/components/layout/PageMasthead';
import {
  notificationService,
  type NotificationPermissionStatus,
} from '@/src/services/notifications/notification.service';
import { canUseNativeNotifications } from '@/src/services/notifications/notifications.constants';
import { layout, radius, spacing, typography, fonts, cardShadow } from '@/src/theme';
import { useAppTheme } from '@/src/theme/useAppTheme';
import type { AppPalette } from '@/src/theme/palettes';

const TYPE_META: Record<
  InAppNotificationType,
  { icon: React.ComponentProps<typeof Ionicons>['name']; color: string }
> = {
  'check-in-reminder': { icon: 'alarm-outline', color: '#2563EB' },
  'heat-risk': { icon: 'thermometer-outline', color: '#1D4ED8' },
  'weather-safety': { icon: 'partly-sunny-outline', color: '#3B82F6' },
  emergency: { icon: 'warning-outline', color: '#1E3A8A' },
  system: { icon: 'information-circle-outline', color: '#64748B' },
};

interface NotificationsTabContentProps {
  notifications: InAppNotification[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  horizontalPadding?: number;
}

export function NotificationsTabContent({
  notifications,
  onMarkRead,
  onMarkAllRead,
  horizontalPadding = layout.pagePadding,
}: NotificationsTabContentProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { palette, isDark } = useAppTheme();
  const styles = useMemo(() => createStyles(palette, isDark), [palette, isDark]);
  const shadow = useMemo(() => cardShadow(), []);

  const [permission, setPermission] = useState<NotificationPermissionStatus>('undetermined');
  const [busy, setBusy] = useState(false);
  const [phoneMessage, setPhoneMessage] = useState<string | null>(null);
  const nativeAvailable = canUseNativeNotifications();

  const unread = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    void (async () => {
      await notificationService.initialize();
      setPermission(await notificationService.getPermissionStatus());
    })();
  }, []);

  async function enablePhoneNotifications() {
    setBusy(true);
    try {
      const result = await notificationService.requestPermission();
      setPermission(await notificationService.getPermissionStatus());
      setPhoneMessage(result.message);
      if (!result.data && result.status === 'denied') {
        // If Android won't show the prompt again, send user to Settings.
        const status = await notificationService.getPermissionStatus();
        if (status === 'denied') {
          await notificationService.openSystemNotificationSettings();
        }
      }
    } finally {
      setBusy(false);
    }
  }

  async function sendTest() {
    setBusy(true);
    try {
      const result = await notificationService.sendTestNotification(2);
      setPermission(await notificationService.getPermissionStatus());
      setPhoneMessage(result.message);
    } finally {
      setBusy(false);
    }
  }

  function openNotification(item: InAppNotification) {
    if (!item.read) onMarkRead(item.id);
    if (item.href) router.push(item.href as never);
  }

  const phoneEnabled = permission === 'granted';

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: spacing.huge + insets.bottom + 72 },
        ]}
      >
        <ScreenTopAccent />

        <SafeAreaView edges={['top']} style={{ paddingHorizontal: horizontalPadding }}>
          <PageMasthead
            overline="IniTify"
            title="Notifications"
            subtitle="Heat, check-in, and emergency alerts — also sent to your phone."
          />

          <View style={[styles.phoneCard, shadow]}>
            <View style={styles.phoneHead}>
              <View style={styles.phoneIcon}>
                <Ionicons
                  name={phoneEnabled ? 'notifications' : 'notifications-off-outline'}
                  size={22}
                  color={palette.primary}
                />
              </View>
              <View style={styles.phoneTextWrap}>
                <Text style={styles.phoneTitle}>
                  {phoneEnabled ? 'Phone notifications on' : 'Enable phone notifications'}
                </Text>
                <Text style={styles.phoneBody}>
                  {!nativeAvailable
                    ? 'Install the release APK to use the phone notification shade.'
                    : phoneEnabled
                      ? 'Heat alerts and reminders will appear in your notification shade.'
                      : 'Tap Allow when Android asks, or open Settings if the prompt does not show.'}
                </Text>
              </View>
            </View>

            {nativeAvailable ? (
              <View style={styles.phoneActions}>
                {!phoneEnabled ? (
                  <Pressable
                    onPress={() => void enablePhoneNotifications()}
                    disabled={busy}
                    style={({ pressed }) => [
                      styles.phonePrimaryBtn,
                      pressed && styles.pressed,
                      busy && styles.disabled,
                    ]}
                  >
                    {busy ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <>
                        <Ionicons name="shield-checkmark-outline" size={16} color="#FFF" />
                        <Text style={styles.phonePrimaryText}>Allow notifications</Text>
                      </>
                    )}
                  </Pressable>
                ) : (
                  <Pressable
                    onPress={() => void sendTest()}
                    disabled={busy}
                    style={({ pressed }) => [
                      styles.phonePrimaryBtn,
                      pressed && styles.pressed,
                      busy && styles.disabled,
                    ]}
                  >
                    {busy ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <>
                        <Ionicons name="flash-outline" size={16} color="#FFF" />
                        <Text style={styles.phonePrimaryText}>Send test notification</Text>
                      </>
                    )}
                  </Pressable>
                )}
                <Pressable
                  onPress={() => void notificationService.openSystemNotificationSettings()}
                  style={({ pressed }) => [styles.phoneGhostBtn, pressed && styles.pressed]}
                >
                  <Text style={styles.phoneGhostText}>Open phone Settings</Text>
                </Pressable>
              </View>
            ) : null}

            {phoneMessage ? <Text style={styles.phoneMessage}>{phoneMessage}</Text> : null}
          </View>

          {unread > 0 ? (
            <Pressable
              onPress={onMarkAllRead}
              style={({ pressed }) => [styles.markAllBtn, pressed && styles.pressed]}
            >
              <Text style={styles.markAllText}>Mark all as read</Text>
            </Pressable>
          ) : null}

          {notifications.length === 0 ? (
            <View style={[styles.emptyCard, shadow]}>
              <View style={styles.emptyIcon}>
                <Ionicons name="notifications-off-outline" size={28} color={palette.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>No notifications yet</Text>
              <Text style={styles.emptyBody}>
                Heat alerts, check-in reminders, and safety updates will appear here.
              </Text>
            </View>
          ) : (
            <View style={styles.list}>
              {notifications.map((item) => {
                const meta = TYPE_META[item.type];
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => openNotification(item)}
                    style={({ pressed }) => [
                      styles.card,
                      shadow,
                      !item.read && styles.cardUnread,
                      pressed && styles.pressed,
                    ]}
                  >
                    <View style={[styles.iconWrap, { backgroundColor: `${meta.color}18` }]}>
                      <Ionicons name={meta.icon} size={20} color={meta.color} />
                    </View>
                    <View style={styles.cardBody}>
                      <View style={styles.cardHead}>
                        <Text style={[styles.cardTitle, !item.read && styles.cardTitleUnread]}>
                          {item.title}
                        </Text>
                        {!item.read ? <View style={styles.unreadDot} /> : null}
                      </View>
                      <Text style={styles.cardText}>{item.body}</Text>
                      <Text style={styles.cardTime}>{formatWhen(item.createdAt)}</Text>
                    </View>
                    {item.href ? (
                      <Ionicons name="chevron-forward" size={18} color={palette.textLight} />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          )}
        </SafeAreaView>
      </ScrollView>
    </View>
  );
}

function formatWhen(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return date.toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function createStyles(p: AppPalette, isDark: boolean) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: p.background },
    scrollContent: { flexGrow: 1 },
    phoneCard: {
      backgroundColor: p.surface,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: p.primary,
      padding: spacing.lg,
      marginBottom: spacing.xl,
      gap: spacing.md,
    },
    phoneHead: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
    phoneIcon: {
      width: 42,
      height: 42,
      borderRadius: radius.md,
      backgroundColor: p.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    phoneTextWrap: { flex: 1, minWidth: 0, gap: 4 },
    phoneTitle: {
      fontFamily: fonts.headerSemi,
      fontSize: 16,
      color: p.text,
    },
    phoneBody: {
      ...typography.bodySm,
      color: p.textMuted,
      lineHeight: 20,
    },
    phoneActions: { gap: spacing.sm },
    phonePrimaryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      backgroundColor: p.primary,
      borderRadius: radius.lg,
      minHeight: 48,
      paddingHorizontal: spacing.lg,
    },
    phonePrimaryText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 15,
      color: '#FFFFFF',
    },
    phoneGhostBtn: {
      alignItems: 'center',
      paddingVertical: spacing.sm,
    },
    phoneGhostText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 14,
      color: p.primary,
    },
    phoneMessage: {
      ...typography.caption,
      color: p.textSecondary,
    },
    disabled: { opacity: 0.7 },
    markAllBtn: {
      alignSelf: 'flex-end',
      marginBottom: spacing.md,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.sm,
    },
    markAllText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 14,
      color: p.primary,
    },
    emptyCard: {
      backgroundColor: p.surface,
      borderRadius: radius.xl,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: p.border,
      padding: spacing.xxl,
      alignItems: 'center',
      gap: spacing.sm,
    },
    emptyIcon: {
      width: 56,
      height: 56,
      borderRadius: radius.pill,
      backgroundColor: p.surfaceInset,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.sm,
    },
    emptyTitle: {
      fontFamily: fonts.headerSemi,
      fontSize: 18,
      color: p.text,
    },
    emptyBody: {
      ...typography.bodySm,
      color: p.textMuted,
      textAlign: 'center',
      lineHeight: 22,
    },
    list: { gap: spacing.md },
    card: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.md,
      backgroundColor: p.surface,
      borderRadius: radius.xl,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: p.border,
      padding: spacing.lg,
    },
    cardUnread: {
      borderColor: isDark ? 'rgba(37,99,235,0.35)' : 'rgba(37,99,235,0.2)',
      backgroundColor: isDark ? p.surface : p.surfaceInset,
    },
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    cardBody: { flex: 1, minWidth: 0, gap: 4 },
    cardHead: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    cardTitle: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 15,
      color: p.text,
      flex: 1,
    },
    cardTitleUnread: {
      color: p.primary,
    },
    unreadDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: p.primary,
    },
    cardText: {
      ...typography.bodySm,
      color: p.textSecondary,
      lineHeight: 20,
    },
    cardTime: {
      ...typography.caption,
      color: p.textLight,
      marginTop: 2,
    },
    pressed: { opacity: 0.88 },
  });
}
