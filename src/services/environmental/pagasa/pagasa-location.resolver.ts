import * as Location from 'expo-location';
import { appConfig } from '@/src/config/app.config';
import { tendayPagasaClient } from './tenday.client';

export interface PagasaLocationQuery {
  province: string | null;
  municity: string | null;
  region: string | null;
  source: 'env' | 'reverse-geocode' | 'manual';
}

/**
 * Resolves province/municipality for TenDay API queries.
 * Priority: env override → reverse geocode from GPS → null
 */
export const pagasaLocationResolver = {
  async resolve(
    latitude: number | null,
    longitude: number | null,
  ): Promise<PagasaLocationQuery> {
    if (appConfig.pagasaProvince || appConfig.pagasaMunicity) {
      return {
        province: appConfig.pagasaProvince,
        municity: appConfig.pagasaMunicity,
        region: appConfig.pagasaRegion,
        source: 'env',
      };
    }

    if (latitude === null || longitude === null) {
      return {
        province: null,
        municity: null,
        region: null,
        source: 'manual',
      };
    }

    try {
      const results = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });
      const place = results[0];
      if (!place) {
        return {
          province: null,
          municity: null,
          region: null,
          source: 'reverse-geocode',
        };
      }

      return {
        province: place.region ?? place.subregion ?? null,
        municity: place.city ?? place.district ?? place.name ?? null,
        region: place.region ?? null,
        source: 'reverse-geocode',
      };
    } catch {
      return {
        province: null,
        municity: null,
        region: null,
        source: 'reverse-geocode',
      };
    }
  },
};

export async function validatePagasaLocation(
  query: PagasaLocationQuery,
): Promise<PagasaLocationQuery & { validated: boolean; message: string }> {
  if (!query.province && !query.municity && !query.region) {
    return {
      ...query,
      validated: false,
      message:
        'Set EXPO_PUBLIC_PAGASA_PROVINCE and EXPO_PUBLIC_PAGASA_MUNICITY, or enable GPS for location resolution.',
    };
  }

  if (!tendayPagasaClient.isConfigured()) {
    return { ...query, validated: false, message: 'TenDay API token not configured.' };
  }

  try {
    const locations = await tendayPagasaClient.searchLocations({
      province: query.province ?? undefined,
      municity: query.municity ?? undefined,
    });
    if (locations.length === 0) {
      return {
        ...query,
        validated: false,
        message:
          'Location not found in PAGASA TenDay Location API. Set exact province/municity names via environment variables.',
      };
    }
    const match = locations[0];
    return {
      province: match.province ?? query.province,
      municity: match.municity ?? query.municity,
      region: match.region ?? query.region,
      source: query.source,
      validated: true,
      message: 'Location validated against PAGASA TenDay Location API.',
    };
  } catch (error) {
    return {
      ...query,
      validated: false,
      message: error instanceof Error ? error.message : 'Location validation failed.',
    };
  }
}
