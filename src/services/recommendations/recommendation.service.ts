import type { HeatRiskLevel } from '@/src/models/risk';
import type { Recommendation, RecommendationType } from '@/src/models/recommendations';

const RECOMMENDATION_CATALOG: Record<
  RecommendationType,
  Omit<Recommendation, 'type'>
> = {
  hydration: {
    title: 'Stay Hydrated',
    description: 'Drink water regularly to maintain hydration status.',
  },
  rest: {
    title: 'Take Rest Breaks',
    description: 'Take regular rest breaks to reduce heat exposure.',
  },
  seek_shade: {
    title: 'Seek Shade',
    description: 'Move to a shaded or cooler area when possible.',
  },
  limit_outdoor_activities: {
    title: 'Limit Outdoor Activities',
    description: 'Reduce or postpone strenuous outdoor activities.',
  },
};

/** Maps documented recommendation types to risk levels */
const RISK_RECOMMENDATIONS: Record<HeatRiskLevel, RecommendationType[]> = {
  LOW: [],
  MODERATE: ['hydration', 'rest'],
  HIGH: ['hydration', 'rest', 'seek_shade', 'limit_outdoor_activities'],
  EXTREME: [
    'hydration',
    'rest',
    'seek_shade',
    'limit_outdoor_activities',
  ],
};

/**
 * Provides personalized safety recommendations based on risk assessment result.
 * Uses documented recommendation examples only.
 */
export const recommendationService = {
  getRecommendations(level: HeatRiskLevel | null): Recommendation[] {
    if (!level) return [];
    return RISK_RECOMMENDATIONS[level].map((type) => ({
      type,
      ...RECOMMENDATION_CATALOG[type],
    }));
  },
};
