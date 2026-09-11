import { computeHeatIndexFromTempHumidity } from '@/src/services/environmental/pagasa/heat-index-calculator';

/** Mirrors resolveHeatIndexC in open-meteo-client.ts */
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
  if (computed != null && apparent != null) return Math.max(computed, apparent);
  if (computed != null) return computed;
  if (apparent != null) return apparent;
  return Math.round(params.tempC * 10) / 10;
}

describe('Open-Meteo heat index (Tuguegarao)', () => {
  it('matches live Open-Meteo snapshot: 26°C, 93% RH, 32.5°C apparent', () => {
    const heatIndexC = resolveHeatIndexC({
      tempC: 26,
      humidity: 93,
      apparentC: 32.5,
    });
    expect(computeHeatIndexFromTempHumidity(26, 93)).toBeCloseTo(27.1, 1);
    expect(heatIndexC).toBe(32.5);
  });
});
