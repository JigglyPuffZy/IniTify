/** Environmental heat data */
export interface HeatIndexReading {
  heatIndex: number;
  retrievedAt: string;
  source: 'manual' | 'cached' | 'DOST-PAGASA' | 'weatherapi' | 'open-meteo';
  latitude: number | null;
  longitude: number | null;
  isCached: boolean;
}

import type { CurrentWeatherSnapshot } from '@/src/models/weather';

export interface EnvironmentalDataResult {
  status: 'success' | 'cached' | 'unavailable' | 'invalid';
  data: HeatIndexReading | null;
  weather?: CurrentWeatherSnapshot | null;
  message: string;
}
