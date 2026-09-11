import { useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  WEATHER_AUTO_REFRESH_MINUTES,
  WEATHER_AUTO_REFRESH_MS,
  formatWeatherCountdown,
  weatherRefreshProgress,
} from '@/src/constants/weather-refresh';
import { useRelativeTime } from '@/src/hooks/useRelativeTime';
import { formatWeatherObservationTime } from '@/src/utils/weather-display';
import { liveIndicatorColors } from '@/src/constants/live-indicator';
import { fonts, radius, spacing, typography } from '@/src/theme';
import { useAppTheme } from '@/src/theme/useAppTheme';
import type { AppPalette } from '@/src/theme/palettes';

const TOTAL_SECONDS = Math.floor(WEATHER_AUTO_REFRESH_MS / 1000);

/** Live sync status + countdown until the next automatic weather refresh. */
export function WeatherRefreshCountdown({
  secondsLeft,
  refreshing,
  lastUpdatedAt,
  onRefresh,
  variant = 'card',
}: {
  secondsLeft: number;
  refreshing?: boolean;
  lastUpdatedAt?: string | null;
  onRefresh?: () => void;
  variant?: 'card' | 'inline';
}) {
  const { palette, isDark } = useAppTheme();
  const styles = useMemo(() => createStyles(palette, isDark), [palette, isDark]);
  const updatedLabel = useRelativeTime(lastUpdatedAt);
  const progress = weatherRefreshProgress(secondsLeft, TOTAL_SECONDS);
  const countdown = formatWeatherCountdown(secondsLeft);

  if (variant === 'inline') {
    return (
      <View style={styles.inlineRow} accessibilityLabel={`Next refresh in ${countdown}`}>
        {refreshing ? (
          <ActivityIndicator size="small" color={palette.primary} />
        ) : (
          <View style={styles.liveDot} />
        )}
        <Text style={styles.inlineText}>{refreshing ? 'Syncing…' : countdown}</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.statusBlock}>
          {refreshing ? (
            <>
              <ActivityIndicator size="small" color={palette.primary} />
              <Text style={styles.statusTitle}>Syncing live weather</Text>
            </>
          ) : (
            <>
              <View style={styles.liveDot} />
              <Text style={styles.statusTitle}>Live · auto-updates every {WEATHER_AUTO_REFRESH_MINUTES} min</Text>
            </>
          )}
        </View>
        {onRefresh ? (
          <Pressable
            onPress={onRefresh}
            disabled={refreshing}
            style={({ pressed }) => [styles.refreshBtn, pressed && { opacity: 0.85 }]}
            accessibilityRole="button"
            accessibilityLabel="Refresh weather now"
          >
            <Ionicons name="refresh" size={16} color={palette.primary} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
      </View>

      <View style={styles.cardMeta}>
        <Text style={styles.metaPrimary}>
          {refreshing ? 'Updating weather…' : `Next update in ${countdown}`}
        </Text>
        {lastUpdatedAt ? (
          <Text style={styles.metaSecondary}>
            Observation {updatedLabel} · {formatWeatherObservationTime(lastUpdatedAt)}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function createStyles(p: AppPalette, isDark: boolean) {
  return StyleSheet.create({
    card: {
      backgroundColor: isDark ? p.surfaceMuted : p.primarySoft,
      borderRadius: radius.lg,
      padding: spacing.md,
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: isDark ? p.border : 'rgba(37,99,235,0.12)',
    },
    cardTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    statusBlock: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      flex: 1,
      minWidth: 0,
    },
    statusTitle: {
      ...typography.caption,
      fontFamily: fonts.bodySemiBold,
      color: p.textSecondary,
      flexShrink: 1,
    },
    liveDot: {
      width: 9,
      height: 9,
      borderRadius: 5,
      backgroundColor: liveIndicatorColors(isDark).dot,
      borderWidth: 2,
      borderColor: liveIndicatorColors(isDark).dotRing,
      flexShrink: 0,
    },
    refreshBtn: {
      width: 34,
      height: 34,
      borderRadius: radius.md,
      backgroundColor: p.surface,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: p.borderLight,
      flexShrink: 0,
    },
    progressTrack: {
      height: 6,
      borderRadius: radius.pill,
      backgroundColor: isDark ? p.border : 'rgba(37,99,235,0.15)',
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: radius.pill,
      backgroundColor: p.primary,
      minWidth: 6,
    },
    cardMeta: {
      gap: 2,
    },
    metaPrimary: {
      ...typography.caption,
      fontFamily: fonts.bodySemiBold,
      fontVariant: ['tabular-nums'],
      color: p.text,
    },
    metaSecondary: {
      ...typography.caption,
      color: p.textMuted,
    },
    inlineRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    inlineText: {
      ...typography.caption,
      fontFamily: fonts.bodySemiBold,
      fontSize: 12,
      color: p.textMuted,
      fontVariant: ['tabular-nums'],
    },
  });
}
