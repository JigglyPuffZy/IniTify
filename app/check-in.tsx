import { useEffect, useMemo } from 'react';
import { Redirect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useIniTify } from '@/src/context/IniTifyContext';
import { CheckInChat } from '@/src/components/CheckInChat';
import type { CheckInChatMessage } from '@/src/models/check-in-chat';
import { getLiveHeatIndexC, getLiveWeatherFacts } from '@/src/utils/live-heat';

export default function CheckInScreen() {
  const router = useRouter();
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
  const weatherFacts = useMemo(
    () => getLiveWeatherFacts(currentWeather, heatReading),
    [currentWeather, heatReading],
  );

  useEffect(() => {
    if (!profile) return;
    void refreshHeatData('manual');
  }, [profile, refreshHeatData]);

  if (!profile) return <Redirect href="/" />;

  function handleClose() {
    if (router.canGoBack()) {
      router.back();
      return;
    }
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

    router.replace('/check-in-history');
  }

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <CheckInChat
        profile={profile}
        heatIndexC={liveHeatIndexC}
        weatherFacts={weatherFacts}
        riskLevel={assessment?.level ?? null}
        location={location}
        onRequestLocation={() => refreshLocation('check_in')}
        onSave={handleSave}
        onClose={handleClose}
      />
    </SafeAreaView>
  );
}
