import decisionTreeRules from '@/src/config/decision-tree.rules';
import type { RiskAssessmentInput } from '@/src/models/risk';
import type { ServiceResult } from '@/src/models/service-result';
import type { HeatRiskLevel } from '@/src/models/risk';
import {
  evaluateDecisionTree,
  validateRulesDocument,
} from './decision-tree.engine';

export interface DecisionTreeOutput {
  level: HeatRiskLevel;
  evaluatedAt: string;
  rulesVersion: string;
  rulesSource?: string;
}

/**
 * Decision Tree AI module — evaluates rules from research documentation.
 * Does NOT use arbitrary if/else logic when rules are disabled or missing.
 */
export const decisionTreeService = {
  isModelAvailable(): boolean {
    return validateRulesDocument(decisionTreeRules) && decisionTreeRules.enabled;
  },

  getRulesStatus(): {
    enabled: boolean;
    version: string;
    source?: string;
    message: string;
  } {
    if (!validateRulesDocument(decisionTreeRules)) {
      return {
        enabled: false,
        version: 'unknown',
        message: 'Decision Tree rules document is invalid.',
      };
    }
    if (!decisionTreeRules.enabled) {
      return {
        enabled: false,
        version: decisionTreeRules.version,
        source: decisionTreeRules.source,
        message:
          'Decision Tree rules are disabled. Copy your research rules into src/config/decision-tree.rules.ts and set enabled: true.',
      };
    }
    return {
      enabled: true,
      version: decisionTreeRules.version,
      source: decisionTreeRules.source,
      message: 'Decision Tree rules loaded and active.',
    };
  },

  evaluate(input: RiskAssessmentInput): ServiceResult<DecisionTreeOutput> {
    const status = this.getRulesStatus();
    if (!status.enabled) {
      return {
        status: 'unavailable',
        data: null,
        message: status.message,
      };
    }

    const missing: string[] = [];
    if (input.heatIndex === null) missing.push('heatIndex');
    if (input.age === null) missing.push('age');
    if (!input.healthCondition) missing.push('healthCondition');
    if (!input.activityLevel) missing.push('activityLevel');
    if (!input.hydrationStatus) missing.push('hydrationStatus');

    if (missing.length > 0) {
      return {
        status: 'invalid_input',
        data: null,
        message: `Decision Tree missing inputs: ${missing.join(', ')}.`,
      };
    }

    const result = evaluateDecisionTree(decisionTreeRules, {
      heatIndex: input.heatIndex,
      age: input.age,
      healthCondition: input.healthCondition,
      activityLevel: input.activityLevel,
      hydrationStatus: input.hydrationStatus,
    });

    if (result.error || !result.level) {
      return {
        status: 'error',
        data: null,
        message: result.error ?? 'Decision Tree evaluation failed.',
      };
    }

    return {
      status: 'success',
      data: {
        level: result.level,
        evaluatedAt: new Date().toISOString(),
        rulesVersion: decisionTreeRules.version,
        rulesSource: decisionTreeRules.source,
      },
      message: 'Decision Tree evaluation complete.',
    };
  },
};
