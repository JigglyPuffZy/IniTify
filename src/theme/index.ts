import { type TextStyle, type ViewStyle } from 'react-native';
import { fonts } from './fonts';
import {
  softShadow,
  cardShadow,
  elevatedShadow,
  floatShadow,
} from './shadows';

/** IniTify design system — blue-only palette, two-font typography */
export const colors = {
  primary: '#2563EB',
  primaryHover: '#1D4ED8',
  primarySoft: '#EFF6FF',
  primaryMuted: '#DBEAFE',
  background: '#F4F6F9',
  surface: '#FFFFFF',
  surfaceMuted: '#F8FAFC',
  surfaceInset: '#F1F5F9',
  border: '#E2E8F0',
  borderLight: '#EEF2F6',
  text: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#64748B',
  textLight: '#94A3B8',
  white: '#FFFFFF',
  danger: '#1D4ED8',
  dangerSoft: '#DBEAFE',
  warning: '#3B82F6',
  warningSoft: '#EFF6FF',
  success: '#60A5FA',
  successSoft: '#DBEAFE',
  info: '#2563EB',
  infoSoft: '#EFF6FF',
  /** Legacy aliases — all mapped to blue */
  primaryDeep: '#1E3A8A',
  accent: '#3B82F6',
  accentSoft: '#EFF6FF',
  violet: '#2563EB',
  violetSoft: '#EFF6FF',
  teal: '#60A5FA',
  tealSoft: '#DBEAFE',
  backgroundAlt: '#EEF2F6',
  primaryLight: '#3B82F6',
  primaryDark: '#1E3A8A',
  accentWarm: '#3B82F6',
  accentWarmSoft: '#EFF6FF',
  surfaceElevated: '#FFFFFF',
  onHero: '#FFFFFF',
  onHeroMuted: 'rgba(255,255,255,0.8)',
  onHeroFaint: 'rgba(255,255,255,0.55)',
};

export const gradients = {
  hero: ['#1E3A8A', '#2563EB'] as const,
  heroSoft: ['#2563EB', '#3B82F6'] as const,
  day: ['#1D4ED8', '#3B82F6'] as const,
  night: ['#0C1929', '#1E3A8A'] as const,
  sunset: ['#1D4ED8', '#3B82F6'] as const,
  emergency: ['#1E3A8A', '#2563EB'] as const,
  violet: ['#1E40AF', '#2563EB'] as const,
  card: ['#FFFFFF', '#F8FAFC'] as const,
  warm: ['#2563EB', '#3B82F6'] as const,
};

export const riskGradients: Record<string, readonly [string, string]> = {
  LOW: ['#93C5FD', '#BFDBFE'],
  MODERATE: ['#60A5FA', '#93C5FD'],
  HIGH: ['#3B82F6', '#60A5FA'],
  EXTREME: ['#1D4ED8', '#3B82F6'],
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  huge: 48,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  pill: 999,
};

export const layout = {
  pagePadding: 20,
  cardPadding: 18,
  cardPaddingLg: 22,
  sectionGap: 28,
  itemGap: 12,
  buttonHeight: 48,
  touchTarget: 44,
  /** Sheet overlap over hero gradient */
  heroCurve: 24,
};

export const typography = {
  display: {
    fontFamily: fonts.header,
    fontSize: 32,
    letterSpacing: -0.8,
  },
  h1: {
    fontFamily: fonts.header,
    fontSize: 24,
    letterSpacing: -0.4,
  },
  h2: {
    fontFamily: fonts.headerSemi,
    fontSize: 18,
    letterSpacing: -0.2,
  },
  h3: {
    fontFamily: fonts.headerSemi,
    fontSize: 16,
  },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22 },
  bodySm: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17 },
  label: { fontFamily: fonts.bodySemiBold, fontSize: 13 },
  overline: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase' as TextStyle['textTransform'],
  },
  button: { fontFamily: fonts.bodySemiBold, fontSize: 15 },
  hero: {
    fontFamily: fonts.header,
    fontSize: 28,
    letterSpacing: -0.5,
  },
};

export {
  softShadow,
  cardShadow,
  elevatedShadow,
  floatShadow,
  platformShadow,
  tabBarShadow,
  surfaceShadow,
} from './shadows';
export { fonts } from './fonts';
export { useAppTheme } from './useAppTheme';
export { getPalette, getHeroGradient, lightPalette, darkPalette } from './palettes';
export type { AppPalette } from './palettes';

export const theme = {
  colors,
  gradients,
  riskGradients,
  spacing,
  radius,
  layout,
  typography,
  softShadow,
  cardShadow,
  elevatedShadow,
  floatShadow,
};
