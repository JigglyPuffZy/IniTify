/** Live weather auto-refresh interval (Open-Meteo) — 5 minutes for near real-time home data. */
export const WEATHER_AUTO_REFRESH_MS = 5 * 60 * 1000;
export const WEATHER_AUTO_REFRESH_MINUTES = 5;

export type WeatherRefreshTrigger = 'app_open' | 'manual' | 'auto_15m' | 'foreground';

export function formatWeatherCountdown(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function weatherRefreshProgress(
  secondsLeft: number,
  totalSeconds = Math.floor(WEATHER_AUTO_REFRESH_MS / 1000),
): number {
  if (totalSeconds <= 0) return 0;
  const elapsed = totalSeconds - Math.max(0, secondsLeft);
  return Math.min(1, Math.max(0, elapsed / totalSeconds));
}
