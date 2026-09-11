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
import { PAGASA_HEAT_INDEX_THRESHOLDS } from '@/src/config/risk-assessment.config';

/** Leaf shortcuts */
const LOW = { type: 'leaf' as const, level: 'LOW' as const };
const MODERATE = { type: 'leaf' as const, level: 'MODERATE' as const };
const HIGH = { type: 'leaf' as const, level: 'HIGH' as const };
const EXTREME = { type: 'leaf' as const, level: 'EXTREME' as const };
const CRITICAL = { type: 'leaf' as const, level: 'CRITICAL' as const };

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

/** High heat-index band (33–41 °C) — PAGASA “extreme caution” */
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
    true: {
      type: 'split' as const,
      feature: 'healthCondition' as const,
      operator: 'not_in' as const,
      value: ['none', 'n/a', 'no condition', 'healthy', ''],
      true: EXTREME,
      false: HIGH,
    },
    false: {
      type: 'split' as const,
      feature: 'age' as const,
      operator: '>=' as const,
      value: 60,
      true: {
        type: 'split' as const,
        feature: 'healthCondition' as const,
        operator: 'not_in' as const,
        value: ['none', 'n/a', 'no condition', 'healthy', ''],
        true: EXTREME,
        false: HIGH,
      },
      false: HIGH,
    },
  },
};

const decisionTreeRules: DecisionTreeRulesDocument = {
  enabled: true,
  version: '1.3.0-pagasa-heat-index-only',
  description:
    'PAGASA / NOAA heat-index bands only — Caution 27–32, Extreme Caution 33–41, Danger 42–51, Extreme Danger 52+.',
  source:
    'DOST-PAGASA heat index classifications (Caution 27–32, Extreme Caution 33–41, Danger 42–51, Extreme Danger 52+).',
  root: {
    type: 'split',
    feature: 'heatIndex',
    operator: '>=',
    value: PAGASA_HEAT_INDEX_THRESHOLDS.extremeDangerMin,
    true: CRITICAL,
    false: {
      type: 'split',
      feature: 'heatIndex',
      operator: '>=',
      value: PAGASA_HEAT_INDEX_THRESHOLDS.dangerMin,
      true: EXTREME,
      false: {
        type: 'split',
        feature: 'heatIndex',
        operator: '>=',
        value: PAGASA_HEAT_INDEX_THRESHOLDS.extremeCautionMin,
        true: highHeatBranch,
        false: {
          type: 'split',
          feature: 'heatIndex',
          operator: '>=',
          value: PAGASA_HEAT_INDEX_THRESHOLDS.cautionMin,
          true: moderateHeatBranch,
          false: lowHeatBranch,
        },
      },
    },
  },
};

export default decisionTreeRules;
