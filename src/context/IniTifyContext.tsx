import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { UserProfile, EmergencyContact } from '@/src/models/user';
import type { RiskAssessmentResult } from '@/src/models/risk';
import type { HeatIndexReading } from '@/src/models/environmental';
import type { UserLocation } from '@/src/models/location';
import type { EmergencyState } from '@/src/models/emergency';
import { environmentalService } from '@/src/services/environmental/environmental.service';
import { locationService } from '@/src/services/location/location.service';
import { riskAssessmentService } from '@/src/services/risk-assessment/risk-assessment.service';
import { offlineCacheService } from '@/src/services/offline-cache/offline-cache.service';
import { emergencyService } from '@/src/services/emergency/emergency.service';
import { recommendationService } from '@/src/services/recommendations/recommendation.service';
import { databaseService } from '@/src/services/database/database.service';
import { appConfig } from '@/src/config/app.config';

const STORAGE_KEYS = {
  profile: '@initify/profile',
  emergencyContact: '@initify/emergency-contact',
};

interface IniTifyContextValue {
  profile: UserProfile | null;
  emergencyContact: EmergencyContact | null;
  location: UserLocation | null;
  locationStatus: string;
  heatReading: HeatIndexReading | null;
  heatDataMessage: string;
  heatDataSource: 'live' | 'cached' | 'unavailable' | 'dev_manual';
  assessment: RiskAssessmentResult | null;
  emergencyState: EmergencyState;
  isLoading: boolean;
  saveProfile: (profile: UserProfile) => Promise<void>;
  saveEmergencyContact: (contact: EmergencyContact) => Promise<void>;
  refreshLocation: () => Promise<void>;
  refreshHeatData: () => Promise<void>;
  applyManualDevHeatIndex: (heatIndex: number) => Promise<{ ok: boolean; message: string }>;
  runAssessment: () => void;
  recordSafetyPromptResponse: (responded: boolean) => void;
}

const IniTifyContext = createContext<IniTifyContextValue | null>(null);

