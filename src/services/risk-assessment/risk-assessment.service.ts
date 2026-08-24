import type { UserRiskFactors } from '@/src/models/user';
import type { HeatIndexReading } from '@/src/models/environmental';
import type { CurrentWeatherSnapshot } from '@/src/models/weather';
import type { UserLocation } from '@/src/models/location';
import type { RiskAssessmentResult } from '@/src/models/risk';
import { RISK_LEVEL_LABELS } from '@/src/constants/risk-levels';
import { decisionTreeService } from '@/src/services/decision-tree/decision-tree.service';
import { isUserProfileComplete } from '@/src/utils/validation';
import { primaryHealthCondition } from '@/src/constants/health-conditions';

/** Map app profile labels → decision tree training labels */
function mapRiskFactorsForTree(riskFactors: UserRiskFactors): UserRiskFactors {
  const hydration = riskFactors.hydrationStatus;
  let hydrationForTree = hydration;
  if (hydration === 'Dehydrated / Concerning' || hydration === 'Dehydrated') {
    hydrationForTree = 'Dehydrated';
  } else if (hydration === 'Well Hydrated') {
    hydrationForTree = 'Well hydrated';
  } else if (hydration === 'Needs Hydration' || hydration === 'Moderately hydrated') {
    hydrationForTree = 'Moderately hydrated';
  }

  const healthConditions =
    riskFactors.healthConditions?.length > 0
      ? riskFactors.healthConditions
      : riskFactors.healthCondition
        ? [riskFactors.healthCondition]
        : ['None'];

  return {
    ...riskFactors,
    healthConditions,
    healthCondition: primaryHealthCondition(healthConditions),
    hydrationStatus: hydrationForTree,
  };
}

/**
 * Orchestrates environmental + user + location inputs through the vulnerability-aware decision tree.
 */
export const riskAssessmentService = {
  assess(params: {
    heatReading: HeatIndexReading | null;
    currentWeather?: CurrentWeatherSnapshot | null;
    riskFactors: UserRiskFactors;
    location: UserLocation | null;
  }): RiskAssessmentResult {
    const treeFactors = mapRiskFactorsForTree(params.riskFactors);
    const inputs = {
      heatIndex: params.heatReading?.heatIndex ?? null,
      humidityPercent: params.currentWeather?.humidity ?? null,
      age: treeFactors.age,
      healthCondition: treeFactors.healthCondition,
      healthConditions: treeFactors.healthConditions,
      activityLevel: treeFactors.activityLevel,
      hydrationStatus: treeFactors.hydrationStatus,
      generalStatus: treeFactors.generalStatus,
      latitude: params.location?.latitude ?? null,
      longitude: params.location?.longitude ?? null,
    };

    if (!isUserProfileComplete(treeFactors)) {
      return {
        level: null,
        assessedAt: new Date().toISOString(),
        inputs,
        source: 'unavailable',
        message: 'Complete all user risk factors before assessment.',
      };
    }

    if (params.heatReading === null) {
      return {
        level: null,
        assessedAt: new Date().toISOString(),
        inputs,
        source: 'unavailable',
        message: 'Heat index data is unavailable. Assessment cannot proceed.',
      };
    }

    const treeResult = decisionTreeService.evaluate(inputs);
    if (treeResult.status !== 'success' || !treeResult.data) {
      return {
        level: null,
        assessedAt: new Date().toISOString(),
        inputs,
        source: 'unavailable',
        message: treeResult.message,
      };
    }

    const data = treeResult.data;

    return {
      level: data.level,
      assessedAt: data.evaluatedAt,
      inputs,
      source: 'decision-tree',
      message: `Your current heat risk level is ${RISK_LEVEL_LABELS[data.level]}.`,
      riskScore: data.riskScore,
      environmentalLevel: data.environmentalLevel,
      vulnerabilityScore: data.vulnerabilityScore,
      primaryRiskFactors: data.primaryRiskFactors,
      reason: data.reason,
      recommendedAction: data.recommendedAction,
    };
  },
};
