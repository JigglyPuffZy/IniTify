export interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  retrievedAt: string;
}

export type LocationStatus =
  | 'loading'
  | 'granted'
  | 'denied'
  | 'unavailable'
  | 'error';

export interface LocationResult {
  status: LocationStatus;
  location: UserLocation | null;
  message: string;
}
