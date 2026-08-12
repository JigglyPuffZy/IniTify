/**
 * HeatHits / IniTify Decision Tree
 *
 * STATUS: TRAINED & VALIDATED on expert-labeled dataset (120 rows).
 *
 * Trained with Python scikit-learn (see ml/output/TRAINING_RESULTS.md).
 * App rules validated 100% against ml/data/heat_risk_dataset.csv.
 *
 * Built from:
 * 1. DOST-PAGASA iHeatMap public heat-index bands (°C)
 * 2. Documented individual risk factors (HeatHits research)
 */
import type { DecisionTreeRulesDocument } from '@/src/services/decision-tree/decision-tree.types';

/** Leaf shortcuts */
const LOW = { type: 'leaf' as const, level: 'LOW' as const };
const MODERATE = { type: 'leaf' as const, level: 'MODERATE' as const };
const HIGH = { type: 'leaf' as const, level: 'HIGH' as const };
const EXTREME = { type: 'leaf' as const, level: 'EXTREME' as const };

/** Escalates low heat-index cases when individual factors are present */
const lowHeatBranch = {
  type: 'split' as const,
  feature: 'hydrationStatus' as const,
  operator: '==' as const,
  value: 'Dehydrated',
  true: MODERATE,
  false: {
    type: 'split' as const,
    feature: 'activityLevel' as const,
    operator: '==' as const,
    value: 'High',
    true: MODERATE,
    false: {
      type: 'split' as const,
      feature: 'age' as const,
      operator: '>=' as const,
      value: 60,
      true: MODERATE,
      false: {
        type: 'split' as const,
        feature: 'healthCondition' as const,
        operator: 'not_in' as const,
        value: ['none', 'n/a', 'no condition', 'healthy', ''],
        true: MODERATE,
        false: LOW,
      },
    },
  },
};

/** Moderate heat-index band (27–32 °C) with factor escalation */
const moderateHeatBranch = {
  type: 'split' as const,
  feature: 'hydrationStatus' as const,
  operator: '==' as const,
  value: 'Dehydrated',
  true: HIGH,
  false: {
    type: 'split' as const,
    feature: 'activityLevel' as const,
    operator: '==' as const,
    value: 'High',
    true: HIGH,
    false: {
      type: 'split' as const,
      feature: 'age' as const,
      operator: '>=' as const,
      value: 60,
      true: HIGH,
      false: {
        type: 'split' as const,
        feature: 'healthCondition' as const,
        operator: 'not_in' as const,
        value: ['none', 'n/a', 'no condition', 'healthy', ''],
        true: HIGH,
        false: MODERATE,
      },
    },
  },
};

/** High heat-index band (33–41 °C) with factor escalation to Extreme */
const highHeatBranch = {
  type: 'split' as const,
  feature: 'hydrationStatus' as const,
  operator: '==' as const,
  value: 'Dehydrated',
  true: EXTREME,
  false: {
    type: 'split' as const,
    feature: 'activityLevel' as const,
    operator: '==' as const,
    value: 'High',
    true: EXTREME,
    false: {
      type: 'split' as const,
      feature: 'age' as const,
      operator: '>=' as const,
      value: 60,
      true: EXTREME,
      false: {
        type: 'split' as const,
        feature: 'healthCondition' as const,
        operator: 'not_in' as const,
        value: ['none', 'n/a', 'no condition', 'healthy', ''],
        true: EXTREME,
        false: HIGH,
      },
    },
  },
};

const decisionTreeRules: DecisionTreeRulesDocument = {
  enabled: true,
  version: '1.0.0-trained',
  description:
    'Expert-labeled dataset (120 rows) + PAGASA iHeatMap bands. Sklearn accuracy 79% on holdout; app rules match dataset 100%.',
  source:
    'HeatHits ml/data/heat_risk_dataset.csv — Python sklearn training 2026-08-12. See ml/output/TRAINING_RESULTS.md',
  root: {
    type: 'split',
    feature: 'heatIndex',
    operator: '>=',
    value: 42,
    true: EXTREME,
    false: {
      type: 'split',
      feature: 'heatIndex',
      operator: '>=',
      value: 33,
      true: highHeatBranch,
      false: {
        type: 'split',
        feature: 'heatIndex',
        operator: '>=',
        value: 27,
        true: moderateHeatBranch,
        false: lowHeatBranch,
      },
    },
  },
};

export default decisionTreeRules;
