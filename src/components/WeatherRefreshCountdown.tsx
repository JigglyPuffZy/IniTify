import { useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { formatWeatherCountdown } from '@/src/constants/weather-refresh';
import { fonts, spacing, typography } from '@/src/theme';
import { useAppTheme } from '@/src/theme/useAppTheme';
import type { AppPalette } from '@/src/theme/palettes';

/** Countdown until the next automatic weather refresh. */
export function WeatherRefreshCountdown({
  secondsLeft,
  refreshing,
}: {
  secondsLeft: number;
  refreshing?: boolean;
  compact?: boolean;
}) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);

  if (refreshing) {
    return (
      <View style={styles.row} accessibilityLabel="Refreshing weather">
        <ActivityIndicator size="small" color={palette.primary} />
        <Text style={styles.text}>Refreshing…</Text>
      </View>
    );
  }

  return (
    <View
      style={styles.row}
      accessibilityLabel={`Next refresh in ${formatWeatherCountdown(secondsLeft)}`}
    >
      <Text style={styles.text}>{formatWeatherCountdown(secondsLeft)}</Text>
    </View>
  );
}

function createStyles(p: AppPalette) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    text: {
      ...typography.caption,
      fontFamily: fonts.bodySemiBold,
      fontSize: 12,
      color: p.textMuted,
      fontVariant: ['tabular-nums'],
    },
  });
}
