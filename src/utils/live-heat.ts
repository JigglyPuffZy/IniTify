import type { HeatIndexReading } from '@/src/models/environmental';
import type { CurrentWeatherSnapshot } from '@/src/models/weather';

/** Live heat index — same value Weather / Home show (prefer snapshot over cached reading). */
export function getLiveHeatIndexC(
  weather: CurrentWeatherSnapshot | null | undefined,
  heatReading: HeatIndexReading | null | undefined,
): number | null {
  if (weather != null && typeof weather.heatIndexC === 'number' && !Number.isNaN(weather.heatIndexC)) {
    return weather.heatIndexC;
  }
  if (
    heatReading != null &&
    typeof heatReading.heatIndex === 'number' &&
    !Number.isNaN(heatReading.heatIndex)
  ) {
    return heatReading.heatIndex;
  }
  return null;
}

/** Match UI precision (e.g. 26.9, not rounded 27). */
export function formatHeatIndexC(heatIndexC: number | null | undefined): string | null {
  if (heatIndexC == null || Number.isNaN(heatIndexC)) return null;
  return (Math.round(heatIndexC * 10) / 10).toFixed(1);
}

export function formatTempC(tempC: number | null | undefined): string | null {
  if (tempC == null || Number.isNaN(tempC)) return null;
  return (Math.round(tempC * 10) / 10).toFixed(1);
}

/** Exact numbers Tify must quote — mirrors Home / Weather dashboard. */
export interface LiveWeatherFacts {
  tempC: number | null;
  heatIndexC: number | null;
  feelsLikeC: number | null;
  humidity: number | null;
  conditionText: string | null;
  tempLabel: string | null;
  heatIndexLabel: string | null;
  feelsLikeLabel: string | null;
}

export function getLiveWeatherFacts(
  weather: CurrentWeatherSnapshot | null | undefined,
  heatReading: HeatIndexReading | null | undefined,
): LiveWeatherFacts {
  const heatIndexC = getLiveHeatIndexC(weather, heatReading);
  const tempC =
    weather != null && typeof weather.tempC === 'number' && !Number.isNaN(weather.tempC)
      ? weather.tempC
      : null;
  const feelsLikeC =
    weather != null && typeof weather.feelsLikeC === 'number' && !Number.isNaN(weather.feelsLikeC)
      ? weather.feelsLikeC
      : null;
  const humidity =
    weather != null && typeof weather.humidity === 'number' && !Number.isNaN(weather.humidity)
      ? weather.humidity
      : null;

  return {
    tempC,
    heatIndexC,
    feelsLikeC,
    humidity,
    conditionText: weather?.conditionText ?? null,
    tempLabel: formatTempC(tempC),
    heatIndexLabel: formatHeatIndexC(heatIndexC),
    feelsLikeLabel: formatTempC(feelsLikeC),
  };
}
