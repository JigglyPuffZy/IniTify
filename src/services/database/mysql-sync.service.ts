import { appConfig } from '@/src/config/app.config';
import type { EmergencyState } from '@/src/models/emergency';
import type { HeatIndexReading } from '@/src/models/environmental';
import type { RiskAssessmentResult } from '@/src/models/risk';
import type { UserLocation } from '@/src/models/location';
import type { EmergencyContact, UserProfile } from '@/src/models/user';
import type { ServiceResult } from '@/src/models/service-result';
import { getDeviceUuid } from '@/src/utils/device-id';
import decisionTreeRules from '@/src/config/decision-tree.rules';

async function postJson<T>(path: string, body: unknown): Promise<ServiceResult<T>> {
  const baseUrl = appConfig.mysqlApiUrl;
  if (!baseUrl) {
    return {
      status: 'requires_configuration',
      data: null,
      message: 'Set EXPO_PUBLIC_MYSQL_API_URL in .env',
    };
  }

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await response.json();
    if (!response.ok || !json.ok) {
      return {
        status: 'error',
        data: null,
        message: json.error || `API error ${response.status}`,
      };
    }
    return { status: 'success', data: json as T, message: 'Synced to MySQL.' };
  } catch {
    return {
      status: 'unavailable',
      data: null,
      message: 'MySQL API unreachable. Is server running?',
    };
  }
}

/** Sync profile + emergency contact to MySQL via API */
export const mysqlSyncService = {
  isEnabled(): boolean {
    return appConfig.databaseProvider === 'mysql' && appConfig.mysqlApiUrl !== null;
  },

  async checkHealth(): Promise<ServiceResult<{ ok: boolean }>> {
    const baseUrl = appConfig.mysqlApiUrl;
    if (!baseUrl) {
      return { status: 'requires_configuration', data: null, message: 'API URL not set.' };
    }
    try {
      const res = await fetch(`${baseUrl.replace(/\/$/, '')}/health`);
      const json = await res.json();
      return res.ok
        ? { status: 'success', data: json, message: 'MySQL API connected.' }
        : { status: 'error', data: null, message: 'Health check failed.' };
    } catch {
      return { status: 'unavailable', data: null, message: 'MySQL API unreachable.' };
    }
  },

  async syncUserProfile(
    profile: UserProfile,
    emergencyContact: EmergencyContact | null,
  ): Promise<ServiceResult<unknown>> {
    if (!this.isEnabled()) return { status: 'requires_configuration', data: null, message: 'MySQL sync disabled.' };
    const deviceUuid = await getDeviceUuid();
    return postJson('/api/users/sync', { deviceUuid, profile, emergencyContact });
  },

  async syncHeatReading(
    profile: UserProfile,
    reading: HeatIndexReading,
    dataSource: string,
  ): Promise<ServiceResult<unknown>> {
    if (!this.isEnabled()) return { status: 'requires_configuration', data: null, message: 'MySQL sync disabled.' };
    const deviceUuid = await getDeviceUuid();
    return postJson('/api/heat-readings', {
      deviceUuid,
      displayName: profile.name,
      reading,
      dataSource,
    });
  },

  async syncAssessment(
    profile: UserProfile,
    assessment: RiskAssessmentResult,
  ): Promise<ServiceResult<unknown>> {
    if (!this.isEnabled()) return { status: 'requires_configuration', data: null, message: 'MySQL sync disabled.' };
    const deviceUuid = await getDeviceUuid();
    return postJson('/api/assessments', {
      deviceUuid,
      displayName: profile.name,
      assessment,
      treeVersion: decisionTreeRules.version,
    });
  },

  async syncEmergencyState(
    profile: UserProfile,
    state: EmergencyState,
  ): Promise<ServiceResult<unknown>> {
    if (!this.isEnabled()) return { status: 'requires_configuration', data: null, message: 'MySQL sync disabled.' };
    const deviceUuid = await getDeviceUuid();
    return postJson('/api/emergency-events', {
      deviceUuid,
      displayName: profile.name,
      state,
    });
  },

  async syncSafetyPrompt(
    profile: UserProfile,
    respondedOk: boolean,
  ): Promise<ServiceResult<unknown>> {
    if (!this.isEnabled()) return { status: 'requires_configuration', data: null, message: 'MySQL sync disabled.' };
    const deviceUuid = await getDeviceUuid();
    return postJson('/api/safety-prompts', {
      deviceUuid,
      displayName: profile.name,
      respondedOk,
    });
  },

  async syncLocation(
    profile: UserProfile,
    location: UserLocation,
    context: string,
  ): Promise<ServiceResult<unknown>> {
    if (!this.isEnabled()) return { status: 'requires_configuration', data: null, message: 'MySQL sync disabled.' };
    const deviceUuid = await getDeviceUuid();
    return postJson('/api/location-logs', {
      deviceUuid,
      displayName: profile.name,
      location,
      context,
    });
  },
};
