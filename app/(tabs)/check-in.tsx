import { useEffect, useMemo } from 'react';
import { Redirect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/src/context/AuthContext';
import { LoadingState } from '@/src/components/ScreenContainer';
import { useIniTify } from '@/src/context/IniTifyContext';
import { CheckInChat } from '@/src/components/CheckInChat';
import type { CheckInChatMessage } from '@/src/models/check-in-chat';
import { getLiveHeatIndexC } from '@/src/utils/live-heat';

export default function CheckInTabScreen() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const {
    profile,
    heatReading,
    currentWeather,
    assessment,
    submitCheckIn,
    location,
    refreshLocation,
    refreshHeatData,
  } = useIniTify();

  const liveHeatIndexC = useMemo(
    () => getLiveHeatIndexC(currentWeather, heatReading),
    [currentWeather, heatReading],
  );

  // Real-time weather before / while chatting with Tify
  useEffect(() => {
    if (!profile) return;
    void refreshHeatData('manual');
  }, [profile, refreshHeatData]);

  if (authLoading) return <LoadingState message="Loading…" />;
  if (!user) return <Redirect href="/(auth)/login" />;
  if (!profile) return <Redirect href="/" />;

  function handleClose() {
    router.replace('/(tabs)/home');
  }

  async function handleSave(input: {
    hydrationStatus: string;
    activityLevel: string;
    generalStatus: string;
    notes?: string;
    chatMessages: CheckInChatMessage[];
  }) {
    const transcriptNote = input.chatMessages.length
      ? `\n\n[Chat check-in]\n${input.chatMessages
          .map((m) => `${m.role === 'user' ? 'You' : 'Tify'}: ${m.content}`)
          .join('\n')}`
      : '';

    const notes = [input.notes?.trim(), transcriptNote.trim()].filter(Boolean).join('\n');

    await submitCheckIn({
      hydrationStatus: input.hydrationStatus,
      activityLevel: input.activityLevel,
      generalStatus: input.generalStatus,
      notes: notes || undefined,
    });

    router.push('/check-in-history');
  }

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <CheckInChat
        profile={profile}
        heatIndexC={liveHeatIndexC}
        riskLevel={assessment?.level ?? null}
        location={location}
        onRequestLocation={() => refreshLocation('check_in')}
        onSave={handleSave}
        onClose={handleClose}
      />
    </SafeAreaView>
  );
}
