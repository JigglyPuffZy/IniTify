/** Documented recommendation examples */
export type RecommendationType =
  | 'hydration'
  | 'rest'
  | 'seek_shade'
  | 'limit_outdoor_activities';

export interface Recommendation {
  type: RecommendationType;
  title: string;
  description: string;
}
