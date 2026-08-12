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

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
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
      return {
        status: 'unavailable',
        location: lastKnownLocation,
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
