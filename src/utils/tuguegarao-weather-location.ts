import { TUGUEGARAO_STUDY_AREA } from '@/src/constants/study-area';
import type { UserLocation } from '@/src/models/location';

/**
 * DOST-PAGASA synoptic station, Tuguegarao, Cagayan (17°38'51.84"N, 121°45'30.58"E).
 * Preferred fixed point for city weather — closer to official local readings than city center.
 */
export const TUGUEGARAO_PAGASA_STATION = {
  latitude: 17.647733,
  longitude: 121.758494,
} as const;

/** Approximate Tuguegarao City bounds — GPS used for weather when inside. */
const TUGUEGARAO_BOUNDS = {
  minLat: 17.56,
  maxLat: 17.72,
  minLon: 121.66,
  maxLon: 121.82,
} as const;

export type TuguegaraoWeatherCoordSource = 'gps' | 'pagasa_station';

export function isInsideTuguegaraoCity(latitude: number, longitude: number): boolean {
  return (
    latitude >= TUGUEGARAO_BOUNDS.minLat &&
    latitude <= TUGUEGARAO_BOUNDS.maxLat &&
    longitude >= TUGUEGARAO_BOUNDS.minLon &&
    longitude <= TUGUEGARAO_BOUNDS.maxLon
  );
}

/**
 * Pick the best coordinates for Tuguegarao weather:
 * 1. User GPS when inside Tuguegarao City
 * 2. PAGASA synoptic station (official city reference)
 */
export function resolveTuguegaraoWeatherCoords(
  userLocation: UserLocation | null | undefined,
): {
  latitude: number;
  longitude: number;
  source: TuguegaraoWeatherCoordSource;
} {
  if (
    userLocation &&
    isInsideTuguegaraoCity(userLocation.latitude, userLocation.longitude)
  ) {
    return {
      latitude: userLocation.latitude,
      longitude: userLocation.longitude,
      source: 'gps',
    };
  }

  return {
    latitude: TUGUEGARAO_PAGASA_STATION.latitude,
    longitude: TUGUEGARAO_PAGASA_STATION.longitude,
    source: 'pagasa_station',
  };
}

/** Default weather coordinates when no GPS is available. */
export function defaultTuguegaraoWeatherCoords(): {
  latitude: number;
  longitude: number;
} {
  return {
    latitude: TUGUEGARAO_PAGASA_STATION.latitude,
    longitude: TUGUEGARAO_PAGASA_STATION.longitude,
  };
}

export const TUGUEGARAO_WEATHER_LABEL = TUGUEGARAO_STUDY_AREA.label;
