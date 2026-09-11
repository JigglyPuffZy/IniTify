import AsyncStorage from '@react-native-async-storage/async-storage';
import type { TifyLanguagePreference } from '@/src/constants/tify-language-preference';

const VALID: TifyLanguagePreference[] = ['en', 'tl', 'taglish'];

function key(userId: string): string {
  return `@initify/tify-language:${userId}`;
}

export const tifyPreferencesService = {
  async getLanguage(userId: string): Promise<TifyLanguagePreference | null> {
    const raw = await AsyncStorage.getItem(key(userId));
    if (!raw) return null;
    return VALID.includes(raw as TifyLanguagePreference) ? (raw as TifyLanguagePreference) : null;
  },

  async saveLanguage(userId: string, language: TifyLanguagePreference): Promise<void> {
    await AsyncStorage.setItem(key(userId), language);
  },

  async clearLanguage(userId: string): Promise<void> {
    await AsyncStorage.removeItem(key(userId));
  },
};
