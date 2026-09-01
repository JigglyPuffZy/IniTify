import { TUGUEGARAO_STUDY_AREA } from '@/src/constants/study-area';
import type { UserLocation } from '@/src/models/location';

/** Tuguegarao city center — fallback when GPS is off (still sorts real hospitals). */
export function tuguegaraoCityCenterLocation(): UserLocation {
  return {
    latitude: TUGUEGARAO_STUDY_AREA.latitude,
    longitude: TUGUEGARAO_STUDY_AREA.longitude,
    accuracy: null,
    retrievedAt: new Date().toISOString(),
  };
}

export function resolveHospitalSearchLocation(gps: UserLocation | null | undefined): {
  location: UserLocation;
  isGps: boolean;
} {
  if (gps?.latitude != null && gps?.longitude != null) {
    return { location: gps, isGps: true };
  }
  return { location: tuguegaraoCityCenterLocation(), isGps: false };
}
