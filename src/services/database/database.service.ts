import { appConfig, type DatabaseProvider } from '@/src/config/app.config';
import type { ServiceResult } from '@/src/models/service-result';
import { mysqlSyncService } from './mysql-sync.service';
import { supabaseSyncService } from './supabase-sync.service';

function getActiveSyncService() {
  if (appConfig.databaseProvider === 'supabase') {
    return supabaseSyncService;
  }
  return mysqlSyncService;
}

/**
 * Database service — Firebase, MySQL API, or Supabase per HeatHits documentation.
 */
export const databaseService = {
  getProvider(): DatabaseProvider | null {
    const provider = appConfig.databaseProvider;
    if (provider === 'firebase' || provider === 'mysql' || provider === 'supabase') {
      return provider;
    }
    return null;
  },

  isConfigured(): boolean {
    const provider = this.getProvider();
    if (provider === 'mysql') {
      return appConfig.mysqlApiUrl !== null;
    }
    if (provider === 'supabase') {
      return appConfig.supabaseUrl !== null && appConfig.supabaseAnonKey !== null;
    }
    return provider !== null;
  },

  async initialize(): Promise<ServiceResult<boolean>> {
    if (!this.isConfigured()) {
      return {
        status: 'requires_configuration',
        data: false,
        message:
          'Database not configured. Set EXPO_PUBLIC_DATABASE_PROVIDER=supabase (or mysql) and credentials in .env.',
      };
    }

    const provider = this.getProvider();
    if (provider === 'mysql') {
      const health = await mysqlSyncService.checkHealth();
      if (health.status === 'success') {
        return { status: 'success', data: true, message: health.message };
      }
      return {
        status: health.status,
        data: false,
        message: `${health.message} Local AsyncStorage still works offline.`,
      };
    }

    if (provider === 'supabase') {
      const health = await supabaseSyncService.checkHealth();
      if (health.status === 'success') {
        return { status: 'success', data: true, message: health.message };
      }
      return {
        status: health.status,
        data: false,
        message: `${health.message} Local AsyncStorage still works offline.`,
      };
    }

    return {
      status: 'unavailable',
      data: false,
      message: `Database provider (${provider}) integration is not implemented.`,
    };
  },

  /** Fire-and-forget sync — errors are silent; local storage always wins */
  get sync() {
    return getActiveSyncService();
  },
};
