import { computeHeatIndexFromTempHumidity } from './pagasa/heat-index-calculator';
import type { CurrentWeatherSnapshot } from '@/src/models/weather';
import {
  TUGUEGARAO_WEATHER_LABEL,
  type TuguegaraoWeatherCoordSource,
} from '@/src/utils/tuguegarao-weather-location';
import { parseOpenMeteoObservationTime } from '@/src/utils/weather-display';

/** Open-Meteo forecast current-weather response (subset). */
interface OpenMeteoCurrentResponse {
  latitude?: number;
  longitude?: number;
  timezone?: string;
  current?: {
    time?: string;
    interval?: number;
    temperature_2m?: number;
    relative_humidity_2m?: number;
    apparent_temperature?: number;
    precipitation?: number;
    weather_code?: number;
    wind_speed_10m?: number;
    wind_direction_10m?: number;
    is_day?: number;
  };
  /** Legacy field name (older Open-Meteo responses) */
  current_weather?: {
    time?: string;
    temperature?: number;
    windspeed?: number;
    winddirection?: number;
    weathercode?: number;
    is_day?: number;
  };
  error?: boolean;
  reason?: string;
}

/** WMO Weather interpretation codes → short English labels */
function weatherCodeToText(code: number | undefined): string {
  if (code == null || Number.isNaN(code)) return 'Current conditions';
  const map: Record<number, string> = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Fog',
    48: 'Depositing rime fog',
    51: 'Light drizzle',
    53: 'Moderate drizzle',
    55: 'Dense drizzle',
    56: 'Light freezing drizzle',
    57: 'Dense freezing drizzle',
    61: 'Slight rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    66: 'Light freezing rain',
    67: 'Heavy freezing rain',
    71: 'Slight snow',
    73: 'Moderate snow',
    75: 'Heavy snow',
    77: 'Snow grains',
    80: 'Slight rain showers',
    81: 'Moderate rain showers',
    82: 'Violent rain showers',
    85: 'Slight snow showers',
    86: 'Heavy snow showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with slight hail',
    99: 'Thunderstorm with heavy hail',
  };
  return map[code] ?? `Weather code ${code}`;
}

function degreesToCompass(degrees: number | undefined): string {
  if (degrees == null || Number.isNaN(degrees)) return '—';
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const;
  const index = Math.round(((((degrees % 360) + 360) % 360) / 45) % 8);
  return dirs[index];
}

/**
 * Heat index for risk: Rothfusz from temp + humidity, then compare with Open-Meteo
 * apparent temperature — use the higher value in humid tropics (PAGASA-style stress).
 */
function resolveHeatIndexC(params: {
  tempC: number;
  humidity?: number | null;
  apparentC?: number | null;
}): number {
  let computed: number | null = null;
  if (typeof params.humidity === 'number' && !Number.isNaN(params.humidity)) {
    const fromRh = computeHeatIndexFromTempHumidity(params.tempC, params.humidity);
    if (fromRh != null) computed = fromRh;
  }

  const apparent =
    typeof params.apparentC === 'number' && !Number.isNaN(params.apparentC)
      ? Math.round(params.apparentC * 10) / 10
      : null;

  if (computed != null && apparent != null) {
    return Math.max(computed, apparent);
  }
  if (computed != null) return computed;
  if (apparent != null) return apparent;
  return Math.round(params.tempC * 10) / 10;
}

