import type { EnvironmentalDataResult } from '@/src/models/environmental';
import {
  cleanHeatIndexData,
  toHeatIndexReading,
  validateHeatIndexReading,
} from './environmental-pipeline';
import { offlineCacheService } from '@/src/services/offline-cache/offline-cache.service';

/**
 * Environmental data service — heat index for decision tree.
 * DOST-PAGASA live API removed; use manual entry + cached values.
 * Official advisories: pagasaNewsService / DOST-PAGASA Updates screen.
 */
export const environmentalService = {
  isConfigured(): boolean {
    return true;
  },

  getProviderStatus() {
    return {
      configured: false,
      provider: 'news-feed' as const,
      message:
        'DOST-PAGASA API disabled. View official updates on DOST-PAGASA Updates. Enter heat index manually for assessment.',
    };
  },

  async fetchHeatIndex(
    _latitude: number | null,
    _longitude: number | null,
  ): Promise<EnvironmentalDataResult> {
    const cached = await offlineCacheService.getLatestHeatReading();
    if (cached) {
      return {
        status: 'cached',
        data: { ...cached, isCached: true },
        message:
          'Showing cached heat index. DOST-PAGASA API is not used — check DOST-PAGASA Updates for advisories.',
      };
    }

    return {
      status: 'unavailable',
      data: null,
      message:
        'No cached heat index. Enter a value manually for assessment, or view DOST-PAGASA Updates.',
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
    const reading = toHeatIndexReading(cleaned, 'manual');
    if (!reading) {
      return { status: 'invalid', data: null, message: 'Unable to process heat data.' };
    }
    return { status: 'success', data: reading, message: 'Heat index data validated.' };
  },
};
