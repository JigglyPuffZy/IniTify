/** Shared visual tokens for splash + auth screens */
export const brand = {
  navy: '#070B12',
  navyMid: '#0F172A',
  navyDeep: '#1E3A8A',
  blue: '#2563EB',
  blueLight: '#3B82F6',
  blueSoft: '#60A5FA',
  onDark: '#FFFFFF',
  onDarkMuted: 'rgba(255,255,255,0.82)',
  onDarkFaint: 'rgba(255,255,255,0.55)',
  glass: 'rgba(255,255,255,0.10)',
  glassBorder: 'rgba(255,255,255,0.22)',
  glow: 'rgba(96,165,250,0.35)',
} as const;

/** Login hero — deep navy/blue top → Initify blue bottom (light mode) */
export const splashGradient = ['#1E3A8A', '#2563EB', '#60A5FA'] as const;
export const splashBackground = brand.navyDeep;

export const authHeroGradient = ['#1E3A8A', '#2563EB', '#3B82F6'] as const;
/** Login hero — dark navy top → blue bottom (dark mode) */
export const authHeroGradientDark = ['#0F172A', '#1E3A8A', '#2563EB'] as const;

/** ~2.3s intro + hold, then fade into Login */
export const SPLASH_INTRO_MS = 1100;
export const SPLASH_MIN_MS = 2300;
export const SPLASH_FADE_OUT_MS = 450;
/** Never block on auth — always dismiss */
export const SPLASH_MAX_MS = 2800;
