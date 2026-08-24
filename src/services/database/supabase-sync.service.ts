import { getSupabaseClient } from '@/src/config/supabase.client';
import { appConfig } from '@/src/config/app.config';
import decisionTreeRules from '@/src/config/decision-tree.rules';
import type { EmergencyContactNotification, EmergencyState } from '@/src/models/emergency';
import type { HeatIndexReading } from '@/src/models/environmental';
import type { UserLocation } from '@/src/models/location';
import type { HeatRiskLevel, RiskAssessmentResult } from '@/src/models/risk';
import type { ServiceResult } from '@/src/models/service-result';
import type { Recommendation } from '@/src/models/recommendations';
import type { EmergencyContact, UserProfile } from '@/src/models/user';
import { hydrationStatusToDb, normalizeHydrationStatus, normalizeProfile } from '@/src/models/user';
import type { HealthCheckIn, ReminderSettings } from '@/src/models/check-in';
import type { WeatherSafetyAcknowledgment } from '@/src/models/check-in';
import { getDeviceUuid } from '@/src/utils/device-id';

/** Pause remote sync after network/DNS failures to avoid console spam */
const SYNC_COOLDOWN_MS = 5 * 60 * 1000;
let syncBlockedUntil = 0;
let cachedUser: { deviceUuid: string; userId: number } | null = null;
let syncFailureLogged = false;

function isSyncPaused(): boolean {
  return Date.now() < syncBlockedUntil;
}

function isNetworkError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes('failed to fetch') ||
    lower.includes('network request failed') ||
    lower.includes('err_name_not_resolved') ||
    lower.includes('networkerror') ||
    lower.includes('load failed')
  );
}

function isPermissionError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  const message = (error.message ?? '').toLowerCase();
  const code = error.code ?? '';
  return (
    code === '42501' ||
    message.includes('403') ||
    message.includes('forbidden') ||
    message.includes('row-level security') ||
    message.includes('permission denied') ||
    message.includes('jwt')
  );
}

function pauseSync(reason: string): void {
  syncBlockedUntil = Date.now() + SYNC_COOLDOWN_MS;
  if (!syncFailureLogged) {
    syncFailureLogged = true;
    console.warn(`[IniTify] Supabase sync paused for 5 minutes: ${reason}`);
  }
}

function clearSyncPause(): void {
  syncBlockedUntil = 0;
  syncFailureLogged = false;
}

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`${label} timed out after ${Math.round(ms / 1000)}s`));
        }, ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

type HeatDataSource = 'DOST-PAGASA' | 'dev_manual' | 'cached';
type LocationContext =
  | 'setup'
  | 'dashboard'
  | 'assessment'
  | 'emergency'
  | 'hospital'
  | 'check_in'
  | 'other';

type AlertDeliveryStatus = 'scheduled' | 'sent' | 'failed' | 'permission_denied';

export interface HospitalLookupSync {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  distanceKm: number;
  estimatedTravelTime: string | null;
}

function mapHeatDataSource(source: string): HeatDataSource {
  if (source === 'dev_manual' || source === 'cached' || source === 'DOST-PAGASA') {
    return source;
  }
  if (source === 'weatherapi' || source === 'open-meteo' || source === 'manual') {
    return 'DOST-PAGASA';
  }
  return 'DOST-PAGASA';
}

function mapLocationContext(context: string): LocationContext {
  const allowed: LocationContext[] = [
    'setup',
    'dashboard',
    'assessment',
    'emergency',
    'hospital',
    'check_in',
    'other',
  ];
  return allowed.includes(context as LocationContext) ? (context as LocationContext) : 'other';
}

export function clearSupabaseUserCache(): void {
  cachedUser = null;
}

