import {
  cleanHeatIndexData,
  validateHeatIndexReading,
  toHeatIndexReading,
} from '@/src/services/environmental/environmental-pipeline';
import { environmentalService } from '@/src/services/environmental/environmental.service';
import { fetchOpenMeteoCurrent } from '@/src/services/environmental/open-meteo-client';
import { computeHeatIndexFromTempHumidity } from '@/src/services/environmental/pagasa/heat-index-calculator';
import { decisionTreeService } from '@/src/services/decision-tree/decision-tree.service';
import {
  evaluateDecisionTree,
  validateRulesDocument,
} from '@/src/services/decision-tree/decision-tree.engine';
import { assessHeatRisk } from '@/src/services/decision-tree/heat-risk-classifier';
import { assessEnvironmentalRisk } from '@/src/services/decision-tree/heat-risk-classifier';
import type { DecisionTreeRulesDocument } from '@/src/services/decision-tree/decision-tree.types';
import { riskAssessmentService } from '@/src/services/risk-assessment/risk-assessment.service';
import { recommendationService } from '@/src/services/recommendations/recommendation.service';
import { emergencyService } from '@/src/services/emergency/emergency.service';
import { validateAge, isUserProfileComplete } from '@/src/utils/validation';
import { TUGUEGARAO_STUDY_AREA } from '@/src/constants/study-area';
import {
  TUGUEGARAO_PAGASA_STATION,
  defaultTuguegaraoWeatherCoords,
} from '@/src/utils/tuguegarao-weather-location';

jest.mock('@/src/services/environmental/open-meteo-client', () => ({
  fetchOpenMeteoCurrent: jest.fn(),
}));

jest.mock('@/src/services/offline-cache/offline-cache.service', () => ({
  offlineCacheService: {
    saveHeatReading: jest.fn(async () => undefined),
    getLatestHeatReading: jest.fn(async () => null),
    saveWeather: jest.fn(async () => undefined),
    getLatestWeather: jest.fn(async () => null),
  },
}));

const mockedFetchOpenMeteo = fetchOpenMeteoCurrent as jest.MockedFunction<
  typeof fetchOpenMeteoCurrent
>;

function mockOpenMeteoWeather(
  overrides: Partial<Awaited<ReturnType<typeof fetchOpenMeteoCurrent>>> = {},
) {
  mockedFetchOpenMeteo.mockResolvedValue({
    locationName: TUGUEGARAO_STUDY_AREA.city,
    tempC: 33,
    feelsLikeC: 36,
    heatIndexC: 36,
    humidity: 70,
    conditionText: 'Partly cloudy',
    conditionIconUrl: '',
    windKph: 10,
    windDir: 'N',
    isDay: true,
    lastUpdated: new Date().toISOString(),
    source: 'open-meteo',
    ...overrides,
  });
}
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
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('cleans and validates heat index data', () => {
    const cleaned = cleanHeatIndexData({ heatIndex: 38, latitude: 14.5, longitude: 121.0 });
    expect(validateHeatIndexReading(cleaned).valid).toBe(true);
    const reading = toHeatIndexReading(cleaned);
    expect(reading?.heatIndex).toBe(38);
    expect(reading?.source).toBe('manual');
  });

  it('returns success, cached, or unavailable from Open-Meteo fetch', async () => {
    mockOpenMeteoWeather({ heatIndexC: 36 });

    const result = await environmentalService.fetchHeatIndex(14.5, 121.0);
    expect(['success', 'unavailable', 'cached', 'invalid']).toContain(result.status);
    expect(mockedFetchOpenMeteo).toHaveBeenCalledWith(14.5, 121.0);
  });

  it('reports open-meteo as the weather provider', () => {
    const status = environmentalService.getProviderStatus();
    expect(status.provider).toBe('open-meteo');
    expect(status.configured).toBe(true);
  });

  it('defaults heat fetch to PAGASA Tuguegarao station when coordinates are omitted', async () => {
    mockOpenMeteoWeather({ heatIndexC: 34 });

    const result = await environmentalService.fetchHeatIndex(null, null);
    expect(['success', 'cached', 'unavailable']).toContain(result.status);
    const defaults = defaultTuguegaraoWeatherCoords();
    expect(mockedFetchOpenMeteo).toHaveBeenCalledWith(
      defaults.latitude,
      defaults.longitude,
    );
    if (result.status === 'success' && result.data) {
      expect(result.data.latitude).toBe(TUGUEGARAO_PAGASA_STATION.latitude);
      expect(result.data.longitude).toBe(TUGUEGARAO_PAGASA_STATION.longitude);
    }
  });
});

