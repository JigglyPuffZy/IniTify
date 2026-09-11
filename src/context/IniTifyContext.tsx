import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { UserProfile, EmergencyContact } from '@/src/models/user';
import { normalizeProfile } from '@/src/models/user';
import type { HealthCheckIn, ReminderSettings } from '@/src/models/check-in';
import type { CheckInChatDraft } from '@/src/models/check-in-chat';
import { DEFAULT_REMINDER_SETTINGS } from '@/src/models/check-in';
import type { HeatRiskLevel, RiskAssessmentResult } from '@/src/models/risk';
import type { InAppNotification } from '@/src/models/in-app-notification';
import type { HeatIndexReading } from '@/src/models/environmental';
import type { CurrentWeatherSnapshot } from '@/src/models/weather';
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
import { resolveTuguegaraoWeatherCoords } from '@/src/utils/tuguegarao-weather-location';
import { normalizeWeatherSnapshot } from '@/src/utils/weather-display';
import { checkInService } from '@/src/services/check-in/check-in.service';
import { reminderManager } from '@/src/services/check-in/reminder-manager.service';
import { shouldShowWeatherSafetyAlert, shouldSendPeriodicReminder } from '@/src/services/check-in/reminder-scheduler.service';
import { inAppNotificationService } from '@/src/services/notifications/in-app-notification.service';
import { notificationService } from '@/src/services/notifications/notification.service';
import { RISK_LEVEL_LABELS } from '@/src/constants/risk-levels';
import { primaryHealthCondition } from '@/src/constants/health-conditions';
import { useAuth } from '@/src/context/AuthContext';
import { supabaseSyncService, clearSupabaseUserCache } from '@/src/services/database/supabase-sync.service';
import {
  WEATHER_AUTO_REFRESH_MINUTES,
  WEATHER_AUTO_REFRESH_MS,
  type WeatherRefreshTrigger,
} from '@/src/constants/weather-refresh';
import { AppState, type AppStateStatus } from 'react-native';
import {
  clearLocalUserData,
  loadLocalEmergencyContact,
  loadLocalProfile,
  saveLocalEmergencyContact,
  saveLocalProfile,
} from '@/src/utils/profile-storage';

interface IniTifyContextValue {
  profile: UserProfile | null;
  emergencyContact: EmergencyContact | null;
  location: UserLocation | null;
  locationStatus: string;
  heatReading: HeatIndexReading | null;
  currentWeather: CurrentWeatherSnapshot | null;
  heatDataMessage: string;
  heatDataSource: 'live' | 'cached' | 'unavailable' | 'dev_manual';
  /** Seconds until next automatic live weather refresh (15 min cycle). */
  weatherRefreshSecondsLeft: number;
  isWeatherRefreshing: boolean;
  weatherAutoRefreshMinutes: number;
  assessment: RiskAssessmentResult | null;
  emergencyState: EmergencyState;
  isLoading: boolean;
  profileRestoredFromCloud: boolean;
  saveProfile: (profile: UserProfile) => Promise<void>;
  saveEmergencyContact: (contact: EmergencyContact) => Promise<void>;
  refreshLocation: (context?: 'setup' | 'dashboard' | 'assessment' | 'emergency' | 'hospital' | 'check_in' | 'other') => Promise<void>;
  refreshHeatData: (trigger?: WeatherRefreshTrigger) => Promise<void>;
  applyManualDevHeatIndex: (heatIndex: number) => Promise<{ ok: boolean; message: string }>;
  runAssessment: () => void;
  recordSafetyPromptResponse: (responded: boolean) => void;
  checkIns: HealthCheckIn[];
  lastCheckIn: HealthCheckIn | null;
  reminderSettings: ReminderSettings;
  submitCheckIn: (input: {
    hydrationStatus: string;
    activityLevel: string;
    generalStatus: string;
    notes?: string;
  }) => Promise<HealthCheckIn>;
  adaptProfileFromCheckInDraft: (draft: CheckInChatDraft) => Promise<void>;
  updateReminderSettings: (settings: ReminderSettings) => Promise<ReminderSettings>;
  refreshCheckInData: () => Promise<void>;
  inAppNotifications: InAppNotification[];
  unreadNotificationCount: number;
  markInAppNotificationRead: (id: string) => Promise<void>;
  markAllInAppNotificationsRead: () => Promise<void>;
  refreshInAppNotifications: () => Promise<void>;
}

