import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { radius as themeRadius, platformShadow } from '@/src/theme';
import type { AppPalette } from '@/src/theme/palettes';

type BlurTint = 'light' | 'dark' | 'default';

interface GlassSurfaceProps {
  children: React.ReactNode;
  intensity?: number;
  tint?: BlurTint;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  borderRadius?: number;
  variant?: 'hero' | 'card' | 'pill';
  isDark?: boolean;
  palette?: AppPalette;
}

function getGlassTokens(isDark: boolean, palette?: AppPalette, variant: 'hero' | 'card' | 'pill' = 'hero') {
  if (palette) {
    if (variant === 'pill') {
      return {
        borderColor: palette.glass.pillBorder,
        overlay: palette.glass.pillOverlay,
        fallback: palette.glass.pillFallback,
      };
    }
    return {
      borderColor: palette.glass.border,
      overlay: palette.glass.overlay,
      fallback: palette.glass.fallback,
    };
  }

  if (isDark) {
    const dark = {
      hero: {
        borderColor: 'rgba(255,255,255,0.14)',
        overlay: 'rgba(255,255,255,0.06)',
        fallback: 'rgba(18,26,43,0.82)',
      },
      card: {
        borderColor: 'rgba(255,255,255,0.1)',
        overlay: 'rgba(255,255,255,0.04)',
        fallback: 'rgba(18,26,43,0.9)',
      },
      pill: {
        borderColor: 'rgba(255,255,255,0.12)',
        overlay: 'rgba(255,255,255,0.05)',
        fallback: 'rgba(18,26,43,0.65)',
      },
    };
    return dark[variant];
  }

  const light = {
    hero: {
      borderColor: 'rgba(255,255,255,0.55)',
      overlay: 'rgba(255,255,255,0.42)',
      fallback: 'rgba(255,255,255,0.78)',
    },
    card: {
      borderColor: 'rgba(255,255,255,0.65)',
      overlay: 'rgba(255,255,255,0.55)',
      fallback: 'rgba(255,255,255,0.85)',
    },
    pill: {
      borderColor: 'rgba(255,255,255,0.5)',
      overlay: 'rgba(255,255,255,0.28)',
      fallback: 'rgba(255,255,255,0.55)',
    },
  };
  return light[variant];
}

export function GlassSurface({
  children,
  intensity = 50,
  tint,
  style,
  contentStyle,
  borderRadius = themeRadius.lg,
  variant = 'hero',
  isDark = false,
  palette,
}: GlassSurfaceProps) {
  const tokens = getGlassTokens(isDark, palette, variant);
  const blurTint: BlurTint = tint ?? (isDark ? 'dark' : 'light');
  const canBlur = Platform.OS === 'ios' || Platform.OS === 'android';

  return (
    <View style={[styles.shell, { borderRadius, borderColor: tokens.borderColor }, style]}>
      {canBlur ? (
        <BlurView
          intensity={isDark ? intensity + 10 : intensity}
          tint={blurTint}
          style={[StyleSheet.absoluteFill, { borderRadius }]}
          experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
        />
      ) : (
        <View
          style={[
            StyleSheet.absoluteFill,
            { borderRadius, backgroundColor: tokens.fallback },
          ]}
        />
      )}
      <View
        style={[
          StyleSheet.absoluteFill,
          { borderRadius, backgroundColor: tokens.overlay, pointerEvents: 'none' },
        ]}
      />
      <View style={[styles.content, contentStyle]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    overflow: 'hidden',
    borderWidth: 1,
    ...platformShadow({
      color: '#0F172A',
      offsetY: 8,
      opacity: 0.14,
      radius: 24,
      elevation: 8,
    }),
  },
  content: {
    position: 'relative',
  },
});
