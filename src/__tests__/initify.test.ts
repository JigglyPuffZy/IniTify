import {
  cleanHeatIndexData,
  validateHeatIndexReading,
  toHeatIndexReading,
} from '@/src/services/environmental/environmental-pipeline';
import { environmentalService } from '@/src/services/environmental/environmental.service';
import { computeHeatIndexFromTempHumidity } from '@/src/services/environmental/pagasa/heat-index-calculator';
import { getPagasaProviderStatus } from '@/src/services/environmental/pagasa/pagasa.service';
import { decisionTreeService } from '@/src/services/decision-tree/decision-tree.service';
import {
  evaluateDecisionTree,
  validateRulesDocument,
} from '@/src/services/decision-tree/decision-tree.engine';
import type { DecisionTreeRulesDocument } from '@/src/services/decision-tree/decision-tree.types';
import { riskAssessmentService } from '@/src/services/risk-assessment/risk-assessment.service';
import { recommendationService } from '@/src/services/recommendations/recommendation.service';
import { emergencyService } from '@/src/services/emergency/emergency.service';
import { validateAge, isUserProfileComplete } from '@/src/utils/validation';

describe('validation', () => {
  it('validates age', () => {
    expect(validateAge('25')).toBeNull();
    expect(validateAge('')).not.toBeNull();
    expect(validateAge('abc')).not.toBeNull();
  });

  it('checks profile completeness', () => {
    expect(
      isUserProfileComplete({
        age: 30,
        healthCondition: 'None',
        activityLevel: 'Low',
        hydrationStatus: 'Well hydrated',
      }),
    ).toBe(true);
  });
});

describe('heat index calculator', () => {
  it('computes heat index from temp and humidity', () => {
    const hi = computeHeatIndexFromTempHumidity(32, 70);
    expect(hi).not.toBeNull();
    expect(hi!).toBeGreaterThan(32);
  });

  it('returns null for invalid humidity', () => {
    expect(computeHeatIndexFromTempHumidity(32, 150)).toBeNull();
  });
});

describe('environmental pipeline', () => {
  it('cleans and validates heat index data', () => {
    const cleaned = cleanHeatIndexData({ heatIndex: 38, latitude: 14.5, longitude: 121.0 });
    expect(validateHeatIndexReading(cleaned).valid).toBe(true);
    const reading = toHeatIndexReading(cleaned);
    expect(reading?.heatIndex).toBe(38);
    expect(reading?.source).toBe('DOST-PAGASA');
  });

  it('reports unavailable when PAGASA not configured', async () => {
    const result = await environmentalService.fetchHeatIndex(14.5, 121.0);
    expect(['unavailable', 'cached']).toContain(result.status);
  });

  it('exposes provider status', () => {
    const status = getPagasaProviderStatus();
    expect(status.provider).toBeDefined();
  });
});

describe('decision tree engine', () => {
  const sampleRules: DecisionTreeRulesDocument = {
    enabled: true,
    version: 'test-1.0',
    source: 'unit-test',
    root: {
      type: 'split',
      feature: 'heatIndex',
      operator: '>=',
      value: 41,
      true: { type: 'leaf', level: 'HIGH' },
      false: {
        type: 'split',
        feature: 'hydrationStatus',
        operator: '==',
        value: 'Dehydrated',
        true: { type: 'leaf', level: 'MODERATE' },
        false: { type: 'leaf', level: 'LOW' },
      },
    },
  };

  it('evaluates enabled rules', () => {
    const result = evaluateDecisionTree(sampleRules, {
      heatIndex: 42,
      age: 30,
      healthCondition: 'None',
      activityLevel: 'Low',
      hydrationStatus: 'Well hydrated',
    });
    expect(result.level).toBe('HIGH');
    expect(result.error).toBeNull();
  });

  it('walks false branch', () => {
    const result = evaluateDecisionTree(sampleRules, {
      heatIndex: 30,
      age: 30,
      healthCondition: 'None',
      activityLevel: 'Low',
      hydrationStatus: 'Dehydrated',
    });
    expect(result.level).toBe('MODERATE');
  });

  it('rejects disabled rules', () => {
    const result = evaluateDecisionTree(
      { ...sampleRules, enabled: false },
      {
        heatIndex: 42,
        age: 30,
        healthCondition: 'None',
        activityLevel: 'Low',
        hydrationStatus: 'Well hydrated',
      },
    );
    expect(result.level).toBeNull();
    expect(result.error).toContain('not enabled');
  });

  it('validates rules document', () => {
    expect(validateRulesDocument(sampleRules)).toBe(true);
    expect(validateRulesDocument({ enabled: true })).toBe(false);
  });
});

describe('decision tree service', () => {
  it('reports trained rules as enabled', () => {
    const status = decisionTreeService.getRulesStatus();
    expect(status.enabled).toBe(true);
  });

  it('classifies extreme heat index', () => {
    const result = decisionTreeService.evaluate({
      heatIndex: 45,
      age: 25,
      healthCondition: 'None',
      activityLevel: 'Low',
      hydrationStatus: 'Well hydrated',
      latitude: 17.6,
      longitude: 121.7,
    });
    expect(result.status).toBe('success');
    expect(result.data?.level).toBe('EXTREME');
  });

  it('escalates moderate heat with dehydration', () => {
    const result = decisionTreeService.evaluate({
      heatIndex: 30,
      age: 25,
      healthCondition: 'None',
      activityLevel: 'Low',
      hydrationStatus: 'Dehydrated',
      latitude: 17.6,
      longitude: 121.7,
    });
    expect(result.status).toBe('success');
    expect(result.data?.level).toBe('HIGH');
  });

  it('classifies low heat with no risk factors', () => {
    const result = decisionTreeService.evaluate({
      heatIndex: 24,
      age: 25,
      healthCondition: 'None',
      activityLevel: 'Low',
      hydrationStatus: 'Well hydrated',
      latitude: 17.6,
      longitude: 121.7,
    });
    expect(result.status).toBe('success');
    expect(result.data?.level).toBe('LOW');
  });
});

describe('risk assessment', () => {
  it('requires complete user profile', () => {
    const result = riskAssessmentService.assess({
      heatReading: {
        heatIndex: 38,
        retrievedAt: new Date().toISOString(),
        source: 'DOST-PAGASA',
        latitude: 14.5,
        longitude: 121.0,
        isCached: false,
      },
      riskFactors: {
        age: null,
        healthCondition: 'None',
        activityLevel: 'Low',
        hydrationStatus: 'Well hydrated',
      },
      location: null,
    });
    expect(result.level).toBeNull();
  });
});

describe('recommendations', () => {
  it('returns documented recommendations for HIGH risk', () => {
    const recs = recommendationService.getRecommendations('HIGH');
    expect(recs.some((r) => r.type === 'hydration')).toBe(true);
  });
});

describe('emergency service', () => {
  it('detects extreme heat indicator', () => {
    const indicators = emergencyService.evaluateIndicators('EXTREME');
    expect(indicators.extremeHeatRisk).toBe(true);
  });
});
