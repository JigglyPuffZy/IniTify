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

  /** Decision Tree — rules loaded from src/config/decision-tree.rules.ts */
  decisionTreeModelPath: readEnv('EXPO_PUBLIC_DECISION_TREE_MODEL_PATH'),

  /**
   * Legacy WeatherAPI.com key — unused. Live weather uses Open-Meteo (no key).
   * Kept so old .env files do not break.
   */
  weatherApiKey: readEnv('EXPO_PUBLIC_WEATHERAPI_KEY'),

  /**
   * Live weather via Open-Meteo — always on (no API key).
   * @see https://open-meteo.com/en/docs
   */
  weatherProvider: 'open-meteo' as const,

  /**
   * Manual heat index fallback when Open-Meteo is unavailable.
   */
  devManualHeatEnabled: readEnv('EXPO_PUBLIC_DEV_MANUAL_HEAT') === 'true',

  /** OpenAI-compatible API key for conversational check-in (optional) */
  checkInAiApiKey: readEnv('EXPO_PUBLIC_CHECK_IN_AI_API_KEY'),

  /** Base URL — defaults to OpenAI; use for Azure / compatible proxies */
  checkInAiBaseUrl: readEnv('EXPO_PUBLIC_CHECK_IN_AI_BASE_URL'),

  /** Model id, e.g. gpt-4o-mini */
  checkInAiModel: readEnv('EXPO_PUBLIC_CHECK_IN_AI_MODEL'),
};
