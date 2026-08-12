import type { HeatIndexReading } from '@/src/models/environmental';
import { validateHeatIndex } from '@/src/utils/validation';

/** Cleans raw environmental data before validation */
export function cleanHeatIndexData(raw: {
  heatIndex?: unknown;
  latitude?: unknown;
  longitude?: unknown;
}): { heatIndex: number | null; latitude: number | null; longitude: number | null } {
  const heatIndex =
    typeof raw.heatIndex === 'number' && !Number.isNaN(raw.heatIndex)
      ? raw.heatIndex
      : typeof raw.heatIndex === 'string'
        ? Number.parseFloat(raw.heatIndex)
        : null;

  const latitude =
    typeof raw.latitude === 'number' && !Number.isNaN(raw.latitude)
      ? raw.latitude
      : null;
  const longitude =
    typeof raw.longitude === 'number' && !Number.isNaN(raw.longitude)
      ? raw.longitude
      : null;

  return {
    heatIndex: heatIndex !== null && !Number.isNaN(heatIndex) ? heatIndex : null,
    latitude,
    longitude,
  };
}

/** Validates cleaned heat-index data */
export function validateHeatIndexReading(data: {
  heatIndex: number | null;
}): { valid: boolean; message: string } {
  if (data.heatIndex === null) {
    return { valid: false, message: 'Heat index is missing.' };
  }
  const error = validateHeatIndex(data.heatIndex);
  if (error) return { valid: false, message: error };
  return { valid: true, message: 'Valid heat index data.' };
}

export function toHeatIndexReading(
  cleaned: ReturnType<typeof cleanHeatIndexData>,
  source: HeatIndexReading['source'] = 'manual',
): HeatIndexReading | null {
  const validation = validateHeatIndexReading(cleaned);
  if (!validation.valid || cleaned.heatIndex === null) return null;

  return {
    heatIndex: cleaned.heatIndex,
    retrievedAt: new Date().toISOString(),
    source,
    latitude: cleaned.latitude,
    longitude: cleaned.longitude,
    isCached: false,
  };
}
