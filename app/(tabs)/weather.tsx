import { useState } from 'react';
import { Redirect } from 'expo-router';
import { useIniTify } from '@/src/context/IniTifyContext';
import { WeatherTabContent } from '@/src/components/WeatherTabContent';
import { useResponsive } from '@/src/utils/responsive';

export default function WeatherTabScreen() {
  const {
    profile,
    currentWeather,
    refreshHeatData,
    weatherRefreshSecondsLeft,
    isWeatherRefreshing,
  } = useIniTify();
  const { horizontalPadding } = useResponsive();
  const [refreshing, setRefreshing] = useState(false);

  async function onRefresh() {
    setRefreshing(true);
    await refreshHeatData('manual');
    setRefreshing(false);
  }

  if (!profile) return <Redirect href="/" />;

  return (
    <WeatherTabContent
      weather={currentWeather}
      loading={refreshing || isWeatherRefreshing}
      configured
      refreshing={refreshing || isWeatherRefreshing}
      onRefresh={onRefresh}
      horizontalPadding={horizontalPadding}
      weatherRefreshSecondsLeft={weatherRefreshSecondsLeft}
    />
  );
}
