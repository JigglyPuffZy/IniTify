import { appConfig } from '@/src/config/app.config';
import type { ServiceResult } from '@/src/models/service-result';
import type { UserLocation } from '@/src/models/location';

export interface HospitalInfo {
  name: string;
  latitude: number;
  longitude: number;
  estimatedTravelTime: string | null;
}

/**
 * Hospital identification service.
 * Does NOT invent hospitals or fake coordinates.
 */
export const hospitalService = {
  isConfigured(): boolean {
    return appConfig.hospitalDataProvider !== null;
  },

  async findNearest(
    _location: UserLocation,
  ): Promise<ServiceResult<HospitalInfo>> {
    if (!this.isConfigured()) {
      return {
        status: 'requires_configuration',
        data: null,
        message:
          'Hospital data provider is not configured. Set EXPO_PUBLIC_HOSPITAL_DATA_PROVIDER.',
      };
    }
    return {
      status: 'unavailable',
      data: null,
      message:
        'Hospital data provider is configured but integration is not implemented.',
    };
  },

  async getNavigationUrl(
    _hospital: HospitalInfo,
    _userLocation: UserLocation,
  ): Promise<ServiceResult<string>> {
    if (!appConfig.mapsProvider) {
      return {
        status: 'requires_configuration',
        data: null,
        message:
          'Mapping/navigation service is not configured. Set EXPO_PUBLIC_MAPS_PROVIDER.',
      };
    }
    return {
      status: 'unavailable',
      data: null,
      message: 'Navigation integration is not implemented.',
    };
  },
};
