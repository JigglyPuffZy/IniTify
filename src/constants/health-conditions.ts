/** Matches docs/database/initify_supabase_health_safety_kb.sql seed names */
export const HEALTH_CONDITION_OPTIONS = [
  'Hypertension / High Blood Pressure',
  'Heart Disease',
  'Asthma',
  'Diabetes',
  'Chronic Respiratory Disease',
  'Kidney Disease',
  'Heat Sensitivity',
  'Cold Sensitivity',
  'Other',
  'None',
] as const;

export type HealthConditionOption = (typeof HEALTH_CONDITION_OPTIONS)[number];

export const OTHER_CONDITION_PREFIX = 'Other — ';

export function isOtherConditionDetail(condition: string): boolean {
  return condition.startsWith(OTHER_CONDITION_PREFIX);
}

export function parseOtherConditionDetail(condition: string): string {
  return isOtherConditionDetail(condition)
    ? condition.slice(OTHER_CONDITION_PREFIX.length).trim()
    : '';
}

export function buildOtherConditionDetail(text: string): string {
  return `${OTHER_CONDITION_PREFIX}${text.trim()}`;
}

/** Split stored profile values into chip selections + free-text "Other" detail */
export function splitHealthConditionsForForm(conditions: string[]): {
  chips: string[];
  otherDetail: string;
} {
  let otherDetail = '';
  const chips: string[] = [];

  for (const condition of conditions) {
    if (isOtherConditionDetail(condition)) {
      otherDetail = parseOtherConditionDetail(condition);
      if (!chips.includes('Other')) chips.push('Other');
    } else {
      chips.push(condition);
    }
  }

  return { chips: chips.length ? chips : ['None'], otherDetail };
}

/** Merge chip selections and optional "Other" text for profile storage */
export function finalizeHealthConditions(chips: string[], otherDetail: string): string[] {
  if (chips.includes('None') && !chips.includes('Other')) {
    return ['None'];
  }

  const next = chips.filter((c) => c !== 'None' && c !== 'Other');

  if (chips.includes('Other')) {
    const trimmed = otherDetail.trim();
    if (trimmed) next.push(buildOtherConditionDetail(trimmed));
    else next.push('Other');
  }

  return next.length ? next : ['None'];
}

export function primaryHealthCondition(conditions: string[]): string {
  if (!conditions.length || conditions.includes('None')) return 'None';
  const first = conditions.find((c) => c !== 'None');
  if (!first) return 'None';
  if (isOtherConditionDetail(first)) return parseOtherConditionDetail(first);
  return first;
}

/** Active conditions from profile (multi-select + legacy single field). */
export function getActiveHealthConditions(
  healthConditions: string[] | undefined,
  healthCondition: string | null | undefined,
): string[] {
  const list =
    healthConditions?.length && !(healthConditions.length === 1 && healthConditions[0] === 'None')
      ? healthConditions
      : healthCondition && healthCondition !== 'None'
        ? [healthCondition]
        : [];
  return list.filter((c) => c && c !== 'None');
}

/** Human-readable label for UI (e.g. "Other — COPD" → "COPD"). */
export function formatConditionLabel(condition: string): string {
  if (isOtherConditionDetail(condition)) return parseOtherConditionDetail(condition);
  if (condition === 'Other') return 'Other condition';
  return condition;
}

/** Map app label → KB table name where they differ */
export function toKbHealthConditionName(condition: string): string {
  if (condition === 'Other' || isOtherConditionDetail(condition)) {
    return 'General / No Known Condition';
  }
  if (condition === 'None') return 'General / No Known Condition';
  if (condition === 'Chronic Respiratory Disease') return 'Chronic Respiratory Disease';
  return condition;
}
