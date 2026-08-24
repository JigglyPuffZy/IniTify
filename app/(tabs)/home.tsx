import { useState, useMemo } from 'react';
import { Text, StyleSheet, View, TextInput, Pressable } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '@/src/context/AuthContext';
import { useIniTify } from '@/src/context/IniTifyContext';
import { LoadingState, SectionHeader, SurfaceCard } from '@/src/components/ScreenContainer';
import { HomeOverview } from '@/src/components/HomeOverview';
import { appConfig } from '@/src/config/app.config';
import { useResponsive } from '@/src/utils/responsive';
import { getTimeGreeting } from '@/src/utils/greeting';
import { radius, spacing } from '@/src/theme';
import { useAppTheme } from '@/src/theme/useAppTheme';
import type { LegacyThemeColors } from '@/src/theme/legacy-colors';

export default function HomeScreen() {
  const { horizontalPadding } = useResponsive();
  const { user } = useAuth();
  const [heatInput, setHeatInput] = useState('');
  const [heatSaveMessage, setHeatSaveMessage] = useState<string | null>(null);
  const [refreshingHeat, setRefreshingHeat] = useState(false);
  const {
    profile,
    assessment,
    heatReading,
    currentWeather,
    heatDataSource,
    emergencyState,
    isLoading,
    applyManualDevHeatIndex,
    refreshHeatData,
    runAssessment,
    weatherRefreshSecondsLeft,
    isWeatherRefreshing,
  } = useIniTify();

  const { colors } = useAppTheme();
  const devStyles = useMemo(() => createDevStyles(colors), [colors]);
  const liveWeatherEnabled = true;
  const showManualHeat = appConfig.devManualHeatEnabled;

  if (isLoading) return <LoadingState message="Loading IniTify…" />;
  if (!user) return <Redirect href="/(auth)/login" />;
  if (!profile) return <Redirect href="/" />;

  const firstName = profile.name.split(' ')[0];
  const greeting = getTimeGreeting();

  async function handleRefreshHeat() {
    setRefreshingHeat(true);
    await refreshHeatData('manual');
    runAssessment();
    setRefreshingHeat(false);
  }

  const devBlock = showManualHeat ? (
    <SurfaceCard>
      <SectionHeader title="Manual heat entry" subtitle="Dev only" />
      <View style={devStyles.heatInputWrap}>
        <TextInput
          style={devStyles.heatInput}
          value={heatInput}
          onChangeText={setHeatInput}
          placeholder={heatReading ? String(heatReading.heatIndex) : '38'}
          keyboardType="decimal-pad"
          placeholderTextColor={colors.textLight}
        />
        <Text style={devStyles.heatUnit}>°C</Text>
      </View>
      <Pressable
        onPress={async () => {
          const value = Number.parseFloat(heatInput);
          const result = await applyManualDevHeatIndex(value);
          setHeatSaveMessage(result.message);
        }}
        style={({ pressed }) => [devStyles.devSaveBtn, pressed && { opacity: 0.9 }]}
      >
        <Text style={devStyles.devSaveBtnText}>Save</Text>
      </Pressable>
      {heatSaveMessage ? <Text style={devStyles.heatSaveMsg}>{heatSaveMessage}</Text> : null}
    </SurfaceCard>
  ) : null;

  return (
    <HomeOverview
      firstName={firstName}
      greeting={greeting}
      weather={currentWeather}
      liveWeatherEnabled={liveWeatherEnabled}
      isLive={heatDataSource === 'live'}
      assessmentLevel={assessment?.level ?? null}
      assessmentMessage={assessment?.message}
      onCheckRisk={runAssessment}
      horizontalPadding={horizontalPadding}
      refreshing={refreshingHeat || isWeatherRefreshing}
      onRefresh={handleRefreshHeat}
      weatherRefreshSecondsLeft={weatherRefreshSecondsLeft}
      emergencyActive={emergencyState.isActive}
      extraContent={devBlock}
    />
  );
}

function createDevStyles(colors: LegacyThemeColors) {
  return StyleSheet.create({
    heatInputWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceMuted,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: spacing.lg,
      marginBottom: spacing.sm,
    },
    heatInput: {
      flex: 1,
      paddingVertical: spacing.lg,
      fontSize: 28,
      fontWeight: '600',
      color: colors.text,
      textAlign: 'center',
    },
    heatUnit: { fontSize: 16, fontWeight: '600', color: colors.textMuted },
    devSaveBtn: {
      backgroundColor: colors.surfaceMuted,
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    devSaveBtnText: { fontSize: 14, fontWeight: '600', color: colors.text },
    heatSaveMsg: { fontSize: 12, color: colors.success, textAlign: 'center', marginTop: spacing.sm },
  });
}
