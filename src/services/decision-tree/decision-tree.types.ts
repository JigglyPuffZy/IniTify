import type { HeatRiskLevel } from '@/src/models/risk';

export type DecisionTreeFeature =
  | 'heatIndex'
  | 'age'
  | 'healthCondition'
  | 'activityLevel'
  | 'hydrationStatus';

export type DecisionTreeOperator =
  | '>'
  | '>='
  | '<'
  | '<='
  | '=='
  | '!='
  | 'in'
  | 'not_in';

export interface DecisionTreeLeafNode {
  type: 'leaf';
  level: HeatRiskLevel;
}

export interface DecisionTreeSplitNode {
  type: 'split';
  feature: DecisionTreeFeature;
  operator: DecisionTreeOperator;
  value: number | string | (number | string)[];
  true: DecisionTreeNode;
  false: DecisionTreeNode;
}

export type DecisionTreeNode = DecisionTreeLeafNode | DecisionTreeSplitNode;

export interface DecisionTreeRulesDocument {
  /** Must be true to activate — prevents accidental use of template rules */
  enabled: boolean;
  version: string;
  description?: string;
  /** Source reference (e.g. research document section) */
  source?: string;
  root: DecisionTreeNode;
}

export interface DecisionTreeInput {
  heatIndex: number | null;
  age: number | null;
  healthCondition: string | null;
  activityLevel: string | null;
  hydrationStatus: string | null;
}
