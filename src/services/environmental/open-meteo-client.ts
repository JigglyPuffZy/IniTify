import { computeHeatIndexFromTempHumidity } from './pagasa/heat-index-calculator';
import type { CurrentWeatherSnapshot } from '@/src/models/weather';
import { TUGUEGARAO_STUDY_AREA } from '@/src/constants/study-area';

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
 * Heat index for risk: prefer Rothfusz from temp + humidity,
 * then apparent temperature, then air temperature. Do not take a max of all.
 */
function resolveHeatIndexC(params: {
  tempC: number;
  humidity?: number | null;
  apparentC?: number | null;
}): number {
  if (typeof params.humidity === 'number' && !Number.isNaN(params.humidity)) {
    const computed = computeHeatIndexFromTempHumidity(params.tempC, params.humidity);
    if (computed != null) return Math.round(computed * 10) / 10;
  }
  if (typeof params.apparentC === 'number' && !Number.isNaN(params.apparentC)) {
    return Math.round(params.apparentC * 10) / 10;
  }
  return Math.round(params.tempC * 10) / 10;
}

function buildForecastUrl(latitude: number, longitude: number): string {
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
  });
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

/**
 * Live current weather for Tuguegarao via Open-Meteo (no API key required).
 * Retries once on transient network failures. Always requests fresh current data.
 * @see https://open-meteo.com/en/docs
 */
export async function fetchOpenMeteoCurrent(
  latitude: number,
  longitude: number,
): Promise<CurrentWeatherSnapshot> {
  // Cache-bust so auto/manual refresh always hits live Open-Meteo current conditions
  const url = `${buildForecastUrl(latitude, longitude)}&_t=${Date.now()}`;
  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetchWithTimeout(url, 12_000);
      const json = (await response.json()) as OpenMeteoCurrentResponse;

      if (!response.ok || json.error) {
        throw new Error(json.reason ?? `Open-Meteo error (${response.status})`);
      }

      const current = json.current;
      if (current?.temperature_2m != null && !Number.isNaN(current.temperature_2m)) {
        const tempC = current.temperature_2m;
        const humidity = current.relative_humidity_2m ?? null;
        const apparentC = current.apparent_temperature ?? null;
        const heatIndexC = resolveHeatIndexC({ tempC, humidity, apparentC });
        const feelsLikeC = apparentC ?? heatIndexC;

        return {
          locationName: TUGUEGARAO_STUDY_AREA.city,
          tempC: Math.round(tempC * 10) / 10,
          feelsLikeC: Math.round(feelsLikeC * 10) / 10,
          heatIndexC,
          humidity: humidity ?? 0,
          conditionText: weatherCodeToText(current.weather_code),
          conditionIconUrl: '',
          windKph: Math.round((current.wind_speed_10m ?? 0) * 10) / 10,
          windDir: degreesToCompass(current.wind_direction_10m),
          isDay: current.is_day === 1,
          lastUpdated: current.time ?? new Date().toISOString(),
          source: 'open-meteo',
        };
      }

      // Legacy current_weather shape (no humidity — use apparent/temp for heat feel)
      const legacy = json.current_weather;
      if (legacy?.temperature != null && !Number.isNaN(legacy.temperature)) {
        const tempC = legacy.temperature;
        const heatIndexC = resolveHeatIndexC({ tempC, humidity: null, apparentC: null });
        return {
          locationName: TUGUEGARAO_STUDY_AREA.city,
          tempC: Math.round(tempC * 10) / 10,
          feelsLikeC: heatIndexC,
          heatIndexC,
          humidity: 0,
          conditionText: weatherCodeToText(legacy.weathercode),
          conditionIconUrl: '',
          windKph: Math.round((legacy.windspeed ?? 0) * 10) / 10,
          windDir: degreesToCompass(legacy.winddirection),
          isDay: legacy.is_day === 1,
          lastUpdated: legacy.time ?? new Date().toISOString(),
          source: 'open-meteo',
        };
      }

      throw new Error('Open-Meteo returned no current conditions.');
    } catch (error) {
      lastError = error;
      if (attempt === 0) {
        await new Promise((r) => setTimeout(r, 600));
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
