import { Redirect } from 'expo-router';
import { useAuth } from '@/src/context/AuthContext';
import { useIniTify } from '@/src/context/IniTifyContext';
import { LoadingState } from '@/src/components/ScreenContainer';
import { ProfileTabContent } from '@/src/components/ProfileTabContent';
import { useResponsive } from '@/src/utils/responsive';

export default function ProfileTabScreen() {
  const { user, isLoading: authLoading } = useAuth();
  const { profile, assessment } = useIniTify();
  const { horizontalPadding } = useResponsive();

  if (authLoading) return <LoadingState message="Loading profile…" />;
  if (!user) return <Redirect href="/(auth)/login" />;
  if (!profile) return <Redirect href="/" />;

  return (
    <ProfileTabContent
      profile={profile}
      assessment={assessment}
      horizontalPadding={horizontalPadding}
    />
  );
}
