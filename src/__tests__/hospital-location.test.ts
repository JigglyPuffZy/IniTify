import { resolveHospitalSearchLocation } from '@/src/utils/hospital-location';

describe('hospital location', () => {
  it('falls back to Tuguegarao city center when GPS is missing', () => {
    const { location, isGps } = resolveHospitalSearchLocation(null);
    expect(isGps).toBe(false);
    expect(location.latitude).toBeCloseTo(17.6132, 3);
    expect(location.longitude).toBeCloseTo(121.727, 3);
  });

  it('uses GPS when available', () => {
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
});
