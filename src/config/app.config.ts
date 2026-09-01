/**
 * App config — EXPO_PUBLIC_* must be static process.env.EXPO_PUBLIC_FOO
 * (Expo inlines them at build time).
 */
export type DatabaseProvider = 'mysql' | 'supabase';

function clean(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

export const appConfig = {
  appName: 'IniTify',

  /** Tuguegarao-only static list — default so APK never shows a blank hospital screen. */
  hospitalDataProvider:
    clean(process.env.EXPO_PUBLIC_HOSPITAL_DATA_PROVIDER) ?? 'static-tuguegarao',
  mapsProvider: clean(process.env.EXPO_PUBLIC_MAPS_PROVIDER) ?? 'google',

  databaseProvider: clean(process.env.EXPO_PUBLIC_DATABASE_PROVIDER),
  mysqlApiUrl: clean(process.env.EXPO_PUBLIC_MYSQL_API_URL),
  supabaseUrl: clean(process.env.EXPO_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: clean(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY),

  /** Open-Meteo — no API key */
  weatherProvider: 'open-meteo' as const,
  devManualHeatEnabled: clean(process.env.EXPO_PUBLIC_DEV_MANUAL_HEAT) === 'true',

  /** Tify AI (optional — guided check-in works without this) */
  checkInAiApiKey: clean(process.env.EXPO_PUBLIC_CHECK_IN_AI_API_KEY),
  checkInAiBaseUrl: clean(process.env.EXPO_PUBLIC_CHECK_IN_AI_BASE_URL),
  checkInAiModel: clean(process.env.EXPO_PUBLIC_CHECK_IN_AI_MODEL),
};
