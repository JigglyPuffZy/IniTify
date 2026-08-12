import type { UserRiskFactors } from '@/src/models/user';
import type { HeatIndexReading } from '@/src/models/environmental';
import type { UserLocation } from '@/src/models/location';
import type { RiskAssessmentResult } from '@/src/models/risk';
import { decisionTreeService } from '@/src/services/decision-tree/decision-tree.service';
import { isUserProfileComplete } from '@/src/utils/validation';

/**
 * Orchestrates environmental + user + location inputs through Decision Tree.
 */
export const riskAssessmentService = {
  assess(params: {
    heatReading: HeatIndexReading | null;
    riskFactors: UserRiskFactors;
    location: UserLocation | null;
  }): RiskAssessmentResult {
    const inputs = {
      heatIndex: params.heatReading?.heatIndex ?? null,
      age: params.riskFactors.age,
      healthCondition: params.riskFactors.healthCondition,
      activityLevel: params.riskFactors.activityLevel,
      hydrationStatus: params.riskFactors.hydrationStatus,
      latitude: params.location?.latitude ?? null,
      longitude: params.location?.longitude ?? null,
    };

    if (!isUserProfileComplete(params.riskFactors)) {
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

    return {
      level: treeResult.data.level,
      assessedAt: treeResult.data.evaluatedAt,
      inputs,
      source: 'decision-tree',
    };
  },
};
