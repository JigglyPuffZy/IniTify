import * as Location from 'expo-location';
import type { LocationResult, UserLocation } from '@/src/models/location';

let lastKnownLocation: UserLocation | null = null;

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

      // Prefer a fresh high-accuracy fix so nearest-hospital ranking is trustworthy.
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        mayShowUserSettingsDialog: true,
      });

      lastKnownLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        retrievedAt: new Date().toISOString(),
      };

      return {
        status: 'granted',
        location: lastKnownLocation,
        message: 'Location retrieved successfully.',
      };
    } catch {
      // Fall back to last known only if it is still relatively fresh (< 5 min).
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
