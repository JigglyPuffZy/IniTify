import { Redirect } from 'expo-router';
import { useAuth } from '@/src/context/AuthContext';
import { useIniTify } from '@/src/context/IniTifyContext';
import { LoadingState } from '@/src/components/ScreenContainer';
import { NotificationsTabContent } from '@/src/components/NotificationsTabContent';
import { useResponsive } from '@/src/utils/responsive';

export default function NotificationsTabScreen() {
  const { user, isLoading: authLoading } = useAuth();
  const {
    inAppNotifications,
    markInAppNotificationRead,
    markAllInAppNotificationsRead,
  } = useIniTify();
  const { horizontalPadding } = useResponsive();

  if (authLoading) return <LoadingState message="Loading…" />;
  if (!user) return <Redirect href="/(auth)/login" />;

  return (
    <NotificationsTabContent
      notifications={inAppNotifications}
      onMarkRead={(id) => void markInAppNotificationRead(id)}
      onMarkAllRead={() => void markAllInAppNotificationsRead()}
      horizontalPadding={horizontalPadding}
    />
  );
}