function mapRiskRowToProfile(displayName: string, row: Record<string, unknown>): UserProfile {
  const healthConditions =
    Array.isArray(row.health_conditions) && row.health_conditions.length > 0
      ? (row.health_conditions as string[])
      : row.health_condition
        ? [String(row.health_condition)]
        : ['None'];

  return normalizeProfile({
    name: displayName,
    riskFactors: {
      age: row.age != null ? Number(row.age) : null,
      healthCondition: String(row.health_condition ?? 'None'),
      healthConditions,
      activityLevel: row.activity_level ? String(row.activity_level) : null,
      hydrationStatus: normalizeHydrationStatus(
        row.hydration_status ? String(row.hydration_status) : null,
      ),
      generalStatus: row.general_status ? String(row.general_status) : 'Feeling Well',
    },
  });
}

async function resolveUserId(displayName: string): Promise<ServiceResult<number>> {
  if (isSyncPaused()) {
    return {
      status: 'unavailable',
      data: null,
      message: 'Supabase sync paused after a network error. Local data is still saved.',
    };
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return { status: 'requires_configuration', data: null, message: 'Supabase not configured.' };
  }

  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const authUser = sessionData.session?.user;

    if (authUser?.id) {
      const cacheKey = `auth:${authUser.id}`;
      if (cachedUser?.deviceUuid === cacheKey) {
        return { status: 'success', data: cachedUser.userId, message: 'User synced.' };
      }

      const { data: existing, error: findError } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', authUser.id)
        .maybeSingle();

      if (findError && isPermissionError(findError)) {
        pauseSync('Supabase denied read access for account profile.');
        return { status: 'error', data: null, message: findError.message };
      }

      if (existing?.id) {
        await supabase
          .from('users')
          .update({
            display_name: displayName,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        clearSyncPause();
        cachedUser = { deviceUuid: cacheKey, userId: existing.id as number };
        return { status: 'success', data: existing.id as number, message: 'User synced.' };
      }

      const { data: created, error: insertError } = await supabase
        .from('users')
        .upsert(
          {
            auth_user_id: authUser.id,
            device_uuid: `auth_${authUser.id}`,
            display_name: displayName,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'auth_user_id' },
        )
        .select('id')
        .single();

      if (insertError || !created?.id) {
        const message = insertError?.message ?? 'Failed to link account.';
        if (isNetworkError(message) || isPermissionError(insertError)) {
          pauseSync(message);
        }
        return { status: 'error', data: null, message };
      }

      clearSyncPause();
      cachedUser = { deviceUuid: cacheKey, userId: created.id as number };
      return { status: 'success', data: created.id as number, message: 'User synced.' };
    }

    const deviceUuid = await getDeviceUuid();
    if (cachedUser?.deviceUuid === deviceUuid) {
      return { status: 'success', data: cachedUser.userId, message: 'User synced.' };
    }

    const { data, error } = await supabase
      .from('users')
      .upsert(
        {
          device_uuid: deviceUuid,
          display_name: displayName,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'device_uuid' },
      )
      .select('id')
      .single();

    if (error || !data?.id) {
      const message = error?.message ?? 'Failed to upsert user.';
      if (isNetworkError(message) || isPermissionError(error)) {
        pauseSync(
          isPermissionError(error)
            ? 'Supabase denied write access (check RLS policies or API key).'
            : message,
        );
      }
      return { status: 'error', data: null, message };
    }

    clearSyncPause();
    cachedUser = { deviceUuid, userId: data.id as number };
    return { status: 'success', data: data.id as number, message: 'User synced.' };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to upsert user.';
    if (isNetworkError(message)) {
      pauseSync(message);
      return {
        status: 'unavailable',
        data: null,
        message: 'Cannot reach Supabase. Check your URL and network connection.',
      };
    }
    return { status: 'error', data: null, message };
  }
}

async function fetchUserProfileUncached(
  supabase: NonNullable<ReturnType<typeof getSupabaseClient>>,
): Promise<
  ServiceResult<{ profile: UserProfile; emergencyContact: EmergencyContact | null } | null>
> {
  const { data: sessionData } = await supabase.auth.getSession();
  const authUser = sessionData.session?.user;
  if (!authUser?.id) {
    return { status: 'success', data: null, message: 'No authenticated Supabase session.' };
  }

  const { data: userRow, error: userError } = await supabase
    .from('users')
    .select('id, display_name')
    .eq('auth_user_id', authUser.id)
    .maybeSingle();

  if (userError) {
    if (isNetworkError(userError.message) || isPermissionError(userError)) {
      pauseSync(userError.message);
    }
    return { status: 'error', data: null, message: userError.message };
  }

  if (!userRow?.id) {
    return { status: 'success', data: null, message: 'No cloud profile for this account yet.' };
  }

  const { data: riskRow, error: riskError } = await supabase
    .from('user_risk_profiles')
    .select(
      'age, health_condition, health_conditions, activity_level, hydration_status, general_status',
    )
    .eq('user_id', userRow.id)
    .eq('is_current', true)
    .order('recorded_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (riskError) {
    return { status: 'error', data: null, message: riskError.message };
  }

  if (!riskRow) {
    return { status: 'success', data: null, message: 'Profile setup not completed in cloud.' };
  }

  const profile = mapRiskRowToProfile(
    userRow.display_name ?? authUser.email?.split('@')[0] ?? 'IniTify user',
    riskRow as Record<string, unknown>,
  );

  const { data: contactRow } = await supabase
    .from('emergency_contacts')
    .select('contact_name, contact_phone')
    .eq('user_id', userRow.id)
    .eq('is_primary', true)
    .maybeSingle();

  const emergencyContact: EmergencyContact | null = contactRow
    ? {
        name: contactRow.contact_name,
        phone: contactRow.contact_phone,
      }
    : null;

  clearSyncPause();
  cachedUser = { deviceUuid: `auth:${authUser.id}`, userId: userRow.id as number };

  return {
    status: 'success',
    data: { profile, emergencyContact },
    message: 'Profile restored from your account.',
  };
}

/** Sync profile + events to Supabase PostgreSQL */
export const supabaseSyncService = {
  isEnabled(): boolean {
    return (
      appConfig.databaseProvider === 'supabase' &&
      appConfig.supabaseUrl !== null &&
      appConfig.supabaseAnonKey !== null
    );
  },

  async checkHealth(): Promise<ServiceResult<{ ok: boolean }>> {
    if (isSyncPaused()) {
      return {
        status: 'unavailable',
        data: null,
        message: 'Supabase unreachable. Sync will retry after a short cooldown.',
      };
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return { status: 'requires_configuration', data: null, message: 'Supabase URL/key not set.' };
    }

    try {
      const { error } = await supabase.from('system_config').select('config_key').limit(1);
      if (error) {
        if (isNetworkError(error.message)) {
          pauseSync(error.message);
          return {
            status: 'unavailable',
            data: null,
            message: 'Cannot reach Supabase. Verify EXPO_PUBLIC_SUPABASE_URL in .env.',
          };
        }
        return {
          status: 'error',
          data: null,
          message: `${error.message} Run initify_supabase_permissions.sql in Supabase if needed.`,
        };
      }

      clearSyncPause();
      return { status: 'success', data: { ok: true }, message: 'Supabase connected.' };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Supabase health check failed.';
      if (isNetworkError(message)) {
        pauseSync(message);
      }
      return {
        status: 'unavailable',
        data: null,
        message: 'Cannot reach Supabase. Check your project URL and internet connection.',
      };
    }
  },

  async syncUserProfile(
    profile: UserProfile,
    emergencyContact: EmergencyContact | null,
  ): Promise<ServiceResult<unknown>> {
    if (!this.isEnabled()) {
      return { status: 'requires_configuration', data: null, message: 'Supabase sync disabled.' };
    }

    const userResult = await resolveUserId(profile.name);
    if (userResult.status !== 'success' || userResult.data === null) {
      return userResult;
    }

    const userId = userResult.data;
    const supabase = getSupabaseClient();
    if (!supabase) {
      return { status: 'requires_configuration', data: null, message: 'Supabase not configured.' };
    }

    await supabase.from('user_risk_profiles').update({ is_current: false }).eq('user_id', userId);

    const { error: profileError } = await supabase.from('user_risk_profiles').insert({
      user_id: userId,
      age: profile.riskFactors.age,
      health_condition: profile.riskFactors.healthCondition,
      activity_level: profile.riskFactors.activityLevel,
      hydration_status: hydrationStatusToDb(profile.riskFactors.hydrationStatus),
      general_status: profile.riskFactors.generalStatus ?? 'Feeling Well',
      health_conditions: profile.riskFactors.healthConditions ?? [],
      is_current: true,
    });

    if (profileError) {
      return { status: 'error', data: null, message: profileError.message };
    }

    if (emergencyContact?.phone) {
      await supabase.from('emergency_contacts').delete().eq('user_id', userId);
      const { error: contactError } = await supabase.from('emergency_contacts').insert({
        user_id: userId,
        contact_name: emergencyContact.name,
        contact_phone: emergencyContact.phone,
        is_primary: true,
      });

      if (contactError) {
        return { status: 'error', data: null, message: contactError.message };
      }
    }

    return { status: 'success', data: { userId }, message: 'Synced to Supabase.' };
  },

  async fetchUserProfile(): Promise<
    ServiceResult<{ profile: UserProfile; emergencyContact: EmergencyContact | null } | null>
  > {
    if (!this.isEnabled()) {
      return { status: 'requires_configuration', data: null, message: 'Supabase sync disabled.' };
    }

    if (isSyncPaused()) {
      return {
        status: 'unavailable',
        data: null,
        message: 'Supabase unreachable. Using local profile until sync resumes.',
      };
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return { status: 'requires_configuration', data: null, message: 'Supabase not configured.' };
    }

    try {
      return await withTimeout(fetchUserProfileUncached(supabase), 7_000, 'Cloud profile');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load cloud profile.';
      if (isNetworkError(message) || message.toLowerCase().includes('timed out')) {
        pauseSync(message);
      }
      return { status: 'unavailable', data: null, message };
    }
  },

  async syncHeatReading(
    profile: UserProfile,
    reading: HeatIndexReading,
    dataSource: string,
  ): Promise<ServiceResult<unknown>> {
    if (!this.isEnabled()) {
      return { status: 'requires_configuration', data: null, message: 'Supabase sync disabled.' };
    }

    const userResult = await resolveUserId(profile.name);
    if (userResult.status !== 'success' || userResult.data === null) {
      return userResult;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return { status: 'requires_configuration', data: null, message: 'Supabase not configured.' };
    }

    const { data, error } = await supabase
      .from('heat_index_readings')
      .insert({
        user_id: userResult.data,
        heat_index_c: reading.heatIndex,
        data_source: mapHeatDataSource(dataSource),
        latitude: reading.latitude,
        longitude: reading.longitude,
        is_cached: reading.isCached,
        retrieved_at: reading.retrievedAt,
      })
      .select('id')
      .single();

    if (error) {
      return { status: 'error', data: null, message: error.message };
    }

    return { status: 'success', data: { heatReadingId: data?.id }, message: 'Synced to Supabase.' };
  },

  async syncAssessment(
    profile: UserProfile,
    assessment: RiskAssessmentResult,
  ): Promise<ServiceResult<unknown>> {
    if (!this.isEnabled()) {
      return { status: 'requires_configuration', data: null, message: 'Supabase sync disabled.' };
    }

    const userResult = await resolveUserId(profile.name);
    if (userResult.status !== 'success' || userResult.data === null) {
      return userResult;
    }

    const inputs = assessment.inputs;
    const supabase = getSupabaseClient();
    if (!supabase) {
      return { status: 'requires_configuration', data: null, message: 'Supabase not configured.' };
    }

    const { data, error } = await supabase
      .from('risk_assessments')
      .insert({
        user_id: userResult.data,
        risk_level: assessment.level,
        assessment_source: assessment.source,
        message: assessment.message ?? null,
        heat_index_c: inputs.heatIndex,
        input_age: inputs.age,
        input_health_condition: inputs.healthCondition,
        input_activity_level: inputs.activityLevel,
        input_hydration_status: inputs.hydrationStatus,
        input_latitude: inputs.latitude,
        input_longitude: inputs.longitude,
        decision_tree_version: decisionTreeRules.version,
        assessed_at: assessment.assessedAt,
      })
      .select('id')
      .single();

    if (error) {
      return { status: 'error', data: null, message: error.message };
    }

    return { status: 'success', data: { assessmentId: data?.id }, message: 'Synced to Supabase.' };
  },

  async syncEmergencyState(
    profile: UserProfile,
    state: EmergencyState,
  ): Promise<ServiceResult<unknown>> {
    if (!this.isEnabled()) {
      return { status: 'requires_configuration', data: null, message: 'Supabase sync disabled.' };
    }

    const userResult = await resolveUserId(profile.name);
    if (userResult.status !== 'success' || userResult.data === null) {
      return userResult;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return { status: 'requires_configuration', data: null, message: 'Supabase not configured.' };
    }

    const { data, error } = await supabase
      .from('emergency_events')
      .insert({
        user_id: userResult.data,
        is_active: state.isActive,
        activated_at: state.activatedAt,
        indicator_extreme_heat: state.indicators.extremeHeatRisk,
        indicator_failed_prompts: state.indicators.repeatedFailedSafetyPrompts,
        indicator_inactivity: state.indicators.prolongedInactivity,
        failed_prompt_threshold: 3,
        inactivity_threshold_min: 15,
      })
      .select('id')
      .single();

    if (error) {
      return { status: 'error', data: null, message: error.message };
    }

    return {
      status: 'success',
      data: { emergencyEventId: data?.id },
      message: 'Synced to Supabase.',
    };
  },

  async syncSafetyPrompt(
    profile: UserProfile,
    respondedOk: boolean,
  ): Promise<ServiceResult<unknown>> {
    if (!this.isEnabled()) {
      return { status: 'requires_configuration', data: null, message: 'Supabase sync disabled.' };
    }

    const userResult = await resolveUserId(profile.name);
    if (userResult.status !== 'success' || userResult.data === null) {
      return userResult;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return { status: 'requires_configuration', data: null, message: 'Supabase not configured.' };
    }

    const { error } = await supabase.from('safety_prompt_responses').insert({
      user_id: userResult.data,
      responded_ok: respondedOk,
      responded_at: new Date().toISOString(),
    });

    if (error) {
      return { status: 'error', data: null, message: error.message };
    }

    return { status: 'success', data: null, message: 'Synced to Supabase.' };
  },

  async syncLocation(
    profile: UserProfile,
    location: UserLocation,
    context: string,
  ): Promise<ServiceResult<unknown>> {
    if (!this.isEnabled()) {
      return { status: 'requires_configuration', data: null, message: 'Supabase sync disabled.' };
    }

    const userResult = await resolveUserId(profile.name);
    if (userResult.status !== 'success' || userResult.data === null) {
      return userResult;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return { status: 'requires_configuration', data: null, message: 'Supabase not configured.' };
    }

    const { error } = await supabase.from('location_logs').insert({
      user_id: userResult.data,
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy_m: location.accuracy,
      context: mapLocationContext(context),
      recorded_at: location.retrievedAt || new Date().toISOString(),
    });

    if (error) {
      return { status: 'error', data: null, message: error.message };
    }

    return { status: 'success', data: null, message: 'Synced to Supabase.' };
  },

  async syncHotlineCall(
    profile: UserProfile,
    params: { label: string; phone: string },
  ): Promise<ServiceResult<unknown>> {
    if (!this.isEnabled()) {
      return { status: 'requires_configuration', data: null, message: 'Supabase sync disabled.' };
    }

    const userResult = await resolveUserId(profile.name);
    if (userResult.status !== 'success' || userResult.data === null) {
      return userResult;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return { status: 'requires_configuration', data: null, message: 'Supabase not configured.' };
    }

    const { error } = await supabase.from('emergency_hotline_calls').insert({
      user_id: userResult.data,
      hotline_label: params.label,
      phone_dialed: params.phone,
      dialed_at: new Date().toISOString(),
    });

    if (error) {
      return { status: 'error', data: null, message: error.message };
    }

    return { status: 'success', data: null, message: 'Hotline call logged.' };
  },

  async syncHospitalLookup(
    profile: UserProfile,
    hospital: HospitalLookupSync,
    userLocation: UserLocation,
  ): Promise<ServiceResult<unknown>> {
    if (!this.isEnabled()) {
      return { status: 'requires_configuration', data: null, message: 'Supabase sync disabled.' };
    }

    const userResult = await resolveUserId(profile.name);
    if (userResult.status !== 'success' || userResult.data === null) {
      return userResult;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return { status: 'requires_configuration', data: null, message: 'Supabase not configured.' };
    }

    const { error } = await supabase.from('hospital_lookups').insert({
      user_id: userResult.data,
      provider: appConfig.hospitalDataProvider ?? 'static-tuguegarao',
      hospital_name: hospital.name,
      hospital_address: hospital.address,
      hospital_latitude: hospital.latitude,
      hospital_longitude: hospital.longitude,
      user_latitude: userLocation.latitude,
      user_longitude: userLocation.longitude,
      distance_km: hospital.distanceKm,
      estimated_travel_time: hospital.estimatedTravelTime,
      maps_provider: appConfig.mapsProvider,
      looked_up_at: new Date().toISOString(),
    });

    if (error) {
      return { status: 'error', data: null, message: error.message };
    }

    return { status: 'success', data: null, message: 'Hospital lookup logged.' };
  },

  async syncRecommendations(
    profile: UserProfile,
    riskLevel: HeatRiskLevel,
    recommendations: Recommendation[],
  ): Promise<ServiceResult<unknown>> {
    if (!this.isEnabled()) {
      return { status: 'requires_configuration', data: null, message: 'Supabase sync disabled.' };
    }
    if (recommendations.length === 0) {
      return { status: 'success', data: null, message: 'No recommendations to sync.' };
    }

    const userResult = await resolveUserId(profile.name);
    if (userResult.status !== 'success' || userResult.data === null) {
      return userResult;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return { status: 'requires_configuration', data: null, message: 'Supabase not configured.' };
    }

    const viewedAt = new Date().toISOString();
    const rows = recommendations.map((rec) => ({
      user_id: userResult.data,
      risk_level: riskLevel,
      recommendation_type: rec.type,
      title: rec.title,
      description: rec.description,
      viewed_at: viewedAt,
    }));

    const { error } = await supabase.from('recommendation_logs').insert(rows);
    if (error) {
      return { status: 'error', data: null, message: error.message };
    }

    return { status: 'success', data: null, message: 'Recommendations logged.' };
  },

  async syncHeatAlert(
    profile: UserProfile,
    riskLevel: HeatRiskLevel,
    summary: string,
    deliveryStatus: AlertDeliveryStatus,
  ): Promise<ServiceResult<unknown>> {
    if (!this.isEnabled()) {
      return { status: 'requires_configuration', data: null, message: 'Supabase sync disabled.' };
    }

    const userResult = await resolveUserId(profile.name);
    if (userResult.status !== 'success' || userResult.data === null) {
      return userResult;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return { status: 'requires_configuration', data: null, message: 'Supabase not configured.' };
    }

    const { error } = await supabase.from('heat_alert_logs').insert({
      user_id: userResult.data,
      risk_level: riskLevel,
      summary,
      delivery_status: deliveryStatus,
      sent_at: new Date().toISOString(),
    });

    if (error) {
      return { status: 'error', data: null, message: error.message };
    }

    return { status: 'success', data: null, message: 'Heat alert logged.' };
  },

  async syncEmergencyActiveAlert(
    profile: UserProfile,
    triggeredReasons: string,
  ): Promise<ServiceResult<unknown>> {
    if (!this.isEnabled()) {
      return { status: 'requires_configuration', data: null, message: 'Supabase sync disabled.' };
    }

    const userResult = await resolveUserId(profile.name);
    if (userResult.status !== 'success' || userResult.data === null) {
      return userResult;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return { status: 'requires_configuration', data: null, message: 'Supabase not configured.' };
    }

    const { error } = await supabase.from('emergency_active_alerts').insert({
      user_id: userResult.data,
      triggered_reasons: triggeredReasons,
      alert_type: 'local_notification',
      delivered_at: new Date().toISOString(),
    });

    if (error) {
      return { status: 'error', data: null, message: error.message };
    }

    return { status: 'success', data: null, message: 'Emergency alert logged.' };
  },

  async syncContactNotification(
    profile: UserProfile,
    contact: EmergencyContact,
    notification: EmergencyContactNotification,
    sentStatus: 'prepared' | 'sent' | 'failed',
  ): Promise<ServiceResult<unknown>> {
    if (!this.isEnabled()) {
      return { status: 'requires_configuration', data: null, message: 'Supabase sync disabled.' };
    }

    const userResult = await resolveUserId(profile.name);
    if (userResult.status !== 'success' || userResult.data === null) {
      return userResult;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return { status: 'requires_configuration', data: null, message: 'Supabase not configured.' };
    }

    const { error } = await supabase.from('emergency_contact_notifications').insert({
      user_id: userResult.data,
      contact_name: contact.name,
      contact_phone: contact.phone,
      heat_risk_level: notification.heatRiskLevel,
      latitude: notification.lastKnownLocation?.latitude ?? null,
      longitude: notification.lastKnownLocation?.longitude ?? null,
      nearest_hospital: notification.nearestHospital,
      estimated_travel_time: notification.estimatedTravelTime,
      is_development_mode: notification.isDevelopmentMode,
      sent_status: sentStatus,
      sent_at: notification.sentAt,
    });

    if (error) {
      return { status: 'error', data: null, message: error.message };
    }

    return { status: 'success', data: null, message: 'Contact notification logged.' };
  },

  async syncCheckIn(
    profile: UserProfile,
    checkIn: HealthCheckIn,
  ): Promise<ServiceResult<unknown>> {
    if (!this.isEnabled()) {
      return { status: 'requires_configuration', data: null, message: 'Supabase sync disabled.' };
    }

    const userResult = await resolveUserId(profile.name);
    if (userResult.status !== 'success' || userResult.data === null) {
      return userResult;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return { status: 'requires_configuration', data: null, message: 'Supabase not configured.' };
    }

    const { error } = await supabase.from('user_check_ins').insert({
      user_id: userResult.data,
      hydration_status: hydrationStatusToDb(checkIn.hydrationStatus),
      activity_level: checkIn.activityLevel,
      general_status: checkIn.generalStatus,
      notes: checkIn.notes ?? null,
      check_in_time: checkIn.checkInTime,
    });

    if (error) {
      return { status: 'error', data: null, message: error.message };
    }

    return { status: 'success', data: null, message: 'Check-in synced.' };
  },

  async syncReminderSettings(
    profile: UserProfile,
    settings: ReminderSettings,
  ): Promise<ServiceResult<unknown>> {
    if (!this.isEnabled()) {
      return { status: 'requires_configuration', data: null, message: 'Supabase sync disabled.' };
    }

    const userResult = await resolveUserId(profile.name);
    if (userResult.status !== 'success' || userResult.data === null) {
      return userResult;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return { status: 'requires_configuration', data: null, message: 'Supabase not configured.' };
    }

    const { error } = await supabase.from('user_reminder_settings').upsert(
      {
        user_id: userResult.data,
        reminders_enabled: settings.remindersEnabled,
        frequency: settings.frequency,
        custom_interval_minutes: settings.customIntervalMinutes,
        quiet_hours_enabled: settings.quietHoursEnabled,
        quiet_hours_start: settings.quietHoursStart,
        quiet_hours_end: settings.quietHoursEnd,
        last_reminder_sent_at: settings.lastReminderSentAt,
        next_reminder_at: settings.nextReminderAt,
        updated_at: settings.updatedAt,
      },
      { onConflict: 'user_id' },
    );

    if (error) {
      return { status: 'error', data: null, message: error.message };
    }

    return { status: 'success', data: null, message: 'Reminder settings synced.' };
  },

  async syncWeatherSafetyAck(
    profile: UserProfile,
    ack: WeatherSafetyAcknowledgment,
  ): Promise<ServiceResult<unknown>> {
    if (!this.isEnabled()) {
      return { status: 'requires_configuration', data: null, message: 'Supabase sync disabled.' };
    }

    const userResult = await resolveUserId(profile.name);
    if (userResult.status !== 'success' || userResult.data === null) {
      return userResult;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return { status: 'requires_configuration', data: null, message: 'Supabase not configured.' };
    }

    const { error } = await supabase.from('weather_safety_acknowledgments').insert({
      user_id: userResult.data,
      heat_index_c: ack.heatIndexC,
      risk_level: ack.riskLevel,
      acknowledged_at: ack.acknowledgedAt,
    });

    if (error) {
      return { status: 'error', data: null, message: error.message };
    }

    return { status: 'success', data: null, message: 'Weather safety acknowledgment logged.' };
  },

  async syncWeatherRefreshLog(
    profile: UserProfile,
    params: {
      trigger: 'app_open' | 'manual' | 'auto_15m' | 'foreground';
      status: 'success' | 'cached' | 'unavailable' | 'invalid';
      heatIndexC?: number | null;
      tempC?: number | null;
      feelsLikeC?: number | null;
      humidity?: number | null;
      conditionText?: string | null;
      message?: string | null;
      intervalMinutes?: number;
    },
  ): Promise<ServiceResult<unknown>> {
    if (!this.isEnabled()) {
      return { status: 'requires_configuration', data: null, message: 'Supabase sync disabled.' };
    }
    if (isSyncPaused()) {
      return { status: 'unavailable', data: null, message: 'Supabase sync paused.' };
    }

    const userResult = await resolveUserId(profile.name);
    if (userResult.status !== 'success' || userResult.data === null) {
      return userResult;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return { status: 'requires_configuration', data: null, message: 'Supabase not configured.' };
    }

    const { error } = await supabase.from('weather_refresh_logs').insert({
      user_id: userResult.data,
      trigger: params.trigger,
      status: params.status,
      provider: 'open-meteo',
      heat_index_c: params.heatIndexC ?? null,
      temp_c: params.tempC ?? null,
      feels_like_c: params.feelsLikeC ?? null,
      humidity: params.humidity ?? null,
      condition_text: params.conditionText ?? null,
      interval_minutes: params.intervalMinutes ?? 15,
      message: params.message ?? null,
      refreshed_at: new Date().toISOString(),
    });

    if (error) {
      // Table may not exist until SQL is run — fail soft
      return { status: 'error', data: null, message: error.message };
    }

    return { status: 'success', data: null, message: 'Weather refresh logged.' };
  },
};