export function IniTifyProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [emergencyContact, setEmergencyContact] = useState<EmergencyContact | null>(null);
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [locationStatus, setLocationStatus] = useState('loading');
  const [heatReading, setHeatReading] = useState<HeatIndexReading | null>(null);
  const [heatDataMessage, setHeatDataMessage] = useState('');
  const [heatDataSource, setHeatDataSource] = useState<
    'live' | 'cached' | 'unavailable' | 'dev_manual'
  >('unavailable');
  const [assessment, setAssessment] = useState<RiskAssessmentResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  /** Re-evaluate emergency when safety prompts / inactivity change */
  const [emergencyTick, setEmergencyTick] = useState(0);

  const emergencyState = useMemo(
    () => emergencyService.evaluateEmergency(assessment?.level ?? null),
    [assessment?.level, emergencyTick],
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setEmergencyTick((t) => t + 1);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    async function loadPersisted() {
      try {
        const [profileRaw, contactRaw, cachedAssessment] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.profile),
          AsyncStorage.getItem(STORAGE_KEYS.emergencyContact),
          offlineCacheService.getLatestAssessment(),
        ]);
        if (profileRaw) setProfile(JSON.parse(profileRaw));
        if (contactRaw) setEmergencyContact(JSON.parse(contactRaw));
        if (cachedAssessment) setAssessment(cachedAssessment);

        const cachedHeat = await offlineCacheService.getLatestHeatReading();
        if (cachedHeat) {
          setHeatReading(cachedHeat);
          setHeatDataSource('cached');
          setHeatDataMessage('Showing cached heat data.');
        }
      } finally {
        setIsLoading(false);
      }
    }
    loadPersisted();
  }, []);

  const saveProfile = useCallback(async (next: UserProfile) => {
    setProfile(next);
    await AsyncStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(next));
  }, []);

  const saveEmergencyContact = useCallback(async (contact: EmergencyContact) => {
    setEmergencyContact(contact);
    await AsyncStorage.setItem(STORAGE_KEYS.emergencyContact, JSON.stringify(contact));
  }, []);

  const refreshLocation = useCallback(async () => {
    setLocationStatus('loading');
    const result = await locationService.requestPermission();
    setLocationStatus(result.status);
    setLocation(result.location);
    if (result.location) {
      emergencyService.recordActivity(result.location);
      if (profile) {
        void databaseService.sync.syncLocation(profile, result.location, 'dashboard');
      }
    }
  }, [profile]);

  const refreshHeatData = useCallback(async () => {
    const result = await environmentalService.fetchHeatIndex(
      location?.latitude ?? null,
      location?.longitude ?? null,
    );
    setHeatDataMessage(result.message);
    if (result.status === 'success' && result.data) {
      setHeatReading(result.data);
      setHeatDataSource('live');
      await offlineCacheService.saveHeatReading(result.data);
    } else if (result.status === 'cached' && result.data) {
      setHeatReading(result.data);
      setHeatDataSource('cached');
    } else {
      setHeatDataSource('unavailable');
    }
  }, [location]);

  const applyManualDevHeatIndex = useCallback(
    async (heatIndex: number) => {
      if (!appConfig.devManualHeatEnabled) {
        return {
          ok: false,
          message: 'Manual heat index is disabled. Set EXPO_PUBLIC_DEV_MANUAL_HEAT=true in .env.',
        };
      }
      const result = environmentalService.processRawData({
        heatIndex,
        latitude: location?.latitude ?? null,
        longitude: location?.longitude ?? null,
      });
      if (result.status !== 'success' || !result.data) {
        return { ok: false, message: result.message };
      }
      setHeatReading(result.data);
      setHeatDataSource('dev_manual');
      setHeatDataMessage(
        'DEVELOPMENT TEST DATA — manual heat index entry. NOT live DOST-PAGASA data.',
      );
      await offlineCacheService.saveHeatReading(result.data);
      if (profile) {
        void databaseService.sync.syncHeatReading(profile, result.data, 'dev_manual');
      }
      return { ok: true, message: 'Manual dev heat index applied for testing.' };
    },
    [location, profile],
  );

  const runAssessment = useCallback(() => {
    if (!profile) return;
    const result = riskAssessmentService.assess({
      heatReading,
      riskFactors: profile.riskFactors,
      location,
    });
    setAssessment(result);
    offlineCacheService.saveAssessment(result);
    if (location) emergencyService.recordActivity(location);
    setEmergencyTick((t) => t + 1);
    if (profile && result.level) {
      void databaseService.sync.syncAssessment(profile, result);
    }
  }, [profile, heatReading, location]);

  const recordSafetyPromptResponse = useCallback(
    (responded: boolean) => {
      if (responded) {
        emergencyService.resetSafetyPromptFailures();
      } else {
        emergencyService.recordFailedSafetyPrompt();
      }
      if (location) emergencyService.recordActivity(location);
      setEmergencyTick((t) => t + 1);
      if (profile) {
        void databaseService.sync.syncSafetyPrompt(profile, responded);
      }
    },
    [location, profile],
  );

  useEffect(() => {
    if (!profile || !databaseService.sync.isEnabled()) return;
    void databaseService.sync.syncEmergencyState(profile, emergencyState);
  }, [profile, emergencyState.isActive, emergencyState.activatedAt]);

  const value = useMemo(
    () => ({
      profile,
      emergencyContact,
      location,
      locationStatus,
      heatReading,
      heatDataMessage,
      heatDataSource,
      assessment,
      emergencyState,
      isLoading,
      saveProfile,
      saveEmergencyContact,
      refreshLocation,
      refreshHeatData,
      applyManualDevHeatIndex,
      runAssessment,
      recordSafetyPromptResponse,
    }),
    [
      profile,
      emergencyContact,
      location,
      locationStatus,
      heatReading,
      heatDataMessage,
      heatDataSource,
      assessment,
      emergencyState,
      isLoading,
      saveProfile,
      saveEmergencyContact,
      refreshLocation,
      refreshHeatData,
      applyManualDevHeatIndex,
      runAssessment,
      recordSafetyPromptResponse,
    ],
  );

  return (
    <IniTifyContext.Provider value={value}>{children}</IniTifyContext.Provider>
  );
}

export function useIniTify() {
  const ctx = useContext(IniTifyContext);
  if (!ctx) throw new Error('useIniTify must be used within IniTifyProvider');
  return ctx;
}

export function useRecommendations() {
  const { assessment } = useIniTify();
  return recommendationService.getRecommendations(assessment?.level ?? null);
}
