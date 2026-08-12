import { appConfig } from '@/src/config/app.config';
import type { HeatIndexReading } from '@/src/models/environmental';
import {
  computeHeatIndexFromTempHumidity,
  type HeatIndexComputationMethod,
} from './heat-index-calculator';
import { tendayPagasaClient } from './tenday.client';
import {
  pagasaLocationResolver,
  validatePagasaLocation,
} from './pagasa-location.resolver';
import {
  cleanHeatIndexData,
  toHeatIndexReading,
} from '../environmental-pipeline';

export interface PagasaFetchResult {
  reading: HeatIndexReading | null;
  message: string;
  computationMethod: HeatIndexComputationMethod | null;
}

/**
 * Fetches environmental data from DOST-PAGASA TenDay Weather Forecast API
 * (official documented API — requires approved token).
 */
export async function fetchFromTenDayApi(
  latitude: number | null,
  longitude: number | null,
): Promise<PagasaFetchResult> {
  if (!tendayPagasaClient.isConfigured()) {
    return {
      reading: null,
      message:
        'DOST-PAGASA TenDay API token not configured. Request access at tenday.pagasa.dost.gov.ph and set EXPO_PUBLIC_PAGASA_API_KEY.',
      computationMethod: null,
    };
  }

  const locationQuery = await pagasaLocationResolver.resolve(latitude, longitude);
  const validated = await validatePagasaLocation(locationQuery);

  if (!validated.validated) {
    return {
      reading: null,
      message: validated.message,
      computationMethod: null,
    };
  }

  try {
    const forecast = await tendayPagasaClient.fetchCurrentForecast({
      province: validated.province ?? undefined,
      municity: validated.municity ?? undefined,
      region: validated.region ?? undefined,
    });

    if (!forecast) {
      return {
        reading: null,
        message: 'No forecast data returned from DOST-PAGASA TenDay API.',
        computationMethod: null,
      };
    }

    const temp = forecast.tmean ?? forecast.tmax ?? null;
    const humidity = forecast.humidity ?? null;

    if (temp === null || humidity === null) {
      return {
        reading: null,
        message:
          'TenDay forecast missing temperature or humidity fields required for heat index computation.',
        computationMethod: null,
      };
    }

    const heatIndex = computeHeatIndexFromTempHumidity(temp, humidity);
    if (heatIndex === null) {
      return {
        reading: null,
        message: 'Unable to compute heat index from TenDay forecast data.',
        computationMethod: null,
      };
    }

    const cleaned = cleanHeatIndexData({
      heatIndex,
      latitude,
      longitude,
    });
    const reading = toHeatIndexReading(cleaned);
    if (!reading) {
      return {
        reading: null,
        message: 'Computed heat index failed validation.',
        computationMethod: null,
      };
    }

    return {
      reading,
      message: `Heat index computed from DOST-PAGASA TenDay forecast (tmean=${temp}°C, humidity=${humidity}%) for ${validated.municity ?? validated.province}. For guidance only.`,
      computationMethod: 'computed-from-tenday',
    };
  } catch (error) {
    return {
      reading: null,
      message: error instanceof Error ? error.message : 'TenDay API request failed.',
      computationMethod: null,
    };
  }
}

/**
 * Fetches from a custom configured endpoint that returns heat index directly.
 * Response field mapping is configured via environment variables.
 */
export async function fetchFromCustomPagasaEndpoint(
  latitude: number | null,
  longitude: number | null,
): Promise<PagasaFetchResult> {
  if (!appConfig.pagasaApiUrl) {
    return {
      reading: null,
      message: 'Custom PAGASA API URL is not configured.',
      computationMethod: null,
    };
  }

  try {
    const url = new URL(appConfig.pagasaApiUrl);
    if (latitude !== null) url.searchParams.set('lat', String(latitude));
    if (longitude !== null) url.searchParams.set('lon', String(longitude));

    const headers: Record<string, string> = { Accept: 'application/json' };
    if (appConfig.pagasaApiKey) {
      headers.token = appConfig.pagasaApiKey;
      headers.Authorization = `Bearer ${appConfig.pagasaApiKey}`;
    }

    const response = await fetch(url.toString(), { headers });
    if (!response.ok) {
      return {
        reading: null,
        message: `Custom PAGASA endpoint error (${response.status}).`,
        computationMethod: null,
      };
    }

    const body = (await response.json()) as Record<string, unknown>;
    const fieldName = appConfig.pagasaHeatIndexField ?? 'heatIndex';
    let rawValue: unknown = body[fieldName];
    if (rawValue === undefined && body.data && typeof body.data === 'object' && !Array.isArray(body.data)) {
      rawValue = (body.data as Record<string, unknown>)[fieldName];
    }

    const cleaned = cleanHeatIndexData({
      heatIndex: rawValue,
      latitude,
      longitude,
    });
    const reading = toHeatIndexReading(cleaned);

    if (!reading) {
      return {
        reading: null,
        message: `Custom PAGASA response missing valid "${fieldName}" field.`,
        computationMethod: null,
      };
    }

    return {
      reading,
      message: 'Heat index retrieved from configured DOST-PAGASA data endpoint.',
      computationMethod: 'direct',
    };
  } catch (error) {
    return {
      reading: null,
      message: error instanceof Error ? error.message : 'Custom PAGASA fetch failed.',
      computationMethod: null,
    };
  }
}

export function getPagasaProviderStatus(): {
  provider: string;
  configured: boolean;
  message: string;
} {
  const provider = appConfig.pagasaProvider;
  if (provider === 'tenday') {
    return {
      provider: 'tenday',
      configured: tendayPagasaClient.isConfigured(),
      message: tendayPagasaClient.isConfigured()
        ? 'TenDay API token configured.'
        : 'Set EXPO_PUBLIC_PAGASA_API_KEY with your approved TenDay token.',
    };
  }
  if (provider === 'custom') {
    return {
      provider: 'custom',
      configured: appConfig.pagasaApiUrl !== null,
      message: appConfig.pagasaApiUrl
        ? 'Custom PAGASA endpoint configured.'
        : 'Set EXPO_PUBLIC_PAGASA_API_URL for custom heat-index endpoint.',
    };
  }
  return {
    provider: 'none',
    configured: false,
    message: 'Set EXPO_PUBLIC_PAGASA_PROVIDER to "tenday" or "custom".',
  };
}
