export type AppPalette = {
  background: string;
  heroGradient: readonly [string, string, string];
  surface: string;
  surfaceMuted: string;
  surfaceInset: string;
  border: string;
  borderLight: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  textLight: string;
  onHero: string;
  onHeroMuted: string;
  heroText: string;
  heroTextMuted: string;
  primary: string;
  primarySoft: string;
  danger: string;
  dangerSoft: string;
  warning: string;
  warningSoft: string;
  success: string;
  successSoft: string;
  glass: {
    border: string;
    overlay: string;
    fallback: string;
    pillBorder: string;
    pillOverlay: string;
    pillFallback: string;
  };
  tabBar: string;
  statusBar: 'light' | 'dark';
};

/** Monochromatic blue scale — semantic tokens alias to blue shades for UI consistency */
const shared = {
  primary: '#2563EB',
  primarySoft: 'rgba(37,99,235,0.12)',
  danger: '#1D4ED8',
  dangerSoft: 'rgba(37,99,235,0.14)',
  warning: '#3B82F6',
  warningSoft: 'rgba(59,130,246,0.12)',
  success: '#60A5FA',
  successSoft: 'rgba(96,165,250,0.12)',
};

export const lightPalette: AppPalette = {
  ...shared,
  background: '#E8EDF5',
  heroGradient: ['#BFDBFE', '#93C5FD', '#E8EDF5'] as const,
  surface: '#FFFFFF',
  surfaceMuted: '#F8FAFC',
  surfaceInset: '#F1F5F9',
  border: '#E2E8F0',
  borderLight: '#EEF2F6',
  text: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#64748B',
  textLight: '#94A3B8',
  onHero: '#FFFFFF',
  onHeroMuted: 'rgba(255,255,255,0.88)',
  heroText: '#0F172A',
  heroTextMuted: '#475569',
  glass: {
    border: 'rgba(15,23,42,0.12)',
    overlay: 'rgba(255,255,255,0.72)',
    fallback: 'rgba(255,255,255,0.9)',
    pillBorder: 'rgba(15,23,42,0.1)',
    pillOverlay: 'rgba(255,255,255,0.65)',
    pillFallback: 'rgba(255,255,255,0.88)',
  },
  tabBar: 'rgba(255,255,255,0.92)',
  statusBar: 'dark',
};

export const darkPalette: AppPalette = {
  ...shared,
  primarySoft: 'rgba(37,99,235,0.18)',
  dangerSoft: 'rgba(37,99,235,0.18)',
  warningSoft: 'rgba(59,130,246,0.16)',
  successSoft: 'rgba(96,165,250,0.14)',
  background: '#080C14',
  heroGradient: ['#0C1929', '#1E3A8A', '#080C14'] as const,
  surface: '#121A2B',
  surfaceMuted: '#161F32',
  surfaceInset: '#1A2438',
  border: 'rgba(255,255,255,0.12)',
  borderLight: 'rgba(255,255,255,0.08)',
  text: '#F8FAFC',
  textSecondary: '#E2E8F0',
  textMuted: '#CBD5E1',
  textLight: '#94A3B8',
  onHero: '#FFFFFF',
  onHeroMuted: 'rgba(255,255,255,0.92)',
  heroText: '#FFFFFF',
  heroTextMuted: 'rgba(255,255,255,0.88)',
  glass: {
    border: 'rgba(255,255,255,0.2)',
    overlay: 'rgba(18,26,43,0.55)',
    fallback: 'rgba(18,26,43,0.92)',
    pillBorder: 'rgba(255,255,255,0.18)',
    pillOverlay: 'rgba(18,26,43,0.5)',
    pillFallback: 'rgba(18,26,43,0.88)',
  },
  tabBar: 'rgba(12,18,30,0.94)',
  statusBar: 'light',
};

export function getPalette(scheme: 'light' | 'dark'): AppPalette {
  return scheme === 'dark' ? darkPalette : lightPalette;
}

/** Blue-only hero backdrop — risk level affects the chip, not the sky gradient */
export function getHeroGradient(
  isDark: boolean,
  _riskLevel: string | null,
): readonly [string, string, string] {
  if (isDark) {
    return ['#0C1929', '#1E3A8A', '#080C14'] as const;
  }
  return ['#BFDBFE', '#93C5FD', '#E8EDF5'] as const;
}
