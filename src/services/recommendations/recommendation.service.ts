import type { HeatRiskLevel } from '@/src/models/risk';
import type { Recommendation, RecommendationType } from '@/src/models/recommendations';

const RECOMMENDATION_CATALOG: Record<
  RecommendationType,
  Omit<Recommendation, 'type'>
> = {
  hydration: {
    title: 'Stay Hydrated',
    description:
      'Drink about 250 ml (1 cup) of water every 15–20 minutes while in the heat — roughly 0.75–1 L per outdoor hour, and aim for at least 2–3 L total across a hot day unless your doctor limits fluids.',
  },
  rest: {
    title: 'Take Rest Breaks',
    description:
      'Take a 5–10 minute rest in shade or a cool room every 30–45 minutes of outdoor work or walking.',
  },
  seek_shade: {
    title: 'Seek Shade',
    description:
      'Move to shade or air-conditioning within 5 minutes if you feel dizzy, nauseous, or overly hot; stay there at least 10–15 minutes before going back out.',
  },
  limit_outdoor_activities: {
    title: 'Limit Outdoor Activities',
    description:
      'Avoid strenuous outdoor activity from about 10:00 AM–3:00 PM (peak heat). Keep outdoor tasks under 20–30 continuous minutes when the heat index is high.',
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
