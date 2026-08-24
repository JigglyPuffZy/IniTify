import type { HeatRiskLevel } from '@/src/models/risk';
import { riskAssessmentConfig } from '@/src/config/risk-assessment.config';
import {
  evaluateHealthVulnerability,
  isCardiovascularCondition,
} from '@/src/constants/health-vulnerability';
import type { DecisionTreeInput } from './decision-tree.types';

const LEVEL_ORDER: HeatRiskLevel[] = ['LOW', 'MODERATE', 'HIGH', 'EXTREME'];

const NO_HEALTH_RISK = new Set([
  'none',
  'n/a',
  'no condition',
  'healthy',
  '',
]);

export interface NormalizedHeatRiskInput {
  heatIndex: number;
  humidityPercent: number | null;
  age: number;
  healthCondition: string;
  healthConditions: string[];
  activityLevel: 'Low' | 'Moderate' | 'High';
  hydrationStatus: 'Well hydrated' | 'Moderately hydrated' | 'Dehydrated';
  generalStatus: 'Feeling Well' | 'Mild Discomfort' | 'Not Feeling Well';
}

export interface HeatRiskAssessment {
  level: HeatRiskLevel;
  riskScore: number;
  environmentalLevel: HeatRiskLevel;
  vulnerabilityScore: number;
  primaryRiskFactors: string[];
  reason: string;
  recommendedAction: string;
}

export function hasHealthRisk(healthCondition: string | null | undefined): boolean {
  if (!healthCondition) return false;
  return !NO_HEALTH_RISK.has(healthCondition.trim().toLowerCase());
}

function levelIndex(level: HeatRiskLevel): number {
  return LEVEL_ORDER.indexOf(level);
}

function indexToLevel(index: number): HeatRiskLevel {
  return LEVEL_ORDER[Math.min(Math.max(index, 0), LEVEL_ORDER.length - 1)];
}

function maxLevel(a: HeatRiskLevel, b: HeatRiskLevel): HeatRiskLevel {
  return indexToLevel(Math.max(levelIndex(a), levelIndex(b)));
}

function normalizeHydration(value: string | null | undefined): NormalizedHeatRiskInput['hydrationStatus'] {
  const v = (value ?? '').toLowerCase();
  if (v.includes('dehydrat')) return 'Dehydrated';
  if (v.includes('need') || v.includes('moderate')) return 'Moderately hydrated';
  return 'Well hydrated';
}

function normalizeActivity(value: string | null | undefined): NormalizedHeatRiskInput['activityLevel'] {
  const v = (value ?? '').toLowerCase();
  if (v.includes('high')) return 'High';
  if (v.includes('moderate') || v.includes('medium')) return 'Moderate';
  return 'Low';
}

function normalizeGeneralStatus(
  value: string | null | undefined,
): NormalizedHeatRiskInput['generalStatus'] {
  const v = (value ?? '').toLowerCase();
  if (v.includes('not feeling') || v.includes('unwell') || v.includes('sick')) {
    return 'Not Feeling Well';
  }
  if (v.includes('mild') || v.includes('discomfort')) return 'Mild Discomfort';
  return 'Feeling Well';
}

/** Map app profile labels → normalized decision-tree input */
export function normalizeHeatRiskInput(
  input: DecisionTreeInput & { generalStatus?: string | null },
): NormalizedHeatRiskInput | null {
  if (input.heatIndex === null || input.age === null) return null;
  if (!input.activityLevel || !input.hydrationStatus) return null;

  const rawHealth = input.healthCondition?.trim();
  const healthCondition = rawHealth && rawHealth.length > 0 ? rawHealth : 'None';
  const healthConditions =
    input.healthConditions?.length && !(input.healthConditions.length === 1 && input.healthConditions[0] === 'None')
      ? input.healthConditions
      : healthCondition !== 'None'
        ? [healthCondition]
        : [];

  return {
    heatIndex: input.heatIndex,
    humidityPercent: input.humidityPercent ?? null,
    age: input.age,
    healthCondition,
    healthConditions,
    activityLevel: normalizeActivity(input.activityLevel),
    hydrationStatus: normalizeHydration(input.hydrationStatus),
    generalStatus: normalizeGeneralStatus(input.generalStatus),
  };
}

