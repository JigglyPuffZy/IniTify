import { appConfig } from '@/src/config/app.config';

/** Documented TenDay API response fields (tenday.pagasa.dost.gov.ph API doc) */
export interface TenDayForecastRecord {
  date?: string;
  province?: string;
  municity?: string;
  tmean?: number;
  tmin?: number;
  tmax?: number;
  humidity?: number;
  rainfall_total?: number;
  wind_speed?: number;
  wind_direction?: string;
  cloud_cover?: string;
  rainfall_desc?: string;
}

export interface TenDayApiResponse {
  data?: TenDayForecastRecord | TenDayForecastRecord[];
  misc?: {
    status_code?: number;
    description?: string;
  };
}

export interface TenDayLocationRecord {
  region?: string;
  province?: string;
  municity?: string;
  psgc?: string;
}

export interface TenDayLocationResponse {
  data?: TenDayLocationRecord[];
  misc?: { status_code?: number; description?: string };
}

const TENDAY_BASE_URL = 'https://tenday.pagasa.dost.gov.ph/api/v1';

function buildHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (appConfig.pagasaApiKey) {
    headers.token = appConfig.pagasaApiKey;
  }
  return headers;
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.status === 401) {
    throw new Error('DOST-PAGASA TenDay API: unauthorized — check your API token.');
  }
  if (response.status === 429) {
    throw new Error('DOST-PAGASA TenDay API: rate limit exceeded. Try again later.');
  }
  if (!response.ok) {
    throw new Error(
      `DOST-PAGASA TenDay API error (${response.status}): ${response.statusText}`,
    );
  }
  return response.json() as Promise<T>;
}

export const tendayPagasaClient = {
  baseUrl: TENDAY_BASE_URL,

  isConfigured(): boolean {
    return appConfig.pagasaApiKey !== null && appConfig.pagasaApiKey.length > 0;
  },

  async fetchCurrentForecast(params: {
    province?: string;
    municity?: string;
    region?: string;
  }): Promise<TenDayForecastRecord | null> {
    const url = new URL(`${TENDAY_BASE_URL}/tenday/current`);
    if (params.province) url.searchParams.set('province', params.province);
    if (params.municity) url.searchParams.set('municity', params.municity);
    if (params.region) url.searchParams.set('region', params.region);

    const response = await fetch(url.toString(), { headers: buildHeaders() });
    const body = await parseResponse<TenDayApiResponse>(response);
    const record = Array.isArray(body.data) ? body.data[0] : body.data;
    return record ?? null;
  },

  async searchLocations(params: {
    province?: string;
    municity?: string;
  }): Promise<TenDayLocationRecord[]> {
    const url = new URL(`${TENDAY_BASE_URL}/location`);
    if (params.province) url.searchParams.set('province', params.province);
    if (params.municity) url.searchParams.set('municity', params.municity);

    const response = await fetch(url.toString(), { headers: buildHeaders() });
    const body = await parseResponse<TenDayLocationResponse>(response);
    return body.data ?? [];
  },

  async validateToken(): Promise<{ valid: boolean; message: string }> {
    if (!this.isConfigured()) {
      return { valid: false, message: 'TenDay API token is not configured.' };
    }
    try {
      const url = `${TENDAY_BASE_URL}/validate`;
      const response = await fetch(url, { headers: buildHeaders() });
      const body = await parseResponse<{ misc?: { status_code?: number; description?: string } }>(
        response,
      );
      const ok = body.misc?.status_code === 200;
      return {
        valid: ok,
        message: ok
          ? 'TenDay API token is valid.'
          : body.misc?.description ?? 'Token validation failed.',
      };
    } catch (error) {
      return {
        valid: false,
        message: error instanceof Error ? error.message : 'Token validation failed.',
      };
    }
  },
};
