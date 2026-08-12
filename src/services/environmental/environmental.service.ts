import { appConfig } from '@/src/config/app.config';
import type { EnvironmentalDataResult } from '@/src/models/environmental';
import {
  cleanHeatIndexData,
  toHeatIndexReading,
  validateHeatIndexReading,
} from './environmental-pipeline';
import { offlineCacheService } from '@/src/services/offline-cache/offline-cache.service';
import {
  fetchFromCustomPagasaEndpoint,
  fetchFromTenDayApi,
  getPagasaProviderStatus,
} from './pagasa/pagasa.service';

/**
 * Environmental data service — DOST-PAGASA heat-index source.
 */
export const environmentalService = {
  isConfigured(): boolean {
    const status = getPagasaProviderStatus();
    return status.configured;
  },

  getProviderStatus() {
    return getPagasaProviderStatus();
  },

  async fetchHeatIndex(
    latitude: number | null,
    longitude: number | null,
  ): Promise<EnvironmentalDataResult> {
    const provider = appConfig.pagasaProvider;

    if (provider === 'tenday') {
      const result = await fetchFromTenDayApi(latitude, longitude);
      if (result.reading) {
        await offlineCacheService.saveHeatReading(result.reading);
        return {
          status: 'success',
          data: result.reading,
          message: result.message,
        };
      }

      const cached = await offlineCacheService.getLatestHeatReading();
      if (cached) {
        return {
          status: 'cached',
          data: { ...cached, isCached: true },
          message: `${result.message} Showing previously cached data.`,
        };
      }

      return { status: 'unavailable', data: null, message: result.message };
    }

    if (provider === 'custom') {
      const result = await fetchFromCustomPagasaEndpoint(latitude, longitude);
      if (result.reading) {
        await offlineCacheService.saveHeatReading(result.reading);
        return {
          status: 'success',
          data: result.reading,
          message: result.message,
        };
      }

      const cached = await offlineCacheService.getLatestHeatReading();
      if (cached) {
        return {
          status: 'cached',
          data: { ...cached, isCached: true },
          message: `${result.message} Showing previously cached data.`,
        };
      }

      return { status: 'unavailable', data: null, message: result.message };
    }

    const cached = await offlineCacheService.getLatestHeatReading();
    if (cached) {
      return {
        status: 'cached',
        data: { ...cached, isCached: true },
        message:
          'PAGASA provider not configured. Set EXPO_PUBLIC_PAGASA_PROVIDER. Showing cached data.',
      };
    }

    return {
      status: 'unavailable',
      data: null,
      message:
        'DOST-PAGASA not configured. Set EXPO_PUBLIC_PAGASA_PROVIDER to "tenday" or "custom" and provide API credentials.',
    };
  },

  processRawData(raw: {
    heatIndex?: unknown;
    latitude?: unknown;
    longitude?: unknown;
  }): EnvironmentalDataResult {
    const cleaned = cleanHeatIndexData(raw);
    const validation = validateHeatIndexReading(cleaned);
    if (!validation.valid) {
      return { status: 'invalid', data: null, message: validation.message };
    }
    const reading = toHeatIndexReading(cleaned);
    if (!reading) {
      return { status: 'invalid', data: null, message: 'Unable to process heat data.' };
    }
    return { status: 'success', data: reading, message: 'Heat index data validated.' };
  },
};
