import type { TuguegaraoWeatherCoordSource } from '@/src/utils/tuguegarao-weather-location';

/** Live current weather for Tuguegarao study area (Open-Meteo) */
export interface CurrentWeatherSnapshot {
  locationName: string;
  tempC: number;
  feelsLikeC: number;
  heatIndexC: number;
  humidity: number;
  conditionText: string;
  conditionIconUrl: string;
  windKph: number;
  windDir: string;
  isDay: boolean;
  /** ISO instant when Open-Meteo observation applies (Philippine Time normalized). */
  observationAt: string;
  /** When the app last fetched this snapshot. */
  fetchedAt: string;
  /** @deprecated Use observationAt — kept for older cached payloads */
  lastUpdated: string;
  /** Coordinates sent to Open-Meteo */
  queryLatitude: number;
  queryLongitude: number;
  /** Grid cell Open-Meteo used (may differ slightly from query) */
  gridLatitude?: number | null;
  gridLongitude?: number | null;
  coordSource: TuguegaraoWeatherCoordSource;
  source: 'open-meteo';
}