function buildForecastUrl(latitude: number, longitude: number, models?: string): string {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: [
      'temperature_2m',
      'relative_humidity_2m',
      'apparent_temperature',
      'precipitation',
      'weather_code',
      'wind_speed_10m',
      'wind_direction_10m',
      'is_day',
    ].join(','),
    wind_speed_unit: 'kmh',
    timezone: 'Asia/Manila',
    // Prefer land grid cell (station area) over water interpolation.
    cell_selection: 'land',
  });
  if (models) params.set('models', models);
  return `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

export type OpenMeteoFetchContext = {
  queryLatitude: number;
  queryLongitude: number;
  coordSource: TuguegaraoWeatherCoordSource;
};

function buildSnapshot(
  base: Omit<
    CurrentWeatherSnapshot,
    | 'observationAt'
    | 'fetchedAt'
    | 'lastUpdated'
    | 'queryLatitude'
    | 'queryLongitude'
    | 'gridLatitude'
    | 'gridLongitude'
    | 'coordSource'
  >,
  observationTime: string,
  grid: OpenMeteoCurrentResponse,
  ctx: OpenMeteoFetchContext,
): CurrentWeatherSnapshot {
  const observationAt = parseOpenMeteoObservationTime(observationTime);
  const fetchedAt = new Date().toISOString();
  return {
    ...base,
    observationAt,
    fetchedAt,
    lastUpdated: observationAt,
    queryLatitude: ctx.queryLatitude,
    queryLongitude: ctx.queryLongitude,
    gridLatitude: grid.latitude ?? null,
    gridLongitude: grid.longitude ?? null,
    coordSource: ctx.coordSource,
  };
}

function parseOpenMeteoResponse(
  json: OpenMeteoCurrentResponse,
  ctx: OpenMeteoFetchContext,
): CurrentWeatherSnapshot | null {
  const current = json.current;
  if (current?.temperature_2m != null && !Number.isNaN(current.temperature_2m)) {
    const tempC = current.temperature_2m;
    const humidity = current.relative_humidity_2m ?? null;
    const apparentC = current.apparent_temperature ?? null;
    const heatIndexC = resolveHeatIndexC({ tempC, humidity, apparentC });
    const feelsLikeC = apparentC ?? heatIndexC;

    return buildSnapshot(
      {
        locationName: TUGUEGARAO_WEATHER_LABEL,
        tempC: Math.round(tempC * 10) / 10,
        feelsLikeC: Math.round(feelsLikeC * 10) / 10,
        heatIndexC,
        humidity: humidity ?? 0,
        conditionText: weatherCodeToText(current.weather_code),
        conditionIconUrl: '',
        windKph: Math.round((current.wind_speed_10m ?? 0) * 10) / 10,
        windDir: degreesToCompass(current.wind_direction_10m),
        isDay: current.is_day === 1,
        source: 'open-meteo',
      },
      current.time ?? new Date().toISOString(),
      json,
      ctx,
    );
  }

  const legacy = json.current_weather;
  if (legacy?.temperature != null && !Number.isNaN(legacy.temperature)) {
    const tempC = legacy.temperature;
    const heatIndexC = resolveHeatIndexC({ tempC, humidity: null, apparentC: null });
    return buildSnapshot(
      {
        locationName: TUGUEGARAO_WEATHER_LABEL,
        tempC: Math.round(tempC * 10) / 10,
        feelsLikeC: heatIndexC,
        heatIndexC,
        humidity: 0,
        conditionText: weatherCodeToText(legacy.weathercode),
        conditionIconUrl: '',
        windKph: Math.round((legacy.windspeed ?? 0) * 10) / 10,
        windDir: degreesToCompass(legacy.winddirection),
        isDay: legacy.is_day === 1,
        source: 'open-meteo',
      },
      legacy.time ?? new Date().toISOString(),
      json,
      ctx,
    );
  }

  return null;
}

async function fetchOpenMeteoOnce(
  url: string,
  ctx: OpenMeteoFetchContext,
): Promise<CurrentWeatherSnapshot | null> {
  const response = await fetchWithTimeout(url, 12_000);
  const json = (await response.json()) as OpenMeteoCurrentResponse;

  if (!response.ok || json.error) {
    throw new Error(json.reason ?? `Open-Meteo error (${response.status})`);
  }

  return parseOpenMeteoResponse(json, ctx);
}

/**
 * Live current weather for Tuguegarao via Open-Meteo (no API key required).
 * Uses best-match model first, then GFS seamless as fallback for the Philippines.
 * @see https://open-meteo.com/en/docs
 */
export async function fetchOpenMeteoCurrent(
  latitude: number,
  longitude: number,
  ctx?: Partial<OpenMeteoFetchContext>,
): Promise<CurrentWeatherSnapshot> {
  const fetchCtx: OpenMeteoFetchContext = {
    queryLatitude: ctx?.queryLatitude ?? latitude,
    queryLongitude: ctx?.queryLongitude ?? longitude,
    coordSource: ctx?.coordSource ?? 'pagasa_station',
  };
  const cacheBust = `_t=${Date.now()}`;
  const attempts = [
    buildForecastUrl(latitude, longitude),
    buildForecastUrl(latitude, longitude, 'gfs_seamless'),
  ];

  let lastError: unknown;

  for (const baseUrl of attempts) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const snapshot = await fetchOpenMeteoOnce(`${baseUrl}&${cacheBust}`, fetchCtx);
        if (snapshot) return snapshot;
        throw new Error('Open-Meteo returned no current conditions.');
      } catch (error) {
        lastError = error;
        if (attempt === 0) {
          await new Promise((r) => setTimeout(r, 600));
        }
      }
    }
  }

  if (lastError instanceof Error) {
    if (lastError.name === 'AbortError') {
      throw new Error('Weather request timed out. Pull down to retry.');
    }
    throw lastError;
  }
  throw new Error('Could not load live weather. Check your connection.');
}
