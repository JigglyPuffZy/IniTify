import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { InAppNotification, InAppNotificationType } from '@/src/models/in-app-notification';
import { ScreenTopAccent } from '@/src/components/layout/PageMasthead';
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
  { icon: React.ComponentProps<typeof Ionicons>['name']; color: string; label: string }
> = {
  'check-in-reminder': { icon: 'alarm-outline', color: '#2563EB', label: 'Check-in' },
  'heat-risk': { icon: 'thermometer-outline', color: '#DC2626', label: 'Heat risk' },
  'weather-safety': { icon: 'partly-sunny-outline', color: '#D97706', label: 'Weather' },
  emergency: { icon: 'warning-outline', color: '#991B1B', label: 'Emergency' },
  system: { icon: 'information-circle-outline', color: '#64748B', label: 'System' },
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
      if (!result.data && result.status === 'permission_denied') {
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
          <View style={styles.pageHeader}>
            <View style={styles.pageHeaderRow}>
              <View style={styles.pageHeaderText}>
                <Text style={styles.pageTitle}>Notifications</Text>
                <Text style={styles.pageSubtitle}>
                  Heat alerts, check-ins, and safety updates
                </Text>
              </View>
              {unread > 0 ? (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadBadgeText}>{unread}</Text>
                </View>
              ) : null}
            </View>
          </View>

          <View style={styles.phoneCard}>
            <LinearGradient
              colors={
                phoneEnabled
                  ? isDark
                    ? ['#1E3A8A', '#2563EB']
                    : ['#2563EB', '#3B82F6']
                  : isDark
                    ? [palette.surface, palette.surfaceMuted]
                    : [palette.surface, palette.primarySoft]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.phoneCardInner}>
              <View style={styles.phoneHead}>
                <View
                  style={[
                    styles.phoneIcon,
                    phoneEnabled && styles.phoneIconOn,
                  ]}
                >
                  <Ionicons
                    name={phoneEnabled ? 'notifications' : 'notifications-off-outline'}
                    size={22}
                    color={phoneEnabled ? '#FFFFFF' : palette.primary}
                  />
                </View>
                <View style={styles.phoneTextWrap}>
                  <Text style={[styles.phoneTitle, phoneEnabled && styles.phoneTitleOn]}>
                    {phoneEnabled ? 'Phone alerts on' : 'Turn on phone alerts'}
                  </Text>
                  <Text style={[styles.phoneBody, phoneEnabled && styles.phoneBodyOn]}>
                    {!nativeAvailable
                      ? 'Install the release APK to use the phone notification shade.'
                      : phoneEnabled
                        ? 'Heat and check-in reminders appear in your notification shade.'
                        : 'Allow notifications so IniTify can warn you about heat risk.'}
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
                        styles.phonePrimaryBtnOnCard,
                        pressed && styles.pressed,
                        busy && styles.disabled,
                      ]}
                    >
                      {busy ? (
                        <ActivityIndicator color={palette.primary} />
                      ) : (
                        <>
                          <Ionicons name="flash-outline" size={16} color={palette.primary} />
                          <Text style={styles.phonePrimaryTextOnCard}>Send test alert</Text>
                        </>
                      )}
                    </Pressable>
                  )}
                  <Pressable
                    onPress={() => void notificationService.openSystemNotificationSettings()}
                    style={({ pressed }) => [styles.phoneGhostBtn, pressed && styles.pressed]}
                  >
                    <Text
                      style={[
                        styles.phoneGhostText,
                        phoneEnabled && styles.phoneGhostTextOn,
                      ]}
                    >
                      Open phone Settings
                    </Text>
                  </Pressable>
                </View>
              ) : null}

              {phoneMessage ? (
                <Text style={[styles.phoneMessage, phoneEnabled && styles.phoneMessageOn]}>
                  {phoneMessage}
                </Text>
              ) : null}
            </View>
          </View>

          <View style={styles.sectionRow}>
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionTitle}>In-app inbox</Text>
              <Text style={styles.sectionSubtitle}>
                {notifications.length === 0
                  ? 'Nothing here yet'
                  : `${notifications.length} notification${notifications.length === 1 ? '' : 's'}`}
              </Text>
            </View>
            {unread > 0 ? (
              <Pressable
                onPress={onMarkAllRead}
                style={({ pressed }) => [styles.markAllBtn, pressed && styles.pressed]}
              >
                <Text style={styles.markAllText}>Mark all read</Text>
              </Pressable>
            ) : null}
          </View>

          {notifications.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIcon}>
                <Ionicons name="notifications-outline" size={32} color={palette.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>All caught up</Text>
              <Text style={styles.emptyBody}>
                When heat risk rises or a check-in is due, alerts will show up here and on your phone.
              </Text>
            </View>
          ) : (
            <View style={styles.menuCard}>
              {notifications.map((item, index) => {
                const meta = TYPE_META[item.type];
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => openNotification(item)}
                    style={({ pressed }) => [
                      styles.notifRow,
                      index < notifications.length - 1 && styles.notifRowBorder,
                      !item.read && styles.notifRowUnread,
                      pressed && styles.pressed,
                    ]}
                  >
                    <View style={[styles.notifIcon, { backgroundColor: `${meta.color}18` }]}>
                      <Ionicons name={meta.icon} size={20} color={meta.color} />
                    </View>
                    <View style={styles.notifCopy}>
                      <View style={styles.notifHead}>
                        <Text style={styles.notifType}>{meta.label}</Text>
                        {!item.read ? <View style={styles.unreadDot} /> : null}
                      </View>
                      <Text
                        style={[styles.notifTitle, !item.read && styles.notifTitleUnread]}
                        numberOfLines={2}
                      >
                        {item.title}
                      </Text>
                      <Text style={styles.notifBody} numberOfLines={2}>{item.body}</Text>
                      <Text style={styles.notifTime}>{formatWhen(item.createdAt)}</Text>
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
  const shadow = cardShadow();

  return StyleSheet.create({
    root: { flex: 1, backgroundColor: p.background },
    scrollContent: { flexGrow: 1 },

    pageHeader: {
      marginTop: spacing.sm,
      marginBottom: spacing.lg,
    },
    pageHeaderRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.md,
    },
    pageHeaderText: { flex: 1, minWidth: 0, gap: 4 },
    pageTitle: {
      fontFamily: fonts.header,
      fontSize: 28,
      letterSpacing: -0.5,
      color: p.text,
    },
    pageSubtitle: {
      ...typography.bodySm,
      color: p.textMuted,
      lineHeight: 20,
    },
    unreadBadge: {
      minWidth: 28,
      height: 28,
      borderRadius: radius.pill,
      backgroundColor: p.primary,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.sm,
      marginTop: 4,
    },
    unreadBadgeText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 13,
      color: '#FFFFFF',
    },

    phoneCard: {
      borderRadius: radius.xxl,
      overflow: 'hidden',
      marginBottom: spacing.xxl,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(59,130,246,0.35)' : 'rgba(37,99,235,0.2)',
      ...shadow,
    },
    phoneCardInner: {
      padding: spacing.lg,
      gap: spacing.md,
    },
    phoneHead: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
    phoneIcon: {
      width: 48,
      height: 48,
      borderRadius: radius.md,
      backgroundColor: p.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    phoneIconOn: {
      backgroundColor: 'rgba(255,255,255,0.2)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.35)',
    },
    phoneTextWrap: { flex: 1, minWidth: 0, gap: 4 },
    phoneTitle: {
      fontFamily: fonts.headerSemi,
      fontSize: 17,
      color: p.text,
    },
    phoneTitleOn: { color: '#FFFFFF' },
    phoneBody: {
      ...typography.bodySm,
      color: p.textMuted,
      lineHeight: 20,
    },
    phoneBodyOn: { color: 'rgba(255,255,255,0.88)' },
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
    phonePrimaryBtnOnCard: {
      backgroundColor: '#FFFFFF',
    },
    phonePrimaryText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 15,
      color: '#FFFFFF',
    },
    phonePrimaryTextOnCard: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 15,
      color: p.primary,
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
    phoneGhostTextOn: { color: 'rgba(255,255,255,0.92)' },
    phoneMessage: {
      ...typography.caption,
      color: p.textSecondary,
    },
    phoneMessageOn: { color: 'rgba(255,255,255,0.85)' },
    disabled: { opacity: 0.7 },

    sectionRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: spacing.md,
      marginBottom: spacing.sm,
    },
    sectionBlock: { flex: 1, minWidth: 0, gap: 2 },
    sectionTitle: {
      fontFamily: fonts.headerSemi,
      fontSize: 17,
      color: p.text,
      letterSpacing: -0.2,
    },
    sectionSubtitle: {
      ...typography.caption,
      color: p.textMuted,
      lineHeight: 17,
    },
    markAllBtn: {
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
      ...shadow,
    },
    emptyIcon: {
      width: 64,
      height: 64,
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

    menuCard: {
      backgroundColor: p.surface,
      borderRadius: radius.xl,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: p.border,
      overflow: 'hidden',
      marginBottom: spacing.lg,
      ...shadow,
    },
    notifRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.md,
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.lg,
    },
    notifRowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: p.borderLight,
    },
    notifRowUnread: {
      backgroundColor: isDark ? 'rgba(37,99,235,0.08)' : p.primarySoft,
    },
    notifIcon: {
      width: 42,
      height: 42,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    notifCopy: { flex: 1, minWidth: 0, gap: 3 },
    notifHead: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    notifType: {
      ...typography.overline,
      fontSize: 10,
      color: p.textMuted,
    },
    unreadDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: p.primary,
    },
    notifTitle: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 15,
      color: p.text,
      lineHeight: 20,
    },
    notifTitleUnread: { color: p.primary },
    notifBody: {
      ...typography.bodySm,
      color: p.textSecondary,
      lineHeight: 19,
    },
    notifTime: {
      ...typography.caption,
      color: p.textLight,
      marginTop: 2,
    },

    pressed: { opacity: 0.88 },
  });
}
