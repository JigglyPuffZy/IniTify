import { primaryHealthCondition } from '@/src/constants/health-conditions';
import { formatHeatIndexAssessmentLine } from '@/src/constants/risk-levels';
import type { HeatIndexReading } from '@/src/models/environmental';
import type { UserLocation } from '@/src/models/location';
import type { RiskAssessmentResult } from '@/src/models/risk';
import type { UserRiskFactors } from '@/src/models/user';
import type { CurrentWeatherSnapshot } from '@/src/models/weather';
import { decisionTreeService } from '@/src/services/decision-tree/decision-tree.service';

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
 * Orchestrates heat-index reading through PAGASA band classification.
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

    const heatIndex = params.heatReading.heatIndex;
    const summary = formatHeatIndexAssessmentLine(heatIndex, data.level);

    return {
      level: data.level,
      assessedAt: data.evaluatedAt,
      inputs,
      source: 'decision-tree',
      message: summary,
      riskScore: data.riskScore,
      environmentalLevel: data.environmentalLevel,
      vulnerabilityScore: data.vulnerabilityScore,
      primaryRiskFactors: data.primaryRiskFactors,
      reason: data.reason,
      recommendedAction: data.recommendedAction,
    };
  },
};
