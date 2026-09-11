import type { EnvironmentalDataResult } from '@/src/models/environmental';
import type { CurrentWeatherSnapshot } from '@/src/models/weather';
import {
  cleanHeatIndexData,
  toHeatIndexReading,
  validateHeatIndexReading,
} from './environmental-pipeline';
import { offlineCacheService } from '@/src/services/offline-cache/offline-cache.service';
import { fetchOpenMeteoCurrent } from './open-meteo-client';
import type { OpenMeteoFetchContext } from './open-meteo-client';
import { appConfig } from '@/src/config/app.config';
import { TUGUEGARAO_STUDY_AREA } from '@/src/constants/study-area';
import { defaultTuguegaraoWeatherCoords } from '@/src/utils/tuguegarao-weather-location';
import {
  formatWeatherLocationSource,
  formatWeatherObservationTime,
  normalizeWeatherSnapshot,
} from '@/src/utils/weather-display';

/**
 * Live weather and heat index for Tuguegarao via Open-Meteo (no API key).
 * @see https://api.open-meteo.com/v1/forecast
 */
export const environmentalService = {
  isConfigured(): boolean {
    return true;
  },

  getProviderStatus() {
    return {
      configured: true,
      provider: 'open-meteo' as const,
      message: `Live weather & heat index for ${TUGUEGARAO_STUDY_AREA.label} (Open-Meteo, PAGASA station area).`,
    };
  },

  async fetchHeatIndex(
    latitude: number | null,
    longitude: number | null,
    fetchContext?: Partial<OpenMeteoFetchContext>,
  ): Promise<EnvironmentalDataResult> {
    const defaults = defaultTuguegaraoWeatherCoords();
    const heatLatitude = latitude ?? defaults.latitude;
    const heatLongitude = longitude ?? defaults.longitude;

    try {
      const weather = await fetchOpenMeteoCurrent(heatLatitude, heatLongitude, {
        queryLatitude: heatLatitude,
        queryLongitude: heatLongitude,
        coordSource: fetchContext?.coordSource ?? 'pagasa_station',
      });
      const cleaned = cleanHeatIndexData({
        heatIndex: weather.heatIndexC,
        latitude: heatLatitude,
        longitude: heatLongitude,
      });
      const validation = validateHeatIndexReading(cleaned);
      if (!validation.valid) {
        return { status: 'invalid', data: null, weather: null, message: validation.message };
      }
      const reading = toHeatIndexReading(cleaned, 'open-meteo');
      if (!reading) {
        return {
          status: 'invalid',
          data: null,
          weather: null,
          message: 'Unable to process weather data.',
        };
      }
      await offlineCacheService.saveHeatReading(reading);
      const weatherSnapshot: CurrentWeatherSnapshot = { ...weather };
      await offlineCacheService.saveWeather(weatherSnapshot);
      return {
        status: 'success',
        data: reading,
        weather: weatherSnapshot,
        message: `${weather.conditionText} · ${weather.heatIndexC}°C heat index · ${formatWeatherObservationTime(weather.observationAt)} · ${formatWeatherLocationSource(weather.coordSource)}`,
      };
    } catch (error) {
      const cached = await offlineCacheService.getLatestHeatReading();
      const cachedWeather = await offlineCacheService.getLatestWeather();
      const normalizedWeather = cachedWeather ? normalizeWeatherSnapshot(cachedWeather) : null;
      if (cached) {
        return {
          status: 'cached',
          data: { ...cached, isCached: true },
          weather: normalizedWeather,
          message:
            error instanceof Error
              ? `${error.message} Showing last saved reading.`
              : 'Weather unavailable. Showing last saved reading.',
        };
      }

      if (normalizedWeather) {
        return {
          status: 'cached',
          data: null,
          weather: normalizedWeather,
          message:
            error instanceof Error
              ? `${error.message} Showing last saved weather.`
              : 'Showing last saved weather.',
        };
      }

      if (appConfig.devManualHeatEnabled) {
        return {
          status: 'unavailable',
          data: null,
          weather: null,
          message:
            error instanceof Error
              ? `${error.message} Enter heat index manually on Home.`
              : 'Enter heat index manually on Home.',
        };
      }

      return {
        status: 'unavailable',
        data: null,
        weather: null,
        message:
          error instanceof Error
            ? error.message
            : 'Could not load live heat index. Check your connection.',
      };
    }
  },

  processRawData(raw: {
    heatIndex?: unknown;
    latitude?: unknown;
    longitude?: unknown;
  }): EnvironmentalDataResult {
    const cleaned = cleanHeatIndexData(raw);
    const validation = validateHeatIndexReading(cleaned);
    if (!validation.valid) {
      return { status: 'invalid', data: null, weather: null, message: validation.message };
    }
    const reading = toHeatIndexReading(cleaned, 'manual');
    if (!reading) {
      return { status: 'invalid', data: null, weather: null, message: 'Unable to process heat data.' };
    }
    return { status: 'success', data: reading, weather: null, message: 'Heat index saved.' };
  },
};
