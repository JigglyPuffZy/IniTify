import { resolveHospitalSearchLocation } from '@/src/utils/hospital-location';
import { TUGUEGARAO_PAGASA_STATION } from '@/src/utils/tuguegarao-weather-location';

describe('hospital location', () => {
  it('falls back to PAGASA station when GPS is missing', () => {
    const { location, isGps } = resolveHospitalSearchLocation(null);
    expect(isGps).toBe(false);
    expect(location.latitude).toBeCloseTo(TUGUEGARAO_PAGASA_STATION.latitude, 4);
    expect(location.longitude).toBeCloseTo(TUGUEGARAO_PAGASA_STATION.longitude, 4);
  });

  it('uses GPS when inside Tuguegarao City', () => {
    const gps = {
      latitude: 17.62,
      longitude: 121.73,
      accuracy: 10,
      retrievedAt: new Date().toISOString(),
    };
    const { location, isGps } = resolveHospitalSearchLocation(gps);
    expect(isGps).toBe(true);
    expect(location).toBe(gps);
  });

  it('ignores GPS outside Tuguegarao and uses PAGASA reference', () => {
    const manila = {
      latitude: 14.5995,
      longitude: 120.9842,
      accuracy: 10,
      retrievedAt: new Date().toISOString(),
    };
    const { location, isGps } = resolveHospitalSearchLocation(manila);
    expect(isGps).toBe(false);
    expect(location.latitude).toBeCloseTo(TUGUEGARAO_PAGASA_STATION.latitude, 4);
  });
});
