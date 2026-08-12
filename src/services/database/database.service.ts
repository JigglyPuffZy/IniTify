import { appConfig, type DatabaseProvider } from '@/src/config/app.config';
import type { ServiceResult } from '@/src/models/service-result';

/**
 * Database service — Firebase or MySQL per documentation.
 * NOT CONFIGURED until provider is selected and schema approved.
 */
export const databaseService = {
  getProvider(): DatabaseProvider | null {
    const provider = appConfig.databaseProvider;
    if (provider === 'firebase' || provider === 'mysql') return provider;
    return null;
  },

  isConfigured(): boolean {
    return this.getProvider() !== null;
  },

  async initialize(): Promise<ServiceResult<boolean>> {
    if (!this.isConfigured()) {
      return {
        status: 'requires_configuration',
        data: false,
        message:
          'Database not configured. Set EXPO_PUBLIC_DATABASE_PROVIDER to firebase or mysql.',
      };
    }
    return {
      status: 'unavailable',
      data: false,
      message: `Database provider (${this.getProvider()}) integration is not implemented.`,
    };
  },
};
