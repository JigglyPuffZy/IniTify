import type { AppPalette } from './palettes';

/** Maps dynamic palette to the legacy static `colors` shape used across older screens. */
export type LegacyThemeColors = {
  primary: string;
  primarySoft: string;
  background: string;
  surface: string;
  surfaceMuted: string;
  surfaceInset: string;
  border: string;
  borderLight: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  textLight: string;
  white: string;
  danger: string;
  success: string;
  successSoft: string;
  teal: string;
  tealSoft: string;
};

export function legacyColorsFromPalette(p: AppPalette): LegacyThemeColors {
  return {
    primary: p.primary,
    primarySoft: p.primarySoft,
    background: p.background,
    surface: p.surface,
    surfaceMuted: p.surfaceMuted,
    surfaceInset: p.surfaceInset,
    border: p.border,
    borderLight: p.borderLight,
    text: p.text,
    textSecondary: p.textSecondary,
    textMuted: p.textMuted,
    textLight: p.textLight,
    white: '#FFFFFF',
    danger: p.danger,
    success: p.success,
    successSoft: p.successSoft,
    teal: p.success,
    tealSoft: p.successSoft,
  };
}
