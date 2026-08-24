import { useRouter, Stack } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { EmptyState } from '@/src/components/ScreenContainer';
import { Button } from '@/src/components/UiComponents';
import { layout, spacing } from '@/src/theme';
import { useAppTheme } from '@/src/theme/useAppTheme';
import type { LegacyThemeColors } from '@/src/theme/legacy-colors';

export default function NotFoundScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <>
      <Stack.Screen options={{ title: 'Page not found' }} />
      <View style={styles.container}>
        <EmptyState
          title="This page doesn't exist"
          message="The screen you're looking for isn't available. Return to Home to continue."
          icon="map-outline"
        />
        <Button label="Go to Home" onPress={() => router.replace('/home')} icon="home-outline" />
      </View>
    </>
  );
}

function createStyles(colors: LegacyThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      padding: layout.pagePadding,
      justifyContent: 'center',
      gap: spacing.lg,
    },
  });
}
