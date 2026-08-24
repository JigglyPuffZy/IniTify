import { useMemo } from 'react';
import { useThemePreference } from '@/src/context/ThemeContext';
import { getPalette, type AppPalette } from './palettes';
import { legacyColorsFromPalette, type LegacyThemeColors } from './legacy-colors';

export function useAppTheme(): {
  palette: AppPalette;
  colors: LegacyThemeColors;
  isDark: boolean;
  scheme: 'light' | 'dark';
  preference: 'system' | 'light' | 'dark';
  setPreference: (preference: 'system' | 'light' | 'dark') => void;
} {
  const { scheme, preference, setPreference } = useThemePreference();
  const palette = useMemo(() => getPalette(scheme), [scheme]);
  const colors = useMemo(() => legacyColorsFromPalette(palette), [palette]);
  return {
    palette,
    colors,
    isDark: scheme === 'dark',
    scheme,
    preference,
    setPreference,
  };
}