const IniTifyContext = createContext<IniTifyContextValue | null>(null);

export function IniTifyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [emergencyContact, setEmergencyContact] = useState<EmergencyContact | null>(null);
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [locationStatus, setLocationStatus] = useState('loading');
  const [heatReading, setHeatReading] = useState<HeatIndexReading | null>(null);
  const [currentWeather, setCurrentWeather] = useState<CurrentWeatherSnapshot | null>(null);
  const [heatDataMessage, setHeatDataMessage] = useState('');
  const [heatDataSource, setHeatDataSource] = useState<
    'live' | 'cached' | 'unavailable' | 'dev_manual'
  >('unavailable');
  const [nextWeatherRefreshAt, setNextWeatherRefreshAt] = useState<number | null>(null);
  const [weatherRefreshSecondsLeft, setWeatherRefreshSecondsLeft] = useState(
    Math.floor(WEATHER_AUTO_REFRESH_MS / 1000),
  );
  const [isWeatherRefreshing, setIsWeatherRefreshing] = useState(false);
  const weatherRefreshInFlight = useRef(false);
  const [assessment, setAssessment] = useState<RiskAssessmentResult | null>(null);
  const [checkIns, setCheckIns] = useState<HealthCheckIn[]>([]);
  const [lastCheckIn, setLastCheckIn] = useState<HealthCheckIn | null>(null);
  const [reminderSettings, setReminderSettings] = useState<ReminderSettings>({
    ...DEFAULT_REMINDER_SETTINGS,
  });
  const [inAppNotifications, setInAppNotifications] = useState<InAppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [profileRestoredFromCloud, setProfileRestoredFromCloud] = useState(false);
  /** Re-evaluate emergency when safety prompts / inactivity change */
  const [emergencyTick, setEmergencyTick] = useState(0);
  const prevRiskLevelRef = useRef<HeatRiskLevel | null>(null);

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
    let active = true;

    async function loadForUser() {
      if (!user) {
        setProfile(null);
        setEmergencyContact(null);
        setAssessment(null);
        setCheckIns([]);
        setLastCheckIn(null);
        setReminderSettings({ ...DEFAULT_REMINDER_SETTINGS });
        setInAppNotifications([]);
        setProfileRestoredFromCloud(false);
        setIsLoading(false);
        return;
      }

      // Clear previous account data immediately so UI never shows the wrong name.
      setIsLoading(true);
      setProfile(null);
      setEmergencyContact(null);
      setAssessment(null);
      setCheckIns([]);
      setLastCheckIn(null);
      setReminderSettings({ ...DEFAULT_REMINDER_SETTINGS });
      setInAppNotifications([]);
      setProfileRestoredFromCloud(false);
      clearSupabaseUserCache();

      try {
        // 1) Local data first — do not block the splash on cloud/network
        const [
          localProfile,
          localContact,
          cachedAssessment,
          storedCheckIns,
          storedLast,
          storedReminders,
          cachedHeat,
          cachedWeather,
          storedNotifications,
        ] = await Promise.all([
          loadLocalProfile(user.id),
          loadLocalEmergencyContact(user.id),
          offlineCacheService.getLatestAssessment(),
          checkInService.getCheckIns(user.id),
          checkInService.getLastCheckIn(user.id),
          checkInService.getReminderSettings(user.id),
          offlineCacheService.getLatestHeatReading(),
          offlineCacheService.getLatestWeather(),
          inAppNotificationService.list(user.id),
        ]);

        if (!active) return;

        let nextProfile = localProfile;
        let nextContact = localContact;

        setProfile(nextProfile);
        setEmergencyContact(nextContact);
        if (nextProfile && cachedAssessment) setAssessment(cachedAssessment);
        else setAssessment(null);
        setCheckIns(storedCheckIns);
        setLastCheckIn(storedLast);
        setReminderSettings(storedReminders);
        setInAppNotifications(storedNotifications);

        if (cachedHeat) {
          setHeatReading(cachedHeat);
          setHeatDataSource('cached');
          setHeatDataMessage('Showing cached heat data.');
        }
        if (cachedWeather) {
          setCurrentWeather(normalizeWeatherSnapshot(cachedWeather));
        }

        // Unblock "Loading your account profile…" ASAP
        setIsLoading(false);

        // 2) Optional cloud refresh (timed out / skipped when offline)
        if (user.mode === 'supabase' && supabaseSyncService.isEnabled()) {
          const cloud = await supabaseSyncService.fetchUserProfile();
          if (!active) return;

          if (cloud.status === 'success' && cloud.data) {
            nextProfile = cloud.data.profile;
            nextContact = cloud.data.emergencyContact ?? nextContact;
            setProfile(nextProfile);
            setEmergencyContact(nextContact);
            setProfileRestoredFromCloud(true);
            await saveLocalProfile(user.id, nextProfile);
            if (nextContact) {
              await saveLocalEmergencyContact(user.id, nextContact);
            }
          } else if (cloud.status === 'success' && !cloud.data && !localProfile) {
            // Confirmed empty cloud + no local profile — stay on setup
            setProfile(null);
            setEmergencyContact(null);
            await clearLocalUserData(user.id);
          }
          // On unavailable/error: keep local profile (do not clear)
        }
      } catch {
        if (active) setIsLoading(false);
      }
    }

    void loadForUser();

    return () => {
      active = false;
    };
  }, [user?.id, user?.mode]);

  const activeProfile = user ? profile : null;

  const saveProfile = useCallback(
    async (next: UserProfile) => {
      const normalized = normalizeProfile({
        ...next,
        riskFactors: {
          ...next.riskFactors,
          healthConditions:
            next.riskFactors.healthConditions?.length > 0
              ? next.riskFactors.healthConditions
              : next.riskFactors.healthCondition
                ? [next.riskFactors.healthCondition]
                : ['None'],
          healthCondition:
            next.riskFactors.healthCondition ??
            primaryHealthCondition(next.riskFactors.healthConditions ?? []),
        },
      });
      setProfile(normalized);
      if (user) {
        await saveLocalProfile(user.id, normalized);
        if (user.mode === 'supabase' && supabaseSyncService.isEnabled()) {
          void supabaseSyncService.syncUserProfile(normalized, emergencyContact);
        }
      }
    },
    [user, emergencyContact],
  );

  const saveEmergencyContact = useCallback(
    async (contact: EmergencyContact) => {
      setEmergencyContact(contact);
      if (user) {
        await saveLocalEmergencyContact(user.id, contact);
        if (profile && user.mode === 'supabase' && supabaseSyncService.isEnabled()) {
          void supabaseSyncService.syncUserProfile(profile, contact);
        }
      }
    },
    [user, profile],
  );

  const refreshLocation = useCallback(
    async (
      context:
        | 'setup'
        | 'dashboard'
        | 'assessment'
        | 'emergency'
        | 'hospital'
        | 'check_in'
        | 'other' = 'dashboard',
    ) => {
      setLocationStatus('loading');
      try {
        if (!locationService || typeof locationService.requestPermission !== 'function') {
          setLocationStatus('unavailable');
          return;
        }
        const result = await locationService.requestPermission();
        setLocationStatus(result.status);
        setLocation(result.location);
        if (result.location) {
          emergencyService.recordActivity(result.location);
          if (profile) {
            void databaseService.sync.syncLocation(profile, result.location, context);
          }
        }
      } catch {
        setLocationStatus('error');
      }
    },
    [profile],
  );

  const refreshHeatData = useCallback(
    async (trigger: WeatherRefreshTrigger = 'manual') => {
      if (weatherRefreshInFlight.current) return;
      weatherRefreshInFlight.current = true;
      setIsWeatherRefreshing(true);

      try {
        const weatherCoords = resolveTuguegaraoWeatherCoords(location);
        const result = await environmentalService.fetchHeatIndex(
          weatherCoords.latitude,
          weatherCoords.longitude,
          { coordSource: weatherCoords.source },
        );
        setHeatDataMessage(result.message);

        if (result.status === 'success' && result.data) {
          setHeatReading(result.data);
          if (result.weather) setCurrentWeather(result.weather);
          setHeatDataSource('live');
          await offlineCacheService.saveHeatReading(result.data);
          if (result.weather) await offlineCacheService.saveWeather(result.weather);
          if (profile) {
            void databaseService.sync.syncHeatReading(profile, result.data, 'open-meteo');
            void databaseService.sync.syncWeatherRefreshLog(profile, {
              trigger,
              status: 'success',
              heatIndexC: result.data.heatIndex,
              tempC: result.weather?.tempC ?? null,
              feelsLikeC: result.weather?.feelsLikeC ?? null,
              humidity: result.weather?.humidity ?? null,
              conditionText: result.weather?.conditionText ?? null,
              message: result.message,
              intervalMinutes: WEATHER_AUTO_REFRESH_MINUTES,
            });
          }
        } else if (result.status === 'cached') {
          if (result.data) setHeatReading(result.data);
          if (result.weather) setCurrentWeather(result.weather);
          setHeatDataSource('cached');
          if (profile) {
            void databaseService.sync.syncWeatherRefreshLog(profile, {
              trigger,
              status: 'cached',
              heatIndexC: result.data?.heatIndex ?? result.weather?.heatIndexC ?? null,
              tempC: result.weather?.tempC ?? null,
              feelsLikeC: result.weather?.feelsLikeC ?? null,
              humidity: result.weather?.humidity ?? null,
              conditionText: result.weather?.conditionText ?? null,
              message: result.message,
              intervalMinutes: WEATHER_AUTO_REFRESH_MINUTES,
            });
          }
        } else {
          setHeatDataSource('unavailable');
          if (result.weather) setCurrentWeather(result.weather);
          if (profile) {
            void databaseService.sync.syncWeatherRefreshLog(profile, {
              trigger,
              status: result.status === 'invalid' ? 'invalid' : 'unavailable',
              message: result.message,
              intervalMinutes: WEATHER_AUTO_REFRESH_MINUTES,
            });
          }
        }

        // Restart countdown after every refresh attempt (live or not)
        setNextWeatherRefreshAt(Date.now() + WEATHER_AUTO_REFRESH_MS);
        setWeatherRefreshSecondsLeft(Math.floor(WEATHER_AUTO_REFRESH_MS / 1000));
      } finally {
        weatherRefreshInFlight.current = false;
        setIsWeatherRefreshing(false);
      }
    },
    [profile, location],
  );

  const applyManualDevHeatIndex = useCallback(
    async (heatIndex: number) => {
      if (!appConfig.devManualHeatEnabled) {
        return {
          ok: false,
          message: 'Heat level entry is not available right now.',
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
      setHeatDataMessage('Heat level saved.');
      await offlineCacheService.saveHeatReading(result.data);
      if (profile) {
        void databaseService.sync.syncHeatReading(profile, result.data, 'dev_manual');
      }
      return { ok: true, message: 'Heat level saved.' };
    },
    [location, profile],
  );

  const runAssessment = useCallback(() => {
    if (!profile) return;
    const result = riskAssessmentService.assess({
      heatReading,
      currentWeather,
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
  }, [profile, heatReading, currentWeather, location]);

  const refreshCheckInData = useCallback(async () => {
    if (!user) {
      setCheckIns([]);
      setLastCheckIn(null);
      setReminderSettings({ ...DEFAULT_REMINDER_SETTINGS });
      return;
    }
    const [list, last, settings] = await Promise.all([
      checkInService.getCheckIns(user.id),
      checkInService.getLastCheckIn(user.id),
      checkInService.getReminderSettings(user.id),
    ]);
    setCheckIns(list);
    setLastCheckIn(last);
    setReminderSettings(settings);
  }, [user?.id]);

  const refreshInAppNotifications = useCallback(async () => {
    if (!user) {
      setInAppNotifications([]);
      return;
    }
    const list = await inAppNotificationService.list(user.id);
    setInAppNotifications(list);
  }, [user?.id]);

  const markInAppNotificationRead = useCallback(
    async (id: string) => {
      if (!user) return;
      const list = await inAppNotificationService.markRead(user.id, id);
      setInAppNotifications(list);
    },
    [user?.id],
  );

  const markAllInAppNotificationsRead = useCallback(async () => {
    if (!user) return;
    const list = await inAppNotificationService.markAllRead(user.id);
    setInAppNotifications(list);
  }, [user?.id]);

  const submitCheckIn = useCallback(
    async (input: {
      hydrationStatus: string;
      activityLevel: string;
      generalStatus: string;
      notes?: string;
    }) => {
      if (!user || !profile) throw new Error('Profile required');
      const record = await checkInService.saveCheckIn(user.id, profile, {
        hydrationStatus: input.hydrationStatus as HealthCheckIn['hydrationStatus'],
        activityLevel: input.activityLevel as HealthCheckIn['activityLevel'],
        generalStatus: input.generalStatus as HealthCheckIn['generalStatus'],
        notes: input.notes?.trim() || null,
      });

      const updatedProfile: UserProfile = {
        ...profile,
        riskFactors: checkInService.mapCheckInToProfileRiskFactors(profile, record),
      };
      await saveProfile(updatedProfile);
      setCheckIns((prev) => [record, ...prev]);
      setLastCheckIn(record);

      await checkInService.saveWeatherAcknowledgment(user.id, profile, {
        acknowledgedAt: new Date().toISOString(),
        heatIndexC: heatReading?.heatIndex ?? null,
        riskLevel: assessment?.level ?? null,
      });

      const settings = await checkInService.getReminderSettings(user.id);
      const rescheduled = await reminderManager.reschedule(user.id, profile, settings);
      setReminderSettings(rescheduled);

      return record;
    },
    [user, profile, saveProfile, heatReading, assessment],
  );

  const adaptProfileFromCheckInDraft = useCallback(
    async (draft: CheckInChatDraft) => {
      if (!profile) return;

      const nextRiskFactors = { ...profile.riskFactors };
      let changed = false;

      if (draft.hydrationStatus && draft.hydrationStatus !== profile.riskFactors.hydrationStatus) {
        nextRiskFactors.hydrationStatus = draft.hydrationStatus;
        changed = true;
      }
      if (draft.activityLevel && draft.activityLevel !== profile.riskFactors.activityLevel) {
        nextRiskFactors.activityLevel = draft.activityLevel;
        changed = true;
      }
      if (draft.generalStatus && draft.generalStatus !== profile.riskFactors.generalStatus) {
        nextRiskFactors.generalStatus = draft.generalStatus;
        changed = true;
      }

      if (!changed) return;

      await saveProfile({
        ...profile,
        riskFactors: nextRiskFactors,
      });
    },
    [profile, saveProfile],
  );

  const updateReminderSettings = useCallback(
    async (settings: ReminderSettings) => {
      if (!user || !profile) return settings;
      if (settings.remindersEnabled && settings.frequency !== 'disabled') {
        await notificationService.requestPermission();
      }
      const saved = await checkInService.saveReminderSettings(user.id, settings);
      const rescheduled = await reminderManager.reschedule(user.id, profile, saved);
      setReminderSettings(rescheduled);
      void databaseService.sync.syncReminderSettings(profile, rescheduled);
      return rescheduled;
    },
    [user, profile],
  );

  useEffect(() => {
    if (!user || !profile) return;

    void (async () => {
      const ack = await checkInService.getWeatherAcknowledgment(user.id);
      const lastSent = await checkInService.getLastWeatherAlertSentAt(user.id);
      const show = shouldShowWeatherSafetyAlert({
        heatIndexC: heatReading?.heatIndex ?? null,
        riskLevel: assessment?.level ?? null,
        profile,
        lastCheckIn,
        lastAck: ack,
      });
      if (!show) return;

      if (lastSent) {
        const hoursSinceSent =
          (Date.now() - new Date(lastSent).getTime()) / (1000 * 60 * 60);
        if (hoursSinceSent < 3) return;
      }

      const heat = heatReading?.heatIndex;
      const level = assessment?.level;
      const body =
        heat != null
          ? `Heat index ~${Math.round(heat)}°C${level ? ` · ${level} risk` : ''}. Tap to update hydration and how you feel.`
          : 'Elevated heat risk detected. Tap to update your hydration and how you feel.';

      const result = await inAppNotificationService.add(user.id, {
        type: 'weather-safety',
        title: 'High heat alert',
        body,
        href: '/check-in',
        dedupeMinutes: 180,
      });
      if (result) {
        setInAppNotifications((prev) => [result, ...prev]);
        await checkInService.saveLastWeatherAlertSentAt(user.id, new Date().toISOString());
        void notificationService.sendWeatherSafetyReminder(body);
      }
    })();
  }, [user, profile, heatReading, assessment, lastCheckIn, emergencyTick]);

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
    if (!user || !profile || isLoading) return;

    void (async () => {
      const settings = await checkInService.getReminderSettings(user.id);
      if (!settings.remindersEnabled || settings.frequency === 'disabled') return;

      const nextDue = settings.nextReminderAt
        ? new Date(settings.nextReminderAt).getTime() <= Date.now()
        : true;
      const needsSchedule = !settings.nextReminderAt || nextDue;

      if (needsSchedule) {
        const rescheduled = await reminderManager.reschedule(user.id, profile, settings);
        setReminderSettings(rescheduled);
      }
    })();
  }, [user, profile, isLoading]);

  useEffect(() => {
    if (!user || !profile) return;

    const tick = () => {
      void (async () => {
        const settings = await checkInService.getReminderSettings(user.id);
        if (!shouldSendPeriodicReminder({ settings, lastCheckIn })) return;

        const added = await inAppNotificationService.add(user.id, {
          type: 'check-in-reminder',
          title: 'Time to check in',
          body: "Tify: how's your hydration and how are you feeling in the heat?",
          href: '/check-in',
          dedupeMinutes: 30,
        });
        if (!added) return;

        setInAppNotifications((prev) => [added, ...prev]);
        void notificationService.sendHealthCheckInReminderNow();
        const updated = await reminderManager.onReminderFired(user.id, profile, settings);
        setReminderSettings(updated);
      })();
    };

    tick();
    const interval = setInterval(tick, 60_000);
    return () => clearInterval(interval);
  }, [user?.id, profile, lastCheckIn]);

  useEffect(() => {
    if (!user || !profile || !emergencyState.isActive) return;

    void (async () => {
      const added = await inAppNotificationService.add(user.id, {
        type: 'emergency',
        title: 'Emergency active',
        body: 'Heat emergency detected. Open Emergency for hotlines and first aid.',
        href: '/(tabs)/emergency',
        dedupeMinutes: 60,
      });
      if (added) {
        setInAppNotifications((prev) => [added, ...prev]);
        void notificationService.sendEmergencyActiveAlert(
          'Heat emergency detected. Open Emergency for hotlines and first aid.',
        );
      }
    })();
  }, [user?.id, profile, emergencyState.isActive]);

  useEffect(() => {
    if (!user || !profile || !assessment?.level) return;

    const level = assessment.level;
    const prev = prevRiskLevelRef.current;
    prevRiskLevelRef.current = level;

    const elevated = level === 'HIGH' || level === 'EXTREME' || level === 'CRITICAL';
    const wasElevated = prev === 'HIGH' || prev === 'EXTREME' || prev === 'CRITICAL';
    const escalated =
      elevated &&
      (!wasElevated ||
        ((prev === 'HIGH' && (level === 'EXTREME' || level === 'CRITICAL')) ||
          (prev === 'EXTREME' && level === 'CRITICAL')));
    if (!escalated || !prev) return;

    void (async () => {
      const added = await inAppNotificationService.add(user.id, {
        type: 'heat-risk',
        title: `${RISK_LEVEL_LABELS[level]} heat risk`,
        body: 'Your risk level increased. Review safety tips and stay hydrated.',
        href: '/safety-tips',
        dedupeMinutes: 180,
      });
      if (added) {
        setInAppNotifications((prevList) => [added, ...prevList]);
        void notificationService.sendHeatRiskAlert(
          level,
          'Your risk level increased. Review safety tips and stay hydrated.',
        );
      }
    })();
  }, [user?.id, profile, assessment?.level]);

  useEffect(() => {
    if (!user || isLoading || !profile) return;
    void refreshLocation();
  }, [user, isLoading, profile, refreshLocation]);

  useEffect(() => {
    if (!user || !profile) return;
    void refreshHeatData('app_open');
  }, [user, profile, refreshHeatData]);

  // Live countdown (updates every second)
  useEffect(() => {
    if (!user || !profile || nextWeatherRefreshAt == null) return;

    const tick = () => {
      const left = Math.max(0, Math.ceil((nextWeatherRefreshAt - Date.now()) / 1000));
      setWeatherRefreshSecondsLeft(left);
      if (left <= 0 && !weatherRefreshInFlight.current) {
        void refreshHeatData('auto_15m');
      }
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [user, profile, nextWeatherRefreshAt, refreshHeatData]);

  // When app returns to foreground, refresh if the auto-refresh window already elapsed
  useEffect(() => {
    if (!user || !profile) return;

    const onChange = (state: AppStateStatus) => {
      if (state !== 'active') return;
      if (nextWeatherRefreshAt != null && Date.now() >= nextWeatherRefreshAt) {
        void refreshHeatData('foreground');
      }
    };

    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, [user, profile, nextWeatherRefreshAt, refreshHeatData]);

  useEffect(() => {
    if (!user || !profile || !heatReading) return;
    runAssessment();
  }, [
    user,
    profile,
    profile?.riskFactors.age,
    profile?.riskFactors.healthCondition,
    profile?.riskFactors.healthConditions?.join('|'),
    profile?.riskFactors.activityLevel,
    profile?.riskFactors.hydrationStatus,
    profile?.riskFactors.generalStatus,
    heatReading?.heatIndex,
    heatReading?.retrievedAt,
    currentWeather?.heatIndexC,
    currentWeather?.humidity,
    currentWeather?.lastUpdated,
    runAssessment,
  ]);

  useEffect(() => {
    if (!user || !profile || !databaseService.sync.isEnabled()) return;
    void databaseService.sync.syncEmergencyState(profile, emergencyState);
  }, [user, profile, emergencyState.isActive, emergencyState.activatedAt]);

  const unreadNotificationCount = useMemo(
    () => inAppNotifications.filter((n) => !n.read).length,
    [inAppNotifications],
  );

  const value = useMemo(
    () => ({
      profile: activeProfile,
      emergencyContact,
      location,
      locationStatus,
      heatReading,
      currentWeather,
      heatDataMessage,
      heatDataSource,
      weatherRefreshSecondsLeft,
      isWeatherRefreshing,
      weatherAutoRefreshMinutes: WEATHER_AUTO_REFRESH_MINUTES,
      assessment,
      emergencyState,
      isLoading,
      profileRestoredFromCloud,
      saveProfile,
      saveEmergencyContact,
      refreshLocation,
      refreshHeatData,
      applyManualDevHeatIndex,
      runAssessment,
      recordSafetyPromptResponse,
      checkIns,
      lastCheckIn,
      reminderSettings,
      submitCheckIn,
      adaptProfileFromCheckInDraft,
      updateReminderSettings,
      refreshCheckInData,
      inAppNotifications,
      unreadNotificationCount,
      markInAppNotificationRead,
      markAllInAppNotificationsRead,
      refreshInAppNotifications,
    }),
    [
      activeProfile,
      emergencyContact,
      location,
      locationStatus,
      heatReading,
      currentWeather,
      heatDataMessage,
      heatDataSource,
      weatherRefreshSecondsLeft,
      isWeatherRefreshing,
      assessment,
      emergencyState,
      isLoading,
      profileRestoredFromCloud,
      saveProfile,
      saveEmergencyContact,
      refreshLocation,
      refreshHeatData,
      applyManualDevHeatIndex,
      runAssessment,
      recordSafetyPromptResponse,
      checkIns,
      lastCheckIn,
      reminderSettings,
      submitCheckIn,
      adaptProfileFromCheckInDraft,
      updateReminderSettings,
      refreshCheckInData,
      inAppNotifications,
      unreadNotificationCount,
      markInAppNotificationRead,
      markAllInAppNotificationsRead,
      refreshInAppNotifications,
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
