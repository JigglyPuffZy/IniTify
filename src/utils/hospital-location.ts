import {
  defaultTuguegaraoWeatherCoords,
  isInsideTuguegaraoCity,
} from '@/src/utils/tuguegarao-weather-location';
import type { UserLocation } from '@/src/models/location';

/** PAGASA synoptic station — same reference point as live weather when GPS is off. */
export function tuguegaraoReferenceLocation(): UserLocation {
  const { latitude, longitude } = defaultTuguegaraoWeatherCoords();
  return {
    latitude,
    longitude,
    accuracy: null,
    retrievedAt: new Date().toISOString(),
  };
}

/**
 * Pick coordinates for nearest-hospital ranking:
 * 1. GPS when inside Tuguegarao City (study area)
 * 2. PAGASA station reference (matches weather fallback)
 */
export function resolveHospitalSearchLocation(gps: UserLocation | null | undefined): {
  location: UserLocation;
  isGps: boolean;
} {
  if (
    gps?.latitude != null &&
    gps?.longitude != null &&
    isInsideTuguegaraoCity(gps.latitude, gps.longitude)
  ) {
    return { location: gps, isGps: true };
  }
  return { location: tuguegaraoReferenceLocation(), isGps: false };
}
