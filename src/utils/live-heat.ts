import type { CurrentWeatherSnapshot } from '@/src/models/weather';
import type { HeatIndexReading } from '@/src/models/environmental';

/** Live heat index — same value Weather / Home show (prefer snapshot over cached reading). */
export function getLiveHeatIndexC(
  weather: CurrentWeatherSnapshot | null | undefined,
  heatReading: HeatIndexReading | null | undefined,
): number | null {
  if (weather != null && typeof weather.heatIndexC === 'number' && !Number.isNaN(weather.heatIndexC)) {
    return weather.heatIndexC;
  }
  if (heatReading != null && typeof heatReading.heatIndex === 'number' && !Number.isNaN(heatReading.heatIndex)) {
    return heatReading.heatIndex;
  }
  return null;
}

/** Match UI precision (e.g. 26.9, not rounded 27 / 33). */
export function formatHeatIndexC(heatIndexC: number | null | undefined): string | null {
  if (heatIndexC == null || Number.isNaN(heatIndexC)) return null;
  return (Math.round(heatIndexC * 10) / 10).toFixed(1);
}
