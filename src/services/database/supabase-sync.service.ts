import { getSupabaseClient } from '@/src/config/supabase.client';
import { appConfig } from '@/src/config/app.config';
import decisionTreeRules from '@/src/config/decision-tree.rules';
import type { EmergencyState } from '@/src/models/emergency';
import type { HeatIndexReading } from '@/src/models/environmental';
import type { UserLocation } from '@/src/models/location';
import type { RiskAssessmentResult } from '@/src/models/risk';
import type { ServiceResult } from '@/src/models/service-result';
import type { EmergencyContact, UserProfile } from '@/src/models/user';
import { getDeviceUuid } from '@/src/utils/device-id';

type HeatDataSource = 'DOST-PAGASA' | 'dev_manual' | 'cached';
type LocationContext =
  | 'setup'
  | 'dashboard'
  | 'assessment'
  | 'emergency'
  | 'hospital'
  | 'other';

function mapHeatDataSource(source: string): HeatDataSource {
  if (source === 'dev_manual' || source === 'cached' || source === 'DOST-PAGASA') {
    return source;
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
    'other',
  ];
  return allowed.includes(context as LocationContext) ? (context as LocationContext) : 'other';
}

async function upsertUserId(deviceUuid: string, displayName: string): Promise<ServiceResult<number>> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { status: 'requires_configuration', data: null, message: 'Supabase not configured.' };
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
    return {
      status: 'error',
      data: null,
      message: error?.message ?? 'Failed to upsert user.',
    };
  }

  return { status: 'success', data: data.id as number, message: 'User synced.' };
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
    const supabase = getSupabaseClient();
    if (!supabase) {
      return { status: 'requires_configuration', data: null, message: 'Supabase URL/key not set.' };
    }

    const { error } = await supabase.from('system_config').select('config_key').limit(1);
    if (error) {
      return {
        status: 'error',
        data: null,
        message: `${error.message} Run initify_supabase_permissions.sql in Supabase if needed.`,
      };
    }

    return { status: 'success', data: { ok: true }, message: 'Supabase connected.' };
  },

  async syncUserProfile(
    profile: UserProfile,
    emergencyContact: EmergencyContact | null,
  ): Promise<ServiceResult<unknown>> {
    if (!this.isEnabled()) {
      return { status: 'requires_configuration', data: null, message: 'Supabase sync disabled.' };
    }

    const deviceUuid = await getDeviceUuid();
    const userResult = await upsertUserId(deviceUuid, profile.name);
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
      hydration_status: profile.riskFactors.hydrationStatus,
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

  async syncHeatReading(
    profile: UserProfile,
    reading: HeatIndexReading,
    dataSource: string,
  ): Promise<ServiceResult<unknown>> {
    if (!this.isEnabled()) {
      return { status: 'requires_configuration', data: null, message: 'Supabase sync disabled.' };
    }

    const deviceUuid = await getDeviceUuid();
    const userResult = await upsertUserId(deviceUuid, profile.name);
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

    const deviceUuid = await getDeviceUuid();
    const userResult = await upsertUserId(deviceUuid, profile.name);
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

    const deviceUuid = await getDeviceUuid();
    const userResult = await upsertUserId(deviceUuid, profile.name);
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

    const deviceUuid = await getDeviceUuid();
    const userResult = await upsertUserId(deviceUuid, profile.name);
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

    const deviceUuid = await getDeviceUuid();
    const userResult = await upsertUserId(deviceUuid, profile.name);
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
};
