import { CheckInChat } from '@/src/components/CheckInChat';
import { TifyLanguagePicker } from '@/src/components/TifyLanguagePicker';
import { LoadingState } from '@/src/components/ScreenContainer';
import type { TifyLanguagePreference } from '@/src/constants/tify-language-preference';
import { useAuth } from '@/src/context/AuthContext';
import { useIniTify } from '@/src/context/IniTifyContext';
import type { CheckInChatMessage } from '@/src/models/check-in-chat';
import { tifyPreferencesService } from '@/src/services/check-in/tify-preferences.service';
import { getLiveHeatIndexC, getLiveWeatherFacts } from '@/src/utils/live-heat';
import { Redirect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CheckInTabScreen() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const {
    profile,
    heatReading,
    currentWeather,
    assessment,
    submitCheckIn,
    adaptProfileFromCheckInDraft,
    location,
    refreshLocation,
    refreshHeatData,
  } = useIniTify();

  const [languagePreference, setLanguagePreference] = useState<TifyLanguagePreference | null>(null);
  const [languageLoading, setLanguageLoading] = useState(true);
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);

  const liveHeatIndexC = useMemo(
    () => getLiveHeatIndexC(currentWeather, heatReading),
    [currentWeather, heatReading],
  );
  const weatherFacts = useMemo(
    () => getLiveWeatherFacts(currentWeather, heatReading),
    [currentWeather, heatReading],
  );

  useEffect(() => {
    if (!user?.id) return;
    let active = true;
    void (async () => {
      const saved = await tifyPreferencesService.getLanguage(user.id);
      if (!active) return;
      setLanguagePreference(saved);
      setShowLanguagePicker(saved == null);
      setLanguageLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!profile) return;
    void refreshHeatData('manual');
  }, [profile, refreshHeatData]);

  const handleLanguageSelect = useCallback(
    async (language: TifyLanguagePreference) => {
      if (!user?.id) return;
      await tifyPreferencesService.saveLanguage(user.id, language);
      setLanguagePreference(language);
      setShowLanguagePicker(false);
    },
    [user?.id],
  );

  if (authLoading || languageLoading) return <LoadingState message="Loading…" />;
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

  if (showLanguagePicker || !languagePreference) {
    return (
      <TifyLanguagePicker
        onSelect={(lang) => void handleLanguageSelect(lang)}
        onClose={languagePreference ? () => setShowLanguagePicker(false) : handleClose}
        title={languagePreference ? 'Change Tify language' : 'Choose your language'}
        subtitle={
          languagePreference
            ? 'Piliin ulit ang wika ni Tify. / Pick how Tify should talk to you.'
            : 'Piliin ang wika para kay Tify. You can change this later.'
        }
      />
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <CheckInChat
        key={languagePreference}
        profile={profile}
        languagePreference={languagePreference}
        heatIndexC={liveHeatIndexC}
        weatherFacts={weatherFacts}
        riskLevel={assessment?.level ?? null}
        location={location}
        onRequestLocation={() => refreshLocation('check_in')}
        onSave={handleSave}
        onDraftAdapt={adaptProfileFromCheckInDraft}
        onChangeLanguage={() => setShowLanguagePicker(true)}
        onClose={handleClose}
      />
    </SafeAreaView>
  );
}
