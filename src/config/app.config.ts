/**
 * Application configuration.
 * API keys and secrets must be supplied via environment — never hardcoded.
 */
export type PagasaProvider = 'tenday' | 'custom' | 'none';
export type DatabaseProvider = 'firebase' | 'mysql';

function readEnv(key: string): string | null {
  const value = process.env[key];
  return value && value.trim().length > 0 ? value.trim() : null;
}

function readPagasaProvider(): PagasaProvider {
  const value = readEnv('EXPO_PUBLIC_PAGASA_PROVIDER');
  if (value === 'tenday' || value === 'custom') return value;
  return 'none';
}

export const appConfig = {
  appName: 'IniTify',

  /** DOST-PAGASA integration */
  pagasaProvider: readPagasaProvider(),
  pagasaApiUrl: readEnv('EXPO_PUBLIC_PAGASA_API_URL'),
  pagasaApiKey: readEnv('EXPO_PUBLIC_PAGASA_API_KEY'),
  pagasaProvince: readEnv('EXPO_PUBLIC_PAGASA_PROVINCE'),
  pagasaMunicity: readEnv('EXPO_PUBLIC_PAGASA_MUNICITY'),
  pagasaRegion: readEnv('EXPO_PUBLIC_PAGASA_REGION'),
  /** JSON field name for custom endpoint heat index value */
  pagasaHeatIndexField: readEnv('EXPO_PUBLIC_PAGASA_HEAT_INDEX_FIELD') ?? 'heatIndex',

  /** Hospital / mapping services — NOT CONFIGURED */
  hospitalDataProvider: readEnv('EXPO_PUBLIC_HOSPITAL_DATA_PROVIDER'),
  mapsProvider: readEnv('EXPO_PUBLIC_MAPS_PROVIDER'),

  /** Database — Firebase or MySQL; NOT CONFIGURED */
  databaseProvider: readEnv('EXPO_PUBLIC_DATABASE_PROVIDER'),

  /** Decision Tree — rules loaded from src/config/decision-tree.rules.ts */
  decisionTreeModelPath: readEnv('EXPO_PUBLIC_DECISION_TREE_MODEL_PATH'),

  /**
   * Development only — manual heat index entry for testing without PAGASA API.
   * Must be explicitly enabled. Never presented as live PAGASA data.
   */
  devManualHeatEnabled: readEnv('EXPO_PUBLIC_DEV_MANUAL_HEAT') === 'true',
};
