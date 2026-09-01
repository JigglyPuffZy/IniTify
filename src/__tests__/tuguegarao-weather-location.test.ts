import {
  TUGUEGARAO_PAGASA_STATION,
  isInsideTuguegaraoCity,
  resolveTuguegaraoWeatherCoords,
} from '@/src/utils/tuguegarao-weather-location';

describe('tuguegarao weather location', () => {
  it('uses PAGASA station when GPS is missing', () => {
    const result = resolveTuguegaraoWeatherCoords(null);
    expect(result.source).toBe('pagasa_station');
    expect(result.latitude).toBe(TUGUEGARAO_PAGASA_STATION.latitude);
    expect(result.longitude).toBe(TUGUEGARAO_PAGASA_STATION.longitude);
  });

  it('uses GPS when inside Tuguegarao City', () => {
    const gps = {
      latitude: 17.62,
      longitude: 121.73,
      accuracy: 10,
      retrievedAt: new Date().toISOString(),
    };
    const result = resolveTuguegaraoWeatherCoords(gps);
    expect(result.source).toBe('gps');
    expect(result.latitude).toBe(17.62);
    expect(result.longitude).toBe(121.73);
  });

  it('falls back to PAGASA station when GPS is outside the city', () => {
    const manila = {
      latitude: 14.5995,
      longitude: 120.9842,
      accuracy: 10,
      retrievedAt: new Date().toISOString(),
    };
    const result = resolveTuguegaraoWeatherCoords(manila);
    expect(result.source).toBe('pagasa_station');
  });

  it('detects Tuguegarao city bounds', () => {
    expect(isInsideTuguegaraoCity(17.62, 121.73)).toBe(true);
    expect(isInsideTuguegaraoCity(14.6, 121.0)).toBe(false);
  });
});
