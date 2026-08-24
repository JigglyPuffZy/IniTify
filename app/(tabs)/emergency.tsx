import { Redirect } from 'expo-router';
import { useIniTify } from '@/src/context/IniTifyContext';
import { EmergencyTabContent } from '@/src/components/EmergencyTabContent';
import { useResponsive } from '@/src/utils/responsive';

export default function EmergencyTabScreen() {
  const { profile, emergencyContact, emergencyState } = useIniTify();
  const { horizontalPadding } = useResponsive();

  if (!profile) return <Redirect href="/" />;

  return (
    <EmergencyTabContent
      profile={profile}
      emergencyContact={emergencyContact}
      emergencyState={emergencyState}
      horizontalPadding={horizontalPadding}
    />
  );
}
