import type { HeatRiskLevel } from '@/src/models/risk';
import { riskAssessmentConfig } from '@/src/config/risk-assessment.config';
import {
  evaluateHealthVulnerability,
} from '@/src/constants/health-vulnerability';
import { RISK_LEVEL_LABELS, HEAT_INDEX_CLASSIFICATION_BANDS } from '@/src/constants/risk-levels';
import type { DecisionTreeInput } from './decision-tree.types';

const LEVEL_ORDER: HeatRiskLevel[] = ['LOW', 'MODERATE', 'HIGH', 'EXTREME', 'CRITICAL'];

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

/** Map app profile labels → normalized decision-tree input (heat index required). */
export function normalizeHeatRiskInput(
  input: DecisionTreeInput & { generalStatus?: string | null },
): NormalizedHeatRiskInput | null {
  if (input.heatIndex === null) return null;

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
    age: input.age ?? 25,
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
  const baseLevel = band?.level ?? 'CRITICAL';
  const baseLabel = band?.label ?? 'Extreme Danger';
  const factors: string[] = [
    `Heat index ${heatIndex.toFixed(1)}°C (${baseLabel} band)`,
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

  const hydrationImpact = hydrationImpactPoints(input.hydrationStatus, health.maxSeverity);
  if (hydrationImpact.points > 0) {
    score += hydrationImpact.points;
    factors.push(hydrationImpact.label);
  }

  return { score, factors, health };
}

/** True when profile shows no meaningful personal heat vulnerability. */
export function isOptimalHeatProfile(
  input: NormalizedHeatRiskInput,
  personal: { score: number; health: { activeLabels: string[] } },
): boolean {
  if (personal.score > 0 || personal.health.activeLabels.length > 0) return false;
  const { vulnerability } = riskAssessmentConfig;
  return (
    input.hydrationStatus === 'Well hydrated' &&
    input.activityLevel === 'Low' &&
    input.age > vulnerability.age.childMaxAge &&
    input.age < vulnerability.age.elderlyMinAge
  );
}

/**
 * Weight vulnerability by context — chronic conditions matter more as heat rises;
 * dehydration and feeling unwell always count.
 */
function environmentAdjustedVulnerabilityScore(
  rawScore: number,
  environmentalLevel: HeatRiskLevel,
  input: NormalizedHeatRiskInput,
): number {
  if (rawScore <= 0) return 0;

  const acute =
    (input.hydrationStatus === 'Dehydrated' ? 6 : 0) +
    (input.hydrationStatus === 'Moderately hydrated' ? 2 : 0) +
    (input.activityLevel === 'High' ? 2 : 0);

  const chronic = Math.max(0, rawScore - acute);

  if (levelIndex(environmentalLevel) >= levelIndex('HIGH')) {
    return rawScore;
  }

  if (environmentalLevel === 'LOW') {
    return acute + Math.min(chronic, 1);
  }

  // MODERATE (PAGASA caution band): chronic conditions add partial weight
  return acute + Math.round(chronic * 0.7);
}

/** Clinical personal risk — may be below PAGASA band when profile is strong; never below env in danger heat. */
function resolvePersonalClinicalLevel(params: {
  environmentalLevel: HeatRiskLevel;
  environmentalFactors: string[];
  vulnerabilityScore: number;
  vulnerabilityFactors: string[];
  input: NormalizedHeatRiskInput;
  healthMaxSeverity: number;
  optimalProfile: boolean;
}): HeatRiskLevel {
  const {
    environmentalLevel,
    vulnerabilityScore,
    vulnerabilityFactors,
    input,
    healthMaxSeverity,
    optimalProfile,
  } = params;

  const adjustedScore = environmentAdjustedVulnerabilityScore(
    vulnerabilityScore,
    environmentalLevel,
    input,
  );

  let level = combineRiskAssessment({
    environmentalLevel,
    environmentalFactors: params.environmentalFactors,
    vulnerabilityScore: adjustedScore,
    vulnerabilityFactors,
    input,
    healthMaxSeverity,
  });

  if (optimalProfile && environmentalLevel === 'MODERATE') {
    return 'LOW';
  }

  if (levelIndex(environmentalLevel) >= levelIndex('HIGH')) {
    return maxLevel(level, environmentalLevel);
  }

  if (environmentalLevel === 'MODERATE' && input.hydrationStatus !== 'Dehydrated') {
    level = indexToLevel(Math.min(levelIndex(level), levelIndex('HIGH')));
  }

  return level;
}

/** Step 3 — combine environmental baseline with vulnerability modifiers. */
function combineRiskAssessment(params: {
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

  if (thresholds.CRITICAL !== undefined && vulnerabilityScore >= thresholds.CRITICAL) {
    if (levelIndex(environmentalLevel) >= levelIndex('EXTREME')) {
      finalIndex = Math.max(finalIndex, levelIndex('CRITICAL'));
    }
  }
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
    finalIndex = Math.max(finalIndex, levelIndex('EXTREME'));
  }

  if (
    input.activityLevel === 'High' &&
    healthMaxSeverity >= criticalOverrides.minHealthSeverityForActivityOverride &&
    envAtLeast(criticalOverrides.highActivityWithHealthMinEnvironmental)
  ) {
    finalIndex = Math.max(finalIndex, levelIndex('EXTREME'));
  }

  if (
    input.age >= riskAssessmentConfig.vulnerability.age.elderlyMinAge &&
    healthMaxSeverity >= criticalOverrides.minHealthSeverityForAgeOverride &&
    envAtLeast(criticalOverrides.elderlyWithHealthMinEnvironmental)
  ) {
    finalIndex = Math.max(finalIndex, levelIndex('EXTREME'));
  }

  return indexToLevel(finalIndex);
}

function hydrationImpactPoints(
  hydration: NormalizedHeatRiskInput['hydrationStatus'],
  healthMaxSeverity: number,
): { points: number; label: string } {
  const { hydration: basePoints } = riskAssessmentConfig.vulnerability;
  const base = basePoints[hydration];

  if (hydration === 'Well hydrated') {
    return { points: 0, label: 'Well hydrated' };
  }

  const appLabel = hydration === 'Dehydrated' ? 'Dehydrated / concerning' : 'Needs hydration';

  let bonus = 0;
  if (healthMaxSeverity >= 4) {
    bonus = hydration === 'Dehydrated' ? 3 : 2;
  } else if (healthMaxSeverity >= 3) {
    bonus = hydration === 'Dehydrated' ? 2 : 1;
  }

  const points = base + bonus;
  const label =
    bonus > 0
      ? `${appLabel} — higher concern with your health condition(s)`
      : appLabel;

  return { points, label };
}

function buildRiskScore(finalLevel: HeatRiskLevel): number {
  return Math.round((levelIndex(finalLevel) / (LEVEL_ORDER.length - 1)) * 100);
}

function buildCombinedReason(params: {
  heatIndex: number;
  environmentalLevel: HeatRiskLevel;
  environmentalLabel: string;
  finalLevel: HeatRiskLevel;
  personalFactors: string[];
  optimalProfile: boolean;
}): string {
  const { heatIndex, environmentalLevel, environmentalLabel, finalLevel, personalFactors, optimalProfile } =
    params;
  const band = HEAT_INDEX_CLASSIFICATION_BANDS.find((b) => b.level === environmentalLevel);
  const range = band?.rangeLabel ?? environmentalLabel;
  const envLabel = RISK_LEVEL_LABELS[environmentalLevel];

  if (optimalProfile && environmentalLevel === 'MODERATE' && finalLevel === 'LOW') {
    return `${heatIndex.toFixed(1)}°C heat index — outdoor ${envLabel} (${range}). Well hydrated with no conditions; personal risk stays Low Risk.`;
  }

  const base = `${heatIndex.toFixed(1)}°C heat index — outdoor ${envLabel} (${range}).`;

  if (finalLevel === environmentalLevel) {
    if (personalFactors.length === 0) return `${base} Matches your outdoor heat level.`;
    return `${base} Factors: ${personalFactors.slice(0, 3).join('; ')}.`;
  }

  if (levelIndex(finalLevel) < levelIndex(environmentalLevel)) {
    return `${base} Your profile lowers personal risk to ${RISK_LEVEL_LABELS[finalLevel]} — follow heat precautions.`;
  }

  const yourLabel = RISK_LEVEL_LABELS[finalLevel];
  const personal = personalFactors.slice(0, 3).join('; ');
  return `${base} Personal risk: ${yourLabel} (${personal}).`;
}

function buildRecommendedAction(
  level: HeatRiskLevel,
  input?: NormalizedHeatRiskInput,
  health?: ReturnType<typeof evaluateHealthVulnerability>,
): string {
  let action = riskAssessmentConfig.recommendations[level];
  if (!input) return action;

  if (input.hydrationStatus === 'Dehydrated') {
    action +=
      ' You reported dehydration — drink water or ORS now, rest in shade/AC, and seek help if dizzy or confused.';
  } else if (input.hydrationStatus === 'Moderately hydrated') {
    action += health?.hasSignificantCondition
      ? ' With your health profile, drink ~250 ml now and every 30 min while it is hot.'
      : ' Drink ~250 ml water in the next 15–20 minutes.';
  } else if (health?.hasSignificantCondition && levelIndex(level) >= levelIndex('MODERATE')) {
    action += ' Keep sipping fluids regularly — your health profile needs extra hydration in heat.';
  }

  return action;
}

/**
 * Heat risk: PAGASA environmental band + personal adaptation (age, health, hydration, activity).
 * General status is collected for Tify check-ins only — not scored here.
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

  const personal = assessPersonalVulnerability(normalized);
  const optimalProfile = isOptimalHeatProfile(normalized, personal);

  const level = resolvePersonalClinicalLevel({
    environmentalLevel: environmental.level,
    environmentalFactors: environmental.factors,
    vulnerabilityScore: personal.score,
    vulnerabilityFactors: personal.factors,
    input: normalized,
    healthMaxSeverity: personal.health.maxSeverity,
    optimalProfile,
  });

  const primaryRiskFactors = [...environmental.factors, ...personal.factors];
  const riskScore = buildRiskScore(level);

  return {
    level,
    riskScore,
    environmentalLevel: environmental.level,
    vulnerabilityScore: personal.score,
    primaryRiskFactors,
    reason: buildCombinedReason({
      heatIndex: normalized.heatIndex,
      environmentalLevel: environmental.level,
      environmentalLabel: environmental.label,
      finalLevel: level,
      personalFactors: personal.factors,
      optimalProfile,
    }),
    recommendedAction: buildRecommendedAction(level, normalized, personal.health),
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
  return factors;
}
