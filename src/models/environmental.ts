/** Environmental heat data from DOST-PAGASA pipeline */
export interface HeatIndexReading {
  heatIndex: number;
  retrievedAt: string;
  source: 'DOST-PAGASA';
  latitude: number | null;
  longitude: number | null;
  isCached: boolean;
}

export interface EnvironmentalDataResult {
  status: 'success' | 'cached' | 'unavailable' | 'invalid';
  data: HeatIndexReading | null;
  message: string;
}
