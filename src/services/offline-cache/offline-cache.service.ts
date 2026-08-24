import AsyncStorage from '@react-native-async-storage/async-storage';
import type { HeatIndexReading } from '@/src/models/environmental';
import type { CurrentWeatherSnapshot } from '@/src/models/weather';
import type { RiskAssessmentResult } from '@/src/models/risk';
import { FIRST_AID_GUIDANCE } from '@/src/constants/first-aid';

const KEYS = {
  heatReading: '@initify/cache/heat-reading',
  weather: '@initify/cache/current-weather',
  assessment: '@initify/cache/assessment',
  firstAid: '@initify/cache/first-aid',
} as const;

/** Offline cache for previously retrieved and essential emergency information */
export const offlineCacheService = {
  async saveHeatReading(reading: HeatIndexReading): Promise<void> {
    await AsyncStorage.setItem(KEYS.heatReading, JSON.stringify(reading));
  },

  async getLatestHeatReading(): Promise<HeatIndexReading | null> {
    const raw = await AsyncStorage.getItem(KEYS.heatReading);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as HeatIndexReading;
    } catch {
      return null;
    }
  },

  async saveWeather(weather: CurrentWeatherSnapshot): Promise<void> {
    await AsyncStorage.setItem(KEYS.weather, JSON.stringify(weather));
  },

  async getLatestWeather(): Promise<CurrentWeatherSnapshot | null> {
    const raw = await AsyncStorage.getItem(KEYS.weather);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as CurrentWeatherSnapshot;
    } catch {
      return null;
    }
  },

  async saveAssessment(result: RiskAssessmentResult): Promise<void> {
    await AsyncStorage.setItem(KEYS.assessment, JSON.stringify(result));
  },

  async getLatestAssessment(): Promise<RiskAssessmentResult | null> {
    const raw = await AsyncStorage.getItem(KEYS.assessment);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as RiskAssessmentResult;
    } catch {
      return null;
    }
  },

  async getFirstAidGuidance() {
    return FIRST_AID_GUIDANCE;
  },

  async clearAll(): Promise<void> {
    await AsyncStorage.multiRemove(Object.values(KEYS));
  },
};