/** Step 1 — environmental baseline from heat index (PAGASA bands), optionally adjusted for humidity. */
export function assessEnvironmentalRisk(
  heatIndex: number,
  humidityPercent: number | null = null,
): { level: HeatRiskLevel; label: string; factors: string[] } {
  const { environmental } = riskAssessmentConfig;
  const band = environmental.heatIndexBands.find((b) => heatIndex < b.maxExclusive);
  const baseLevel = band?.level ?? 'EXTREME';
  const baseLabel = band?.label ?? 'Danger';
  const factors: string[] = [
    `Heat index ${Math.round(heatIndex)}°C (${baseLabel} band)`,
  ];

  let level = baseLevel;

  if (
    environmental.humidity.enabled &&
    humidityPercent !== null &&
    humidityPercent >= environmental.humidity.highThresholdPercent &&
    levelIndex(level) <= levelIndex(environmental.humidity.bumpWhenEnvironmentalAtMost)
  ) {
    level = indexToLevel(levelIndex(level) + 1);
    factors.push(`High humidity (${Math.round(humidityPercent)}%) increases heat stress`);
  }

  return { level, label: baseLabel, factors };
}

/** Step 2 — personal vulnerability score and contributing factors. */
export function assessPersonalVulnerability(input: NormalizedHeatRiskInput): {
  score: number;
  factors: string[];
  health: ReturnType<typeof evaluateHealthVulnerability>;
} {
  const { vulnerability } = riskAssessmentConfig;
  const factors: string[] = [];
  let score = 0;

  const health = evaluateHealthVulnerability({
    healthConditions: input.healthConditions,
    healthCondition: input.healthCondition,
    additionalConditionPoints: vulnerability.additionalConditionPoints,
  });
  if (health.score > 0) {
    score += health.score;
    if (health.activeLabels.length === 1) {
      factors.push(`Health condition: ${health.activeLabels[0]}`);
    } else {
      factors.push(`Health conditions: ${health.activeLabels.join(', ')}`);
    }
  }

  if (input.age <= vulnerability.age.childMaxAge) {
    score += vulnerability.age.childPoints;
    factors.push(`Young age (${input.age} years)`);
  } else if (input.age >= vulnerability.age.elderlyMinAge) {
    score += vulnerability.age.elderlyPoints;
    factors.push(`Older age (${input.age} years)`);
  }

  const activityPoints = vulnerability.activity[input.activityLevel];
  if (activityPoints > 0) {
    score += activityPoints;
    factors.push(`${input.activityLevel} physical activity`);
  }

  const hydrationPoints = vulnerability.hydration[input.hydrationStatus];
  if (hydrationPoints > 0) {
    score += hydrationPoints;
    factors.push(`${input.hydrationStatus.toLowerCase()}`);
  }

  const statusPoints = vulnerability.generalStatus[input.generalStatus];
  if (statusPoints > 0) {
    score += statusPoints;
    factors.push(input.generalStatus.toLowerCase());
  }

  return { score, factors, health };
}

/** Step 3 — combine environmental baseline with vulnerability modifiers. */
export function combineRiskAssessment(params: {
  environmentalLevel: HeatRiskLevel;
  environmentalFactors: string[];
  vulnerabilityScore: number;
  vulnerabilityFactors: string[];
  input: NormalizedHeatRiskInput;
  healthMaxSeverity: number;
}): HeatRiskLevel {
  const { environmentalLevel, vulnerabilityScore, input, healthMaxSeverity } = params;
  const { combine, criticalOverrides } = riskAssessmentConfig;

  let finalIndex = levelIndex(environmentalLevel);
  const thresholds = combine[environmentalLevel];

  if (thresholds.EXTREME !== undefined && vulnerabilityScore >= thresholds.EXTREME) {
    finalIndex = Math.max(finalIndex, levelIndex('EXTREME'));
  }
  if (thresholds.HIGH !== undefined && vulnerabilityScore >= thresholds.HIGH) {
    finalIndex = Math.max(finalIndex, levelIndex('HIGH'));
  }
  if (thresholds.MODERATE !== undefined && vulnerabilityScore >= thresholds.MODERATE) {
    finalIndex = Math.max(finalIndex, levelIndex('MODERATE'));
  }

  const envAtLeast = (min: HeatRiskLevel) => levelIndex(environmentalLevel) >= levelIndex(min);

  if (
    input.hydrationStatus === 'Dehydrated' &&
    envAtLeast(criticalOverrides.dehydratedMinEnvironmental)
  ) {
    finalIndex = levelIndex('EXTREME');
  }

  if (
    input.activityLevel === 'High' &&
    healthMaxSeverity >= criticalOverrides.minHealthSeverityForActivityOverride &&
    envAtLeast(criticalOverrides.highActivityWithHealthMinEnvironmental)
  ) {
    finalIndex = levelIndex('EXTREME');
  }

  if (
    input.age >= riskAssessmentConfig.vulnerability.age.elderlyMinAge &&
    healthMaxSeverity >= criticalOverrides.minHealthSeverityForAgeOverride &&
    envAtLeast(criticalOverrides.elderlyWithHealthMinEnvironmental)
  ) {
    finalIndex = levelIndex('EXTREME');
  }

  if (
    input.generalStatus === 'Not Feeling Well' &&
    envAtLeast(criticalOverrides.notFeelingWellMinEnvironmental)
  ) {
    finalIndex = levelIndex('EXTREME');
  }

  return indexToLevel(finalIndex);
}

