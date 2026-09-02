import { Linking, Platform } from 'react-native';
import { appConfig } from '@/src/config/app.config';
import { TUGUEGARAO_HOSPITALS } from '@/src/data/tuguegarao-hospitals';
import type { UserLocation } from '@/src/models/location';
import type { ServiceResult } from '@/src/models/service-result';
import { distanceKm, estimateTravelMinutes } from '@/src/utils/geo';

const STATIC_PROVIDER = 'static-tuguegarao';

function activeHospitalProvider(): string {
  const configured = appConfig.hospitalDataProvider?.trim().toLowerCase() ?? '';
  if (!configured || configured === STATIC_PROVIDER || configured.includes('static')) {
    return STATIC_PROVIDER;
  }
  return configured;
}

function rankedHospitalsForLocation(location: UserLocation): HospitalInfo[] {
  return rankAllStatic(location).map((hospital, index) => ({
    ...hospital,
    isNearest: index === 0,
  }));
}

export interface HospitalInfo {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  phone: string | null;
  category: 'government' | 'private';
  distanceKm: number;
  estimatedTravelTime: string | null;
  isNearest?: boolean;
}

type RankedHospital = HospitalInfo & { sortKm: number };

function toHospitalInfo(
  hospital: (typeof TUGUEGARAO_HOSPITALS)[number],
  userLocation: UserLocation,
): RankedHospital {
  const km = distanceKm(
    userLocation.latitude,
    userLocation.longitude,
    hospital.latitude,
    hospital.longitude,
  );
  const minutes = estimateTravelMinutes(km);
  return {
    id: hospital.id,
    name: hospital.name,
    address: hospital.address,
    latitude: hospital.latitude,
    longitude: hospital.longitude,
    phone: hospital.phone,
    category: hospital.category,
    // Keep precise value for sorting; round only for display.
    sortKm: km,
    distanceKm: Math.round(km * 10) / 10,
    estimatedTravelTime: `~${minutes} min (estimate)`,
  };
}

function rankAllStatic(location: UserLocation): HospitalInfo[] {
  return TUGUEGARAO_HOSPITALS.map((h) => toHospitalInfo(h, location))
    .sort((a, b) => a.sortKm - b.sortKm)
    .map(({ sortKm: _sortKm, ...hospital }) => hospital);
}

function buildMapsUrl(
  provider: string,
  userLocation: UserLocation,
  hospital: HospitalInfo,
): string | null {
  const dest = `${hospital.latitude},${hospital.longitude}`;
  const origin = `${userLocation.latitude},${userLocation.longitude}`;

  switch (provider.toLowerCase()) {
    case 'google':
      return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}&travelmode=driving`;
    case 'apple':
      return `http://maps.apple.com/?saddr=${origin}&daddr=${dest}&dirflg=d`;
    case 'waze':
      return `https://waze.com/ul?ll=${hospital.latitude},${hospital.longitude}&navigate=yes`;
    default:
      return null;
  }
}

/**
 * Hospital identification service.
 * Provider: static-tuguegarao (curated list for thesis demo in Tuguegarao City).
 */
export const hospitalService = {
  isConfigured(): boolean {
    return true;
  },

  async findNearest(location: UserLocation): Promise<ServiceResult<HospitalInfo>> {
    const ranked = rankedHospitalsForLocation(location);
    const nearest = ranked[0];
    if (!nearest) {
      return {
        status: 'unavailable',
        data: null,
        message: 'Hospital list is empty.',
      };
    }

    const provider = activeHospitalProvider();
    if (provider !== STATIC_PROVIDER) {
      return {
        status: 'unavailable',
        data: null,
        message: `Hospital provider "${provider}" is not supported yet. Use static-tuguegarao.`,
      };
    }

    return {
      status: 'success',
      data: nearest,
      message: `Nearest listed facility: ${nearest.name} (${nearest.distanceKm} km).`,
    };
  },

  async findAllRanked(location: UserLocation): Promise<ServiceResult<HospitalInfo[]>> {
    const ranked = rankedHospitalsForLocation(location);
    if (!ranked.length) {
      return {
        status: 'unavailable',
        data: null,
        message: 'Hospital list is empty.',
      };
    }

    const provider = activeHospitalProvider();
    if (provider !== STATIC_PROVIDER) {
      return {
        status: 'unavailable',
        data: null,
        message: `Hospital provider "${provider}" is not supported yet. Use static-tuguegarao.`,
      };
    }

    return {
      status: 'success',
      data: ranked,
      message: `${ranked.length} major hospitals in Tuguegarao City (sorted by distance).`,
    };
  },

  async getNavigationUrl(
    hospital: HospitalInfo,
    userLocation: UserLocation,
  ): Promise<ServiceResult<string>> {
    const provider = appConfig.mapsProvider;

    if (!provider) {
      return {
        status: 'requires_configuration',
        data: null,
        message:
          'Mapping/navigation service is not configured. Set EXPO_PUBLIC_MAPS_PROVIDER=google',
      };
    }

    const url = buildMapsUrl(provider, userLocation, hospital);
    if (!url) {
      return {
        status: 'error',
        data: null,
        message: `Unsupported maps provider "${provider}". Use google, apple, or waze.`,
      };
    }

    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen && provider === 'apple' && Platform.OS !== 'ios') {
      const googleUrl = buildMapsUrl('google', userLocation, hospital);
      if (googleUrl) {
        return { status: 'success', data: googleUrl, message: 'Using Google Maps fallback.' };
      }
    }

    return {
      status: 'success',
      data: url,
      message: 'Navigation URL ready.',
    };
  },

  async openNavigation(
    hospital: HospitalInfo,
    userLocation: UserLocation,
  ): Promise<ServiceResult<null>> {
    const urlResult = await this.getNavigationUrl(hospital, userLocation);
    if (urlResult.status !== 'success' || !urlResult.data) {
      return {
        status: urlResult.status,
        data: null,
        message: urlResult.message,
      };
    }

    await Linking.openURL(urlResult.data);
    return {
      status: 'success',
      data: null,
      message: 'Opened maps application.',
    };
  },
};
