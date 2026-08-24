/** Live weather auto-refresh interval (Open-Meteo). */
export const WEATHER_AUTO_REFRESH_MS = 15 * 60 * 1000;
export const WEATHER_AUTO_REFRESH_MINUTES = 15;

export type WeatherRefreshTrigger = 'app_open' | 'manual' | 'auto_15m' | 'foreground';

export function formatWeatherCountdown(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
