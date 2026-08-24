import { Platform, type ViewStyle } from 'react-native';

type ShadowSpec = {
  color?: string;
  offsetX?: number;
  offsetY: number;
  opacity: number;
  radius: number;
  elevation?: number;
};

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.replace('#', '');
  const full =
    normalized.length === 3
      ? normalized
          .split('')
          .map((c) => c + c)
          .join('')
      : normalized.padEnd(6, '0').slice(0, 6);
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

/** Cross-platform shadow — uses boxShadow on web, shadow* on iOS, elevation on Android */
export function platformShadow(spec: ShadowSpec): ViewStyle {
  const {
    color = '#0F172A',
    offsetX = 0,
    offsetY,
    opacity,
    radius,
    elevation = 0,
  } = spec;

  if (Platform.OS === 'web') {
    const { r, g, b } = hexToRgb(color);
    return {
      boxShadow: `${offsetX}px ${offsetY}px ${radius}px rgba(${r}, ${g}, ${b}, ${opacity})`,
    } as ViewStyle;
  }

  if (Platform.OS === 'android') {
    return { elevation };
  }

  return {
    shadowColor: color,
    shadowOffset: { width: offsetX, height: offsetY },
    shadowOpacity: opacity,
    shadowRadius: radius,
  };
}

export function softShadow(): ViewStyle {
  return platformShadow({ offsetY: 1, opacity: 0.05, radius: 4, elevation: 1 });
}

export function cardShadow(): ViewStyle {
  return platformShadow({ offsetY: 4, opacity: 0.07, radius: 12, elevation: 3 });
}

export function elevatedShadow(): ViewStyle {
  return platformShadow({ offsetY: 8, opacity: 0.1, radius: 20, elevation: 5 });
}

export function floatShadow(): ViewStyle {
  return cardShadow();
}

export function tabBarShadow(isDark: boolean): ViewStyle {
  return platformShadow({
    color: '#000000',
    offsetY: -4,
    opacity: isDark ? 0.35 : 0.06,
    radius: 12,
    elevation: 12,
  });
}

export function surfaceShadow(isDark: boolean): ViewStyle {
  return platformShadow({
    color: '#000000',
    offsetY: 4,
    opacity: isDark ? 0.25 : 0.07,
    radius: 16,
    elevation: 4,
  });
}
