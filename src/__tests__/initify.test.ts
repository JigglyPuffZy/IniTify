import {
  cleanHeatIndexData,
  validateHeatIndexReading,
  toHeatIndexReading,
} from '@/src/services/environmental/environmental-pipeline';
import { environmentalService } from '@/src/services/environmental/environmental.service';
import { computeHeatIndexFromTempHumidity } from '@/src/services/environmental/pagasa/heat-index-calculator';
import { pagasaNewsService } from '@/src/services/pagasa-news/pagasa-news.service';
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
    expect(reading?.source).toBe('manual');
  });

  it('returns cached or unavailable without live PAGASA API', async () => {
    const result = await environmentalService.fetchHeatIndex(14.5, 121.0);
    expect(['unavailable', 'cached']).toContain(result.status);
  });

  it('reports news-feed provider status', () => {
    const status = environmentalService.getProviderStatus();
    expect(status.provider).toBe('news-feed');
  });
});

describe('pagasa news service', () => {
  it('formats category emoji', () => {
    expect(pagasaNewsService.categoryEmoji('Rainfall Warning')).toBe('🌧️');
  });
});

describe('PH date partitioning for PAGASA news', () => {
  const { partitionUpdatesByPhDate } = require('@/src/utils/ph-date');

  it('puts items with today published_at in today bucket', () => {
    const now = new Date('2026-08-12T10:00:00+08:00');
    const feed = partitionUpdatesByPhDate(
      [
        {
          id: 1,
          published_at: '2026-08-12T02:00:00+08:00',
          title: 'Today advisory',
        },
        {
          id: 2,
          published_at: '2026-08-11T18:00:00+08:00',
          title: 'Yesterday advisory',
        },
      ],
      now,
    );
    expect(feed.today).toHaveLength(1);
    expect(feed.previous).toHaveLength(1);
    expect(feed.hasTodayUpdates).toBe(true);
  });

  it('moves yesterday items out of today when date changes', () => {
    const aug13 = new Date('2026-08-13T08:00:00+08:00');
    const feed = partitionUpdatesByPhDate(
      [{ id: 1, published_at: '2026-08-12T08:00:00+08:00', title: 'Aug 12' }],
      aug13,
    );
    expect(feed.today).toHaveLength(0);
    expect(feed.previous).toHaveLength(1);
    expect(feed.hasTodayUpdates).toBe(false);
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

describe('emergency active alert', () => {
  it('sends local notification when emergency becomes active', async () => {
    const { notificationService } = require('@/src/services/notifications/notification.service');
    const result = await notificationService.sendEmergencyActiveAlert(
      'Extreme heat risk, Repeated failed safety prompts',
    );
    expect(result.status).toBe('success');
  });
});

describe('emergency hotline', () => {
  it('normalizes phone numbers for dialer', () => {
    const { normalizePhoneForDial } = require('@/src/services/emergency/emergency-hotline.service');
    expect(normalizePhoneForDial('0917 123 4567')).toBe('09171234567');
    expect(normalizePhoneForDial('+63 917-123-4567')).toBe('+639171234567');
  });

  it('opens tel link for Tuguegarao emergency hotline', async () => {
    const { dialPhoneNumber } = require('@/src/services/emergency/emergency-hotline.service');
    const result = await dialPhoneNumber('09168872897');
    expect(result.status).toBe('success');
  });
});

describe('emergency service', () => {
  it('detects extreme heat indicator', () => {
    const indicators = emergencyService.evaluateIndicators('EXTREME');
    expect(indicators.extremeHeatRisk).toBe(true);
  });

  it('uses configured emergency thresholds', () => {
    expect(emergencyService.getMissingConfiguration()).toEqual([]);
  });
});

describe('first-aid guidance', () => {
  it('loads approved sections', () => {
    const { FIRST_AID_GUIDANCE } = require('@/src/constants/first-aid');
    expect(FIRST_AID_GUIDANCE.isApproved).toBe(true);
    expect(FIRST_AID_GUIDANCE.sections.length).toBeGreaterThan(0);
  });
});

describe('hospital service', () => {
  it('finds nearest Tuguegarao hospital', async () => {
    const { hospitalService } = require('@/src/services/hospital/hospital.service');
    const result = await hospitalService.findNearest({
      latitude: 17.6131,
      longitude: 121.7269,
      accuracy: 10,
      retrievedAt: new Date().toISOString(),
    });
    expect(result.status).toBe('success');
    expect(result.data?.name).toBeTruthy();
    expect(result.data?.distanceKm).toBeGreaterThanOrEqual(0);
  });

  it('lists all major Tuguegarao hospitals ranked by distance', async () => {
    const { hospitalService } = require('@/src/services/hospital/hospital.service');
    const { TUGUEGARAO_HOSPITAL_COUNT } = require('@/src/data/tuguegarao-hospitals');
    const result = await hospitalService.findAllRanked({
      latitude: 17.6131,
      longitude: 121.7269,
      accuracy: 10,
      retrievedAt: new Date().toISOString(),
    });
    expect(result.status).toBe('success');
    expect(result.data?.length).toBe(TUGUEGARAO_HOSPITAL_COUNT);
    expect(result.data?.[0]?.isNearest).toBe(true);
  });

  it('builds navigation url when maps configured', async () => {
    const { hospitalService } = require('@/src/services/hospital/hospital.service');
    const location = {
      latitude: 17.6131,
      longitude: 121.7269,
      accuracy: 10,
      retrievedAt: new Date().toISOString(),
    };
    const nearest = await hospitalService.findNearest(location);
    const nav = await hospitalService.getNavigationUrl(nearest.data!, location);
    expect(nav.status).toBe('success');
    expect(nav.data).toContain('google.com/maps');
  });
});