function buildRiskScore(finalLevel: HeatRiskLevel, vulnerabilityScore: number): number {
  const levelComponent = (levelIndex(finalLevel) / (LEVEL_ORDER.length - 1)) * 65;
  const vulnComponent = Math.min(vulnerabilityScore, 15) / 15 * 35;
  return Math.round(Math.min(100, levelComponent + vulnComponent));
}

function buildReason(params: {
  finalLevel: HeatRiskLevel;
  environmentalLevel: HeatRiskLevel;
  environmentalFactors: string[];
  vulnerabilityFactors: string[];
}): string {
  const { finalLevel, environmentalLevel, environmentalFactors, vulnerabilityFactors } = params;
  const envPhrase =
    environmentalLevel === 'LOW'
      ? 'Current environmental conditions are low risk'
      : environmentalLevel === 'MODERATE'
        ? 'Current heat conditions are moderate'
        : environmentalLevel === 'HIGH'
          ? 'Current heat conditions are high'
          : 'Current heat conditions are extreme';

  if (vulnerabilityFactors.length === 0) {
    return `Risk level: ${finalLevel}. ${envPhrase}, and no significant personal heat-risk factors were identified.`;
  }

  const personal = vulnerabilityFactors.slice(0, 3).join('; ');
  const extra =
    vulnerabilityFactors.length > 3
      ? ` (+${vulnerabilityFactors.length - 3} more factor${vulnerabilityFactors.length - 3 > 1 ? 's' : ''})`
      : '';

  if (levelIndex(finalLevel) > levelIndex(environmentalLevel)) {
    return `Risk level: ${finalLevel}. ${envPhrase}, but your personal vulnerability (${personal}${extra}) increases your overall heat-related health risk.`;
  }

  return `Risk level: ${finalLevel}. ${envPhrase}. Contributing factors: ${personal}${extra}. Environmental context: ${environmentalFactors.join('; ')}.`;
}

function buildRecommendedAction(level: HeatRiskLevel, vulnerabilityFactors: string[]): string {
  let action = riskAssessmentConfig.recommendations[level];
  const hasCardio = vulnerabilityFactors.some((f) =>
    isCardiovascularCondition(f),
  );
  if (hasCardio && levelIndex(level) >= levelIndex('MODERATE')) {
    action += ' Monitor blood pressure and avoid sudden heat exposure if you have cardiovascular conditions.';
  }
  return action;
}

/**
 * Full vulnerability-aware heat risk assessment.
 * Environmental heat index + personal modifiers — never temperature alone.
 */
export function assessHeatRisk(
  input: DecisionTreeInput & { generalStatus?: string | null },
): HeatRiskAssessment | null {
  const normalized = normalizeHeatRiskInput(input);
  if (!normalized) return null;

  const environmental = assessEnvironmentalRisk(
    normalized.heatIndex,
    normalized.humidityPercent,
  );
  const vulnerability = assessPersonalVulnerability(normalized);

  const level = combineRiskAssessment({
    environmentalLevel: environmental.level,
    environmentalFactors: environmental.factors,
    vulnerabilityScore: vulnerability.score,
    vulnerabilityFactors: vulnerability.factors,
    input: normalized,
    healthMaxSeverity: vulnerability.health.maxSeverity,
  });

  const primaryRiskFactors = [...environmental.factors, ...vulnerability.factors];
  const riskScore = buildRiskScore(level, vulnerability.score);

  return {
    level,
    riskScore,
    environmentalLevel: environmental.level,
    vulnerabilityScore: vulnerability.score,
    primaryRiskFactors,
    reason: buildReason({
      finalLevel: level,
      environmentalLevel: environmental.level,
      environmentalFactors: environmental.factors,
      vulnerabilityFactors: vulnerability.factors,
    }),
    recommendedAction: buildRecommendedAction(level, vulnerability.factors),
  };
}

/** @deprecated Use assessHeatRisk for full output; returns level only for compatibility. */
export function classifyHeatRisk(
  input: DecisionTreeInput & { generalStatus?: string | null },
): HeatRiskLevel | null {
  return assessHeatRisk(input)?.level ?? null;
}

/** Legacy helper — counts discrete boolean factors. */
export function countRiskFactors(input: NormalizedHeatRiskInput): number {
  let factors = 0;
  if (input.age >= 60) factors += 1;
  if (hasHealthRisk(input.healthCondition)) factors += 1;
  if (input.activityLevel === 'High') factors += 1;
  if (input.hydrationStatus === 'Dehydrated') factors += 1;
  if (input.generalStatus === 'Mild Discomfort') factors += 1;
  if (input.generalStatus === 'Not Feeling Well') factors += 1;
  return factors;
}
