import type { HeatRiskLevel } from '@/src/models/risk';
import type {
  DecisionTreeInput,
  DecisionTreeNode,
  DecisionTreeOperator,
  DecisionTreeRulesDocument,
} from './decision-tree.types';

function getFeatureValue(
  input: DecisionTreeInput,
  feature: import('./decision-tree.types').DecisionTreeFeature,
): number | string | null {
  switch (feature) {
    case 'heatIndex':
      return input.heatIndex;
    case 'age':
      return input.age;
    case 'healthCondition':
      return input.healthCondition;
    case 'activityLevel':
      return input.activityLevel;
    case 'hydrationStatus':
      return input.hydrationStatus;
    default:
      return null;
  }
}

function compare(
  operator: DecisionTreeOperator,
  actual: number | string | null,
  expected: number | string | (number | string)[],
): boolean {
  if (actual === null || actual === undefined) return false;

  if (operator === 'in' || operator === 'not_in') {
    const list = Array.isArray(expected) ? expected : [expected];
    const normalized = list.map((v) => String(v).toLowerCase());
    const match = normalized.includes(String(actual).toLowerCase());
    return operator === 'in' ? match : !match;
  }

  if (typeof expected === 'number' && typeof actual === 'string') {
    const parsed = Number.parseFloat(actual);
    if (!Number.isNaN(parsed)) return compare(operator, parsed, expected);
    return false;
  }

  if (typeof actual === 'number' && typeof expected === 'number') {
    switch (operator) {
      case '>':
        return actual > expected;
      case '>=':
        return actual >= expected;
      case '<':
        return actual < expected;
      case '<=':
        return actual <= expected;
      case '==':
        return actual === expected;
      case '!=':
        return actual !== expected;
      default:
        return false;
    }
  }

  const actualStr = String(actual).toLowerCase();
  const expectedStr = String(expected).toLowerCase();
  switch (operator) {
    case '==':
      return actualStr === expectedStr;
    case '!=':
      return actualStr !== expectedStr;
    default:
      return false;
  }
}

function walkTree(
  node: DecisionTreeNode,
  input: DecisionTreeInput,
): HeatRiskLevel | null {
  if (node.type === 'leaf') {
    return node.level;
  }

  const actual = getFeatureValue(input, node.feature);
  const branch = compare(node.operator, actual, node.value) ? node.true : node.false;
  return walkTree(branch, input);
}

export function evaluateDecisionTree(
  rules: DecisionTreeRulesDocument,
  input: DecisionTreeInput,
): { level: HeatRiskLevel | null; error: string | null } {
  if (!rules.enabled) {
    return {
      level: null,
      error:
        'Decision Tree rules are not enabled. Set enabled:true in decision-tree.rules.json with your research document rules.',
    };
  }

  if (!rules.root) {
    return { level: null, error: 'Decision Tree rules missing root node.' };
  }

  try {
    const level = walkTree(rules.root, input);
    if (!level) {
      return { level: null, error: 'Decision Tree did not resolve a risk level.' };
    }
    return { level, error: null };
  } catch {
    return { level: null, error: 'Decision Tree evaluation failed.' };
  }
}

export function validateRulesDocument(
  rules: unknown,
): rules is DecisionTreeRulesDocument {
  if (!rules || typeof rules !== 'object') return false;
  const doc = rules as DecisionTreeRulesDocument;
  return typeof doc.enabled === 'boolean' && doc.root?.type !== undefined;
}
