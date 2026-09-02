import * as Location from 'expo-location';
import type { LocationResult, UserLocation } from '@/src/models/location';

let lastKnownLocation: UserLocation | null = null;

const GPS_TIMEOUT_MS = 12_000;

function mapPosition(position: Location.LocationObject): UserLocation {
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracy: position.coords.accuracy,
    retrievedAt: new Date().toISOString(),
  };
}

async function getCurrentPositionWithTimeout(
  options: Location.LocationOptions,
  timeoutMs = GPS_TIMEOUT_MS,
): Promise<Location.LocationObject> {
  return Promise.race([
    Location.getCurrentPositionAsync(options),
    new Promise<Location.LocationObject>((_, reject) => {
      setTimeout(() => reject(new Error('Location request timed out')), timeoutMs);
    }),
  ]);
}

export const locationService = {
  getLastKnownLocation(): UserLocation | null {
    return lastKnownLocation;
  },

  async requestPermission(): Promise<LocationResult> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== Location.PermissionStatus.GRANTED) {
        return {
          status: 'denied',
          location: lastKnownLocation,
          message: 'Location permission denied. GPS-based features are limited.',
        };
      }
      return this.getCurrentLocation();
    } catch {
      return {
        status: 'error',
        location: lastKnownLocation,
        message: 'Unable to request location permission.',
      };
    }
  },

  async getCurrentLocation(): Promise<LocationResult> {
    try {
      const permission = await Location.getForegroundPermissionsAsync();
      if (permission.status !== Location.PermissionStatus.GRANTED) {
        return {
          status: 'denied',
          location: lastKnownLocation,
          message: 'Location permission not granted.',
        };
      }

      // Fast path: OS-cached fix (avoids blank screens while waiting for GPS).
      try {
        const cached = await Location.getLastKnownPositionAsync({ maxAge: 120_000 });
        if (cached) {
          lastKnownLocation = mapPosition(cached);
        }
      } catch {
        /* ignore */
      }

      try {
        const position = await getCurrentPositionWithTimeout({
          accuracy: Location.Accuracy.Balanced,
          mayShowUserSettingsDialog: true,
        });
        lastKnownLocation = mapPosition(position);
        return {
          status: 'granted',
          location: lastKnownLocation,
          message: 'Location retrieved successfully.',
        };
      } catch {
        if (lastKnownLocation) {
          return {
            status: 'granted',
            location: lastKnownLocation,
            message: 'Using last known location (GPS fix timed out).',
          };
        }
        throw new Error('GPS unavailable');
      }
    } catch {
      const maxAgeMs = 5 * 60 * 1000;
      const freshLastKnown =
        lastKnownLocation &&
        Date.now() - new Date(lastKnownLocation.retrievedAt).getTime() < maxAgeMs
          ? lastKnownLocation
          : null;

      return {
        status: 'unavailable',
        location: freshLastKnown,
        message: 'Location is currently unavailable.',
      };
    }
  },

  async checkPermission(): Promise<'granted' | 'denied' | 'undetermined'> {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status === Location.PermissionStatus.GRANTED) return 'granted';
    if (status === Location.PermissionStatus.DENIED) return 'denied';
    return 'undetermined';
  },
};
