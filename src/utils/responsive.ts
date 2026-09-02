import { Platform, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing } from '@/src/theme';

const DESIGN_WIDTH = 390;

/** Scale a size relative to a 390pt-wide reference (clamped for very small/large phones). */
export function scaleSize(size: number, width: number): number {
  const factor = Math.min(Math.max(width / DESIGN_WIDTH, 0.82), 1.1);
  return Math.round(size * factor);
}

export function horizontalPaddingForWidth(width: number): number {
  if (width < 360) return 16;
  if (width < 414) return 20;
  return 24;
}

export function computeBentoTileWidth(
  width: number,
  horizontalPadding: number,
  gap = spacing.md,
): number {
  const contentWidth = width - horizontalPadding * 2;
  return Math.max(0, Math.floor((contentWidth - gap) / 2));
}

export type ResponsiveMetrics = {
  width: number;
  height: number;
  insets: ReturnType<typeof useSafeAreaInsets>;
  isNarrow: boolean;
  isCompact: boolean;
  isRegular: boolean;
  isLarge: boolean;
  horizontalPadding: number;
  heroTitleSize: number;
  mastheadTitleSize: number;
  displayTempSize: number;
  displayTempLineHeight: number;
  tempUnitSize: number;
  chatBubbleMaxWidth: number;
  chipMaxWidth: number;
  bentoTileWidth: number;
  cardRadius: number;
  stackRiskActions: boolean;
  hideStepLabels: boolean;
};

export function buildResponsiveMetrics(
  width: number,
  height: number,
  insets: ReturnType<typeof useSafeAreaInsets>,
): ResponsiveMetrics {
  const isNarrow = width < 340;
  const isCompact = width < 360;
  const isRegular = width >= 360 && width < 414;
  const isLarge = width >= 414;
  const horizontalPadding = horizontalPaddingForWidth(width);
  const displayTempSize = scaleSize(72, width);

  return {
    width,
    height,
    insets,
    isNarrow,
    isCompact,
    isRegular,
    isLarge,
    horizontalPadding,
    heroTitleSize: scaleSize(isCompact ? 26 : isRegular ? 28 : 30, width),
    mastheadTitleSize: scaleSize(34, width),
    displayTempSize,
    displayTempLineHeight: displayTempSize + 4,
    tempUnitSize: scaleSize(22, width),
    chatBubbleMaxWidth: Math.min(width * 0.82, width - horizontalPadding * 2 - 48),
    chipMaxWidth: Math.min(220, width - horizontalPadding * 2 - 24),
    bentoTileWidth: computeBentoTileWidth(width, horizontalPadding),
    cardRadius: isCompact ? 16 : 18,
    stackRiskActions: width < 360,
    hideStepLabels: width < 320,
  };
}

/** Breakpoints tuned for common phone widths (320px – 430px+) */
export function useResponsive(): ResponsiveMetrics {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  return buildResponsiveMetrics(width, height, insets);
}

export function useResponsiveTabBar() {
  const { width, isCompact, isRegular } = useResponsive();
  const insets = useSafeAreaInsets();

  const iconSize = isCompact ? 21 : 22;
  const iconWrapHeight = 30;
  const iconWrapWidth = isCompact ? 46 : 50;
  const labelSize = isCompact ? 10 : 11;
  const labelLineHeight = isCompact ? 13 : 14;
  const labelMarginTop = 3;
  const paddingTop = 8;
  const paddingBottom = Platform.OS === 'android' ? 8 : 6;
  const safeBottom = Math.max(insets.bottom, paddingBottom);

  const contentHeight =
    paddingTop + iconWrapHeight + labelMarginTop + labelLineHeight + paddingBottom;

  return {
    contentHeight,
    totalHeight: contentHeight + insets.bottom,
    safeBottom,
    iconSize,
    iconWrapHeight,
    iconWrapWidth,
    labelSize,
    labelLineHeight,
    labelMarginTop,
    paddingTop,
    paddingBottom,
    /** Shorter labels on narrow screens */
    labels: {
      home: 'Home',
      checkIn: 'Check-in',
      notifications: width < 360 ? 'Alerts' : 'Notifications',
      emergency: width < 390 ? 'SOS' : 'Emergency',
      profile: 'Profile',
    } as const,
    /** Minimum width per tab item scales with screen */
    itemMinWidth: Math.max(52, Math.floor(width / 5) - 8),
    /** Legacy alias used by Screen scroll padding */
    height: contentHeight,
  };
}