describe('PH date partitioning', () => {
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
    expect(result.level).toBe('EXTREME');
    expect(result.error).toBeNull();
  });

  it('escalates moderate heat with dehydration', () => {
    const result = evaluateDecisionTree(sampleRules, {
      heatIndex: 30,
      age: 30,
      healthCondition: 'None',
      activityLevel: 'Low',
      hydrationStatus: 'Dehydrated',
    });
    expect(result.level).toBe('HIGH');
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

  it('keeps typical Tuguegarao afternoon at HIGH with one health factor', () => {
    const result = decisionTreeService.evaluate({
      heatIndex: 40.7,
      age: 25,
      healthCondition: 'Hypertension / High Blood Pressure',
      activityLevel: 'Low',
      hydrationStatus: 'Well hydrated',
      latitude: 17.6,
      longitude: 121.7,
    });
    expect(result.status).toBe('success');
    expect(result.data?.level).toBe('HIGH');
  });

  it('escalates to EXTREME when dehydration meets high heat index', () => {
    const result = decisionTreeService.evaluate({
      heatIndex: 40.7,
      age: 25,
      healthCondition: 'None',
      activityLevel: 'Low',
      hydrationStatus: 'Dehydrated',
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

  it('classifies moderate heat with no risk factors', () => {
    const result = decisionTreeService.evaluate({
      heatIndex: 29,
      age: 25,
      healthCondition: 'None',
      activityLevel: 'Low',
      hydrationStatus: 'Well hydrated',
      latitude: 17.6,
      longitude: 121.7,
    });
    expect(result.status).toBe('success');
    expect(result.data?.level).toBe('MODERATE');
  });

  it('escalates to EXTREME when high activity meets health condition in hot band', () => {
    const result = decisionTreeService.evaluate({
      heatIndex: 38,
      age: 25,
      healthCondition: 'Diabetes',
      activityLevel: 'High',
      hydrationStatus: 'Well hydrated',
      latitude: 17.6,
      longitude: 121.7,
    });
    expect(result.status).toBe('success');
    expect(result.data?.level).toBe('EXTREME');
  });

  it('uses generalStatus from check-in as a risk factor', () => {
    const result = decisionTreeService.evaluate({
      heatIndex: 40,
      age: 25,
      healthCondition: 'None',
      activityLevel: 'Low',
      hydrationStatus: 'Well hydrated',
      generalStatus: 'Not Feeling Well',
      latitude: 17.6,
      longitude: 121.7,
    });
    expect(result.status).toBe('success');
    expect(result.data?.level).toBe('EXTREME');
  });
});

describe('vulnerability-aware heat risk', () => {
  it('does not assign risk from temperature alone — healthy user low heat', () => {
    const result = assessHeatRisk({
      heatIndex: 24,
      age: 30,
      healthCondition: 'None',
      activityLevel: 'Low',
      hydrationStatus: 'Well hydrated',
      generalStatus: 'Feeling Well',
    });
    expect(result?.level).toBe('LOW');
    expect(result?.environmentalLevel).toBe('LOW');
    expect(result?.vulnerabilityScore).toBe(0);
    expect(result?.reason).toContain('no significant personal');
  });

  it('escalates moderate environmental heat when user has hypertension', () => {
    const result = assessHeatRisk({
      heatIndex: 29,
      age: 45,
      healthCondition: 'Hypertension / High Blood Pressure',
      healthConditions: ['Hypertension / High Blood Pressure'],
      activityLevel: 'Low',
      hydrationStatus: 'Well hydrated',
      generalStatus: 'Feeling Well',
    });
    expect(result?.environmentalLevel).toBe('MODERATE');
    expect(result?.level).toBe('HIGH');
    expect(result?.primaryRiskFactors.some((f) => f.includes('Hypertension'))).toBe(true);
    expect(result?.reason).toContain('personal vulnerability');
  });

  it('raises risk for hypertension even when environmental heat is low', () => {
    const result = assessHeatRisk({
      heatIndex: 24,
      age: 50,
      healthCondition: 'Hypertension / High Blood Pressure',
      healthConditions: ['Hypertension / High Blood Pressure'],
      activityLevel: 'Low',
      hydrationStatus: 'Well hydrated',
      generalStatus: 'Feeling Well',
    });
    expect(result?.environmentalLevel).toBe('LOW');
    expect(result?.level).toBe('MODERATE');
  });

  it('returns explainable output with score, factors, and guidance', () => {
    const result = assessHeatRisk({
      heatIndex: 38,
      humidityPercent: 75,
      age: 65,
      healthCondition: 'Heart Disease',
      healthConditions: ['Heart Disease', 'Diabetes'],
      activityLevel: 'High',
      hydrationStatus: 'Dehydrated',
      generalStatus: 'Mild Discomfort',
    });
    expect(result).not.toBeNull();
    expect(result!.riskScore).toBeGreaterThan(50);
    expect(result!.primaryRiskFactors.length).toBeGreaterThan(2);
    expect(result!.reason).toMatch(/^Risk level:/);
    expect(result!.recommendedAction.length).toBeGreaterThan(10);
    expect(result!.level).toBe('EXTREME');
  });

  it('does not auto-assign EXTREME for hypertension alone at moderate heat', () => {
    const result = assessHeatRisk({
      heatIndex: 30,
      age: 40,
      healthCondition: 'Hypertension / High Blood Pressure',
      healthConditions: ['Hypertension / High Blood Pressure'],
      activityLevel: 'Low',
      hydrationStatus: 'Well hydrated',
      generalStatus: 'Feeling Well',
    });
    expect(result?.level).toBe('HIGH');
    expect(result?.level).not.toBe('EXTREME');
  });

  it('maps PAGASA heat-index bands to environmental levels', () => {
    expect(assessEnvironmentalRisk(26).level).toBe('LOW');
    expect(assessEnvironmentalRisk(29).level).toBe('MODERATE');
    expect(assessEnvironmentalRisk(38).level).toBe('HIGH');
    expect(assessEnvironmentalRisk(45).level).toBe('EXTREME');
    expect(assessEnvironmentalRisk(55).level).toBe('CRITICAL');
    expect(assessEnvironmentalRisk(29).label).toBe('Caution');
    expect(assessEnvironmentalRisk(55).label).toBe('Extreme Danger');
  });

  it('classifies every PAGASA boundary exactly (poster: 27–32, 33–41, 42–51, 52+)', () => {
    const healthy = {
      age: 25,
      healthCondition: 'None',
      activityLevel: 'Low' as const,
      hydrationStatus: 'Well hydrated' as const,
      generalStatus: 'Feeling Well' as const,
    };

    const boundaryCases: Array<{
      heatIndex: number;
      environmental: 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME' | 'CRITICAL';
      label: string;
    }> = [
      { heatIndex: 26.9, environmental: 'LOW', label: 'Below Caution' },
      { heatIndex: 27, environmental: 'MODERATE', label: 'Caution' },
      { heatIndex: 32, environmental: 'MODERATE', label: 'Caution' },
      { heatIndex: 32.9, environmental: 'MODERATE', label: 'Caution' },
      { heatIndex: 33, environmental: 'HIGH', label: 'Extreme Caution' },
      { heatIndex: 41, environmental: 'HIGH', label: 'Extreme Caution' },
      { heatIndex: 41.9, environmental: 'HIGH', label: 'Extreme Caution' },
      { heatIndex: 42, environmental: 'EXTREME', label: 'Danger' },
      { heatIndex: 51, environmental: 'EXTREME', label: 'Danger' },
      { heatIndex: 51.9, environmental: 'EXTREME', label: 'Danger' },
      { heatIndex: 52, environmental: 'CRITICAL', label: 'Extreme Danger' },
      { heatIndex: 60, environmental: 'CRITICAL', label: 'Extreme Danger' },
    ];

    for (const { heatIndex, environmental, label } of boundaryCases) {
      const env = assessEnvironmentalRisk(heatIndex);
      expect(env.level).toBe(environmental);
      expect(env.label).toBe(label);

      const result = assessHeatRisk({ heatIndex, ...healthy });
      expect(result?.environmentalLevel).toBe(environmental);
      expect(result?.level).toBe(environmental);
    }
  });

  it('classifies extreme danger heat index at 52°C or above', () => {
    const result = decisionTreeService.evaluate({
      heatIndex: 55,
      age: 25,
      healthCondition: 'None',
      activityLevel: 'Low',
      hydrationStatus: 'Well hydrated',
      latitude: 17.6,
      longitude: 121.7,
    });
    expect(result.status).toBe('success');
    expect(result.data?.level).toBe('CRITICAL');
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
  it('sends a phone notification for emergency active', async () => {
    const { notificationService } = require('@/src/services/notifications/notification.service');
    const result = await notificationService.sendEmergencyActiveAlert(
      'Extreme heat risk, Repeated failed safety prompts',
    );
    expect(result.status).toBe('success');
    expect(result.data).toBeTruthy();
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
    const {
      FIRST_AID_GUIDANCE,
      getFirstAidGuidanceForConditions,
    } = require('@/src/constants/first-aid');
    expect(FIRST_AID_GUIDANCE.isApproved).toBe(true);
    expect(FIRST_AID_GUIDANCE.sections.length).toBeGreaterThan(0);

    const diabetes = getFirstAidGuidanceForConditions(['Diabetes'], 'Diabetes');
    expect(diabetes.conditionBlocks).toHaveLength(1);
    expect(diabetes.conditionBlocks[0].conditionLabel).toBe('Diabetes');
    expect(diabetes.conditionBlocks[0].sections[0].heading).toMatch(/blood sugar|Check/i);

    const multi = getFirstAidGuidanceForConditions(
      ['Diabetes', 'Asthma'],
      'Diabetes',
    );
    expect(multi.conditionBlocks).toHaveLength(2);
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
