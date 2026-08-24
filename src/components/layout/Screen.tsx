import { useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  type RefreshControlProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { layout, spacing } from '@/src/theme';
import { useAppTheme } from '@/src/theme/useAppTheme';
import { useResponsiveTabBar } from '@/src/utils/responsive';
import { PageMasthead, ScreenTopAccent } from '@/src/components/layout/PageMasthead';
import type { AppPalette } from '@/src/theme/palettes';

interface ScreenProps {
  overline?: string;
  title?: string;
  subtitle?: string;
  live?: boolean;
  back?: boolean;
  onBackPress?: () => void;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  horizontalPadding?: number;
  scroll?: boolean;
  refreshControl?: React.ReactElement<RefreshControlProps>;
  contentStyle?: StyleProp<ViewStyle>;
  hideHeader?: boolean;
  /** Adds bottom padding so content clears the tab bar */
  reserveTabBar?: boolean;
}

export function Screen({
  overline,
  title,
  subtitle,
  live,
  back = false,
  onBackPress,
  headerRight,
  children,
  horizontalPadding = layout.pagePadding,
  scroll = true,
  refreshControl,
  contentStyle,
  hideHeader = false,
  reserveTabBar = false,
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const tab = useResponsiveTabBar();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const scrollBottomPadding =
    spacing.huge + (reserveTabBar ? insets.bottom + tab.height + 8 : 0);

  const showHeader = !hideHeader && Boolean(title || back);

  const body = (
    <View style={[styles.content, { paddingHorizontal: horizontalPadding }, contentStyle]}>
      {showHeader && title ? (
        <PageMasthead
          overline={overline}
          title={title}
          subtitle={subtitle}
          live={live}
          back={back}
          onBackPress={onBackPress}
          headerRight={headerRight}
        />
      ) : showHeader && back ? (
        <PageMasthead
          overline={overline}
          title={title ?? 'Back'}
          subtitle={subtitle}
          back
          onBackPress={onBackPress}
          headerRight={headerRight}
        />
      ) : null}
      {children}
    </View>
  );

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScreenTopAccent />
      {scroll ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollBottomPadding }]}
          keyboardShouldPersistTaps="handled"
          refreshControl={refreshControl}
        >
          {body}
        </ScrollView>
      ) : (
        body
      )}
    </SafeAreaView>
  );
}

function createStyles(p: AppPalette) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: p.background,
    },
    scrollContent: {
      flexGrow: 1,
    },
    content: {
      paddingTop: spacing.sm,
      gap: layout.sectionGap,
    },
  });
}
