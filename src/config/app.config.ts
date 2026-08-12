/**
 * Application configuration.
 * API keys and secrets must be supplied via environment — never hardcoded.
 */
export type DatabaseProvider = 'firebase' | 'mysql' | 'supabase';

function readEnv(key: string): string | null {
  const value = process.env[key];
  return value && value.trim().length > 0 ? value.trim() : null;
}

export const appConfig = {
  appName: 'IniTify',

  /** Hospital / mapping services */
  hospitalDataProvider: readEnv('EXPO_PUBLIC_HOSPITAL_DATA_PROVIDER'),
  mapsProvider: readEnv('EXPO_PUBLIC_MAPS_PROVIDER'),

  /** Database — Firebase, MySQL API, or Supabase */
  databaseProvider: readEnv('EXPO_PUBLIC_DATABASE_PROVIDER'),

  /** MySQL REST API base URL (e.g. http://192.168.1.10:3001) */
  mysqlApiUrl: readEnv('EXPO_PUBLIC_MYSQL_API_URL'),

  /** Supabase project URL */
  supabaseUrl: readEnv('EXPO_PUBLIC_SUPABASE_URL'),

  /** Supabase anon/public key — safe for mobile app */
  supabaseAnonKey: readEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY'),

  /**
   * Optional backend news API (defaults to Supabase direct read when unset).
   * e.g. http://192.168.1.100:3001/api/pagasa-news
   */
  newsApiUrl: readEnv('EXPO_PUBLIC_NEWS_API_URL'),

  /** Decision Tree — rules loaded from src/config/decision-tree.rules.ts */
  decisionTreeModelPath: readEnv('EXPO_PUBLIC_DECISION_TREE_MODEL_PATH'),

  /**
   * Manual heat index entry for risk assessment demo.
   * NOT live API data — use official DOST-PAGASA Updates for advisories.
   */
  devManualHeatEnabled: readEnv('EXPO_PUBLIC_DEV_MANUAL_HEAT') === 'true',
};
