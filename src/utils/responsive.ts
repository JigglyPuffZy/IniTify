import { Platform, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Breakpoints tuned for common phone widths (320px – 430px+) */
export function useResponsive() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const isCompact = width < 360;
  const isRegular = width >= 360 && width < 414;
  const isLarge = width >= 414;

  return {
    width,
    height,
    insets,
    isCompact,
    isRegular,
    isLarge,
    horizontalPadding: isCompact ? 16 : isRegular ? 20 : 24,
    heroTitleSize: isCompact ? 26 : isRegular ? 28 : 30,
    cardRadius: isCompact ? 16 : 18,
  };
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
      checkIn: width < 360 ? 'Check-in' : 'Check-in',
      notifications: width < 360 ? 'Alerts' : 'Notifications',
      emergency: width < 390 ? 'SOS' : 'Emergency',
      profile: 'Profile',
    } as const,
    /** Minimum width per tab item scales with screen */
    itemMinWidth: Math.max(56, Math.floor(width / 5) - 6),
    /** Legacy alias used by Screen scroll padding */
    height: contentHeight,
  };
}
