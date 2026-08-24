import { getSupabaseClient } from '@/src/config/supabase.client';
import { appConfig } from '@/src/config/app.config';
import type { ServiceResult } from '@/src/models/service-result';
import { toKbHealthConditionName } from '@/src/constants/health-conditions';
import { getLocalSafetyTips } from '@/src/constants/local-health-safety-tips';
import { mapWeatherToHazard } from '@/src/services/check-in/reminder-scheduler.service';

export interface PersonalizedSafetyTip {
  tipId: number;
  healthCondition: string;
  weatherHazard: string;
  title: string;
  safetyTip: string;
  warningSigns: string;
  emergencyAdvice: string;
  priority: number;
}

export const healthSafetyKbService = {
  isConfigured(): boolean {
    return appConfig.supabaseUrl !== null && appConfig.supabaseAnonKey !== null;
  },

  async getTipsForProfile(params: {
    healthConditions: string[];
    healthCondition?: string | null;
    heatIndexC: number | null;
    conditionText?: string | null;
    limit?: number;
  }): Promise<ServiceResult<PersonalizedSafetyTip[]>> {
    const hazard = mapWeatherToHazard({
      heatIndexC: params.heatIndexC,
      conditionText: params.conditionText,
    });

    const conditions = params.healthConditions
      .filter((c) => c && c !== 'None')
      .map(toKbHealthConditionName);

    const queryNames =
      conditions.length > 0 ? conditions : ['General / No Known Condition'];

    const perConditionLimit = params.limit ?? 3;
    const totalLimit = perConditionLimit * queryNames.length;

    const supabase = getSupabaseClient();
    if (!supabase) {
      const local = getLocalSafetyTips({
        healthConditions: params.healthConditions,
        healthCondition: params.healthCondition,
        weatherHazard: hazard,
        limit: totalLimit,
      });
      return {
        status: local.length > 0 ? 'success' : 'requires_configuration',
        data: local.length > 0 ? local : null,
        message:
          local.length > 0
            ? `Loaded ${local.length} on-device safety tip(s) for your conditions.`
            : 'Supabase not configured for safety tips.',
      };
    }

    try {
      const { data, error } = await supabase
        .from('v_personalized_safety_tips')
        .select(
          'tip_id, health_condition, weather_hazard, title, safety_tip, warning_signs, emergency_advice, priority',
        )
        .eq('weather_hazard', hazard)
        .in('health_condition', queryNames)
        .order('priority', { ascending: true })
        .limit(totalLimit);

      if (error) {
        const local = getLocalSafetyTips({
          healthConditions: params.healthConditions,
          healthCondition: params.healthCondition,
          weatherHazard: hazard,
          limit: totalLimit,
        });
        if (local.length > 0) {
          return {
            status: 'success',
            data: local,
            message: `Using on-device tips (${error.message}).`,
          };
        }
        const hint = error.message.includes('v_personalized_safety_tips')
          ? ' Run initify_supabase_health_safety_kb.sql in Supabase.'
          : '';
        return {
          status: 'error',
          data: null,
          message: `${error.message}${hint}`,
        };
      }

      let tips: PersonalizedSafetyTip[] = (data ?? []).map((row) => ({
        tipId: row.tip_id as number,
        healthCondition: row.health_condition as string,
        weatherHazard: row.weather_hazard as string,
        title: row.title as string,
        safetyTip: row.safety_tip as string,
        warningSigns: row.warning_signs as string,
        emergencyAdvice: row.emergency_advice as string,
        priority: row.priority as number,
      }));

      if (tips.length === 0) {
        tips = getLocalSafetyTips({
          healthConditions: params.healthConditions,
          healthCondition: params.healthCondition,
          weatherHazard: hazard,
          limit: totalLimit,
        });
      }

      return {
        status: 'success',
        data: tips,
        message:
          tips.length > 0
            ? `Loaded ${tips.length} safety tip(s) for ${hazard}.`
            : `No tips found for ${hazard}.`,
      };
    } catch (err) {
      const local = getLocalSafetyTips({
        healthConditions: params.healthConditions,
        healthCondition: params.healthCondition,
        weatherHazard: hazard,
        limit: totalLimit,
      });
      return {
        status: local.length > 0 ? 'success' : 'error',
        data: local.length > 0 ? local : null,
        message:
          local.length > 0
            ? 'Loaded on-device safety tips.'
            : err instanceof Error
              ? err.message
              : 'Failed to load safety tips.',
      };
    }
  },
};
