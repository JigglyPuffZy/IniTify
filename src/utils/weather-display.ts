import type { CurrentWeatherSnapshot } from '@/src/models/weather';
import {
  defaultTuguegaraoWeatherCoords,
  type TuguegaraoWeatherCoordSource,
} from '@/src/utils/tuguegarao-weather-location';

const MANILA_TZ = 'Asia/Manila';
const PHT_OFFSET = '+08:00';

/**
 * Open-Meteo returns local times without offset when timezone=Asia/Manila.
 * Normalize to a real instant so all devices show the same Philippine time.
 */
export function parseOpenMeteoObservationTime(time: string | undefined | null): string {
  if (!time?.trim()) return new Date().toISOString();

  const trimmed = time.trim();
  if (trimmed.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(trimmed)) {
    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
  }

  const withSeconds = trimmed.length === 16 ? `${trimmed}:00` : trimmed;
  const parsed = new Date(`${withSeconds}${PHT_OFFSET}`);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

/** e.g. "Sun, Sep 6 · 4:15 AM PHT" */
export function formatWeatherObservationTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return '—';

  const datePart = parsed.toLocaleString('en-PH', {
    timeZone: MANILA_TZ,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const timePart = parsed.toLocaleString('en-PH', {
    timeZone: MANILA_TZ,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  return `${datePart} · ${timePart} PHT`;
}

export function formatWeatherLocationSource(
  coordSource: TuguegaraoWeatherCoordSource | undefined,
): string {
  if (coordSource === 'gps') return 'Your location · Tuguegarao';
  return 'Tuguegarao City';
}

export function weatherObservationIso(weather: CurrentWeatherSnapshot | null | undefined): string | null {
  if (!weather) return null;
  return weather.observationAt ?? weather.lastUpdated ?? null;
}

/** Open-Meteo publishes current conditions about every 15 minutes. */
export function isWeatherObservationStale(
  iso: string | null | undefined,
  maxAgeMinutes = 20,
): boolean {
  if (!iso) return false;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return false;
  return Date.now() - parsed.getTime() > maxAgeMinutes * 60 * 1000;
}

export function formatWeatherDataSourceLabel(
  heatDataSource: 'live' | 'cached' | 'unavailable' | 'dev_manual',
): string {
  switch (heatDataSource) {
    case 'live':
      return 'Live data';
    case 'cached':
      return 'Cached · pull to refresh';
    case 'dev_manual':
      return 'Manual entry';
    default:
      return 'Unavailable';
  }
}

/** Backfill metadata for weather cached before observation fields were added. */
export function normalizeWeatherSnapshot(
  raw: Partial<CurrentWeatherSnapshot> & Pick<CurrentWeatherSnapshot, 'tempC' | 'heatIndexC' | 'humidity' | 'conditionText' | 'locationName' | 'source'>,
): CurrentWeatherSnapshot {
  const defaults = defaultTuguegaraoWeatherCoords();
  const legacyTime = raw.lastUpdated ?? raw.observationAt;
  const observationAt =
    raw.observationAt ??
    (legacyTime ? parseOpenMeteoObservationTime(legacyTime) : new Date().toISOString());

  return {
    locationName: raw.locationName,
    tempC: raw.tempC,
    feelsLikeC: raw.feelsLikeC ?? raw.heatIndexC,
    heatIndexC: raw.heatIndexC,
    humidity: raw.humidity,
    conditionText: raw.conditionText,
    conditionIconUrl: raw.conditionIconUrl ?? '',
    windKph: raw.windKph ?? 0,
    windDir: raw.windDir ?? '—',
    isDay: raw.isDay ?? true,
    observationAt,
    fetchedAt: raw.fetchedAt ?? observationAt,
    lastUpdated: observationAt,
    queryLatitude: raw.queryLatitude ?? defaults.latitude,
    queryLongitude: raw.queryLongitude ?? defaults.longitude,
    gridLatitude: raw.gridLatitude ?? null,
    gridLongitude: raw.gridLongitude ?? null,
    coordSource: raw.coordSource ?? 'pagasa_station',
    source: raw.source,
  };
}
